"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useAuth, useToast } from "@/components/Providers";
import { OUTCOME_LABEL } from "@/lib/logic";
import type { MyRecord } from "@/lib/types";

export default function RecordsPage() {
  const { me } = useAuth();
  const toast = useToast();
  const [records, setRecords] = useState<MyRecord[] | null>(null);
  const [err, setErr] = useState("");
  const [fee, setFee] = useState(450);
  const [armed, setArmed] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRecords((await api<{ records: MyRecord[] }>("/api/records")).records); setErr(""); }
    catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => {
    load();
    try { const f = Number(localStorage.getItem("hariyata.fee")); if (f > 0) setFee(f); } catch {}
  }, [load]);

  const t = (records || []).reduce((a, r) => ({ del: a.del + r.del, rej: a.rej + r.rej, fake: a.fake + r.fake }), { del: 0, rej: 0, fake: 0 });
  const remove = async (id: string) => {
    if (armed !== id) { setArmed(id); setTimeout(() => setArmed(a => (a === id ? null : a)), 4000); return; }
    setArmed(null);
    try { await api(`/api/records?id=${encodeURIComponent(id)}`, { method: "DELETE" }); toast.show("Record deleted"); load(); }
    catch (e) { toast.show((e as Error).message); }
  };
  const roleLabel = me?.role === "admin" ? "Admin" : me?.status === "pending" ? "Awaiting approval" : me?.status === "blocked" ? "Blocked" : "Seller";
  const roleCls = me?.role === "admin" ? "p-admin" : me?.status === "pending" ? "p-pending" : me?.status === "blocked" ? "p-blocked" : "p-ok";

  return (
    <section className="view">
      <div className="head">
        <h1>Your records.</h1>
        <p>Parcels you have reported, and the courier fees lost to returns.</p>
      </div>
      <div className="row"><span className="hint">Your role</span><span className={`pill ${roleCls}`}>{roleCls === "p-blocked" ? <span>{roleLabel}</span> : roleLabel}</span>
        <span className="hint">· Plan</span><Link href="/billing" className="pill p-ok" style={{ textDecoration: "none" }}>{me?.planName}</Link></div>
      <div className="hero-fig"><b>Rs. {((t.rej + t.fake) * fee).toLocaleString("en-US")}</b><span>Courier fees lost to rejected and fake orders</span></div>
      <div className="inline-fee">
        <label htmlFor="feeInput">Courier fee per parcel, Rs.</label>
        <input id="feeInput" type="number" min={0} step={10} inputMode="numeric" value={fee}
          onChange={e => { const v = Math.max(0, Number(e.target.value) || 0); setFee(v); try { localStorage.setItem("hariyata.fee", String(v)); } catch {} }} />
      </div>
      <div className="stats">
        <div className="stat"><b>{records?.length ?? 0}</b><span>Numbers reported</span></div>
        <div className="stat s-del"><b>{t.del}</b><span>Delivered</span></div>
        <div className="stat s-rej"><b>{t.rej}</b><span>Rejected</span></div>
        <div className="stat s-fake"><b>{t.fake}</b><span>Fake</span></div>
      </div>
      <div className="sec">
        <div className="sec-h"><h2>Your reports</h2></div>
        {err && <p className="err">{err}</p>}
        {records === null && !err && <div className="skeleton" style={{ height: 120 }} />}
        {records && records.length === 0 && (
          <div className="empty"><strong>No reports yet.</strong>After a parcel is delivered or returned, record it in <Link href="/report">Report</Link>.</div>
        )}
        {records && records.length > 0 && (
          <div className="list">
            {records.map(r => (
              <div className="item" key={r.id}>
                <div><div className="n">{r.masked}</div>
                  <div className="meta">{r.del} delivered, {r.rej} rejected, {r.fake} fake{r.at ? `, ${new Date(r.at).toLocaleDateString("en-GB")}` : ""}</div></div>
                <span className="tag">{OUTCOME_LABEL[r.last]}</span>
                <div className="acts"><button type="button" className="chipbtn" data-armed={armed === r.id ? "1" : undefined} onClick={() => remove(r.id)}>
                  {armed === r.id ? "Tap again to delete" : "Delete record"}</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
