"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { summarise } from "@/core/feedback";
import { STAGES } from "@/core/session";

import { FindingItem, SeverityLegend } from "../finding-item";
import type { StageProps } from "../stage-view";

/** All findings, grouped by the stage they belong to, each with a way back to fix it. */
export function FeedbackStage({ ctx, analysis }: StageProps) {
  const t = useTranslations("workspace.feedback");
  const ts = useTranslations("stages");
  const counts = summarise(analysis.findings);
  const stages = STAGES.filter((s) => analysis.findings.some((f) => f.stage === s));

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <div>
        <h2 className="text-ds-heading-4">{t("title")}</h2>
        <p className="mt-1 text-ds-body-sm text-text-secondary">
          {counts.errors + counts.warnings === 0 ? t("allClear") : t("summary", counts)}
        </p>
        <p className="mt-1 text-ds-body-xs text-text-muted">{t("unlocks")}</p>
      </div>
      <SeverityLegend />
      <div className="flex max-w-3xl flex-col gap-8">
        {stages.map((stage) => (
          <section key={stage} aria-labelledby={`fb-${stage}`}>
            <div className="flex items-center justify-between border-b border-sheet-edge pb-1">
              <h3 id={`fb-${stage}`} className="text-ds-heading-5">
                {ts(stage)}
              </h3>
              <Button variant="link" size="sm" onClick={() => ctx.goTo(stage)}>
                {t("goTo", { stage: ts(stage) })}
              </Button>
            </div>
            <ul>
              {analysis.findings
                .filter((f) => f.stage === stage)
                .map((f, i) => (
                  <FindingItem key={`${f.rule}-${i}`} finding={f} />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
