import { acSonometer } from "./ac-sonometer/definition";
import { currentBalance } from "./current-balance/definition";
import { helmholtz } from "./helmholtz/definition";
import { resonanceTubeForks } from "./resonance-tube-forks/definition";
import { resonanceTubeTwo } from "./resonance-tube-two/definition";
import { slinky } from "./slinky/definition";
import { stretchedWire } from "./stretched-wire/definition";
import type { ExperimentDefinition } from "./types";

/**
 * Experiments whose full definition exists. A catalogue entry without a definition
 * shows its brief and accepts no data yet.
 */
const DEFINITIONS: Record<string, ExperimentDefinition> = {
  [stretchedWire.entry.id]: stretchedWire as ExperimentDefinition,
  [acSonometer.entry.id]: acSonometer as ExperimentDefinition,
  [resonanceTubeTwo.entry.id]: resonanceTubeTwo as ExperimentDefinition,
  [resonanceTubeForks.entry.id]: resonanceTubeForks as ExperimentDefinition,
  [helmholtz.entry.id]: helmholtz as ExperimentDefinition,
  [slinky.entry.id]: slinky as ExperimentDefinition,
  [currentBalance.entry.id]: currentBalance as ExperimentDefinition,
};

export function getDefinition(id: string): ExperimentDefinition | undefined {
  return DEFINITIONS[id];
}
