"use client";
import { useEffect, useRef, useState } from "react";
import type { Level, Outcome } from "@/lib/logic";
import { OUTCOME_LABEL } from "@/lib/logic";
import type { CheckResult } from "@/lib/types";
import { Icon } from "./Icons";

export const LEVEL: Record<Level, { word: string; cls: string; line: string; advice: [string, string] }> = {
  good: { word: "Safe", cls: "v-safe", line: "Ship COD as normal", advice: ["Ship as normal.", "This customer has accepted COD parcels from other sellers."] },
  watch: { word: "Confirm", cls: "v-confirm", line: "Call before you ship", advice: ["Call to confirm before you ship.", "If you can, collect the delivery fee in advance."] },
  risk: { word: "Risk", cls: "v-risk", line: "Take an advance", advice: ["Don't send COD without an advance.", "Several sellers report rejected or fake orders from this number."] },
  new: { word: "New", cls: "v-new", line: "No reports yet", advice: ["No one has reported this number yet.", "Confirm by phone, then report the result after delivery."] }
};
export const LEVEL_ORDER: Level[] = ["risk", "watch", "new", "good"];

export function Tag({ level }: { level: Level }) {
  const L = LEVEL[level];
  return <span className={`tag ${L.cls}`}><span className="swatch" />{L.word}</span>;
}

function usePrefersReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { setR(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  return r;
}

export function OutcomeButtons({ onPick, disabled, pressed, shortcuts }: {
  onPick: (o: Outcome) => void; disabled?: boolean; pressed?: Outcome | null; shortcuts?: boolean;
}) {
  return (
    <div className="seg3" role="group" aria-label="Outcome">
      {(["del", "rej", "fake"] as Outcome[]).map((o, i) => (
        <button key={o} type="button" data-outcome={o} aria-pressed={pressed === undefined ? undefined : pressed === o}
          disabled={disabled} onClick={() => onPick(o)}>
          {Icon[o]}<span>{OUTCOME_LABEL[o]}</span>{shortcuts && <kbd className="desk">{i + 1}</kbd>}
        </button>
      ))}
    </div>
  );
}

export function ResultCard({ r, fresh, onReport, canReport, reportNote, busy }: {
  r: CheckResult; fresh: boolean; onReport: (o: Outcome) => void; canReport: boolean; reportNote?: string; busy?: boolean;
}) {
  const L = LEVEL[r.level];
  const reduce = usePrefersReducedMotion();
  const target = r.score;
  const [shown, setShown] = useState(fresh && !reduce ? 0 : target ?? 0);
  const raf = useRef(0);

  useEffect(() => {
    if (target == null) return;
    if (!fresh || reduce) { setShown(target); return; }
    const t0 = performance.now(), dur = 900;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, fresh, reduce]);

  // Keyboard: 1/2/3 report on the visible result
  useEffect(() => {
    if (!canReport) return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA"))) return;
      const o = ({ "1": "del", "2": "rej", "3": "fake" } as Record<string, Outcome>)[e.key];
      if (o && !busy) onReport(o);
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [canReport, busy, onReport]);

  const fill = target == null ? 0 : Math.round(shown / 2);
  return (
    <article className={`result ${L.cls} ${fresh && !reduce ? "reveal" : ""}`} aria-live="polite">
      <div className="verdict">
        <div className="verdict-word" aria-label={L.word}>
          {L.word.split("").map((ch, i) => <span key={i} style={{ animationDelay: `${i * 45}ms` }}>{ch}</span>)}
        </div>
        <div className="verdict-line">{L.line}</div>
        <div className="verdict-num">{r.pretty}</div>
      </div>
      <div className="rbody">
        <div className="score-row">
          <div>
            <div className="score-big">{target == null ? "—" : shown}{target != null && <small>/100</small>}</div>
            <div className="score-label">Trust score</div>
          </div>
          <div className="meter">
            <div className="segs" role="img" aria-label={target == null ? "No score yet" : `Score ${target} of 100`}>
              {Array.from({ length: 50 }, (_, i) => <i key={i} className={i < fill ? "on" : ""} />)}
            </div>
            <div className="scale" aria-hidden="true">
              <span className="s0" style={{ left: 0 }}>0</span><span style={{ left: "45%" }}>45</span>
              <span style={{ left: "75%" }}>75</span><span className="s100" style={{ left: "100%" }}>100</span>
            </div>
          </div>
        </div>
        <div className="breakdown">
          <div className="b-del"><b>{r.del}</b><span>Delivered</span></div>
          <div className="b-rej"><b>{r.rej}</b><span>Rejected</span></div>
          <div className="b-fake"><b>{r.fake}</b><span>Fake</span></div>
        </div>
        <p className="advice"><strong>{L.advice[0]}</strong> {L.advice[1]}</p>
        <p className="sub">
          {r.sellers ? `Based on ${r.sellers} seller${r.sellers === 1 ? "" : "s"}.` : "No seller has reported this number."}
          {r.mobile ? "" : " This looks like a landline."}
        </p>
        <div className="field">
          <span className="lbl">After delivery, report the result</span>
          <OutcomeButtons onPick={onReport} disabled={!canReport || busy} shortcuts />
          {r.mine && <p className="hint">Your record for this number: {r.mine.del} delivered, {r.mine.rej} rejected, {r.mine.fake} fake.</p>}
          {!canReport && reportNote && <p className="hint">{reportNote}</p>}
        </div>
      </div>
    </article>
  );
}
