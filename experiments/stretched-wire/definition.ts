import type { FeedbackRule, Finding } from "@/core/feedback";
import { METRE_RULE } from "@/core/instruments";

import { getCatalogueEntry } from "../catalogue";
import { approachesRule, transcriptionRule } from "../shared-rules";
import type { ExperimentDefinition } from "../types";
import { createWorld, FIXED_BRIDGE_CM, idealReadings, type StretchedWireWorld } from "./model";

/** Load used for the ideal (Compare) run when the student's own load can't be read. */
const DEFAULT_LOAD_KG = 4.0;

/** Rows where f·l is about double (or half) the others: a second harmonic or a misplaced rider. */
const harmonicSlip: FeedbackRule = {
  id: "stretched-harmonic",
  stage: "observations",
  check: ({ completeRows }) => {
    const products = completeRows
      .map((r) => {
        const f = r.cells.f?.si;
        const l = r.cells.l?.si ?? avg(r.cells.l1?.si, r.cells.l2?.si);
        return f && l ? { id: r.id, k: f * l } : undefined;
      })
      .filter((x): x is { id: string; k: number } => x !== undefined);
    if (products.length < 4) return [];
    const sorted = products.map((p) => p.k).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    const findings: Finding[] = [];
    for (const p of products) {
      const ratio = p.k / median;
      if (Math.abs(ratio - 2) < 0.15)
        findings.push({ rule: "stretched-harmonic", severity: "warning", stage: "observations", key: "stretched.secondHarmonic", rows: [p.id] });
      else if (Math.abs(ratio - 0.5) < 0.08)
        findings.push({ rule: "stretched-harmonic", severity: "warning", stage: "observations", key: "stretched.halfLength", rows: [p.id] });
    }
    return findings;
  },
};

/** 1/l worked out with l still in centimetres: 0.0224 instead of 2.24 m⁻¹. */
const inverseInCm: FeedbackRule = {
  id: "stretched-inverse-cm",
  stage: "observations",
  check: ({ completeRows }) => {
    const rows = completeRows.filter((r) => {
      const typed = r.cells.invL?.si;
      const l = r.cells.l?.si;
      return typed !== undefined && l !== undefined && Math.abs(typed * 100 * l - 1) < 0.02;
    });
    return rows.length
      ? [{ rule: "stretched-inverse-cm", severity: "error", stage: "observations", key: "stretched.inverseInCm", rows: rows.map((r) => r.id), column: "invL" }]
      : [];
  },
};

/** Perform mode: forks struck on the bench instead of the rubber pad. */
const struckOnBench: FeedbackRule = {
  id: "stretched-struck-bench",
  stage: "measure",
  check: ({ actions }) => {
    const n = actions.filter((a) => a.kind === "strike-fork" && a.detail?.surface === "bench").length;
    return n ? [{ rule: "stretched-struck-bench", severity: "warning", stage: "measure", key: "stretched.struckOnBench", params: { n } }] : [];
  },
};

function avg(a?: number, b?: number) {
  return a !== undefined && b !== undefined ? (a + b) / 2 : (a ?? b);
}

export const stretchedWire: ExperimentDefinition<StretchedWireWorld> = {
  entry: getCatalogueEntry("stretched-wire")!,
  constants: [{ id: "load", symbol: "M", kind: "mass", units: ["kg", "g"] }],
  columns: [
    { id: "f", symbol: "f", kind: "frequency", units: ["Hz"], source: "given" },
    { id: "l1", symbol: "l₁", kind: "length", units: ["cm", "m", "mm"], source: "measured", instrument: METRE_RULE },
    { id: "l2", symbol: "l₂", kind: "length", units: ["cm", "m", "mm"], source: "measured", instrument: METRE_RULE },
    { id: "l", symbol: "l", kind: "length", units: ["cm", "m"], source: "derived", derive: (r) => ((r.l1 ?? 0) + (r.l2 ?? 0)) / 2 },
    { id: "invL", symbol: "1/l", kind: "inverse-length", units: ["m⁻¹"], source: "derived", derive: (r) => 2 / ((r.l1 ?? 0) + (r.l2 ?? 0)) },
  ],
  graph: {
    x: "invL",
    y: "f",
    throughOrigin: true,
    slope: { symbol: "k", unit: "Hz m" },
    intercept: { symbol: "c", unit: "Hz" },
  },
  results: [
    {
      id: "mu",
      symbol: "μ",
      unit: "kg m⁻¹",
      // f = (1/2l)√(T/μ) → slope k = ½√(T/μ) → μ = T / 4k²
      fromFit: ({ slope }, { conditions, constants }) => ((constants.load ?? DEFAULT_LOAD_KG) * conditions.g) / (4 * slope * slope),
      accepted: (world) => world?.mu,
      goodWithinPercent: 5,
    },
    {
      id: "c",
      symbol: "v",
      unit: "m s⁻¹",
      fromFit: ({ slope }) => 2 * slope,
      accepted: () => undefined,
      goodWithinPercent: 3,
    },
  ],
  createWorld,
  idealRows: (world, conditions, constants) =>
    idealReadings(world, constants.load ?? DEFAULT_LOAD_KG, conditions).map(({ f, l }) => ({ f, l1: l, l2: l, l, invL: 1 / l })),
  reveal: (world) => [
    { label: "Mass per unit length of this wire, μ", value: `${(world.mu * 1000).toFixed(3)} g m⁻¹` },
    ...world.forks.map((f) => ({ label: `Fork stamped ${f.nominal} Hz`, value: `${f.actual.toFixed(1)} Hz` })),
    { label: "Tension lost to pulley friction", value: `${(world.pulleyLoss * 100).toFixed(1)} %` },
  ],
  rules: [harmonicSlip, inverseInCm, approachesRule("l1", "l2"), struckOnBench, transcriptionRule(FIXED_BRIDGE_CM)],
  describeAction: (action) => {
    const d = action.detail ?? {};
    switch (action.kind) {
      case "set-load":
        return `A load of ${d.kg} kg was hung from the end of the wire passing over the pulley.`;
      case "place-rider":
        return "A small paper rider was placed at the middle of the wire between the bridges.";
      case "strike-fork":
        return d.surface === "pad"
          ? `A tuning fork of frequency ${d.f} Hz was struck on a rubber pad and its stem was pressed on the sonometer box.`
          : `A tuning fork of frequency ${d.f} Hz was struck and its stem was pressed on the sonometer box.`;
      case "rider-thrown":
        return "The movable bridge was adjusted until the paper rider was thrown off, and the vibrating length was read from the metre rule.";
      default:
        return undefined;
    }
  },
  logLine: ({ kind, detail: d }) => {
    switch (kind) {
      case "set-load":
        return `Load set to ${d?.kg} kg`;
      case "place-rider":
        return "Rider placed at the middle of the wire";
      case "move-bridge":
        return `Bridge moved to ${Number(d?.to).toFixed(1)} cm`;
      case "strike-fork":
        return `${d?.f} Hz fork struck on the ${d?.surface === "pad" ? "rubber pad" : "bench"}`;
      case "rider-thrown":
        return `Rider thrown off (fork ${d?.f} Hz)`;
      case "view":
        return d?.mode === "eye" ? "Eye-level view of the scale" : "Bench view";
      default:
        return kind;
    }
  },
  stepChecks: [
    ({ kinds }) => kinds.has("set-load"),
    ({ kinds }) => kinds.has("place-rider"),
    ({ kinds }) => kinds.has("move-bridge"),
    ({ kinds }) => kinds.has("strike-fork"),
    ({ kinds }) => kinds.has("rider-thrown"),
    ({ rows }) => rows >= 1,
    ({ rows }) => rows >= 5,
  ],
};
