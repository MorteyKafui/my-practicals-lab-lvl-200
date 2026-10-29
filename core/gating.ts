import { STAGES, type Session, type StageId } from "./session";

/**
 * Which stages a student may open. The one hard rule of the lab: the accepted values
 * (Compare) stay locked until the student has analysed their own data and read their
 * feedback. Everything else is advice, not a gate.
 */

export type StageState = "open" | "locked" | "skipped";

export interface StageStatus {
  stage: StageId;
  state: StageState;
  /** Message key (under stages.why.*) explaining a lock. */
  reason?: string;
}

export interface GateInputs {
  session: Pick<Session, "mode" | "graph" | "answers" | "feedbackViewedAt" | "setup">;
  /** The practical has a set-up stage. */
  hasSetup?: boolean;
  completeRows: number;
}

export const MIN_ROWS_TO_PLOT = 3;

export function stageStatuses({ session, completeRows, hasSetup = false }: GateInputs): StageStatus[] {
  return STAGES.map((stage): StageStatus => {
    switch (stage) {
      case "setup":
        return session.mode === "bring" || !hasSetup ? { stage, state: "skipped" } : { stage, state: "open" };
      case "measure":
        if (session.mode === "bring") return { stage, state: "skipped" };
        // The bench opens once the apparatus has been chosen (and wired) correctly.
        return hasSetup && !session.setup?.done ? { stage, state: "locked", reason: "needSetup" } : { stage, state: "open" };
      case "graph":
      case "calculate":
        return completeRows >= MIN_ROWS_TO_PLOT ? { stage, state: "open" } : { stage, state: "locked", reason: "needRows" };
      case "compare":
        if (completeRows < MIN_ROWS_TO_PLOT) return { stage, state: "locked", reason: "needRows" };
        if (!session.graph?.line) return { stage, state: "locked", reason: "needLine" };
        if (!session.answers.slope?.trim()) return { stage, state: "locked", reason: "needSlope" };
        if (!session.feedbackViewedAt) return { stage, state: "locked", reason: "needFeedback" };
        return { stage, state: "open" };
      default:
        return { stage, state: "open" };
    }
  });
}

export function canOpen(statuses: readonly StageStatus[], stage: StageId): boolean {
  return statuses.find((s) => s.stage === stage)?.state === "open";
}
