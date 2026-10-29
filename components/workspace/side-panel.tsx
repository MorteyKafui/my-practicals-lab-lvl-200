"use client";

import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

import { Tex } from "@/components/tex";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatElapsed } from "@/core/action-log";
import type { Analysis } from "@/experiments/analyse";
import type { ExperimentDefinition } from "@/experiments/types";
import { cn } from "@/lib/utils";

import { FindingItem } from "./finding-item";
import type { WorkspaceContextValue } from "./workspace";

export function SidePanel({ ctx, definition, analysis }: { ctx: WorkspaceContextValue; definition: ExperimentDefinition; analysis: Analysis }) {
  const t = useTranslations("workspace.panel");
  const tx = useTranslations(`experiments.${ctx.session.experimentId}`);
  const steps = tx.raw("steps") as string[];
  const theory = tx.raw("theory") as string[];
  const tips = tx.raw("tips") as string[];
  const kinds = new Set(ctx.session.actions.map((a) => a.kind));
  const rows = analysis.context.completeRows.length;
  const live = analysis.findings.filter((f) => f.stage === ctx.session.stage && f.severity !== "good");

  return (
    <aside className="no-print border-t border-rule xl:border-t-0">
      <Tabs key={ctx.session.stage} defaultValue={ctx.session.stage === "measure" ? "instructions" : "check"} className="gap-0">
        <TabsList variant="line" className="h-11 w-full justify-start gap-4 border-b border-rule px-4">
          <TabsTrigger value="instructions">{t("instructions")}</TabsTrigger>
          <TabsTrigger value="theory">{t("theory")}</TabsTrigger>
          <TabsTrigger value="tips">{t("tips")}</TabsTrigger>
          <TabsTrigger value="log">{t("log")}</TabsTrigger>
          <TabsTrigger value="check">
            {t("check")}
            {live.length > 0 && <span className="figure ml-1 text-ds-mono-xs text-text-muted">{live.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="p-4">
          <ol className="flex flex-col">
            {steps.map((step, i) => {
              const done = ctx.session.mode === "perform" && (definition.stepChecks?.[i]?.({ kinds, rows }) ?? false);
              return (
                <li key={step} className="flex gap-3 border-b border-rule py-2.5 text-ds-body-sm last:border-b-0">
                  {done ? (
                    <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-data" weight="fill" aria-label="done" />
                  ) : (
                    <CircleIcon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                  )}
                  <span className={cn(done && "text-text-muted")}>{step}</span>
                </li>
              );
            })}
          </ol>
        </TabsContent>

        <TabsContent value="theory" className="flex flex-col gap-2 p-4 text-ds-body-sm text-text-secondary">
          {theory.map((p) => (
            <Tex key={p}>{p}</Tex>
          ))}
        </TabsContent>

        <TabsContent value="tips" className="p-4">
          <ul className="flex flex-col gap-3 text-ds-body-sm text-text-secondary">
            {tips.map((tip) => (
              <li key={tip} className="border-l-2 border-reference pl-3">
                {tip}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="log" className="p-4">
          {ctx.session.actions.length === 0 ? (
            <p className="text-ds-body-sm text-text-muted">{t("noActions")}</p>
          ) : (
            <ol className="figure flex max-h-[60vh] flex-col overflow-y-auto text-ds-mono-xs" aria-live="polite">
              {[...ctx.session.actions].reverse().slice(0, 200).map((a, i) => (
                <li key={`${a.t}-${i}`} className="flex gap-3 border-b border-rule py-1.5">
                  <span className="text-text-muted">{formatElapsed(a.t)}</span>
                  <span className="min-w-0 flex-1 font-sans text-ds-body-xs text-text-secondary">{definition.logLine(a)}</span>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="check" className="p-4">
          <h2 className="mb-1 text-ds-heading-6 text-text-muted">{t("liveTitle")}</h2>
          {live.length === 0 ? (
            <p className="text-ds-body-sm text-text-muted">{t("liveEmpty")}</p>
          ) : (
            <ul>
              {live.slice(0, 6).map((f, i) => (
                <FindingItem key={`${f.rule}-${i}`} finding={f} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}
