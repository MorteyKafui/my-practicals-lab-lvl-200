import { describe, expect, test } from "bun:test";

import { DEFAULT_ENVIRONMENT, MU_0 } from "@/core/environment";
import { quantise } from "@/core/instruments";

import { errorKeys, findingKeys, goldenSession, result } from "../test-helpers";
import type { ExperimentDefinition } from "../types";
import { faraday } from "./definition";
import { coilArea, COIL_TURNS, createWorld, idealReadings, LABEL_TURNS_PER_M, peakCurrent, peakEmf } from "./model";

const SEED = 314271828;
const def = faraday as ExperimentDefinition;
const world = createWorld(SEED, DEFAULT_ENVIRONMENT);
const IRMS = 0.1;

const rows = (irms: (row: number) => number = () => IRMS) =>
  idealReadings(world, IRMS).map(({ f, s, e0 }, i) => {
    const y = quantise((2 * e0) / s, 0.1);
    return { f: String(f), I: (irms(i) * 1000).toFixed(0), Y: y.toFixed(1), S: String(s * 1000), e0: ((y * s * 1000) / 2).toFixed(2) };
  });
const constants = { N: String(COIL_TURNS), n: String(LABEL_TURNS_PER_M), d: (world.coilDiameter * 100).toFixed(2) };
const session = (r = rows()) => goldenSession(def, r, { seed: SEED, constants });

describe("Faraday model", () => {
  test("ε₀ = N μ₀ n A ω I₀", () => {
    expect(peakEmf(world, 0.1, 1000)).toBeCloseTo(COIL_TURNS * MU_0 * world.n * coilArea(world) * 2 * Math.PI * 1000 * 0.1, 12);
  });
  test("the inductance makes the current fall as frequency rises", () => {
    expect(peakCurrent(world, 2, 3000)).toBeLessThan(peakCurrent(world, 2, 100));
  });
  test("every ideal trace fits on the 8-division screen", () => {
    expect(idealReadings(world, IRMS).every((r) => r.y <= 8 && r.y >= 2)).toBe(true);
  });
});

describe("Faraday golden datasets", () => {
  test("a careful run: no errors; μ₀ within 6 % (the solenoid's label n is within 1.5 %)", () => {
    expect(errorKeys(def, session())).toEqual([]);
    const mu = result(def, session(), "mu0");
    expect(Math.abs(mu.value! - MU_0) / MU_0).toBeLessThan(0.06);
  });
  test("current left to fall as the frequency rises", () => {
    expect(findingKeys(def, session(rows((i) => IRMS * (1 - i * 0.02))))).toContain("faraday.currentVaries");
  });
  test("peak-to-peak value used as ε₀", () => {
    const r = rows().map((row) => ({ ...row, e0: (Number(row.Y) * Number(row.S)).toFixed(2) }));
    expect(errorKeys(def, session(r))).toContain("faraday.peakToPeak");
  });
  test("a trace taller than the screen", () => {
    const r = rows();
    r[2] = { ...r[2]!, Y: "9.4" };
    expect(errorKeys(def, session(r))).toContain("faraday.offScreen");
  });
});
