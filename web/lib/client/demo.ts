"use client";
// Demo mode (NEXT_PUBLIC_DEMO=1): the whole app runs in the browser on sample data,
// with no Firebase or server. Used for previews and automated screenshots.
import { aggregate, isMobile, masked, normalize, pretty, score, type Outcome } from "../logic";
import { plans, type PlanId } from "../plans";
import type { AdminOverview, CheckResult, Me, MyRecord, Payment } from "../types";

export const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

type Rep = { n: string; by: string; del: number; rej: number; fake: number; last: Outcome; at: string };
const ME_UID = "demo-you";
const day = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const state = {
  me: { uid: ME_UID, email: "you@example.com", name: "Demo Seller", photo: "", role: "admin", status: "approved",
    plan: "starter" as PlanId, planUntil: new Date(Date.now() + 21 * 86400000).toISOString(), checksUsed: 42 } ,
  reports: [
    { n: "94771234567", by: "s1", del: 0, rej: 2, fake: 0, last: "rej", at: day(1) },
    { n: "94771234567", by: "s2", del: 0, rej: 0, fake: 1, last: "fake", at: day(3) },
    { n: "94712345678", by: "s2", del: 3, rej: 0, fake: 0, last: "del", at: day(2) },
    { n: "94712345678", by: "s3", del: 2, rej: 0, fake: 0, last: "del", at: day(6) },
    { n: "94761112223", by: "s1", del: 1, rej: 1, fake: 0, last: "rej", at: day(4) },
    { n: "94759981200", by: ME_UID, del: 2, rej: 0, fake: 0, last: "del", at: day(1) },
    { n: "94702223334", by: ME_UID, del: 0, rej: 1, fake: 0, last: "rej", at: day(5) }
  ] as Rep[],
  settings: { requireApproval: false },
  sellers: [
    { uid: "s1", name: "Kasun Stores", email: "kasun@example.com", status: "approved", role: "seller", plan: "pro" as PlanId },
    { uid: "s2", name: "Nadee Fashion", email: "nadee@example.com", status: "approved", role: "seller", plan: "starter" as PlanId },
    { uid: "s3", name: "Galle Gadgets", email: "gg@example.com", status: "pending", role: "seller", plan: "free" as PlanId },
    { uid: "s4", name: "Quick Deals LK", email: "qd@example.com", status: "blocked", role: "seller", plan: "free" as PlanId }
  ],
  payments: [
    { id: "p1", uid: "s3", email: "gg@example.com", name: "Galle Gadgets", plan: "starter", amount: 990, method: "bank", reference: "TRX 4410 2291", status: "pending", createdAt: day(0) },
    { id: "p2", uid: "s1", email: "kasun@example.com", name: "Kasun Stores", plan: "pro", amount: 2490, method: "ezcash", reference: "077 555 0101", status: "paid", createdAt: day(9) },
    { id: "p3", uid: ME_UID, email: "you@example.com", name: "Demo Seller", plan: "starter", amount: 990, method: "bank", reference: "TRX 0091 7731", status: "paid", createdAt: day(9) }
  ] as Payment[]
};

function meOut(): Me {
  const p = plans[state.me.plan];
  return { ...state.me, role: state.me.role as Me["role"], status: state.me.status as Me["status"], planName: p.name,
    checksLimit: p.checksPerMonth, bulk: p.bulk, planUntil: state.me.plan === "free" ? null : state.me.planUntil };
}

function result(n: string): CheckResult {
  const counting = new Set([ME_UID, ...state.sellers.filter(s => s.status === "approved").map(s => s.uid)]);
  const all = state.reports.filter(r => r.n === n);
  const agg = aggregate(all.filter(r => counting.has(r.by)));
  const sc = score(agg);
  const mine = all.find(r => r.by === ME_UID);
  return { number: n, pretty: pretty(n), mobile: isMobile(n), level: sc.level, score: sc.score, del: agg.del, rej: agg.rej, fake: agg.fake,
    sellers: agg.sellers, mine: mine ? { del: mine.del, rej: mine.rej, fake: mine.fake } : null };
}

const fail = (status: number, message: string) => { const e = new Error(message) as Error & { status: number }; e.status = status; throw e; };

export async function demoApi<T>(path: string, init: { method?: string; body?: unknown }): Promise<T> {
  await new Promise(r => setTimeout(r, 250));
  const url = new URL(path, "http://demo");
  const b = (init.body || {}) as Record<string, unknown>;
  const method = init.method || (init.body ? "POST" : "GET");

  switch (`${method} ${url.pathname}`) {
    case "GET /api/me":
      return { me: meOut(), payments: { card: false, bank: "Trivex IT, Commercial Bank, Acc 0000000000, Colombo", ezcash: "077 000 0000" } } as T;
    case "POST /api/check": {
      const nums = Array.from(new Set((b.numbers as string[]).map(normalize).filter((n): n is string => !!n)));
      if (!nums.length) fail(400, "That isn't a valid Sri Lankan number. Try 10 digits, like 077 123 4567.");
      state.me.checksUsed += nums.length;
      return { results: nums.map(result), me: meOut() } as T;
    }
    case "POST /api/report": {
      const n = normalize(b.number)!; const o = b.outcome as Outcome;
      let r = state.reports.find(x => x.n === n && x.by === ME_UID);
      const prev = r ? { ...r } : null;
      if (!r) { r = { n, by: ME_UID, del: 0, rej: 0, fake: 0, last: o, at: "" }; state.reports.push(r); }
      r[o]++; r.last = o; r.at = new Date().toISOString();
      return { id: n, prev, result: result(n) } as T;
    }
    case "POST /api/report/undo": {
      const n = String(b.id); const prev = b.prev as Rep | null;
      state.reports = state.reports.filter(x => !(x.n === n && x.by === ME_UID));
      if (prev) state.reports.push(prev);
      return { ok: true, result: result(n) } as T;
    }
    case "GET /api/records":
      return { records: state.reports.filter(r => r.by === ME_UID).map<MyRecord>(r => ({ id: r.n, masked: masked(r.n), del: r.del, rej: r.rej, fake: r.fake, last: r.last, at: r.at })) } as T;
    case "DELETE /api/records":
      state.reports = state.reports.filter(r => !(r.n === url.searchParams.get("id") && r.by === ME_UID));
      return { ok: true } as T;
    case "GET /api/billing/history":
      return { payments: state.payments.filter(p => p.uid === ME_UID) } as T;
    case "POST /api/billing/manual":
      state.payments.unshift({ id: "p" + Date.now(), uid: ME_UID, email: state.me.email, name: state.me.name, plan: b.plan as PlanId,
        amount: plans[b.plan as PlanId].price, method: b.method as Payment["method"], reference: String(b.reference), status: "pending", createdAt: new Date().toISOString() });
      return { id: "x" } as T;
    case "POST /api/billing/checkout":
      return fail(503, "Card payments aren't available in the demo.") as T;
    case "GET /api/admin/overview": {
      const people = [{ uid: ME_UID, name: state.me.name, email: state.me.email, status: "approved", role: "admin", plan: state.me.plan }, ...state.sellers];
      const ov: AdminOverview = {
        stats: { reports: state.reports.length, sellers: state.sellers.length, pending: state.sellers.filter(s => s.status === "pending").length,
          blocked: state.sellers.filter(s => s.status === "blocked").length, paying: people.filter(p => p.plan !== "free").length,
          pendingPayments: state.payments.filter(p => p.status === "pending").length },
        settings: state.settings,
        sellers: people.map(s => {
          const mine = state.reports.filter(r => r.by === s.uid);
          const tot = mine.reduce((a, r) => a + r.del + r.rej + r.fake, 0), bad = mine.reduce((a, r) => a + r.rej + r.fake, 0);
          return { uid: s.uid, name: s.name, email: s.email, photo: "", role: s.role as "seller" | "admin", status: s.status as "approved",
            plan: s.plan, planUntil: s.plan === "free" ? null : day(-20), reports: mine.length, badRate: tot ? Math.round((bad / tot) * 100) : 0, createdAt: day(30) };
        }),
        reports: [...state.reports].sort((a, b) => b.at.localeCompare(a.at)).map(r => ({ id: r.n + r.by, masked: masked(r.n), by: r.by,
          byName: people.find(p => p.uid === r.by)?.name || "Seller", del: r.del, rej: r.rej, fake: r.fake, last: r.last, at: r.at,
          counted: r.by === ME_UID || state.sellers.find(s => s.uid === r.by)?.status === "approved" })),
        payments: state.payments
      };
      return ov as T;
    }
    case "POST /api/admin/users": {
      const s = state.sellers.find(x => x.uid === b.uid);
      if (s) { if (b.status) s.status = String(b.status); if (b.role) s.role = String(b.role); if (b.plan) s.plan = b.plan as PlanId; }
      return { ok: true } as T;
    }
    case "POST /api/admin/settings": state.settings.requireApproval = !!b.requireApproval; return { ok: true } as T;
    case "POST /api/admin/payments": {
      const p = state.payments.find(x => x.id === b.id); if (p) p.status = b.action === "approve" ? "paid" : "rejected";
      return { ok: true } as T;
    }
    case "DELETE /api/admin/reports": {
      const id = url.searchParams.get("id"); state.reports = state.reports.filter(r => r.n + r.by !== id); return { ok: true } as T;
    }
  }
  return fail(404, "Not available in the demo.") as T;
}
