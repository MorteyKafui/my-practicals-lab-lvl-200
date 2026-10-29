"use client";

import { FlaskIcon, NotebookIcon, TrashIcon } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { Mode } from "@/core/session";
import { useCreateSession, useDeleteSession, useExperimentSessions } from "@/hooks/use-sessions";

import { BriefContent } from "./stages/brief";

export function StartPanel({ experimentId, ready, onOpen }: { experimentId: string; ready: boolean; onOpen: (id: string) => void }) {
  const t = useTranslations("workspace.start");
  const ts = useTranslations("stages");
  const tm = useTranslations("workspace.progress.mode");
  const tx = useTranslations(`experiments.${experimentId}`);
  const format = useFormatter();
  const sessions = useExperimentSessions(experimentId);
  const create = useCreateSession();
  const remove = useDeleteSession();

  const start = async (mode: Mode) => {
    const session = await create.mutateAsync({ experimentId, mode });
    onOpen(session.id);
  };

  return (
    <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <h1 className="text-ds-heading-3">{tx("title")}</h1>
        <p className="mt-2 max-w-[70ch] text-ds-body-sm text-text-secondary">{tx("aim")}</p>
        <div className="mt-8">
          <BriefContent experimentId={experimentId} />
        </div>
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-16 lg:self-start">
        {ready ? (
          <section aria-labelledby="start-title">
            <h2 id="start-title" className="mb-3 text-ds-heading-5">
              {t("title")}
            </h2>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => start("perform")}
                disabled={create.isPending}
                className="group flex gap-3 border border-sheet-edge bg-sheet p-4 text-left transition-colors hover:border-text-primary focus-visible:border-ring focus-visible:outline-none"
              >
                <FlaskIcon className="mt-0.5 size-5 shrink-0 text-data" />
                <span>
                  <span className="block text-ds-label-md">{t("perform")}</span>
                  <span className="mt-1 block text-ds-body-sm text-text-secondary">{t("performBody")}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => start("bring")}
                disabled={create.isPending}
                className="group flex gap-3 border border-sheet-edge bg-sheet p-4 text-left transition-colors hover:border-text-primary focus-visible:border-ring focus-visible:outline-none"
              >
                <NotebookIcon className="mt-0.5 size-5 shrink-0 text-text-secondary" />
                <span>
                  <span className="block text-ds-label-md">{t("bring")}</span>
                  <span className="mt-1 block text-ds-body-sm text-text-secondary">{t("bringBody")}</span>
                </span>
              </button>
            </div>
          </section>
        ) : (
          <p className="bg-well p-4 text-ds-body-sm text-text-secondary">{t("notReady")}</p>
        )}

        {sessions.data && sessions.data.length > 0 && (
          <section aria-labelledby="previous-title">
            <h2 id="previous-title" className="mb-2 text-ds-heading-5">
              {t("previous")}
            </h2>
            <ul className="border-t border-rule">
              {sessions.data.map((s) => (
                <li key={s.id} className="flex items-center gap-2 border-b border-rule py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-ds-body-sm">
                      {t("started", { date: format.dateTime(s.createdAt, { dateStyle: "medium", timeStyle: "short" }) })}
                    </p>
                    <p className="text-ds-body-xs text-text-muted">
                      {tm(s.mode)} · {t("stage", { stage: ts(s.stage) })} · <span className="figure">#{s.seed}</span>
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onOpen(s.id)}>
                    {t("resume")}
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => remove.mutate(s.id)}>
                    <TrashIcon />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
