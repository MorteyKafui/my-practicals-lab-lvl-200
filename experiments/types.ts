import type { LabAction } from "@/core/action-log";
import type { Conditions, Environment } from "@/core/environment";
import type { FeedbackRule } from "@/core/feedback";
import type { InstrumentSpec } from "@/core/instruments";
import type { Session } from "@/core/session";
import type { QuantityKind } from "@/core/units";

import type { CatalogueEntry } from "./catalogue";

/**
 * The experiment plugin contract. Adding a practical means writing one folder that exports
 * an ExperimentDefinition; the workspace, notebook, graph tool, feedback, comparison and
 * report all work from it. See .claude/skills/add-experiment for the step-by-step guide.
 */

export interface ColumnSpec {
  id: string;
  /** Symbol as printed in the table header and on the graph axis: "l", "1/l", "f". */
  symbol: string;
  kind: QuantityKind;
  /** Units the student may record in; the first is the default. */
  units: string[];
  /**
   * measured: read from an instrument and typed by the student.
   * given: a setting the student records (fork frequency, hanging mass).
   * derived: computed by the student from other columns; the app checks their arithmetic.
   */
  source: "measured" | "given" | "derived";
  instrument?: InstrumentSpec;
  /** SI value of a derived column from the row's other SI values (and the recorded constants, in SI). */
  derive?: (row: Readonly<Record<string, number>>, constants: Readonly<Record<string, number>>) => number;
}

export interface GraphSpec {
  /** Column ids. The student may choose other axes; this is the plot the theory asks for. */
  x: string;
  y: string;
  /** The theory says the line passes through the origin. */
  throughOrigin: boolean;
  slope: { symbol: string; unit: string };
  intercept?: { symbol: string; unit: string };
}

export interface ResultSpec<World> {
  id: string;
  symbol: string;
  /** SI unit as printed. */
  unit: string;
  /** From the student's own line (slope, intercept) and conditions. */
  fromFit: (fit: { slope: number; intercept: number }, ctx: ResultContext) => number;
  /** The accepted or true value; shown only once Compare unlocks. */
  accepted(world: World | undefined, conditions: Conditions, constants: Readonly<Record<string, number>>): number | undefined;
  /** A result within this % of accepted is "good agreement" for this practical. */
  goodWithinPercent: number;
}

export interface ResultContext {
  conditions: Conditions;
  /** Constants the student recorded once for the whole practical (tension, temperature…). */
  constants: Readonly<Record<string, number>>;
  /** The complete rows of the table, SI values by column id. */
  rows: readonly Readonly<Record<string, number>>[];
}

export interface ConstantSpec {
  id: string;
  symbol: string;
  kind: QuantityKind;
  units: string[];
}

/** Props for an experiment's interactive 3D bench (registered client-side in experiments/benches.ts). */
export interface BenchProps {
  /** The hidden world; each bench narrows it to its own type. */
  world: unknown;
  conditions: Conditions;
  session: Session;
  /** Append to the action log (and persist). */
  act: (action: Omit<LabAction, "t">) => void;
}

export interface ExperimentDefinition<World = unknown> {
  entry: CatalogueEntry;
  /** Values recorded once for the whole practical (e.g. the hanging mass), shown above the table. */
  constants: ConstantSpec[];
  columns: ColumnSpec[];
  graph: GraphSpec;
  results: ResultSpec<World>[];
  /** Build the hidden apparatus from the session seed. */
  createWorld: (seed: number, env: Environment) => World;
  /** What a careful experimenter would record in this world (SI values): used for the Compare overlay. */
  idealRows(world: World, conditions: Conditions, constants: Readonly<Record<string, number>>): Record<string, number>[];
  /** The hidden apparatus values, revealed in Compare once feedback has been read. */
  reveal?(world: World): { label: string; value: string }[];
  /** Experiment-specific feedback on top of the generic rules. */
  rules: FeedbackRule[];
  /** One sentence of method, passive past tense, for an action (or undefined to omit it). */
  describeAction: (action: LabAction) => string | undefined;
  /** A short present-tense line for the live lab log. */
  logLine: (action: LabAction) => string;
  /** Perform mode: check i ticks off instruction step i. */
  stepChecks?: ((progress: { kinds: ReadonlySet<string>; rows: number }) => boolean)[];
}

