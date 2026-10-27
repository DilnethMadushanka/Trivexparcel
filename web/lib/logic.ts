// Hariyata core logic. Pure functions shared by the server and the browser.

export type Outcome = "del" | "rej" | "fake";
export type Level = "new" | "good" | "watch" | "risk";

export interface ReportCounts { del?: number; rej?: number; fake?: number }
export interface Aggregate { del: number; rej: number; fake: number; sellers: number; badSellers: number; fakeSellers: number }
export interface Score { level: Level; score: number | null; total: number }

export const OUTCOMES: Outcome[] = ["del", "rej", "fake"];

/** Normalize a Sri Lankan phone number to 94XXXXXXXXX (11 digits), or null. */
export function normalize(raw: unknown): string | null {
  if (raw == null) return null;
  let d = String(raw).replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  d = d.replace(/\D/g, "");
  if (d.startsWith("0094")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "94" + d.slice(1);
  else if (d.length === 9 && /^[1-9]/.test(d)) d = "94" + d;
  if (!/^94[1-9]\d{8}$/.test(d)) return null;
  return d;
}

export const isMobile = (n: string | null | undefined): boolean => /^947[0-8]\d{7}$/.test(n || "");

/** 94771234567 -> 077 123 4567 */
export function pretty(n: string): string {
  const l = "0" + n.slice(2);
  return `${l.slice(0, 3)} ${l.slice(3, 6)} ${l.slice(6)}`;
}

/** 94771234567 -> 077 ••• ••67 */
export function masked(n: string): string {
  const l = "0" + n.slice(2);
  return `${l.slice(0, 3)} ••• ••${l.slice(8)}`;
}

/** Every Sri Lankan number in pasted text (WhatsApp/FB order lists), de-duplicated. */
export function extract(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /(?:\+?94|0094|0)?[\s\-.()]*7[\s\-.]*\d(?:[\s\-.]*\d){7}|(?:\+?94|0094|0)[\s\-.()]*[1-9][\s\-.]*\d(?:[\s\-.]*\d){7}/g;
  const s = String(text || "");
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const before = s[m.index - 1];
    const after = s[m.index + m[0].length];
    if ((before && /\d/.test(before)) || (after && /\d/.test(after))) continue;
    const n = normalize(m[0]);
    if (n && !seen.has(n)) { seen.add(n); out.push(n); }
  }
  return out;
}

/** Combine one record per seller into totals. */
export function aggregate(docs: ReportCounts[]): Aggregate {
  const a: Aggregate = { del: 0, rej: 0, fake: 0, sellers: 0, badSellers: 0, fakeSellers: 0 };
  for (const d of docs) {
    const del = Math.max(0, (d.del ?? 0) | 0), rej = Math.max(0, (d.rej ?? 0) | 0), fake = Math.max(0, (d.fake ?? 0) | 0);
    if (del + rej + fake === 0) continue;
    a.del += del; a.rej += rej; a.fake += fake; a.sellers++;
    if (rej + fake > 0) a.badSellers++;
    if (fake > 0) a.fakeSellers++;
  }
  return a;
}

/** Trust score 0–100 (higher is safer) and a verdict level. */
export function score(a: Aggregate): Score {
  const total = a.del + a.rej + a.fake;
  if (total === 0) return { level: "new", score: null, total };
  const bad = a.rej + 2 * a.fake;
  let s = Math.round(((a.del + 1) / (a.del + bad + 2)) * 100);
  let level: Level;
  // One report on its own never marks someone "risk".
  if (a.fakeSellers >= 2 || (a.badSellers >= 2 && s < 60) || (s < 45 && total >= 2)) level = "risk";
  else if (s >= 75 && a.del >= 2 && a.fake === 0) level = "good";
  else level = "watch";
  if (level === "risk") s = Math.min(s, 44);
  if (level === "good") s = Math.max(s, 75);
  if (level === "watch") s = Math.min(Math.max(s, 45), 74);
  return { level, score: s, total };
}

export const OUTCOME_LABEL: Record<Outcome, string> = { del: "Delivered", rej: "Rejected", fake: "Fake" };
