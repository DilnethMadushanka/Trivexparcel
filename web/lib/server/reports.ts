import "server-only";
import { db } from "./firebase-admin";
import { hashNumber } from "./hash";
import { HttpError, type UserDoc } from "./auth";
import { aggregate, isMobile, masked, pretty, score, type Outcome } from "../logic";
import type { CheckResult, MyRecord } from "../types";

export interface ReportDoc { h: string; by: string; del: number; rej: number; fake: number; last: Outcome; at: string; m: string }

/** Status of each reporter, so blocked and unapproved sellers don't count. */
async function countingSellers(uids: string[]): Promise<Set<string>> {
  const unique = Array.from(new Set(uids));
  if (!unique.length) return new Set();
  const snaps = await db().getAll(...unique.map(u => db().doc(`users/${u}`)));
  return new Set(snaps.filter(s => s.exists && (s.data() as UserDoc).status === "approved").map(s => s.id));
}

export async function lookup(numbers: string[], uid: string): Promise<CheckResult[]> {
  const hashes = numbers.map(hashNumber);
  const byHash = new Map<string, ReportDoc[]>();
  for (let i = 0; i < hashes.length; i += 30) {
    const snap = await db().collection("reports").where("h", "in", hashes.slice(i, i + 30)).get();
    snap.docs.forEach(d => {
      const r = d.data() as ReportDoc;
      if (!byHash.has(r.h)) byHash.set(r.h, []);
      byHash.get(r.h)!.push(r);
    });
  }
  const counting = await countingSellers(Array.from(byHash.values()).flat().map(r => r.by));
  return numbers.map((n, i) => {
    const all = byHash.get(hashes[i]) || [];
    const agg = aggregate(all.filter(r => counting.has(r.by)));
    const sc = score(agg);
    const mine = all.find(r => r.by === uid);
    return {
      number: n, pretty: pretty(n), mobile: isMobile(n),
      level: sc.level, score: sc.score,
      del: agg.del, rej: agg.rej, fake: agg.fake, sellers: agg.sellers,
      mine: mine ? { del: mine.del | 0, rej: mine.rej | 0, fake: mine.fake | 0 } : null
    };
  });
}

const reportId = (hash: string, uid: string) => `${hash}_${uid}`;

/** Add one outcome to this seller's record for the number. Returns the previous state for undo. */
export async function addReport(n: string, outcome: Outcome, uid: string): Promise<{ id: string; prev: ReportDoc | null }> {
  const h = hashNumber(n);
  const ref = db().doc(`reports/${reportId(h, uid)}`);
  let prev: ReportDoc | null = null;
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    prev = snap.exists ? (snap.data() as ReportDoc) : null;
    const next: ReportDoc = prev ? { ...prev } : { h, by: uid, del: 0, rej: 0, fake: 0, last: outcome, at: "", m: masked(n) };
    next[outcome] = (next[outcome] | 0) + 1;
    next.last = outcome;
    next.at = new Date().toISOString();
    tx.set(ref, next);
  });
  return { id: ref.id, prev };
}

/** Put a seller's record back the way it was before their last report. */
export async function undoReport(id: string, prev: ReportDoc | null, uid: string): Promise<void> {
  if (!id.endsWith(`_${uid}`) || id.includes("/")) throw new HttpError(403, "You can only undo your own reports.");
  const ref = db().doc(`reports/${id}`);
  if (!prev) { await ref.delete(); return; }
  const h = id.slice(0, -(uid.length + 1));
  const clean: ReportDoc = {
    h, by: uid,
    del: Math.max(0, Number(prev.del) | 0), rej: Math.max(0, Number(prev.rej) | 0), fake: Math.max(0, Number(prev.fake) | 0),
    last: (["del", "rej", "fake"] as const).includes(prev.last) ? prev.last : "del",
    at: String(prev.at || new Date().toISOString()), m: String(prev.m || "")
  };
  await ref.set(clean);
}

export async function myRecords(uid: string): Promise<MyRecord[]> {
  const snap = await db().collection("reports").where("by", "==", uid).get();
  return snap.docs
    .map(d => { const r = d.data() as ReportDoc; return { id: d.id, masked: r.m, del: r.del | 0, rej: r.rej | 0, fake: r.fake | 0, last: r.last, at: r.at }; })
    .sort((a, b) => b.at.localeCompare(a.at));
}

export async function deleteMyRecord(id: string, uid: string): Promise<void> {
  if (!id.endsWith(`_${uid}`) || id.includes("/")) throw new HttpError(403, "You can only delete your own records.");
  await db().doc(`reports/${id}`).delete();
}
