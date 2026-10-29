"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { formatElapsed } from "@/core/action-log";
import type { StageStatus } from "@/core/gating";
import { STAGES, type Session } from "@/core/session";

/** Title row: the practical's name and aim, and the progress card (stage, elapsed time, date, seed). */
export function WorkspaceHeader({ session, statuses }: { session: Session; statuses: StageStatus[] }) {
  const t = useTranslations();
  const format = useFormatter();
  const elapsed = useElapsed(session);
  const visible = statuses.filter((s) => s.state !== "skipped").map((s) => s.stage);
  const current = Math.max(1, visible.indexOf(session.stage) + 1);
  const done = STAGES.indexOf(session.stage) / (STAGES.length - 1);

  return (
    <header className="flex flex-col gap-4 border-b border-rule px-4 py-4 md:px-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-ds-heading-4 md:text-ds-heading-3">{t(`experiments.${session.experimentId}.title`)}</h1>
        <p className="mt-1 line-clamp-2 max-w-[80ch] text-ds-body-sm text-text-muted">
          {t(`experiments.${session.experimentId}.aim`)}
        </p>
      </div>
      <dl className="grid shrink-0 grid-cols-[auto_auto_auto] gap-x-6 gap-y-1 bg-well px-4 py-3 text-ds-body-xs lg:min-w-[340px]">
        <div className="col-span-3 mb-1">
          <dt className="sr-only">{t("progress.label")}</dt>
          <dd className="flex items-center gap-3">
            <span className="text-ds-label-sm text-text-primary">{t("workspace.progress.stage", { current, total: visible.length })}</span>
            <span className="h-1.5 flex-1 bg-sheet-edge" aria-hidden>
              <span className="block h-full bg-data" style={{ width: `${Math.round(done * 100)}%` }} />
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">{t("workspace.progress.elapsed")}</dt>
          <dd className="figure text-text-primary">{elapsed}</dd>
        </div>
        <div>
          <dt className="text-text-muted">{t(`workspace.progress.mode.${session.mode}`)}</dt>
          <dd className="figure text-text-primary">{format.dateTime(session.createdAt, { dateStyle: "medium" })}</dd>
        </div>
        <div>
          <dt className="text-text-muted">{t("workspace.progress.seed")}</dt>
          <dd className="figure text-text-primary">#{session.seed}</dd>
        </div>
      </dl>
    </header>
  );
}

function useElapsed(session: Session) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const last = session.actions[session.actions.length - 1];
  // While working on the bench the clock runs; afterwards it shows time spent on the bench.
  const end = session.stage === "measure" || !last ? now : session.createdAt + last.t;
  return formatElapsed(Math.max(0, end - session.createdAt));
}
