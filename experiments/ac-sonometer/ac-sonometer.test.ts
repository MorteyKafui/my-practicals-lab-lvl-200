import { describe, expect, test } from "bun:test";

import { actualConditions, DEFAULT_ENVIRONMENT } from "@/core/environment";
import { quantise } from "@/core/instruments";

import { errorKeys, findingKeys, goldenSession, result } from "../test-helpers";
import type { ExperimentDefinition } from "../types";
import { acSonometer } from "./definition";
import { createWorld, excitation, idealReadings, resonantLength, tension } from "./model";

const SEED = 271828182;
const def = acSonometer as ExperimentDefinition;
const world = createWorld(SEED, DEFAULT_ENVIRONMENT);
const conditions = actualConditions(DEFAULT_ENVIRONMENT, SEED);

function rows() {
  return idealReadings(world, conditions).map(({ kg, l }) => {
    const l1 = quantise(l * 100 - 0.1, 0.1);
    const l2 = quantise(l * 100 + 0.1, 0.1);
    const mean = (l1 + l2) / 2;
    return { M: kg.toFixed(2), T: (kg * 9.81).toFixed(2), l1: l1.toFixed(1), l2: l2.toFixed(1), l: mean.toFixed(2), lsq: ((mean / 100) ** 2).toFixed(4) };
  });
}
const session = (r = rows()) => goldenSession(def, r, { seed: SEED, constants: { mu: (world.muLabel * 1000).toFixed(2) }, constantUnits: { mu: "g m⁻¹" } });

describe("AC sonometer model", () => {
  test("resonant length satisfies f = (1/2l)√(T/μ) at the mains frequency", () => {
    const T = tension(world, 1.5, conditions);
    const l = resonantLength(world, T, conditions.mainsHz);
    expect(Math.sqrt(T / world.mu) / (2 * l)).toBeCloseTo(conditions.mainsHz, 9);
  });

  test("a magnet at the middle drives the fundamental; at a node of it, it cannot", () => {
    const T = tension(world, 1.5, conditions);
    const l = resonantLength(world, T, conditions.mainsHz);
    expect(excitation(world, T, l, conditions.mainsHz, 0.5, 0.5)).toBeGreaterThan(1);
    expect(excitation(world, T, l, conditions.mainsHz, 0.02, 0.5)).toBeLessThan(1);
  });

  test("at least five loads fit on the sonometer", () => {
    expect(idealReadings(world, conditions).length).toBeGreaterThanOrEqual(5);
  });
});

describe("AC sonometer golden datasets", () => {
  test("a careful run has no errors and finds the mains frequency within 3 %", () => {
    expect(errorKeys(def, session())).toEqual([]);
    const f = result(def, session(), "f");
    expect(Math.abs(f.value! - conditions.mainsHz) / conditions.mainsHz).toBeLessThan(0.03);
    expect(f.accepted).toBeCloseTo(conditions.mainsHz, 6);
  });

  test("mass recorded where the tension should be", () => {
    const r = rows().map((row) => ({ ...row, T: row.M }));
    expect(errorKeys(def, session(r))).toContain("ac.massNotTension");
  });

  test("l² worked out in cm²", () => {
    const r = rows().map((row) => ({ ...row, lsq: (Number(row.l) ** 2).toFixed(1) }));
    expect(findingKeys(def, session(r))).toContain("table.derivedArithmetic");
  });

  test("magnet off-centre at resonance is caught from the log", () => {
    const s = session();
    s.actions = [{ t: 1, kind: "rider-thrown", detail: { magnetFraction: 0.12, bridgeCm: 60 } }];
    expect(findingKeys(def, s)).toContain("ac.magnetOffCentre");
  });
});
