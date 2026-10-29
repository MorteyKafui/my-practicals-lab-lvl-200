import { describe, expect, test } from "bun:test";

import { actualConditions, DEFAULT_ENVIRONMENT, MU_0 } from "@/core/environment";

import { errorKeys, findingKeys, goldenSession, result } from "../test-helpers";
import type { ExperimentDefinition } from "../types";
import { slinky } from "./definition";
import { background, createWorld, fieldAtCentre, probeReading } from "./model";

const SEED = 173205080;
const def = slinky as ExperimentDefinition;
const world = createWorld(SEED, DEFAULT_ENVIRONMENT);
const conditions = actualConditions(DEFAULT_ENVIRONMENT, SEED);
const I = 2.0;

// Lengths of 60 cm and more: long compared with the diameter, as a careful student chooses.
const rows = (zeroed = true) =>
  [60, 70, 80, 90, 100, 120, 140].map((cm) => {
    const B = probeReading(world, conditions, cm / 100, I, zeroed ? background(world, conditions) : 0);
    return { L: cm.toFixed(1), B: (B * 1000).toFixed(3), nL: (world.turns / (cm / 100)).toFixed(1) };
  });
const session = (r = rows()) => goldenSession(def, r, { seed: SEED, constants: { N: String(world.turns), I: I.toFixed(2) } });

describe("slinky model", () => {
  test("long slinky tends to μ₀NI/L; short one falls below", () => {
    expect(fieldAtCentre(world, 10, I) * 10).toBeCloseTo(MU_0 * world.turns * I, 6);
    expect(fieldAtCentre(world, 0.2, I)).toBeLessThan((MU_0 * world.turns * I) / 0.2);
  });
  test("zeroing with the current off removes the background exactly", () => {
    expect(probeReading(world, conditions, 1, 0, background(world, conditions))).toBeCloseTo(0, 12);
  });
});

describe("slinky golden datasets", () => {
  test("a careful run: no errors, μ₀ within 5 %", () => {
    expect(errorKeys(def, session())).toEqual([]);
    const mu = result(def, session(), "mu0");
    expect(Math.abs(mu.value! - MU_0) / MU_0).toBeLessThan(0.05);
  });
  test("teslameter zeroed with the current on", () => {
    const s = session();
    s.actions = [{ t: 1, kind: "zero-probe", detail: { currentOn: true } }];
    expect(errorKeys(def, s)).toContain("slinky.zeroedWithCurrent");
  });
  test("never zeroed before recording", () => {
    const s = session(rows(false));
    s.actions = [{ t: 1, kind: "record", detail: { column: "B", typed: "0.4" } }];
    expect(findingKeys(def, s)).toContain("slinky.notZeroed");
  });
  test("current changed between readings", () => {
    const s = session();
    s.actions = [
      { t: 1, kind: "record", detail: { column: "L", typed: "60.0" } },
      { t: 2, kind: "set-current", detail: { a: 2.5 } },
    ];
    expect(findingKeys(def, s)).toContain("slinky.currentChanged");
  });
  test("N/L worked out with L in cm", () => {
    const r = rows().map((row) => ({ ...row, nL: (world.turns / Number(row.L)).toFixed(3) }));
    expect(errorKeys(def, session(r))).toContain("table.derivedArithmetic");
  });
});
