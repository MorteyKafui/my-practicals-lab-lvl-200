/**
 * Everything the student does on the bench, timestamped. The log drives three things:
 *   • technique feedback ("you never repeated a reading", "the fork was struck on the bench"),
 *   • session replay, so the student can watch how they worked,
 *   • the report's Method section, written in the passive past tense from what really happened.
 */

export type ActionValue = string | number | boolean;

export interface LabAction {
  /** Milliseconds since the session started. */
  t: number;
  /** Experiment-defined verb: "strike-fork", "move-bridge", "record-reading"… */
  kind: string;
  detail?: Record<string, ActionValue>;
}

export function countActions(log: readonly LabAction[], kind: string): number {
  return log.reduce((n, a) => (a.kind === kind ? n + 1 : n), 0);
}

export function lastAction(log: readonly LabAction[], kind: string): LabAction | undefined {
  for (let i = log.length - 1; i >= 0; i--) if (log[i]!.kind === kind) return log[i];
  return undefined;
}

export function actionsOfKind(log: readonly LabAction[], kind: string): LabAction[] {
  return log.filter((a) => a.kind === kind);
}

/** Collapse runs of the same verb (a hundred bridge nudges) so replay and method text stay readable. */
export function compactLog(log: readonly LabAction[], mergeable: ReadonlySet<string>): LabAction[] {
  const out: LabAction[] = [];
  for (const action of log) {
    const prev = out[out.length - 1];
    if (prev && prev.kind === action.kind && mergeable.has(action.kind)) {
      out[out.length - 1] = { ...action, detail: { ...prev.detail, ...action.detail, from: prev.detail?.from ?? prev.detail?.to ?? "" } };
    } else {
      out.push(action);
    }
  }
  return out;
}

export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
