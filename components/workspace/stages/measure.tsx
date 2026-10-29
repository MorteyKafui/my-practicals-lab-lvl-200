"use client";

import { useTranslations } from "next-intl";
import { useMemo, type ComponentType } from "react";

import { AcSonometerBench } from "@/experiments/ac-sonometer/bench";
import { StretchedWireBench } from "@/experiments/stretched-wire/bench-ui";
import type { BenchProps } from "@/experiments/types";

import { ObservationTable } from "../observation-table";
import type { StageProps } from "../stage-view";
import { ConstantsFields } from "./observations";

/** Interactive benches by experiment id (client-only; this module is loaded with ssr: false). */
const BENCHES: Record<string, ComponentType<BenchProps>> = {
  "stretched-wire": StretchedWireBench,
  "ac-sonometer": AcSonometerBench,
};

/** The bench on top, the student's notebook right under it — read the instrument, write it down. */
export function MeasureStage({ ctx, definition, analysis }: StageProps) {
  const t = useTranslations("workspace.observations");
  const { session } = ctx;
  const Bench = BENCHES[session.experimentId];
  const world = useMemo(() => definition.createWorld(session.seed, session.environment), [definition, session.seed, session.environment]);

  return (
    <div className="flex flex-col">
      {Bench && <Bench world={world} conditions={analysis.conditions} session={session} act={ctx.act} />}
      <div className="flex flex-col gap-4 px-4 py-5 md:px-6">
        <h2 className="text-ds-heading-5">{t("title")}</h2>
        <ConstantsFields ctx={ctx} definition={definition} />
        <ObservationTable ctx={ctx} definition={definition} findings={analysis.findings} />
      </div>
    </div>
  );
}
