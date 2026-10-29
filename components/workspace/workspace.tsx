"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { LabAction } from "@/core/action-log";
import { stageStatuses } from "@/core/gating";
import type { Session, StageId } from "@/core/session";
import { analyse } from "@/experiments/analyse";
import { getDefinition } from "@/experiments/registry";
import { useSession, useUpdateSession } from "@/hooks/use-sessions";

import { Filmstrip } from "./filmstrip";
import { SidePanel } from "./side-panel";
import { StageView } from "./stage-view";
import { StartPanel } from "./start-panel";
import { WorkspaceHeader } from "./workspace-header";

export interface WorkspaceContextValue {
  session: Session;
  update: (fn: (s: Session) => Session) => void;
  act: (action: Omit<LabAction, "t">) => void;
  goTo: (stage: StageId) => void;
}

/** The practical workspace: title row, the current stage, the side panel and the stage filmstrip. */
export function Workspace({ experimentId }: { experimentId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("s") ?? undefined;
  const { data: session, isLoading } = useSession(sessionId);
  const definition = getDefinition(experimentId);

  if (!sessionId || (!isLoading && !session)) {
    return (
      <StartPanel
        experimentId={experimentId}
        ready={Boolean(definition)}
        onOpen={(id) => router.replace(`/experiments/${experimentId}?s=${id}`)}
      />
    );
  }
  if (!session || !definition) return <div className="h-64" aria-busy />;
  return <ActiveWorkspace session={session} />;
}

function ActiveWorkspace({ session }: { session: Session }) {
  const definition = getDefinition(session.experimentId)!;
  const update = useUpdateSession(session.id);

  const act = useCallback(
    (action: Omit<LabAction, "t">) =>
      update((s) => ({ ...s, actions: [...s.actions, { ...action, t: Date.now() - s.createdAt }] })),
    [update],
  );

  const analysis = useMemo(() => analyse(definition, session), [definition, session]);
  const statuses = useMemo(
    () => stageStatuses({ session, completeRows: analysis.context.completeRows.length }),
    [session, analysis],
  );

  const goTo = useCallback(
    (stage: StageId) => {
      const status = statuses.find((s) => s.stage === stage);
      if (status?.state !== "open") return;
      update((s) => ({
        ...s,
        stage,
        feedbackViewedAt: stage === "feedback" ? (s.feedbackViewedAt ?? Date.now()) : s.feedbackViewedAt,
      }));
      document.getElementById("main")?.scrollTo?.({ top: 0 });
      window.scrollTo({ top: 0 });
    },
    [statuses, update],
  );

  const ctx: WorkspaceContextValue = { session, update, act, goTo };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <WorkspaceHeader session={session} statuses={statuses} />
      <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 border-rule xl:border-r">
          <StageView ctx={ctx} definition={definition} analysis={analysis} statuses={statuses} />
        </div>
        <SidePanel ctx={ctx} definition={definition} analysis={analysis} />
      </div>
      <Filmstrip current={session.stage} statuses={statuses} onSelect={goTo} />
    </div>
  );
}
