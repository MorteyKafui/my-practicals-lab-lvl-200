import type { LabAction } from "./action-log";
import type { Environment } from "./environment";
import type { SetupState } from "./setup";
import { parseFigure, type ParsedFigure } from "./sigfigs";
import { toSI, type QuantityKind } from "./units";

/**
 * A session is one student's attempt at one practical: everything they set up, read, typed,
 * plotted and wrote. It lives in IndexedDB on their device and exports as a .vlab file.
 */

export type Mode = "perform" | "bring";

export type StageId =
  | "brief"
  | "setup"
  | "measure"
  | "observations"
  | "graph"
  | "calculate"
  | "discussion"
  | "feedback"
  | "compare"
  | "report";

export const STAGES: readonly StageId[] = [
  "brief",
  "setup",
  "measure",
  "observations",
  "graph",
  "calculate",
  "discussion",
  "feedback",
  "compare",
  "report",
];

export interface TableRow {
  id: string;
  /** Raw strings exactly as typed, keyed by column id. Precision lives in the notation. */
  cells: Record<string, string>;
}

export interface Axis {
  /** Column id plotted on this axis. */
  column: string;
  label: string;
  /** Value at the axis origin (bottom/left edge of the paper). */
  start: number;
  /** Value per large square (2 cm on real graph paper). */
  perSquare: number;
}

export interface GraphState {
  title: string;
  x: Axis;
  y: Axis;
  /** The student's best-fit line, as two points in data units (SI-free: the plotted values). */
  line?: { x1: number; y1: number; x2: number; y2: number };
  /** Two points the student picked on their line for the slope triangle. */
  triangle?: { x1: number; y1: number; x2: number; y2: number };
}

export interface Writing {
  discussion: string;
  precautions: string;
  sourcesOfError: string;
  conclusion: string;
}

export interface Session {
  id: string;
  experimentId: string;
  mode: Mode;
  seed: number;
  environment: Environment;
  createdAt: number;
  updatedAt: number;
  /** Stage the student is on. */
  stage: StageId;
  actions: LabAction[];
  /** Raw typed constants (e.g. hanging mass) and the units chosen for them. */
  constants: Record<string, string>;
  constantUnits: Record<string, string>;
  /** Units chosen for each column. */
  units: Record<string, string>;
  rows: TableRow[];
  graph?: GraphState;
  /** Calculation answers as typed: slope, intercept, results. */
  answers: Record<string, string>;
  writing: Writing;
  /** The do-it-yourself set-up (perform mode). */
  setup?: SetupState;
  feedbackViewedAt?: number;
  /** Bring-your-data mode: where the data came from, for the report. */
  source?: string;
}

export interface ParsedCell {
  raw: string;
  figure?: ParsedFigure;
  /** SI value, when the cell parses and the column has a unit. */
  si?: number;
}

export interface ColumnLike {
  id: string;
  kind: QuantityKind;
  units: string[];
}

export function parseCell(raw: string | undefined, column: ColumnLike, unit: string | undefined): ParsedCell {
  const text = (raw ?? "").trim();
  if (text === "") return { raw: text };
  const figure = parseFigure(text);
  if (!figure) return { raw: text };
  const symbol = unit ?? column.units[0]!;
  return { raw: text, figure, si: toSI(figure.value, column.kind, symbol) };
}

export function unitOf(session: Pick<Session, "units">, column: ColumnLike): string {
  return session.units[column.id] ?? column.units[0]!;
}

export function emptyWriting(): Writing {
  return { discussion: "", precautions: "", sourcesOfError: "", conclusion: "" };
}

export function newRowId(): string {
  return Math.random().toString(36).slice(2, 10);
}
