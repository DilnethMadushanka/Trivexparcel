import type { Level, Outcome } from "./logic";
import type { PlanId } from "./plans";

export type Role = "seller" | "admin";
export type Status = "approved" | "pending" | "blocked";

/** What the browser receives about the signed-in user. */
export interface Me {
  uid: string;
  email: string;
  name: string;
  photo: string;
  role: Role;
  status: Status;
  plan: PlanId;
  planName: string;
  planUntil: string | null;
  checksUsed: number;
  checksLimit: number | null;
  bulk: boolean;
}

export interface CheckResult {
  number: string;
  pretty: string;
  mobile: boolean;
  level: Level;
  score: number | null;
  del: number;
  rej: number;
  fake: number;
  sellers: number;
  mine: { del: number; rej: number; fake: number } | null;
}

export interface MyRecord {
  id: string;
  masked: string;
  del: number;
  rej: number;
  fake: number;
  last: Outcome;
  at: string;
}

export interface AdminSeller {
  uid: string;
  name: string;
  email: string;
  photo: string;
  role: Role;
  status: Status;
  plan: PlanId;
  planUntil: string | null;
  reports: number;
  badRate: number;
  createdAt: string | null;
}

export interface AdminReport {
  id: string;
  masked: string;
  by: string;
  byName: string;
  del: number;
  rej: number;
  fake: number;
  last: Outcome;
  at: string;
  counted: boolean;
}

export interface Payment {
  id: string;
  uid: string;
  email: string;
  name: string;
  plan: PlanId;
  amount: number;
  method: "genie" | "bank" | "ezcash";
  reference: string;
  status: "pending" | "paid" | "rejected" | "failed";
  createdAt: string;
}

export interface AdminOverview {
  stats: { reports: number; sellers: number; pending: number; blocked: number; paying: number; pendingPayments: number };
  settings: { requireApproval: boolean };
  sellers: AdminSeller[];
  reports: AdminReport[];
  payments: Payment[];
}
