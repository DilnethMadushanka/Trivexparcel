"use client";
import { useCallback, useState } from "react";
import { api } from "./api";
import { useAuth, useToast } from "@/components/Providers";
import { masked, OUTCOME_LABEL, type Outcome } from "../logic";
import type { CheckResult } from "../types";

/** Report an outcome with an Undo toast. `after` gets the updated result after the save and after an undo. */
export function useReport() {
  const toast = useToast();
  const { me } = useAuth();
  const [busy, setBusy] = useState(false);
  const canReport = !!me && me.status !== "blocked";
  const note = !me ? "Sign in to report." : me.status === "blocked" ? "Your account is blocked by an admin, so you can't report." : "";

  const report = useCallback(async (number: string, outcome: Outcome, after?: (r: CheckResult | null) => Promise<void> | void) => {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await api<{ id: string; prev: unknown; result: CheckResult }>("/api/report", { body: { number, outcome } });
      toast.show(`Reported ${masked(number)} as ${OUTCOME_LABEL[outcome].toLowerCase()}`, async () => {
        const u = await api<{ result: CheckResult | null }>("/api/report/undo", { body: { id: res.id, prev: res.prev, number } });
        if (after) await after(u.result);
      });
      if (after) await after(res.result);
      return true;
    } catch (e) {
      toast.show((e as Error).message);
      return false;
    } finally { setBusy(false); }
  }, [busy, toast]);

  return { report, busy, canReport, note };
}
