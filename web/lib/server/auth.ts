import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, db } from "./firebase-admin";
import { monthKey, planFor, isPlanId, type PlanId } from "../plans";
import type { Me, Role, Status } from "../types";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface UserDoc {
  email: string;
  name: string;
  photo: string;
  role: Role;
  status: Status;
  plan: PlanId;
  planUntil: Timestamp | null;
  usage?: { month: string; checks: number };
  createdAt?: Timestamp;
}

export interface Ctx { uid: string; user: UserDoc; isAdmin: boolean }

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

export async function getSettings(): Promise<{ requireApproval: boolean }> {
  const snap = await db().doc("settings/app").get();
  return { requireApproval: !!snap.get("requireApproval") };
}

/** Verify the Firebase ID token and load (or create) the user's profile. */
export async function requireUser(req: Request, opts: { admin?: boolean } = {}): Promise<Ctx> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Sign in to continue.");
  let decoded;
  try { decoded = await adminAuth().verifyIdToken(token); }
  catch { throw new HttpError(401, "Your session has expired. Sign in again."); }

  const uid = decoded.uid;
  const email = (decoded.email || "").toLowerCase();
  const ref = db().doc(`users/${uid}`);
  let snap = await ref.get();
  const shouldBeAdmin = !!email && adminEmails().includes(email);

  if (!snap.exists) {
    const { requireApproval } = await getSettings();
    const doc: UserDoc = {
      email,
      name: (decoded.name as string) || email.split("@")[0] || "Seller",
      photo: (decoded.picture as string) || "",
      role: shouldBeAdmin ? "admin" : "seller",
      status: shouldBeAdmin || !requireApproval ? "approved" : "pending",
      plan: "free",
      planUntil: null,
      usage: { month: monthKey(), checks: 0 },
      createdAt: Timestamp.now()
    };
    await ref.create(doc).catch(() => undefined); // another request may have created it first
    snap = await ref.get();
  } else if (shouldBeAdmin && snap.get("role") !== "admin") {
    await ref.update({ role: "admin", status: "approved" });
    snap = await ref.get();
  }

  const user = snap.data() as UserDoc;
  const isAdmin = user.role === "admin";
  if (opts.admin && !isAdmin) throw new HttpError(403, "Admins only.");
  return { uid, user, isAdmin };
}

export function toMe(uid: string, u: UserDoc): Me {
  const plan = planFor({ plan: u.plan, planUntil: u.planUntil ? u.planUntil.toDate() : null });
  const used = u.usage && u.usage.month === monthKey() ? u.usage.checks : 0;
  return {
    uid,
    email: u.email,
    name: u.name,
    photo: u.photo,
    role: u.role,
    status: u.status,
    plan: plan.id,
    planName: plan.name,
    planUntil: plan.id !== "free" && u.planUntil ? u.planUntil.toDate().toISOString() : null,
    checksUsed: used,
    checksLimit: plan.checksPerMonth,
    bulk: plan.bulk
  };
}

/** Atomically spend `n` checks from the user's monthly allowance. */
export async function spendChecks(uid: string, n: number, opts: { bulk: boolean }): Promise<void> {
  const ref = db().doc(`users/${uid}`);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const u = snap.data() as UserDoc;
    const plan = planFor({ plan: u.plan, planUntil: u.planUntil ? u.planUntil.toDate() : null });
    if (opts.bulk && !plan.bulk) throw new HttpError(402, "Bulk check is on the Starter and Pro plans. Upgrade on the Billing page.");
    const month = monthKey();
    const used = u.usage && u.usage.month === month ? u.usage.checks : 0;
    if (plan.checksPerMonth != null && used + n > plan.checksPerMonth) {
      const left = Math.max(0, plan.checksPerMonth - used);
      throw new HttpError(402, left
        ? `You have ${left} check${left === 1 ? "" : "s"} left this month. Upgrade on the Billing page for more.`
        : `You've used all ${plan.checksPerMonth} checks this month. Upgrade on the Billing page for more.`);
    }
    tx.update(ref, { usage: { month, checks: used + n } });
  });
}

/** Extend a user's paid plan by `days` from today or from its current end, whichever is later. */
export async function grantPlan(uid: string, plan: PlanId, days: number): Promise<void> {
  if (!isPlanId(plan)) throw new HttpError(400, "Unknown plan.");
  const ref = db().doc(`users/${uid}`);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "User not found.");
    const u = snap.data() as UserDoc;
    if (plan === "free") { tx.update(ref, { plan: "free", planUntil: null }); return; }
    const now = Date.now();
    const current = u.planUntil ? u.planUntil.toMillis() : 0;
    const base = u.plan === plan && current > now ? current : now;
    tx.update(ref, { plan, planUntil: Timestamp.fromMillis(base + days * 86400000), planUpdatedAt: FieldValue.serverTimestamp() });
  });
}
