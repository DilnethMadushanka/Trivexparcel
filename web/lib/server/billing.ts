import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase-admin";
import { HttpError, grantPlan, type UserDoc } from "./auth";
import { PLAN_DAYS, plans, type PlanId } from "../plans";
import type { Payment } from "../types";

type Method = Payment["method"];

export const genieConfigured = () => !!(process.env.GENIE_API_BASE && process.env.GENIE_API_KEY && process.env.GENIE_WEBHOOK_SECRET);

async function createPayment(uid: string, plan: PlanId, method: Method, reference: string): Promise<string> {
  if (plan === "free") throw new HttpError(400, "Choose Starter or Pro.");
  const user = (await db().doc(`users/${uid}`).get()).data() as UserDoc;
  const ref = db().collection("payments").doc();
  await ref.set({ uid, email: user.email, name: user.name, plan, amount: plans[plan].price, currency: "LKR", method,
    reference: reference.slice(0, 120), status: "pending", createdAt: Timestamp.now() });
  return ref.id;
}

/** Bank transfer or eZ Cash: the seller submits a reference, an admin confirms it. */
export async function submitManual(uid: string, plan: PlanId, method: "bank" | "ezcash", reference: string): Promise<string> {
  const ref = reference.trim();
  if (ref.length < 4) throw new HttpError(400, "Enter the transfer reference or the number you paid from.");
  const open = await db().collection("payments").where("uid", "==", uid).where("status", "==", "pending").limit(3).get();
  if (open.size >= 3) throw new HttpError(429, "You already have payments waiting for approval. We'll confirm them soon.");
  return createPayment(uid, plan, method, ref);
}

export async function decidePayment(actorUid: string, id: string, action: "approve" | "reject"): Promise<void> {
  if (!id || id.includes("/")) throw new HttpError(400, "Invalid payment.");
  const ref = db().doc(`payments/${id}`);
  let grant: { uid: string; plan: PlanId } | null = null;
  await db().runTransaction(async (tx) => {
    grant = null;
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "Payment not found.");
    const p = snap.data()!;
    if (p.status !== "pending") throw new HttpError(409, "This payment has already been decided.");
    tx.update(ref, { status: action === "approve" ? "paid" : "rejected", decidedBy: actorUid, decidedAt: Timestamp.now(), planGranted: action === "approve" });
    if (action === "approve") grant = { uid: p.uid, plan: p.plan };
  });
  const g = grant as { uid: string; plan: PlanId } | null;
  if (g) await grantPlan(g.uid, g.plan, PLAN_DAYS);
}

export async function myPayments(uid: string): Promise<Payment[]> {
  const snap = await db().collection("payments").where("uid", "==", uid).limit(50).get();
  return snap.docs.map(d => {
    const x = d.data();
    return { id: d.id, uid, email: x.email, name: x.name, plan: x.plan, amount: x.amount, method: x.method, reference: x.reference || "",
      status: x.status, createdAt: x.createdAt instanceof Timestamp ? x.createdAt.toDate().toISOString() : "" };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ----------------------------------------------------------------------------------------
   Dialog Genie IPG adapter.

   Genie Business gives each merchant its own API documentation and keys. The request and
   webhook shapes below are a starting point: check every field name, the endpoint path and
   the signature header against your Genie documentation before turning this on. Until the
   three GENIE_* variables are set, card payments stay switched off and the Billing page only
   offers bank transfer and eZ Cash.
   ---------------------------------------------------------------------------------------- */

export async function startGenieCheckout(uid: string, plan: PlanId): Promise<string> {
  if (!genieConfigured()) throw new HttpError(503, "Card payments aren't available yet. Use bank transfer or eZ Cash.");
  const paymentId = await createPayment(uid, plan, "genie", "");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const res = await fetch(`${process.env.GENIE_API_BASE}/transactions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: String(process.env.GENIE_API_KEY) },
    body: JSON.stringify({
      amount: plans[plan].price * 100, // confirm with Genie docs whether amounts are in cents
      currency: "LKR",
      localId: paymentId,
      redirectUrl: `${site}/billing?payment=${paymentId}`,
      webhook: `${site}/api/billing/webhook`
    })
  });
  if (!res.ok) {
    await db().doc(`payments/${paymentId}`).update({ status: "failed", error: `create ${res.status}` });
    throw new HttpError(502, "The card payment page couldn't be opened. Try again, or use bank transfer.");
  }
  const data = await res.json() as { url?: string; id?: string };
  if (!data.url) throw new HttpError(502, "The card payment page couldn't be opened. Try again, or use bank transfer.");
  await db().doc(`payments/${paymentId}`).update({ reference: data.id || "" });
  return data.url;
}

function validSignature(raw: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", String(process.env.GENIE_WEBHOOK_SECRET)).update(raw).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signature.replace(/^sha256=/, ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Genie calls this after a card payment. Activates the plan once, only for a verified success. */
export async function handleGenieWebhook(raw: string, signature: string | null): Promise<void> {
  if (!genieConfigured()) throw new HttpError(503, "Card payments are not configured.");
  if (!validSignature(raw, signature)) throw new HttpError(401, "Invalid signature.");
  let evt: { localId?: string; state?: string; status?: string; amount?: number };
  try { evt = JSON.parse(raw); } catch { throw new HttpError(400, "Invalid body."); }
  const id = String(evt.localId || "");
  if (!id || id.includes("/")) throw new HttpError(400, "Missing payment id.");
  const state = String(evt.state || evt.status || "").toUpperCase();
  const ref = db().doc(`payments/${id}`);
  let grant: { uid: string; plan: PlanId } | null = null;
  await db().runTransaction(async (tx) => {
    grant = null;
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "Payment not found.");
    const p = snap.data()!;
    if (p.status !== "pending") return; // already handled: webhooks can arrive twice
    if (state === "CONFIRMED" || state === "SUCCESS" || state === "PAID") {
      if (typeof evt.amount === "number" && evt.amount !== p.amount * 100) {
        tx.update(ref, { status: "failed", gatewayState: "AMOUNT_MISMATCH", decidedAt: Timestamp.now() });
        return;
      }
      tx.update(ref, { status: "paid", decidedAt: Timestamp.now(), decidedBy: "genie", planGranted: true });
      grant = { uid: p.uid, plan: p.plan };
    } else if (state) {
      tx.update(ref, { status: "failed", decidedAt: Timestamp.now(), gatewayState: state });
    }
  });
  const g = grant as { uid: string; plan: PlanId } | null;
  if (g) await grantPlan(g.uid, g.plan, PLAN_DAYS);
}
