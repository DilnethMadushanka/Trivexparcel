"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useReport } from "@/lib/client/useReport";
import { useAuth } from "@/components/Providers";
import { ResultCard, Tag } from "@/components/Verdict";
import { normalize, pretty, type Level } from "@/lib/logic";
import type { CheckResult, Me } from "@/lib/types";

interface Hist { n: string; level: Level; t: number }
const readHist = (): Hist[] => { try { return JSON.parse(localStorage.getItem("hariyata.history") || "[]"); } catch { return []; } };
const writeHist = (h: Hist[]) => { try { localStorage.setItem("hariyata.history", JSON.stringify(h)); } catch {} };
function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export default function CheckPage() {
  const { setMe } = useAuth();
  const { report, busy: reporting, canReport, note } = useReport();
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [fresh, setFresh] = useState(false);
  const [hist, setHist] = useState<Hist[]>([]);

  useEffect(() => { setHist(readHist()); }, []);

  const remember = (r: CheckResult) => {
    const h = [{ n: r.number, level: r.level, t: Date.now() }, ...readHist().filter(x => x.n !== r.number)].slice(0, 8);
    writeHist(h); setHist(h);
  };

  const run = async (raw: string) => {
    setErr("");
    const n = normalize(raw);
    if (!n) { setErr("That isn't a valid Sri Lankan number. Try 10 digits, like 077 123 4567."); return; }
    setBusy(true);
    try {
      const r = await api<{ results: CheckResult[]; me: Me }>("/api/check", { body: { numbers: [n] } });
      setMe(r.me); setResult(r.results[0]); setFresh(true); remember(r.results[0]);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const afterReport = (r: CheckResult | null) => {
    if (r) { setResult(r); setFresh(false); remember(r); }
  };

  return (
    <section className="view">
      <div className="head">
        <h1>Check before you ship COD.</h1>
        <p>See how this customer handled cash-on-delivery parcels from other sellers, before you pack anything.</p>
      </div>
      <form className="cmd" noValidate onSubmit={e => { e.preventDefault(); (document.activeElement as HTMLElement)?.blur(); run(value); }}>
        <label htmlFor="checkInput" className="hint">Customer phone number</label>
        <div className={`cmd-box ${busy ? "busy" : ""}`}>
          <span className="cc" aria-hidden="true">LK</span>
          <input id="checkInput" className="cmd-input" size={1} type="tel" inputMode="tel" autoComplete="off" placeholder="077 123 4567"
            value={value} onChange={e => setValue(e.target.value)} />
          <button className="go" type="submit" disabled={busy}>{busy ? "Checking…" : "Check"} <kbd className="desk">↵</kbd></button>
          <span className="scan" aria-hidden="true" />
        </div>
        <div className="cmd-meta"><span>Any format works: 07X, +94, 94, with spaces or dashes.</span><span className="desk">Press <kbd>/</kbd> to focus</span></div>
        {err && <p className="err">{err}</p>}
      </form>

      {result && (
        <ResultCard key={result.number + (fresh ? "f" : "")} r={result} fresh={fresh} canReport={canReport} reportNote={note} busy={reporting}
          onReport={o => report(result.number, o, afterReport)} />
      )}

      {hist.length > 0 && (
        <div className="sec">
          <div className="sec-h"><h2>Recent checks</h2><button type="button" className="chipbtn" onClick={() => { writeHist([]); setHist([]); }}>Clear</button></div>
          <div className="list">
            {hist.map(h => (
              <div className="item" key={h.n}>
                <div><div className="n">{pretty(h.n)}</div><div className="meta">{ago(h.t)}</div></div>
                <div className="row" style={{ gap: 14 }}>
                  <Tag level={h.level} />
                  <button type="button" className="chipbtn" onClick={() => { setValue(pretty(h.n)); run(h.n); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Check again</button>
                </div>
              </div>
            ))}
          </div>
          <p className="hint">Saved only on this device. Checking again uses one check.</p>
        </div>
      )}
    </section>
  );
}
