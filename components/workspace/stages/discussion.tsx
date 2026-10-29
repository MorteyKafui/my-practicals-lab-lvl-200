"use client";

import { useTranslations } from "next-intl";

import type { Writing } from "@/core/session";

import { AiCritique } from "../ai-critique";
import { FindingItem } from "../finding-item";
import type { StageProps } from "../stage-view";

const FIELDS: { key: keyof Writing; label: string; hint: string; rows: number }[] = [
  { key: "discussion", label: "discussion", hint: "discussionHint", rows: 8 },
  { key: "precautions", label: "precautions", hint: "precautionsHint", rows: 5 },
  { key: "sourcesOfError", label: "sources", hint: "sourcesHint", rows: 5 },
  { key: "conclusion", label: "conclusion", hint: "conclusionHint", rows: 3 },
];

/** The student's own writing. Feedback is a checklist of what markers look for; it never writes for them. */
export function DiscussionStage({ ctx, analysis }: StageProps) {
  const t = useTranslations("workspace.discussion");
  const { session, update } = ctx;
  const findings = analysis.findings.filter((f) => f.stage === "discussion");

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <h2 className="text-ds-heading-4">{t("title")}</h2>
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.key} className={field.key === "discussion" ? "flex flex-col gap-1.5 lg:col-span-2" : "flex flex-col gap-1.5"}>
            <span className="text-ds-label-md">{t(field.label)}</span>
            <span className="text-ds-body-xs text-text-muted">{t(field.hint)}</span>
            <textarea
              rows={field.rows}
              value={session.writing[field.key]}
              onChange={(e) => update((s) => ({ ...s, writing: { ...s.writing, [field.key]: e.target.value } }))}
              className="border border-input bg-sheet p-3 text-ds-body-md outline-none focus:border-ring"
            />
          </label>
        ))}
      </div>
      <AiCritique ctx={ctx} analysis={analysis} />
      {findings.length > 0 && (
        <ul className="max-w-3xl">
          {findings.map((f, i) => (
            <FindingItem key={`${f.rule}-${i}`} finding={f} />
          ))}
        </ul>
      )}
    </div>
  );
}
