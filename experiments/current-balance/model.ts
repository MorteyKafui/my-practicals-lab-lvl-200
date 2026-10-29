import type { Conditions, Environment } from "@/core/environment";
import { substream, uniform, withTolerance } from "@/core/random";

/**
 * Current balance: magnets on a steel yoke sit on a top-pan balance; a rigid copper rod passes
 * between the poles. A current I in the rod feels F = B I L; by Newton's third law the magnets
 * feel −F, so the balance reading changes by F/g. Reversing the current reverses the change
 * (Fleming's left-hand rule). The field fringes beyond the poles, so the effective length is a
 * little longer than the pole width the student measures.
 */

export const POLE_WIDTH_CM = 5.0;

export interface CurrentBalanceWorld {
  /** Flux density between the poles, T. */
  b: number;
  /** Effective length of rod in the field, m (pole width + fringing). */
  effectiveLength: number;
  /** Mass of yoke and magnets, g. */
  m0: number;
  ammeterError: number;
}

export function createWorld(seed: number, env: Environment): CurrentBalanceWorld {
  void env;
  const rng = substream(seed, "current-balance");
  return {
    b: uniform(rng, 0.05, 0.09),
    effectiveLength: (POLE_WIDTH_CM / 100) * uniform(rng, 1.03, 1.07),
    m0: uniform(rng, 140, 230),
    ammeterError: withTolerance(rng, 1, 0.01) - 1,
  };
}

export const force = (w: CurrentBalanceWorld, currentA: number) => w.b * currentA * w.effectiveLength;

/** Balance reading (g) for current I flowing forward (+) or reversed (−). */
export function balanceReading(w: CurrentBalanceWorld, conditions: Pick<Conditions, "g">, currentA: number, reversed: boolean) {
  return w.m0 + ((reversed ? -1 : 1) * force(w, currentA) * 1000) / conditions.g;
}

export const CURRENTS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

export function idealReadings(w: CurrentBalanceWorld, conditions: Pick<Conditions, "g">) {
  return CURRENTS.map((i) => ({ I: i, m: balanceReading(w, conditions, i, false) }));
}
