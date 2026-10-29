import type { FeedbackRule, Finding } from "@/core/feedback";
import { classifySlip } from "@/core/instruments";

/** Feedback rules shared by practicals that find a resonance length twice (from short and from long). */

/** l₁ and l₂ for the same row should agree within `toleranceM`; identical everywhere suggests one approach only. */
export function approachesRule(a: string, b: string, toleranceM = 0.008): FeedbackRule {
  return {
    id: "two-approaches",
    stage: "observations",
    check: ({ completeRows }) => {
      const rows = completeRows.filter((r) => {
        const x = r.cells[a]?.si;
        const y = r.cells[b]?.si;
        return x !== undefined && y !== undefined && Math.abs(x - y) > toleranceM;
      });
      if (rows.length) return [{ rule: "two-approaches", severity: "warning", stage: "observations", key: "stretched.approachesDisagree", rows: rows.map((r) => r.id) }];
      const identical = completeRows.length >= 3 && completeRows.every((r) => r.cells[a]?.raw && r.cells[a].raw === r.cells[b]?.raw);
      return identical ? [{ rule: "two-approaches", severity: "tip", stage: "observations", key: "stretched.approachesIdentical" }] : [];
    },
  };
}

/**
 * Perform mode: readings typed on the bench are logged with the scale position of the movable
 * bridge at the last resonance. Catch the scale reading recorded instead of the length, and
 * swapped digits. `originCm` is where the length is measured from (the fixed bridge).
 */
export function transcriptionRule(originCm: number, column = "l1"): FeedbackRule {
  return {
    id: "transcription",
    stage: "measure",
    check: ({ actions, session }) => {
      const findings: Finding[] = [];
      const unit = session.units[column] ?? "cm";
      const toCm = unit === "m" ? 100 : unit === "mm" ? 0.1 : 1;
      let scaleReadings = 0;
      let transposed = 0;
      for (const a of actions) {
        if (a.kind !== "record") continue;
        const scale = Number(a.detail?.lastThrownCm);
        const typed = Number(a.detail?.typed) * toCm;
        if (!(scale > 0) || !Number.isFinite(typed)) continue;
        const length = scale - originCm;
        if (Math.abs(typed - scale) <= 0.25 && Math.abs(typed - length) > 1) scaleReadings++;
        else if (classifySlip(typed, Math.round(length * 10) / 10, 0.1).kind === "transposed-digits") transposed++;
      }
      if (scaleReadings)
        findings.push({ rule: "transcription", severity: "error", stage: "measure", key: "stretched.scaleNotLength", params: { n: scaleReadings, fixed: originCm.toFixed(1) } });
      if (transposed) findings.push({ rule: "transcription", severity: "warning", stage: "measure", key: "stretched.transposed", params: { n: transposed } });
      return findings;
    },
  };
}
