import { describe, expect, test } from "bun:test";

import { actualConditions, DEFAULT_ENVIRONMENT, speedOfSound } from "@/core/environment";

import { errorKeys, findingKeys, goldenSession, result } from "../test-helpers";
import type { ExperimentDefinition } from "../types";
import { helmholtz } from "./definition";
import { createWorld, idealReadings, neckArea, resonantFrequency } from "./model";

const SEED = 141421356;
const def = helmholtz as ExperimentDefinition;
const world = createWorld(SEED, DEFAULT_ENVIRONMENT);
const conditions = actualConditions(DEFAULT_ENVIRONMENT, SEED);
const theta = conditions.temperatureC.toFixed(1);

const rows = () =>
  idealReadings(world, conditions).map(({ water, f }) => {
    const fr = Math.round(f);
    return { water: (water * 1e6).toFixed(0), f: String(fr), invF2: (1 / fr ** 2).toPrecision(4) };
  });
const fu = () => String(Math.round(resonantFrequency(world, conditions, world.unknownWater)));
const session = (r = rows(), constants: Record<string, string> = { theta, fu: fu() }) => goldenSession(def, r, { seed: SEED, constants });

describe("Helmholtz model", () => {
  test("frequency follows f = (c/2π)√(A/(VL′))", () => {
    const c = speedOfSound(conditions.temperatureC);
    expect(resonantFrequency(world, conditions, 0)).toBeCloseTo((c / (2 * Math.PI)) * Math.sqrt(neckArea(world) / (world.v0 * world.effectiveLength)), 9);
  });
  test("frequencies are audible and rise as water is added", () => {
    const fs = idealReadings(world, conditions).map((r) => r.f);
    expect(fs[0]).toBeGreaterThan(100);
    expect(fs.at(-1)).toBeLessThan(900);
    expect(fs.every((f, i) => i === 0 || f > fs[i - 1]!)).toBe(true);
  });
});

describe("Helmholtz golden datasets", () => {
  test("a careful run: no errors; V₀ within 4 %, unknown within 8 %", () => {
    expect(errorKeys(def, session())).toEqual([]);
    const v0 = result(def, session(), "v0");
    expect(Math.abs(v0.value! - v0.accepted!) / v0.accepted!).toBeLessThan(0.04);
    const unknown = result(def, session(), "unknown");
    expect(Math.abs(unknown.value! - unknown.accepted!) / unknown.accepted!).toBeLessThan(0.08);
    const neck = result(def, session(), "neck");
    expect(Math.abs(neck.value! - neck.accepted!) / neck.accepted!).toBeLessThan(0.06);
  });
  test("a misread frequency that falls as water is added", () => {
    const r = rows();
    const f = Number(r[2]!.f) - 5;
    r[4] = { ...r[4]!, f: String(f), invF2: (1 / f ** 2).toPrecision(4) };
    expect(findingKeys(def, session(r))).toContain("helmholtz.frequencyFalls");
  });
  test("calibration not used for the unknown", () => {
    expect(findingKeys(def, session(rows(), { theta }))).toContain("helmholtz.noUnknown");
  });
});
