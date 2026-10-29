import { speedOfSound, type Conditions, type Environment } from "@/core/environment";
import { substream, uniform } from "@/core/random";

/**
 * A narrow-neck (Helmholtz) resonator: the plug of air in the neck bounces on the spring of
 * the air in the bulb.
 *   f = (c / 2π) · √(A / (V · L′))     A = neck area, L′ = neck length + end corrections
 * Adding a volume V_w of water leaves air volume V = V₀ − V_w, so
 *   1/f² = (4π²L′ / (c²A)) · (V₀ − V_w)
 * is a straight line in V_w with negative slope; it meets the V_w-axis at V₀. That line is the
 * calibration: measure f for an unknown amount of water and read its volume off the line.
 */

export interface HelmholtzWorld {
  /** Air volume of the empty flask up to the neck, m³. */
  v0: number;
  neckRadius: number;
  neckLength: number;
  /** Effective neck length L′ (with end corrections), m. */
  effectiveLength: number;
  q: number;
  /** The hidden "unknown" volume of water the student measures with the calibration, m³. */
  unknownWater: number;
}

export function createWorld(seed: number, env: Environment): HelmholtzWorld {
  void env;
  const rng = substream(seed, "helmholtz");
  const neckRadius = uniform(rng, 0.011, 0.0135);
  const neckLength = uniform(rng, 0.065, 0.085);
  return {
    v0: uniform(rng, 520e-6, 580e-6),
    neckRadius,
    neckLength,
    effectiveLength: neckLength + neckRadius * uniform(rng, 1.4, 1.6),
    q: uniform(rng, 14, 22),
    unknownWater: Math.round(uniform(rng, 140, 340)) * 1e-6,
  };
}

export const neckArea = (w: HelmholtzWorld) => Math.PI * w.neckRadius ** 2;

export function resonantFrequency(w: HelmholtzWorld, conditions: Pick<Conditions, "temperatureC">, waterM3: number) {
  const c = speedOfSound(conditions.temperatureC);
  return (c / (2 * Math.PI)) * Math.sqrt(neckArea(w) / ((w.v0 - waterM3) * w.effectiveLength));
}

/** Loudness at the flask's mouth (1 at resonance) when driven at f. */
export function response(w: HelmholtzWorld, conditions: Pick<Conditions, "temperatureC">, waterM3: number, f: number) {
  const r = resonantFrequency(w, conditions, waterM3) / f;
  return 1 / Math.sqrt((1 - r * r) ** 2 + (r / w.q) ** 2) / w.q;
}

/** The calibration constant A/L′ (m) that the slope gives. */
export const neckConstant = (w: HelmholtzWorld) => neckArea(w) / w.effectiveLength;

/** A careful student's run: 0 to 350 cm³ of water in 50 cm³ steps. */
export function idealReadings(w: HelmholtzWorld, conditions: Pick<Conditions, "temperatureC">) {
  return [0, 50, 100, 150, 200, 250, 300, 350].map((cm3) => ({ water: cm3 * 1e-6, f: resonantFrequency(w, conditions, cm3 * 1e-6) }));
}
