import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase-admin";
import { HttpError, getSettings, type UserDoc } from "./auth";
import type { ReportDoc } from "./reports";
import { planFor } from "../plans";
import type { AdminOverview, AdminReport, AdminSeller, Payment, Role, Status } from "../types";

const iso = (t: unknown): string | null => (t instanceof Timestamp ? t.toDate().toISOString() : null);

export async function overview(): Promise<AdminOverview> {
  const [usersSnap, reportsSnap, paymentsSnap, settings] = await Promise.all([
    db().collection("users").limit(2000).get(),
    db().collection("reports").orderBy("at", "desc").limit(2000).get(),
    db().collection("payments").orderBy("createdAt", "desc").limit(100).get(),
    getSettings()
  ]);

  const users = new Map<string, UserDoc>();
  usersSnap.docs.forEach(d => users.set(d.id, d.data() as UserDoc));

  const per = new Map<string, { n: number; total: number; bad: number }>();
  const reports: AdminReport[] = [];
  reportsSnap.docs.forEach((d, i) => {
    const r = d.data() as ReportDoc;
    const p = per.get(r.by) || { n: 0, total: 0, bad: 0 };
    p.n++; p.total += (r.del | 0) + (r.rej | 0) + (r.fake | 0); p.bad += (r.rej | 0) + (r.fake | 0);
    per.set(r.by, p);
    if (i < 50) {
      const u = users.get(r.by);
      reports.push({ id: d.id, masked: r.m, by: r.by, byName: u?.name || "Unknown seller", del: r.del | 0, rej: r.rej | 0, fake: r.fake | 0,
        last: r.last, at: r.at, counted: u?.status === "approved" });
    }
  });

  const now = new Date();
  const sellers: AdminSeller[] = Array.from(users.entries()).map(([uid, u]) => {
    const p = per.get(uid) || { n: 0, total: 0, bad: 0 };
    const plan = planFor({ plan: u.plan, planUntil: u.planUntil ? u.planUntil.toDate() : null }, now);
    return {
      uid, name: u.name, email: u.email, photo: u.photo, role: u.role, status: u.status,
      plan: plan.id, planUntil: plan.id !== "free" ? iso(u.planUntil) : null,
      reports: p.n, badRate: p.total ? Math.round((p.bad / p.total) * 100) : 0, createdAt: iso(u.createdAt)
    };
  });

  const payments: Payment[] = paymentsSnap.docs.map(d => {
    const x = d.data();
    return { id: d.id, uid: x.uid, email: x.email || "", name: x.name || "", plan: x.plan, amount: x.amount, method: x.method,
      reference: x.reference || "", status: x.status, createdAt: iso(x.createdAt) || "" };
  });

  return {
    stats: {
      reports: reportsSnap.size,
      sellers: sellers.filter(s => s.role === "seller").length,
      pending: sellers.filter(s => s.status === "pending").length,
      blocked: sellers.filter(s => s.status === "blocked").length,
      paying: sellers.filter(s => s.plan !== "free").length,
      pendingPayments: payments.filter(p => p.status === "pending").length
    },
    settings,
    sellers,
    reports,
    payments
  };
}

export async function updateUser(actorUid: string, uid: string, patch: { status?: Status; role?: Role }): Promise<void> {
  if (typeof uid !== "string" || !uid || uid.includes("/")) throw new HttpError(400, "Invalid user.");
  const upd: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    if (!["approved", "pending", "blocked"].includes(patch.status)) throw new HttpError(400, "Invalid status.");
    if (uid === actorUid && patch.status !== "approved") throw new HttpError(400, "You can't block or unapprove yourself.");
    upd.status = patch.status;
  }
  if (patch.role !== undefined) {
    if (!["seller", "admin"].includes(patch.role)) throw new HttpError(400, "Invalid role.");
    if (uid === actorUid && patch.role !== "admin") throw new HttpError(400, "You can't remove your own admin role.");
    upd.role = patch.role;
    if (patch.role === "admin") upd.status = "approved";
  }
  if (!Object.keys(upd).length) throw new HttpError(400, "Nothing to change.");
  const ref = db().doc(`users/${uid}`);
  if (!(await ref.get()).exists) throw new HttpError(404, "User not found.");
  await ref.update(upd);
}

export async function deleteReport(id: string): Promise<void> {
  if (typeof id !== "string" || !id || id.includes("/")) throw new HttpError(400, "Invalid report.");
  await db().doc(`reports/${id}`).delete();
}

export async function setSettings(s: { requireApproval: boolean }): Promise<void> {
  await db().doc("settings/app").set({ requireApproval: !!s.requireApproval, updatedAt: Timestamp.now() }, { merge: true });
}
