/**
 * The practical catalogue. Each entry is the public face of an experiment plugin;
 * its full definition (apparatus, model, scene, feedback) lives in experiments/<id>/.
 * Display text comes from messages/<locale>.json under experiments.<id>.
 */

export type Topic = "waves" | "acoustics" | "electromagnetism";
export type BuildStatus = "ready" | "building";

export interface CatalogueEntry {
  id: string;
  topic: Topic;
  status: BuildStatus;
  /** Apparatus shown on the catalogue row, in the order a student meets it. */
  apparatus: string[];
  /** What the student plots, written as y against x. */
  graph: { y: string; x: string };
  /** The quantity the practical determines. */
  determines: string;
}

export const CATALOGUE: readonly CatalogueEntry[] = [
  {
    id: "stretched-wire",
    topic: "waves",
    status: "ready",
    apparatus: ["Sonometer", "Tuning forks", "Paper rider", "Slotted masses", "Metre rule"],
    graph: { y: "f / Hz", x: "1/l / m⁻¹" },
    determines: "μ, mass per unit length",
  },
  {
    id: "resonance-tube-two",
    topic: "acoustics",
    status: "ready",
    apparatus: ["Resonance tube", "Water reservoir", "Tuning fork", "Thermometer", "Metre rule"],
    graph: { y: "l₂ − l₁ / m", x: "1/f / s" },
    determines: "v, velocity of sound",
  },
  {
    id: "resonance-tube-forks",
    topic: "acoustics",
    status: "ready",
    apparatus: ["Resonance tube", "Tuning forks", "Thermometer", "Metre rule"],
    graph: { y: "l / m", x: "1/f / s" },
    determines: "v and end correction e",
  },
  {
    id: "helmholtz",
    topic: "acoustics",
    status: "ready",
    apparatus: ["Flask resonator", "Measuring cylinder", "Signal generator", "Loudspeaker"],
    graph: { y: "1/f² / s²", x: "V / m³" },
    determines: "calibration line, unknown volume",
  },
  {
    id: "faraday",
    topic: "electromagnetism",
    status: "ready",
    apparatus: ["Signal generator", "Solenoid", "Search coil", "Oscilloscope", "Ammeter"],
    graph: { y: "ε₀ / V", x: "f / Hz" },
    determines: "ε ∝ dΦ/dt",
  },
  {
    id: "slinky",
    topic: "electromagnetism",
    status: "ready",
    apparatus: ["Slinky", "Power supply", "Ammeter", "Rheostat", "Hall probe", "Metre rule"],
    graph: { y: "B / T", x: "N/L / m⁻¹" },
    determines: "μ₀, permeability of free space",
  },
  {
    id: "current-balance",
    topic: "electromagnetism",
    status: "ready",
    apparatus: ["Top-pan balance", "Magnets on yoke", "Stiff wire", "Power supply", "Ammeter"],
    graph: { y: "F / N", x: "I / A" },
    determines: "B, flux density between the poles",
  },
  {
    id: "ac-sonometer",
    topic: "electromagnetism",
    status: "ready",
    apparatus: ["Sonometer", "Step-down transformer", "Horseshoe magnet", "Slotted masses"],
    graph: { y: "l² / m²", x: "T / N" },
    determines: "f, mains frequency",
  },
];

export function getCatalogueEntry(id: string): CatalogueEntry | undefined {
  return CATALOGUE.find((entry) => entry.id === id);
}
