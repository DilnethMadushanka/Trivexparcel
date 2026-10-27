"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useAuth, useToast } from "@/components/Providers";
import { OUTCOME_LABEL } from "@/lib/logic";
import { plans, type PlanId } from "@/lib/plans";
import type { AdminOverview, AdminSeller, Status } from "@/lib/types";

type Tab = "payments" | "sellers" | "reports";
type Filter = "all" | Status | "admin" | "paying";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

function StatusPill({ s }: { s: AdminSeller }) {
  if (s.role === "admin") return <span className="pill p-admin">Admin</span>;
  if (s.status === "pending") return <span className="pill p-pending">Pending</span>;
  if (s.status === "blocked") return <span className="pill p-blocked"><span>Blocked</span></span>;
  return <span className="pill p-ok">Approved</span>;
}

export default function AdminPage() {
  const { me } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("payments");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [armed, setArmed] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [grant, setGrant] = useState<Record<string, PlanId>>({});

  const load = useCallback(async () => {
    try { setData(await api<AdminOverview>("/api/admin/overview")); setErr(""); }
    catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { if (me?.role === "admin") load(); }, [me?.role, load]);

  if (me?.role !== "admin") return <div className="empty"><strong>Admins only.</strong>Ask an admin to give your account the admin role.</div>;

  const confirmFirst = (key: string) => {
    if (armed === key) { setArmed(null); return true; }
    setArmed(key); setTimeout(() => setArmed(a => (a === key ? null : a)), 4000); return false;
  };
  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setWorking(key);
    try { await fn(); toast.show(msg); await load(); }
    catch (e) { toast.show((e as Error).message); }
    finally { setWorking(null); }
  };
  const setUser = (s: AdminSeller, patch: Record<string, unknown>, msg: string) =>
    run(s.uid + JSON.stringify(patch), () => api("/api/admin/users", { body: { uid: s.uid, ...patch } }), msg);

  if (!data) return (
    <section className="view">
      <div className="head"><h1>Admin.</h1></div>
      {err ? <div className="empty"><strong>Couldn&apos;t load the admin panel.</strong>{err}<button className="btn" style={{ marginTop: 8, width: "fit-content" }} onClick={load}>Try again</button></div>
        : <div className="skeleton" style={{ height: 220 }} />}
    </section>
  );

  const pendingPays = data.payments.filter(p => p.status === "pending");
  const ql = q.trim().toLowerCase();
  const sellers = data.sellers
    .filter(s => filter === "all" || (filter === "admin" ? s.role === "admin" : filter === "paying" ? s.plan !== "free" : s.status === filter && s.role !== "admin"))
    .filter(s => !ql || s.name.toLowerCase().includes(ql) || s.email.toLowerCase().includes(ql))
    .sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0) || b.reports - a.reports);

  const SellerActions = ({ s }: { s: AdminSeller }) => {
    const self = s.uid === me.uid;
    const g = grant[s.uid] || "starter";
    return (
      <div className="acts">
        {s.status !== "approved" && <button className="chipbtn" disabled={!!working} onClick={() => setUser(s, { status: "approved" }, `${s.name} approved`)}>{s.status === "blocked" ? "Unblock" : "Approve"}</button>}
        {s.status !== "blocked" && !self && (
          <button className="chipbtn" data-armed={armed === "b" + s.uid ? "1" : undefined} disabled={!!working}
            onClick={() => confirmFirst("b" + s.uid) && setUser(s, { status: "blocked" }, `${s.name} blocked`)}>{armed === "b" + s.uid ? "Tap again to block" : "Block"}</button>
        )}
        {!self && (s.role === "admin"
          ? <button className="chipbtn" disabled={!!working} onClick={() => setUser(s, { role: "seller" }, `${s.name} is now a seller`)}>Remove admin</button>
          : <button className="chipbtn" data-armed={armed === "a" + s.uid ? "1" : undefined} disabled={!!working}
              onClick={() => confirmFirst("a" + s.uid) && setUser(s, { role: "admin" }, `${s.name} is now an admin`)}>{armed === "a" + s.uid ? "Tap again to make admin" : "Make admin"}</button>)}
        <select className="select" aria-label={`Plan to give ${s.name}`} value={g} onChange={e => setGrant(m => ({ ...m, [s.uid]: e.target.value as PlanId }))}>
          <option value="starter">Starter</option><option value="pro">Pro</option><option value="free">Free</option>
        </select>
        <button className="chipbtn" disabled={!!working} onClick={() => setUser(s, { plan: g, days: 30 }, g === "free" ? `${s.name} moved to Free` : `${s.name} given ${plans[g].name} for 30 days`)}>
          {g === "free" ? "Set Free" : "Give 30 days"}</button>
      </div>
    );
  };

  return (
    <section className="view">
      <div className="head">
        <h1>Admin.</h1>
        <p>Approve payments and sellers, block bad actors, and remove wrong reports.</p>
      </div>

      <div className="stats">
        <div className="stat"><b>{data.stats.sellers}</b><span>Sellers</span></div>
        <div className="stat"><b>{data.stats.paying}</b><span>Paying</span></div>
        <div className="stat s-rej"><b>{data.stats.pendingPayments + data.stats.pending}</b><span>Waiting for you</span></div>
        <div className="stat"><b>{data.stats.reports}</b><span>Reports</span></div>
      </div>

      <div className="switch-row">
        <div><h3>Require approval for new sellers</h3><p>When on, a new seller&apos;s reports don&apos;t count toward scores until you approve them.</p></div>
        <button type="button" className="switch" role="switch" aria-checked={data.settings.requireApproval} aria-label="Require approval for new sellers"
          disabled={working === "settings"}
          onClick={() => run("settings", () => api("/api/admin/settings", { body: { requireApproval: !data.settings.requireApproval } }),
            !data.settings.requireApproval ? "Approval required for new sellers" : "Approval turned off")} />
      </div>

      <div className="filters" role="tablist" aria-label="Admin sections">
        {([["payments", `Payments${pendingPays.length ? ` (${pendingPays.length})` : ""}`], ["sellers", `Sellers${data.stats.pending ? ` (${data.stats.pending} pending)` : ""}`], ["reports", "Reports"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "payments" && (
        <div className="sec">
          {data.payments.length === 0 ? <div className="empty"><strong>No payments yet.</strong>Bank transfer and eZ Cash payments appear here for you to confirm.</div> : (
            <div className="cards-on-phone">
              <div className="tablewrap"><table className="table">
                <thead><tr><th>Seller</th><th>Plan</th><th className="r">Amount</th><th>Method</th><th>Reference</th><th>Date</th><th className="r">Status</th></tr></thead>
                <tbody>{data.payments.map(p => (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: 600 }}>{p.name}</div><div className="hint">{p.email}</div></td>
                    <td>{plans[p.plan]?.name}</td><td className="r tnum">Rs. {p.amount.toLocaleString("en-US")}</td>
                    <td>{p.method === "genie" ? "Card" : p.method === "bank" ? "Bank" : "eZ Cash"}</td><td className="mono" style={{ fontSize: 13 }}>{p.reference || "—"}</td>
                    <td className="hint">{fmtDate(p.createdAt)}</td>
                    <td className="r">{p.status === "pending" && p.method !== "genie" ? (
                      <div className="acts">
                        <button className="chipbtn" disabled={!!working} onClick={() => run(p.id, () => api("/api/admin/payments", { body: { id: p.id, action: "approve" } }), `${p.name}'s plan activated`)}>Approve</button>
                        <button className="chipbtn" data-armed={armed === "r" + p.id ? "1" : undefined} disabled={!!working}
                          onClick={() => confirmFirst("r" + p.id) && run(p.id, () => api("/api/admin/payments", { body: { id: p.id, action: "reject" } }), "Payment marked as not received")}>
                          {armed === "r" + p.id ? "Tap again" : "Reject"}</button>
                      </div>
                    ) : <span className={`status-pill st-${p.status}`}>{p.status === "paid" ? "Paid" : p.status === "pending" ? "Waiting" : p.status === "rejected" ? "Rejected" : "Failed"}</span>}</td>
                  </tr>))}
                </tbody></table></div>
              {data.payments.map(p => (
                <div className="row-card" key={p.id}>
                  <div><div style={{ fontWeight: 600 }}>{p.name} · {plans[p.plan]?.name} · Rs. {p.amount.toLocaleString("en-US")}</div>
                    <div className="hint">{p.method === "genie" ? "Card" : p.method === "bank" ? "Bank" : "eZ Cash"}{p.reference ? `, ${p.reference}` : ""}, {fmtDate(p.createdAt)}</div></div>
                  <span className={`status-pill st-${p.status}`}>{p.status === "paid" ? "Paid" : p.status === "pending" ? "Waiting" : p.status === "rejected" ? "Rejected" : "Failed"}</span>
                  {p.status === "pending" && p.method !== "genie" && (
                    <div className="acts">
                      <button className="chipbtn" disabled={!!working} onClick={() => run(p.id, () => api("/api/admin/payments", { body: { id: p.id, action: "approve" } }), `${p.name}'s plan activated`)}>Approve</button>
                      <button className="chipbtn" data-armed={armed === "r" + p.id ? "1" : undefined} disabled={!!working}
                        onClick={() => confirmFirst("r" + p.id) && run(p.id, () => api("/api/admin/payments", { body: { id: p.id, action: "reject" } }), "Payment marked as not received")}>
                        {armed === "r" + p.id ? "Tap again" : "Reject"}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sellers" && (
        <div className="sec">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="filters">
              {(["all", "pending", "approved", "blocked", "paying", "admin"] as Filter[]).map(f => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
            <input className="input" style={{ maxWidth: 260, fontSize: 14, padding: "8px 12px" }} placeholder="Search name or email" value={q} onChange={e => setQ(e.target.value)} aria-label="Search sellers" />
          </div>
          {sellers.length === 0 ? <div className="empty"><strong>No sellers match.</strong></div> : (
            <div className="cards-on-phone">
              <div className="tablewrap"><table className="table">
                <thead><tr><th>Seller</th><th>Status</th><th>Plan</th><th className="r">Reports</th><th className="r">Bad rate</th><th>Actions</th></tr></thead>
                <tbody>{sellers.map(s => (
                  <tr key={s.uid}>
                    <td><div className="who">{s.photo && <img src={s.photo} alt="" referrerPolicy="no-referrer" />}<div style={{ minWidth: 0 }}><div className="name">{s.name}</div><div className="hint">{s.email}</div></div></div></td>
                    <td><StatusPill s={s} /></td>
                    <td>{plans[s.plan].name}{s.planUntil && <div className="hint">to {fmtDate(s.planUntil)}</div>}</td>
                    <td className="r tnum">{s.reports}</td><td className="r tnum">{s.badRate}%</td>
                    <td><SellerActions s={s} /></td>
                  </tr>))}
                </tbody></table></div>
              {sellers.map(s => (
                <div className="row-card" key={s.uid}>
                  <div className="who">{s.photo && <img src={s.photo} alt="" referrerPolicy="no-referrer" />}<div style={{ minWidth: 0 }}><div className="name">{s.name}</div>
                    <div className="hint">{plans[s.plan].name}, {s.reports} reports, {s.badRate}% rejected or fake</div></div></div>
                  <StatusPill s={s} />
                  <SellerActions s={s} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="sec">
          <div className="sec-h"><h2>Latest reports</h2><span className="aside">Newest 50</span></div>
          {data.reports.length === 0 ? <div className="empty"><strong>No reports yet.</strong></div> : (
            <div className="list">
              {data.reports.map(r => (
                <div className="item" key={r.id}>
                  <div><div className="n">{r.masked}</div>
                    <div className="meta">{r.byName}: {r.del} delivered, {r.rej} rejected, {r.fake} fake, {fmtDate(r.at)}{r.counted ? "" : ". Not counted"}</div></div>
                  <span className="tag">{OUTCOME_LABEL[r.last]}</span>
                  <div className="acts"><button className="chipbtn" data-armed={armed === "d" + r.id ? "1" : undefined} disabled={!!working}
                    onClick={() => confirmFirst("d" + r.id) && run(r.id, () => api(`/api/admin/reports?id=${encodeURIComponent(r.id)}`, { method: "DELETE" }), "Report deleted")}>
                    {armed === "d" + r.id ? "Tap again to delete" : "Delete report"}</button></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
