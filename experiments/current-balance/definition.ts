import type { FeedbackRule } from "@/core/feedback";
import type { InstrumentSpec } from "@/core/instruments";

import { getCatalogueEntry } from "../catalogue";
import type { ExperimentDefinition } from "../types";
import { createWorld, idealReadings, POLE_WIDTH_CM, type CurrentBalanceWorld } from "./model";

const G_STANDARD = 9.81;
export const BALANCE: InstrumentSpec = { id: "top-pan-balance", resolution: 0.01, unit: "g", noise: 0.005 };
export const AMMETER: InstrumentSpec = { id: "ammeter", resolution: 0.01, unit: "A" };

const noZeroReading: FeedbackRule = {
  id: "balance-m0",
  stage: "observations",
  check: ({ session }) =>
    session.constants.m0?.trim() ? [] : [{ rule: "balance-m0", severity: "error", stage: "observations", key: "balance.noZeroReading" }],
};

/** Some readings with the current reversed, some forward: the forces then have both signs. */
const mixedDirections: FeedbackRule = {
  id: "balance-mixed",
  stage: "observations",
  check: ({ completeRows, constants }) => {
    if (constants.m0 === undefined) return [];
    const below = completeRows.filter((r) => (r.cells.m?.si ?? 0) < constants.m0!);
    const above = completeRows.filter((r) => (r.cells.m?.si ?? 0) > constants.m0!);
    return below.length && above.length
      ? [{ rule: "balance-mixed", severity: "warning", stage: "observations", key: "balance.mixedDirections", rows: below.map((r) => r.id) }]
      : [];
  },
};

/** Δm in kg written as the force (forgot × g). */
const massNotForce: FeedbackRule = {
  id: "balance-force",
  stage: "observations",
  check: ({ completeRows, constants }) => {
    if (constants.m0 === undefined) return [];
    const rows = completeRows.filter((r) => {
      const F = r.cells.F?.si;
      const m = r.cells.m?.si;
      return F !== undefined && m !== undefined && Math.abs(m - constants.m0!) > 1e-6 && Math.abs(F - (m - constants.m0!)) < Math.abs(m - constants.m0!) * 0.02;
    });
    return rows.length ? [{ rule: "balance-force", severity: "error", stage: "observations", key: "balance.massNotForce", rows: rows.map((r) => r.id), column: "F" }] : [];
  },
};

const taredWithCurrent: FeedbackRule = {
  id: "balance-tare",
  stage: "measure",
  check: ({ actions }) =>
    actions.some((a) => a.kind === "tare" && a.detail?.currentOn === true)
      ? [{ rule: "balance-tare", severity: "error", stage: "measure", key: "balance.taredWithCurrent" }]
      : [],
};

const neverReversed: FeedbackRule = {
  id: "balance-reverse",
  stage: "measure",
  check: ({ actions, session }) =>
    session.mode === "perform" && actions.length > 0 && !actions.some((a) => a.kind === "reverse")
      ? [{ rule: "balance-reverse", severity: "tip", stage: "measure", key: "balance.neverReversed" }]
      : [],
};

export const currentBalance: ExperimentDefinition<CurrentBalanceWorld> = {
  entry: getCatalogueEntry("current-balance")!,
  constants: [
    { id: "m0", symbol: "m₀ (I = 0)", kind: "mass", units: ["g", "kg"] },
    { id: "L", symbol: "L", kind: "length", units: ["cm", "m"] },
  ],
  columns: [
    { id: "I", symbol: "I", kind: "current", units: ["A"], source: "measured", instrument: AMMETER },
    { id: "m", symbol: "m", kind: "mass", units: ["g", "kg"], source: "measured", instrument: BALANCE },
    { id: "F", symbol: "F", kind: "force", units: ["mN", "N"], source: "derived", derive: (r, c) => ((r.m ?? 0) - (c.m0 ?? Number.NaN)) * G_STANDARD },
  ],
  graph: { x: "I", y: "F", throughOrigin: true, slope: { symbol: "k", unit: "mN A⁻¹" }, intercept: { symbol: "c", unit: "mN" } },
  results: [
    {
      id: "B",
      symbol: "B",
      unit: "T",
      // F = B I L → slope k = B L
      fromFit: ({ slope }, { constants }) => (constants.L ? slope / constants.L : Number.NaN),
      accepted: (world) => world?.b,
      goodWithinPercent: 8,
    },
  ],
  createWorld,
  idealRows: (world, conditions) =>
    idealReadings(world, conditions).map(({ I, m }) => ({ I, m: m / 1000, F: ((m - world.m0) / 1000) * G_STANDARD })),
  reveal: (world) => [
    { label: "Flux density between the poles", value: `${world.b.toFixed(4)} T` },
    { label: "Effective length in the field (with fringing)", value: `${(world.effectiveLength * 100).toFixed(2)} cm (poles ${POLE_WIDTH_CM.toFixed(1)} cm)` },
    { label: "Ammeter calibration error", value: `${(world.ammeterError * 100).toFixed(1)} %` },
  ],
  rules: [noZeroReading, mixedDirections, massNotForce, taredWithCurrent, neverReversed],
  describeAction: ({ kind, detail: d }) => {
    switch (kind) {
      case "tare":
        return d?.currentOn ? undefined : "With no current flowing, the balance carrying the magnets was zeroed (tared).";
      case "power":
        return d?.on ? "The current through the rod was switched on and set with the rheostat, read on the ammeter." : undefined;
      case "set-current":
        return "For each current the new balance reading was recorded.";
      case "reverse":
        return "The current was reversed and the change in the balance reading was observed, to check the direction of the force (Fleming's left-hand rule).";
      default:
        return undefined;
    }
  },
  logLine: ({ kind, detail: d }) => {
    switch (kind) {
      case "power":
        return d?.on ? "Supply on" : "Supply off";
      case "set-current":
        return "Current adjusted";
      case "reverse":
        return d?.reversed ? "Current reversed" : "Current forward";
      case "tare":
        return "Balance read with no current";
      case "record":
        return `Recorded ${d?.column} = ${d?.typed}`;
      default:
        return kind;
    }
  },
  stepChecks: [
    ({ kinds }) => kinds.has("tare"),
    ({ kinds }) => kinds.has("power"),
    ({ kinds }) => kinds.has("set-current"),
    ({ rows }) => rows >= 6,
    ({ kinds }) => kinds.has("reverse"),
  ],
};
