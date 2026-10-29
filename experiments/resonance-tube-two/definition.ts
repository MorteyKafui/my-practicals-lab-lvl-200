import type { FeedbackRule } from "@/core/feedback";

import { getCatalogueEntry } from "../catalogue";
import { createTubeWorld, fitsInTube, idealResonances, type TubeWorld } from "../resonance-tube/physics";
import { noTemperature, theta, TUBE_RULE, tubeDescribe, tubeLogLine, v0Result, vResult } from "../resonance-tube/shared";
import { transcriptionRule } from "../shared-rules";
import type { ExperimentDefinition } from "../types";

/** l₂ ≈ 3l₁ + 2e: a ratio far from about 3 means a resonance was missed or mis-recorded. */
const ratio: FeedbackRule = {
  id: "tube-ratio",
  stage: "observations",
  check: ({ completeRows }) => {
    const rows = completeRows.filter((r) => {
      const a = r.cells.l1?.si;
      const b = r.cells.l2?.si;
      return a !== undefined && b !== undefined && a > 0 && (b / a < 2.4 || b / a > 3.6);
    });
    return rows.length ? [{ rule: "tube-ratio", severity: "warning", stage: "observations", key: "tube.secondResonanceRatio", rows: rows.map((r) => r.id) }] : [];
  },
};

/** e = (l₂ − 3l₁)/2 must come out positive (and about 0.6 r). */
const negativeE: FeedbackRule = {
  id: "tube-negative-e",
  stage: "observations",
  check: ({ completeRows }) => {
    const rows = completeRows.filter((r) => {
      const a = r.cells.l1?.si;
      const b = r.cells.l2?.si;
      return a !== undefined && b !== undefined && (b - 3 * a) / 2 < 0;
    });
    return rows.length ? [{ rule: "tube-negative-e", severity: "warning", stage: "observations", key: "tube.negativeEndCorrection", rows: rows.map((r) => r.id) }] : [];
  },
};

export const resonanceTubeTwo: ExperimentDefinition<TubeWorld> = {
  entry: getCatalogueEntry("resonance-tube-two")!,
  constants: [theta],
  columns: [
    { id: "f", symbol: "f", kind: "frequency", units: ["Hz"], source: "given" },
    { id: "l1", symbol: "l₁", kind: "length", units: ["cm", "m", "mm"], source: "measured", instrument: TUBE_RULE },
    { id: "l2", symbol: "l₂", kind: "length", units: ["cm", "m", "mm"], source: "measured", instrument: TUBE_RULE },
    { id: "d", symbol: "l₂ − l₁", kind: "length", units: ["m", "cm"], source: "derived", derive: (r) => (r.l2 ?? 0) - (r.l1 ?? 0) },
    { id: "invF", symbol: "1/f", kind: "inverse-frequency", units: ["s", "ms"], source: "derived", derive: (r) => 1 / (r.f ?? 1) },
    { id: "e", symbol: "e", kind: "length", units: ["cm", "m"], source: "derived", derive: (r) => ((r.l2 ?? 0) - 3 * (r.l1 ?? 0)) / 2 },
  ],
  graph: { x: "invF", y: "d", throughOrigin: true, slope: { symbol: "k", unit: "m s⁻¹" }, intercept: { symbol: "c", unit: "m" } },
  results: [
    // l₂ − l₁ = λ/2 = v/(2f) → slope k = v/2
    vResult((k) => 2 * k),
    v0Result((k) => 2 * k),
    {
      id: "e",
      symbol: "e",
      unit: "m",
      fromFit: (_fit, { rows }) => {
        const values = rows.filter((r) => r.l1 !== undefined && r.l2 !== undefined).map((r) => (r.l2! - 3 * r.l1!) / 2);
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : Number.NaN;
      },
      accepted: (world) => world?.endCorrection,
      goodWithinPercent: 30,
    },
  ],
  createWorld: (seed, env) => createTubeWorld(seed, env, "resonance-tube-two"),
  idealRows: (world, conditions) =>
    idealResonances(world, conditions)
      .filter((r) => fitsInTube(r.l2))
      .map(({ f, l1, l2 }) => ({ f, l1, l2, d: l2 - l1, invF: 1 / f, e: (l2 - 3 * l1) / 2 })),
  reveal: (world) => [
    { label: "Internal radius of the tube", value: `${(world.radius * 100).toFixed(2)} cm` },
    { label: "End correction actually present", value: `${(world.endCorrection * 100).toFixed(2)} cm` },
    { label: "Thermometer zero error", value: `${world.thermometerError >= 0 ? "+" : ""}${world.thermometerError.toFixed(2)} °C` },
    ...world.forks.map((f) => ({ label: `Fork stamped ${f.nominal} Hz`, value: `${f.actual.toFixed(1)} Hz` })),
  ],
  rules: [noTemperature, ratio, negativeE, transcriptionRule(0, "l1")],
  describeAction: tubeDescribe,
  logLine: tubeLogLine,
  stepChecks: [
    ({ kinds }) => kinds.has("strike-fork"),
    ({ kinds }) => kinds.has("move-water"),
    ({ kinds }) => kinds.has("mark-resonance"),
    ({ rows }) => rows >= 1,
    ({ rows }) => rows >= 5,
  ],
};
