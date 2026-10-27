// Subscription plans. Prices are in LKR per 30 days.

export type PlanId = "free" | "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  checksPerMonth: number | null; // null = unlimited
  bulk: boolean;
  blurb: string;
}

export const plans: Record<PlanId, Plan> = {
  free: { id: "free", name: "Free", price: 0, checksPerMonth: 30, bulk: false, blurb: "30 checks a month" },
  starter: { id: "starter", name: "Starter", price: 990, checksPerMonth: 300, bulk: true, blurb: "300 checks a month, bulk check" },
  pro: { id: "pro", name: "Pro", price: 2490, checksPerMonth: null, bulk: true, blurb: "Unlimited checks, bulk check, priority support" }
};

export const PAID_PLANS: PlanId[] = ["starter", "pro"];
export const PLAN_DAYS = 30;

export const isPlanId = (v: unknown): v is PlanId => v === "free" || v === "starter" || v === "pro";

/** The plan a user is on right now. A paid plan past its end date falls back to Free. */
export function planFor(u: { plan?: unknown; planUntil?: Date | null }, now: Date = new Date()): Plan {
  if (isPlanId(u.plan) && u.plan !== "free" && u.planUntil && u.planUntil.getTime() > now.getTime()) return plans[u.plan];
  return plans.free;
}

/** Usage resets by calendar month in Sri Lanka time (UTC+05:30). */
export function monthKey(now: Date = new Date()): string {
  const lk = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return `${lk.getUTCFullYear()}-${String(lk.getUTCMonth() + 1).padStart(2, "0")}`;
}
