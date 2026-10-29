import { describe, expect, test } from "bun:test";

import { actualConditions, DEFAULT_ENVIRONMENT } from "@/core/environment";

import { errorKeys, findingKeys, goldenSession, result } from "../test-helpers";
import type { ExperimentDefinition } from "../types";
import { currentBalance } from "./definition";
import { balanceReading, createWorld, CURRENTS, POLE_WIDTH_CM } from "./model";

const SEED = 223606797;
const def = currentBalance as ExperimentDefinition;
const world = createWorld(SEED, DEFAULT_ENVIRONMENT);
const conditions = actualConditions(DEFAULT_ENVIRONMENT, SEED);
const m0 = balanceReading(world, conditions, 0, false);

const rows = () =>
  CURRENTS.map((I) => {
    const m = balanceReading(world, conditions, I, false);
    const typedM = m.toFixed(2);
    return { I: I.toFixed(2), m: typedM, F: ((Number(typedM) - Number(m0.toFixed(2))) * 9.81).toFixed(2) };
  });
const constants = { m0: m0.toFixed(2), L: POLE_WIDTH_CM.toFixed(1) };
const session = (r = rows(), c: Record<string, string> = constants) => goldenSession(def, r, { seed: SEED, constants: c });

describe("current balance model", () => {
  test("reading changes by BIL/g and reverses with the current", () => {
    const up = balanceReading(world, conditions, 2, false) - m0;
    const down = balanceReading(world, conditions, 2, true) - m0;
    expect(up).toBeCloseTo((world.b * 2 * world.effectiveLength * 1000) / conditions.g, 9);
    expect(down).toBeCloseTo(-up, 9);
  });
});

describe("current balance golden datasets", () => {
  test("a careful run: no errors; B within 8 % (fringing makes it a little high)", () => {
    expect(errorKeys(def, session())).toEqual([]);
    const B = result(def, session(), "B");
    expect(Math.abs(B.value! - world.b) / world.b).toBeLessThan(0.08);
    expect(B.value!).toBeGreaterThan(world.b);
  });
  test("no zero-current reading", () => {
    expect(errorKeys(def, session(rows(), { L: constants.L }))).toContain("balance.noZeroReading");
  });
  test("change in mass written as the force", () => {
    const r = rows().map((row) => ({ ...row, F: (Number(row.m) - Number(constants.m0)).toFixed(2) }));
    expect(errorKeys(def, session(r))).toContain("balance.massNotForce");
  });
  test("reversed readings mixed in", () => {
    const r = rows();
    const rev = balanceReading(world, conditions, 2, true).toFixed(2);
    r[3] = { I: "2.00", m: rev, F: ((Number(rev) - Number(constants.m0)) * 9.81).toFixed(2) };
    expect(findingKeys(def, session(r))).toContain("balance.mixedDirections");
  });
  test("tared with the current on", () => {
    const s = session();
    s.actions = [{ t: 1, kind: "tare", detail: { currentOn: true } }];
    expect(errorKeys(def, s)).toContain("balance.taredWithCurrent");
  });
});
