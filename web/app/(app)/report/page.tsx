"use client";
import { useState } from "react";
import { useReport } from "@/lib/client/useReport";
import { OutcomeButtons } from "@/components/Verdict";
import { normalize, type Outcome } from "@/lib/logic";

export default function ReportPage() {
  const { report, busy, canReport, note } = useReport();
  const [value, setValue] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    const n = normalize(value);
    if (!n) { setErr("That isn't a valid Sri Lankan number. Try 10 digits, like 077 123 4567."); return; }
    if (!outcome) { setErr("Choose Delivered, Rejected or Fake."); return; }
    if (await report(n, outcome)) { setValue(""); setOutcome(null); }
  };

  return (
    <section className="view">
      <div className="head">
        <h1>What happened to the parcel?</h1>
        <p>Every result you report protects other sellers. You keep one record per number; reporting again updates it.</p>
      </div>
      <form className="view" style={{ gap: 20, maxWidth: 560 }} noValidate onSubmit={e => { e.preventDefault(); submit(); }}>
        <div className="field">
          <label htmlFor="reportInput">Customer phone number</label>
          <input id="reportInput" className="input" type="tel" inputMode="tel" autoComplete="off" placeholder="077 123 4567"
            style={{ fontSize: 22, fontWeight: 600 }} value={value} onChange={e => setValue(e.target.value)} />
        </div>
        <div className="field">
          <span className="lbl">Outcome</span>
          <OutcomeButtons onPick={setOutcome} pressed={outcome} />
          <p className="hint"><b>Rejected</b>: refused the parcel or never answered the courier. <b>Fake</b>: false name or address, or denies ordering.</p>
        </div>
        <div className="row"><button className="btn" type="submit" disabled={!canReport || busy || !outcome}>{busy ? "Saving…" : "Save report"}</button></div>
        {!canReport && note && <p className="hint">{note}</p>}
        {err && <p className="err">{err}</p>}
      </form>
    </section>
  );
}
