"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { StageStatus } from "@/core/gating";
import type { StageId } from "@/core/session";
import type { Analysis } from "@/experiments/analyse";
import type { ExperimentDefinition } from "@/experiments/types";

import { BriefContent } from "./stages/brief";
import { CalculateStage } from "./stages/calculate";
import { CompareStage } from "./stages/compare";
import { DiscussionStage } from "./stages/discussion";
import { FeedbackStage } from "./stages/feedback";
import { GraphStage } from "./stages/graph";
import { ObservationsStage } from "./stages/observations";
import { ReportStage } from "./stages/report";
import { SetupStage } from "./stages/setup";
import type { WorkspaceContextValue } from "./workspace";

// The 3D bench needs WebGL and the browser: never rendered on the server.
const MeasureStage = dynamic(() => import("./stages/measure").then((m) => m.MeasureStage), {
  ssr: false,
  loading: () => <div className="h-[60vh] bg-well" aria-busy />,
});

export interface StageProps {
  ctx: WorkspaceContextValue;
  definition: ExperimentDefinition;
  analysis: Analysis;
}

export function StageView({ ctx, definition, analysis, statuses }: StageProps & { statuses: StageStatus[] }) {
  const t = useTranslations("workspace");
  const ts = useTranslations("stages");
  const props = { ctx, definition, analysis };
  const visible = statuses.filter((s) => s.state !== "skipped");
  const next = visible[visible.findIndex((s) => s.stage === ctx.session.stage) + 1];

  return (
    <div className="flex flex-col">
      {renderStage(ctx.session.stage, props, t, ctx)}
      {next && ctx.session.stage !== "measure" && (
        <div className="no-print flex justify-end border-t border-rule px-4 py-4 md:px-6">
          <Button disabled={next.state !== "open"} onClick={() => ctx.goTo(next.stage)}>
            {t("nav.next", { stage: ts(next.stage) })}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      )}
    </div>
  );
}

function renderStage(stage: StageId, props: StageProps, t: ReturnType<typeof useTranslations>, ctx: WorkspaceContextValue) {
  switch (stage) {
    case "brief":
      return (
        <div className="px-4 py-6 md:px-6">
          <BriefContent experimentId={ctx.session.experimentId} />
          <Button className="mt-8" onClick={() => ctx.goTo(ctx.session.mode === "perform" ? (props.definition.setup ? "setup" : "measure") : "observations")}>
            {ctx.session.mode === "perform" ? t("brief.begin") : t("brief.beginBring")}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      );
    case "setup":
      return <SetupStage {...props} />;
    case "measure":
      return <MeasureStage {...props} />;
    case "observations":
      return <ObservationsStage {...props} />;
    case "graph":
      return <GraphStage {...props} />;
    case "calculate":
      return <CalculateStage {...props} />;
    case "discussion":
      return <DiscussionStage {...props} />;
    case "feedback":
      return <FeedbackStage {...props} />;
    case "compare":
      return <CompareStage {...props} />;
    case "report":
      return <ReportStage {...props} />;
  }
}
