import { substream, uniform, withTolerance } from "./random";

/**
 * The laboratory's surroundings. Defaults suit most labs; Settings lets a school set its own
 * (local g, mains frequency, room temperature, Earth's field), which keeps the app universal.
 */
export interface Environment {
  /** Room temperature, °C. */
  temperatureC: number;
  /** Gravitational field strength, N kg⁻¹. */
  g: number;
  /** Nominal mains frequency, Hz (50 or 60). */
  mainsHz: 50 | 60;
  /** Horizontal component of Earth's magnetic field, T. */
  earthFieldT: number;
}

export const DEFAULT_ENVIRONMENT: Environment = {
  temperatureC: 27,
  g: 9.81,
  mainsHz: 50,
  earthFieldT: 3.2e-5,
};

/** Speed of sound in dry air at θ °C (m s⁻¹): the accepted value used across the acoustics labs. */
export function speedOfSound(temperatureC: number): number {
  return 331.3 * Math.sqrt(1 + temperatureC / 273.15);
}

/** μ₀, the permeability of free space (H m⁻¹). */
export const MU_0 = 4 * Math.PI * 1e-7;

/**
 * The session's actual conditions: the room drifts a little from the nominal setting, and the
 * mains frequency is never exactly 50 Hz. Students who take the temperature get the right one.
 */
export function actualConditions(env: Environment, seed: number) {
  const rng = substream(seed, "environment");
  return {
    temperatureC: env.temperatureC + uniform(rng, -1.5, 1.5),
    g: env.g,
    mainsHz: withTolerance(rng, env.mainsHz, 0.002),
    earthFieldT: withTolerance(rng, env.earthFieldT, 0.05),
  };
}

export type Conditions = ReturnType<typeof actualConditions>;
