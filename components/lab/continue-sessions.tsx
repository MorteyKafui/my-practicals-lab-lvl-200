"use client";

import { FolderOpenIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fromVlab, getDb } from "@/core/db";
import { sessionKeys, useAllSessions } from "@/hooks/use-sessions";

/** Home: the student's most recent sessions, and opening a saved .vlab file. */
export function ContinueSessions() {
  const t = useTranslations("home");
  const ts = useTranslations("stages");
  const tx = useTranslations("experiments");
  const format = useFormatter();
  // An explicit "now" (refreshed each minute) keeps "5 minutes ago" current and avoids next-intl's fallback warning.
  const now = useNow({ updateInterval: 60_000 });
  const sessions = useAllSessions();
  const qc = useQueryClient();
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);

  const open = async (f: File) => {
    try {
      const session = fromVlab(JSON.parse(await f.text()));
      await getDb().sessions.put(session);
      await qc.invalidateQueries({ queryKey: sessionKeys.all });
      router.push(`/experiments/${session.experimentId}?s=${session.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("openFailed"));
    }
  };

  const recent = (sessions.data ?? []).slice(0, 3);

  return (
    <section aria-labelledby="continue" className="mb-10">
      <div className="mb-2 flex items-end justify-between gap-3">
        <h2 id="continue" className="text-ds-heading-5">
          {t("continueTitle")}
        </h2>
        <input ref={file} type="file" accept=".vlab,application/json" hidden onChange={(e) => e.target.files?.[0] && open(e.target.files[0])} />
        <Button size="sm" variant="outline" onClick={() => file.current?.click()}>
          <FolderOpenIcon data-icon="inline-start" />
          {t("openFile")}
        </Button>
      </div>
      {recent.length === 0 ? (
        <p className="text-ds-body-sm text-text-muted">{t("noSessions")}</p>
      ) : (
        <ul className="border-t border-rule">
          {recent.map((s) => (
            <li key={s.id} className="border-b border-rule">
              <Link href={`/experiments/${s.experimentId}?s=${s.id}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 hover:underline">
                <span className="text-ds-label-md">{tx(`${s.experimentId}.short`)}</span>
                <span className="text-ds-body-xs text-text-muted">
                  {ts(s.stage)} · {format.relativeTime(s.updatedAt, now)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
