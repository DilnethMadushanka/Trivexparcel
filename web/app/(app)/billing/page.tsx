"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useAuth, useToast } from "@/components/Providers";
import { PAID_PLANS, plans, type PlanId } from "@/lib/plans";
import type { Payment } from "@/lib/types";

type Method = "genie" | "bank" | "ezcash";
const fmt = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;
const methodName: Record<Method, string> = { genie: "Card", bank: "Bank transfer", ezcash: "eZ Cash" };

export default function BillingPage() {
  const { me, pay, refresh } = useAuth();
  const toast = useToast();
  const [plan, setPlan] = useState<PlanId>("starter");
  const [method, setMethod] = useState<Method>("bank");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [history, setHistory] = useState<Payment[]>([]);
  const [returned, setReturned] = useState(false);

  const load = useCallback(async () => {
    try { setHistory((await api<{ payments: Payment[] }>("/api/billing/history")).payments); } catch {}
  }, []);
  useEffect(() => {
    load();
    if (new URLSearchParams(window.location.search).get("payment")) { setReturned(true); refresh(); }
  }, [load, refresh]);
  useEffect(() => { if (pay?.card) setMethod("genie"); }, [pay?.card]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.show("Copied"); } catch { toast.show("Couldn't copy. Select the text instead."); }
  };

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      if (method === "genie") {
        const r = await api<{ url: string }>("/api/billing/checkout", { body: { plan } });
        window.location.href = r.url;
        return;
      }
      await api("/api/billing/manual", { body: { plan, method, reference: ref } });
      setRef(""); toast.show("Payment sent for approval. We'll activate your plan once it's confirmed."); load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const until = me?.planUntil ? new Date(me.planUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <section className="view">
      <div className="head">
        <h1>Your plan.</h1>
        <p>{me?.planName} plan{until ? `, active until ${until}` : ""}. {me?.checksLimit == null ? "Unlimited checks." : `${me?.checksUsed} of ${me?.checksLimit} checks used this month.`}</p>
      </div>
      {returned && <div className="empty"><strong>Thanks, we&apos;re confirming your payment.</strong>Your plan updates as soon as the bank confirms it, usually within a minute.</div>}

      <div className="plan-grid">
        {(["free", ...PAID_PLANS] as PlanId[]).map(id => {
          const p = plans[id];
          const current = me?.plan === id;
          return (
            <div key={id} className={`plan-card ${current ? "current" : ""}`}>
              <h3>{p.name}{current && <span className="pill p-admin">Current</span>}</h3>
              <div className="price">{p.price ? fmt(p.price) : "Free"}{p.price ? <small> / 30 days</small> : null}</div>
              <ul>
                <li>{p.checksPerMonth == null ? "Unlimited checks" : `${p.checksPerMonth} checks a month`}</li>
                <li>{p.bulk ? "Bulk check for whole order lists" : "Single number checks"}</li>
                <li>Report results, records and loss tracking</li>
              </ul>
              {id !== "free" && (
                <button type="button" className={plan === id ? "btn" : "btn ghost"} onClick={() => setPlan(id)} aria-pressed={plan === id}>
                  {current ? `Extend ${p.name}` : `Choose ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="pay-box">
        <div className="sec-h"><h2>Pay for {plans[plan].name}: {fmt(plans[plan].price)}</h2><span className="aside">Adds 30 days</span></div>
        <div className="pay-methods" role="group" aria-label="Payment method">
          <button type="button" className="pay-method" aria-pressed={method === "genie"} disabled={!pay?.card} onClick={() => setMethod("genie")}>
            Card<span>{pay?.card ? "Visa, Mastercard, Amex via Dialog Genie" : "Coming soon"}</span></button>
          <button type="button" className="pay-method" aria-pressed={method === "bank"} disabled={!pay?.bank} onClick={() => setMethod("bank")}>
            Bank transfer<span>Approved by our team</span></button>
          <button type="button" className="pay-method" aria-pressed={method === "ezcash"} disabled={!pay?.ezcash} onClick={() => setMethod("ezcash")}>
            eZ Cash<span>Approved by our team</span></button>
        </div>

        {method !== "genie" && (
          <div className="field">
            <span className="lbl">1. Send {fmt(plans[plan].price)} to</span>
            <div className="copyline"><span>{method === "bank" ? pay?.bank : pay?.ezcash}</span>
              <button type="button" className="chipbtn" onClick={() => copy(String(method === "bank" ? pay?.bank : pay?.ezcash))}>Copy</button></div>
            <label htmlFor="payRef" className="lbl" style={{ marginTop: 6 }}>2. Enter the {method === "bank" ? "transfer reference" : "number you paid from"}</label>
            <input id="payRef" className="input" value={ref} onChange={e => setRef(e.target.value)} placeholder={method === "bank" ? "e.g. TRX 4410 2291" : "07X XXX XXXX"} />
            <p className="hint">Use your email ({me?.email}) as the transfer note so we can match it quickly.</p>
          </div>
        )}
        <div className="row">
          <button type="button" className="btn" disabled={busy || (method !== "genie" && ref.trim().length < 4)} onClick={submit}>
            {busy ? "Working…" : method === "genie" ? `Pay ${fmt(plans[plan].price)} by card` : "I've paid, send for approval"}
          </button>
        </div>
        {err && <p className="err">{err}</p>}
      </div>

      <div className="sec">
        <div className="sec-h"><h2>Payment history</h2></div>
        {history.length === 0 ? <div className="empty"><strong>No payments yet.</strong></div> : (
          <div className="list">
            {history.map(p => (
              <div className="item" key={p.id}>
                <div><div className="n">{plans[p.plan]?.name} · {fmt(p.amount)}</div>
                  <div className="meta">{methodName[p.method]}{p.reference ? `, ${p.reference}` : ""}, {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB") : ""}</div></div>
                <span className={`status-pill st-${p.status}`}>{p.status === "paid" ? "Paid" : p.status === "pending" ? "Waiting" : p.status === "rejected" ? "Not received" : "Failed"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
