"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/client/api";
import { useReport } from "@/lib/client/useReport";
import { useAuth } from "@/components/Providers";
import { LEVEL, LEVEL_ORDER, Tag } from "@/components/Verdict";
import { extract, OUTCOME_LABEL, type Outcome } from "@/lib/logic";
import type { CheckResult, Me } from "@/lib/types";

const SAMPLE = `Example list (made-up numbers)
Order #1041, Nimal Perera, Kandy, 077 123 4567, Rs. 2,450 COD
Order #1042, Kumari, Galle, +94 71 234 5678, 2 items
#1043 Sahan | Kurunegala | 0761112223 | Rs.3900
Order #1044, Fathima, Colombo 10, 075-998-1200
#1045 Dinesh, Matara 0702223334 (call after 6pm)`;

export default function BulkPage() {
  const { me, setMe } = useAuth();
  const { report, busy: reporting, canReport } = useReport();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<CheckResult[]>([]);
  const found = useMemo(() => extract(text), [text]);

  const run = async () => {
    setErr("");
    const nums = found.slice(0, 90);
    if (!nums.length) { setErr("No phone numbers found. Check the list has numbers like 077 123 4567."); return; }
    setBusy(true);
    try {
      const r = await api<{ results: CheckResult[]; me: Me }>("/api/check", { body: { numbers: nums } });
      setMe(r.me);
      const order = Object.fromEntries(LEVEL_ORDER.map((l, i) => [l, i]));
      setRows([...r.results].sort((a, b) => order[a.level] - order[b.level]));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const replace = (r: CheckResult | null) => { if (r) setRows(rs => rs.map(x => (x.number === r.number ? r : x))); };
  const act = (n: string, o: Outcome) => report(n, o, replace);
  const counts = LEVEL_ORDER.map(l => ({ l, n: rows.filter(r => r.level === l).length }));
  const locked = me && !me.bulk;

  const Actions = ({ n }: { n: string }) => (
    <div className="acts">
      {(["del", "rej", "fake"] as Outcome[]).map(o => (
        <button key={o} type="button" className="chipbtn" disabled={!canReport || reporting} onClick={() => act(n, o)}>{OUTCOME_LABEL[o]}</button>
      ))}
    </div>
  );

  return (
    <section className="view">
      <div className="head">
        <h1>Check a whole order list.</h1>
        <p>Paste orders from WhatsApp, Facebook or Excel. Every Sri Lankan number is picked out and checked at once, riskiest first.</p>
      </div>
      {locked && (
        <div className="empty"><strong>Bulk check is on the Starter and Pro plans.</strong>
          <span>You&apos;re on the Free plan. <Link href="/billing">Upgrade to check whole lists</Link>.</span></div>
      )}
      <form className="field" noValidate onSubmit={e => { e.preventDefault(); run(); }}>
        <label htmlFor="bulkInput">Order list</label>
        <textarea id="bulkInput" className="input" spellCheck={false} value={text} onChange={e => setText(e.target.value)}
          placeholder={"Order #1041, Nimal, Kandy, 077 123 4567, Rs. 2,450\nOrder #1042, Kumari, Galle, +94 71 234 5678"} />
        <div className="cmd-meta">
          <span>{found.length ? `${found.length} number${found.length === 1 ? "" : "s"} found. Each one uses a check.${found.length > 90 ? " Only the first 90 will be checked." : ""}` : "Up to 90 numbers at a time."}</span>
        </div>
        <div className="row">
          <button className="btn" type="submit" disabled={busy || !!locked}>{busy ? "Checking…" : "Check all"}</button>
          <button className="btn ghost" type="button" onClick={() => setText(SAMPLE)}>Paste an example list</button>
        </div>
        {err && <p className="err">{err}</p>}
      </form>

      {rows.length > 0 && (
        <div className="view" style={{ gap: 16 }}>
          <div className="dist" role="img" aria-label={counts.map(c => `${LEVEL[c.l].word} ${c.n}`).join(", ")}>
            {counts.filter(c => c.n).map(c => <span key={c.l} className={LEVEL[c.l].cls} style={{ flex: c.n }} />)}
          </div>
          <div className="legend">
            {counts.map(c => <span key={c.l} className={LEVEL[c.l].cls}><span className="swatch" />{LEVEL[c.l].word} <b>{c.n}</b></span>)}
          </div>
          <div className="cards-on-phone">
            <div className="tablewrap">
              <table className="table">
                <thead><tr><th>Number</th><th>Verdict</th><th className="r">Score</th><th className="r">Delivered</th><th className="r">Rejected</th><th className="r">Fake</th><th className="r">Report</th></tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.number}>
                      <td className="n">{r.pretty}</td><td><Tag level={r.level} /></td>
                      <td className="r tnum">{r.score ?? "—"}</td><td className="r tnum">{r.del}</td><td className="r tnum">{r.rej}</td><td className="r tnum">{r.fake}</td>
                      <td className="r"><Actions n={r.number} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.map(r => (
              <div className="row-card" key={r.number}>
                <div><div className="n" style={{ fontWeight: 600 }}>{r.pretty}</div>
                  <div className="meta hint">{r.score == null ? "No score" : `Score ${r.score}`}, {r.del} delivered, {r.rej} rejected, {r.fake} fake</div></div>
                <Tag level={r.level} />
                <Actions n={r.number} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
