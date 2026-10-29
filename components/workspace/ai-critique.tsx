"use client";

import { SparkleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { formatSigFigs } from "@/core/sigfigs";
import type { Analysis } from "@/experiments/analyse";
import { critiqueWriting } from "@/lib/ai-critique";
import { usePref } from "@/lib/prefs";

import type { WorkspaceContextValue } from "./workspace";

/** Optional: Claude reads the written sections and says what to improve (it never writes them). */
export function AiCritique({ ctx, analysis }: { ctx: WorkspaceContextValue; analysis: Analysis }) {
  const t = useTranslations("workspace.ai");
  const tx = useTranslations(`experiments.${ctx.session.experimentId}`);
  const apiKey = usePref<string>("claude-api-key");
  const critique = useMutation({
    mutationFn: () =>
      critiqueWriting({
        apiKey: apiKey!,
        practical: tx("title"),
        aim: tx("aim"),
        results: analysis.results.filter((r) => r.value !== undefined).map((r) => `${r.symbol} = ${formatSigFigs(r.value!, 3)} ${r.unit}`),
        writing: ctx.session.writing,
      }),
    onSuccess: () => ctx.act({ kind: "ai-critique" }),
  });

  return (
    <section aria-labelledby="ai" className="flex max-w-3xl flex-col gap-3 border border-sheet-edge p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="ai" className="text-ds-heading-5">
            {t("title")}
          </h3>
          <p className="text-ds-body-xs text-text-muted">{t("intro")}</p>
        </div>
        {apiKey ? (
          <Button variant="outline" onClick={() => critique.mutate()} disabled={critique.isPending}>
            <SparkleIcon data-icon="inline-start" />
            {critique.isPending ? t("asking") : t("ask")}
          </Button>
        ) : (
          <Link href="/settings" className="text-ds-body-sm underline underline-offset-2">
            {t("setUp")}
          </Link>
        )}
      </div>
      {critique.isError && <p className="text-ds-body-sm text-negative">{critique.error.message}</p>}
      {critique.data && (
        <div aria-live="polite" className="whitespace-pre-wrap border-l-2 border-reference bg-well p-3 text-ds-body-sm text-text-secondary">
          {critique.data}
        </div>
      )}
    </section>
  );
}
