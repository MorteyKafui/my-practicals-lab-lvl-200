"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePref, writePref } from "@/lib/prefs";

/** The student's own Claude API key for optional AI feedback; kept only in this browser. */
export function ApiKeyField() {
  const t = useTranslations("settings.ai");
  const saved = usePref<string>("claude-api-key");
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col gap-2">
      {saved ? (
        <div className="flex flex-wrap items-center gap-3 text-ds-body-sm">
          <span className="figure text-text-secondary">{`${saved.slice(0, 10)}…${saved.slice(-4)}`}</span>
          <Button size="sm" variant="outline" onClick={() => writePref("claude-api-key", null)}>
            {t("remove")}
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) writePref("claude-api-key", draft.trim());
            setDraft("");
          }}
        >
          <Input type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="sk-ant-…" aria-label={t("key")} className="w-80" />
          <Button size="sm" type="submit" disabled={!draft.trim()}>
            {t("save")}
          </Button>
        </form>
      )}
      <p className="text-ds-body-xs text-text-muted">{t("privacy")}</p>
    </div>
  );
}
