"use client";

import { useTranslations } from "next-intl";

import type { Finding, Severity } from "@/core/feedback";
import { cn } from "@/lib/utils";

const MARK: Record<Severity, string> = {
  error: "bg-negative",
  warning: "bg-ds-amber-400",
  tip: "bg-reference",
  good: "bg-data",
};

/** One feedback finding: a severity mark, what to fix, and why. */
export function FindingItem({ finding, compact }: { finding: Finding; compact?: boolean }) {
  const t = useTranslations("feedback");
  const params = finding.params ?? {};
  return (
    <li className="flex gap-3 border-b border-rule py-3 last:border-b-0">
      <span className={cn("mt-1.5 size-2 shrink-0", MARK[finding.severity])} aria-hidden />
      <div className="min-w-0">
        <p className="text-ds-label-md text-text-primary">
          <span className="sr-only">{t(`severity.${finding.severity}`)}: </span>
          {t(`${finding.key}.title`, params)}
        </p>
        {!compact && <p className="mt-1 text-ds-body-sm text-text-secondary">{t(`${finding.key}.detail`, params)}</p>}
      </div>
    </li>
  );
}

export function SeverityLegend() {
  const t = useTranslations("feedback.severity");
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-ds-body-xs text-text-muted">
      {(Object.keys(MARK) as Severity[]).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cn("size-2", MARK[s])} aria-hidden />
          {t(s)}
        </li>
      ))}
    </ul>
  );
}
