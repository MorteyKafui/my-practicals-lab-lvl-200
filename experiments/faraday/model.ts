import { MU_0, type Environment } from "@/core/environment";
import { substream, uniform, withTolerance } from "@/core/random";

/**
 * Faraday's law with a solenoid and search coil. A sinusoidal current I = I₀ sin ωt in a long
 * solenoid (n turns per metre) gives B = μ₀ n I inside it. A search coil of N turns and area A at
 * its centre links Φ = N B A, so the induced emf has peak
 *   ε₀ = N μ₀ n A ω I₀ = 2π f · (N μ₀ n A I₀)
 * — proportional to the rate of change of flux. At constant current, ε₀ against f is a line
 * through the origin. The solenoid's inductance makes the current fall as f rises unless the
 * generator's amplitude is turned up to keep it constant.
 */

export const LABEL_TURNS_PER_M = 1000;
export const COIL_TURNS = 300;

export interface FaradayWorld {
  /** True turns per metre of the solenoid. */
  n: number;
  /** True search-coil diameter, m. */
  coilDiameter: number;
  resistance: number;
  inductance: number;
  ammeterError: number;
}

export function createWorld(seed: number, env: Environment): FaradayWorld {
  void env;
  const rng = substream(seed, "faraday");
  return {
    n: withTolerance(rng, LABEL_TURNS_PER_M, 0.015),
    coilDiameter: uniform(rng, 0.0195, 0.0205),
    resistance: uniform(rng, 7, 9),
    inductance: uniform(rng, 1.6e-3, 2.4e-3),
    ammeterError: withTolerance(rng, 1, 0.01) - 1,
  };
}

/** Peak current (A) for generator amplitude V₀ (V) at frequency f. */
export function peakCurrent(w: FaradayWorld, amplitudeV: number, f: number) {
  return amplitudeV / Math.hypot(w.resistance, 2 * Math.PI * f * w.inductance);
}

export const coilArea = (w: FaradayWorld) => (Math.PI * w.coilDiameter ** 2) / 4;

/** Peak emf (V) induced in the search coil for peak solenoid current I₀ at frequency f. */
export function peakEmf(w: FaradayWorld, peakCurrentA: number, f: number) {
  return COIL_TURNS * MU_0 * w.n * coilArea(w) * 2 * Math.PI * f * peakCurrentA;
}

export const FREQUENCIES = [200, 400, 600, 800, 1000, 1200, 1500, 2000];
export const VOLTS_PER_DIV = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5];

/** A careful run at constant r.m.s. current, choosing the V/div that makes the trace largest on screen. */
export function idealReadings(w: FaradayWorld, irms: number) {
  const i0 = irms * Math.SQRT2;
  return FREQUENCIES.map((f) => {
    const e0 = peakEmf(w, i0, f);
    const s = [...VOLTS_PER_DIV].find((v) => (2 * e0) / v <= 8)!;
    return { f, e0, s, y: (2 * e0) / s };
  });
}
