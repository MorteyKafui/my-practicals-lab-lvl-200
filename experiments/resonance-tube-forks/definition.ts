import type { FeedbackRule } from "@/core/feedback";

import { getCatalogueEntry } from "../catalogue";
import { createTubeWorld, fitsInTube, idealResonances, type TubeWorld } from "../resonance-tube/physics";
import { noTemperature, theta, TUBE_RULE, tubeDescribe, tubeLogLine, v0Result, vResult } from "../resonance-tube/shared";
import { approachesRule, transcriptionRule } from "../shared-rules";
import type { ExperimentDefinition } from "../types";

/** l = v/(4f) − e: the intercept on the l-axis is −e, so it must come out negative. */
const interceptSign: FeedbackRule = {
  id: "tube-intercept",
  stage: "calculate",
  check: ({ studentLine }) =>
    studentLine && studentLine.intercept > 0
      ? [{ rule: "tube-intercept", severity: "warning", stage: "calculate", key: "tube.positiveIntercept" }]
      : [],
};

/** A length about 3× the trend is the second resonance recorded instead of the first. */
const secondResonance: FeedbackRule = {
  id: "tube-second",
  stage: "observations",
  check: ({ completeRows }) => {
    const k = completeRows
      .map((r) => ({ id: r.id, k: (r.cells.f?.si ?? 0) * avg(r.cells.la?.si, r.cells.lb?.si) }))
      .filter((x) => x.k > 0);
    if (k.length < 4) return [];
    const median = [...k].sort((a, b) => a.k - b.k)[Math.floor(k.length / 2)]!.k;
    const rows = k.filter((x) => x.k / median > 2.4).map((x) => x.id);
    return rows.length ? [{ rule: "tube-second", severity: "warning", stage: "observations", key: "tube.secondNotFirst", rows }] : [];
  },
};

function avg(a?: number, b?: number) {
  return a !== undefined && b !== undefined ? (a + b) / 2 : (a ?? b ?? 0);
}

export const resonanceTubeForks: ExperimentDefinition<TubeWorld> = {
  entry: getCatalogueEntry("resonance-tube-forks")!,
  constants: [theta],
  columns: [
    { id: "f", symbol: "f", kind: "frequency", units: ["Hz"], source: "given" },
    { id: "la", symbol: "l (rising)", kind: "length", units: ["cm", "m", "mm"], source: "measured", instrument: TUBE_RULE },
    { id: "lb", symbol: "l (falling)", kind: "length", units: ["cm", "m", "mm"], source: "measured", instrument: TUBE_RULE },
    { id: "l", symbol: "l", kind: "length", units: ["m", "cm"], source: "derived", derive: (r) => ((r.la ?? 0) + (r.lb ?? 0)) / 2 },
    { id: "invF", symbol: "1/f", kind: "inverse-frequency", units: ["s", "ms"], source: "derived", derive: (r) => 1 / (r.f ?? 1) },
  ],
  graph: { x: "invF", y: "l", throughOrigin: false, slope: { symbol: "k", unit: "m s⁻¹" }, intercept: { symbol: "c", unit: "m" } },
  results: [
    // l = v/(4f) − e → slope k = v/4, intercept c = −e
    vResult((k) => 4 * k),
    v0Result((k) => 4 * k),
    { id: "e", symbol: "e", unit: "m", fromFit: ({ intercept }) => -intercept, accepted: (world) => world?.endCorrection, goodWithinPercent: 30 },
  ],
  createWorld: (seed, env) => createTubeWorld(seed, env, "resonance-tube-forks"),
  idealRows: (world, conditions) =>
    idealResonances(world, conditions)
      .filter((r) => fitsInTube(r.l1))
      .map(({ f, l1 }) => ({ f, la: l1, lb: l1, l: l1, invF: 1 / f })),
  reveal: (world) => [
    { label: "Internal radius of the tube", value: `${(world.radius * 100).toFixed(2)} cm` },
    { label: "End correction actually present", value: `${(world.endCorrection * 100).toFixed(2)} cm` },
    { label: "Thermometer zero error", value: `${world.thermometerError >= 0 ? "+" : ""}${world.thermometerError.toFixed(2)} °C` },
    ...world.forks.map((f) => ({ label: `Fork stamped ${f.nominal} Hz`, value: `${f.actual.toFixed(1)} Hz` })),
  ],
  rules: [noTemperature, approachesRule("la", "lb", 0.01), secondResonance, interceptSign, transcriptionRule(0, "la")],
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
