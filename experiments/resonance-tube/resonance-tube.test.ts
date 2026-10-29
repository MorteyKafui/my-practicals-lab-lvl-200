import { describe, expect, test } from "bun:test";

import { actualConditions, DEFAULT_ENVIRONMENT, speedOfSound } from "@/core/environment";
import { quantise } from "@/core/instruments";

import { resonanceTubeForks } from "../resonance-tube-forks/definition";
import { resonanceTubeTwo } from "../resonance-tube-two/definition";
import { errorKeys, findingKeys, goldenSession, result } from "../test-helpers";
import type { ExperimentDefinition } from "../types";
import { createTubeWorld, fitsInTube, idealResonances, loudness, resonanceLength } from "./physics";

const SEED = 161803398;
const conditions = actualConditions(DEFAULT_ENVIRONMENT, SEED);
const theta = (conditions.temperatureC).toFixed(1);
const cm = (m: number) => quantise(m * 100, 0.1);

describe("resonance tube physics", () => {
  const world = createTubeWorld(SEED, DEFAULT_ENVIRONMENT, "resonance-tube-two");
  test("first and second resonances are λ/2 apart", () => {
    const l1 = resonanceLength(world, conditions, 400, 1);
    const l2 = resonanceLength(world, conditions, 400, 2);
    expect(l2 - l1).toBeCloseTo(speedOfSound(conditions.temperatureC) / (2 * 400), 9);
  });
  test("loudness peaks at resonance and is broad", () => {
    const l1 = resonanceLength(world, conditions, 400, 1);
    expect(loudness(world, conditions, l1, 400, 1)).toBeCloseTo(1, 1);
    expect(loudness(world, conditions, l1 + 0.005, 400, 1)).toBeGreaterThan(0.3);
    expect(loudness(world, conditions, l1 + 0.06, 400, 1)).toBeLessThan(0.2);
  });
});

describe("two resonance positions (practical 2)", () => {
  const def = resonanceTubeTwo as ExperimentDefinition;
  const world = createTubeWorld(SEED, DEFAULT_ENVIRONMENT, "resonance-tube-two");
  const rows = () =>
    idealResonances(world, conditions)
      .filter((r) => fitsInTube(r.l2))
      .map(({ f, l1, l2 }) => {
        const a = cm(l1);
        const b = cm(l2);
        return { f: String(f), l1: a.toFixed(1), l2: b.toFixed(1), d: ((b - a) / 100).toFixed(4), invF: (1 / f).toFixed(5), e: ((b - 3 * a) / 2).toFixed(2) };
      });
  const session = (r = rows(), constants: Record<string, string> = { theta }) => goldenSession(def, r, { seed: SEED, constants });

  test("a careful run: no errors, v within 3 %, v₀ near 331.3, e near 0.6r", () => {
    expect(rows().length).toBeGreaterThanOrEqual(5);
    expect(errorKeys(def, session())).toEqual([]);
    const v = result(def, session(), "v");
    expect(Math.abs(v.value! - v.accepted!) / v.accepted!).toBeLessThan(0.03);
    expect(Math.abs(result(def, session(), "v0").value! - 331.3)).toBeLessThan(10);
    const e = result(def, session(), "e");
    expect(Math.abs(e.value! - world.endCorrection)).toBeLessThan(0.004);
  });

  test("no temperature recorded", () => {
    expect(findingKeys(def, session(rows(), {}))).toContain("tube.noTemperature");
  });

  test("first resonance recorded twice", () => {
    const r = rows().map((row, i) => (i === 1 ? { ...row, l2: row.l1 } : row));
    expect(findingKeys(def, session(r))).toContain("tube.secondResonanceRatio");
  });

  test("1/f worked out in ms in a column of seconds", () => {
    const r = rows().map((row) => ({ ...row, invF: (1000 / Number(row.f)).toFixed(3) }));
    expect(findingKeys(def, session(r))).toContain("table.derivedArithmetic");
  });
});

describe("several forks, first resonance (practical 3)", () => {
  const def = resonanceTubeForks as ExperimentDefinition;
  const world = createTubeWorld(SEED, DEFAULT_ENVIRONMENT, "resonance-tube-forks");
  const rows = () =>
    idealResonances(world, conditions).map(({ f, l1 }) => {
      const a = cm(l1 + 0.001);
      const b = cm(l1 - 0.001);
      return { f: String(f), la: a.toFixed(1), lb: b.toFixed(1), l: ((a + b) / 200).toFixed(4), invF: (1 / f).toFixed(5) };
    });
  const session = (r = rows()) => goldenSession(def, r, { seed: SEED, constants: { theta } });

  test("a careful run: no errors, v within 3 %, intercept gives e", () => {
    expect(errorKeys(def, session())).toEqual([]);
    const v = result(def, session(), "v");
    expect(Math.abs(v.value! - v.accepted!) / v.accepted!).toBeLessThan(0.03);
    expect(Math.abs(result(def, session(), "e").value! - world.endCorrection)).toBeLessThan(0.006);
  });

  test("second resonance recorded for one fork", () => {
    const r = rows();
    const tripled = (Number(r[3]!.la) * 3 + 2).toFixed(1);
    r[3] = { ...r[3]!, la: tripled, lb: tripled, l: (Number(tripled) / 100).toFixed(4) };
    expect(findingKeys(def, session(r))).toContain("tube.secondNotFirst");
  });
});
