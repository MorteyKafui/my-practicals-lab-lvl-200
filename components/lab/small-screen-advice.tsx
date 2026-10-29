"use client";

import { DesktopIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMediaQuery, usePref, writePref } from "@/lib/prefs";

const QUERY = "(max-width: 1023px), (hover: none) and (pointer: coarse)";
const CHOICE_KEY = "small-screen-advice";
const REMIND_AFTER_MS = 1000 * 60 * 60 * 24; // "Remind me later" = tomorrow

type Choice = { choice: "continue" } | { choice: "later"; at: number };

/**
 * Advises (never forces) a larger device. Shows once on narrow or touch-only screens;
 * "Continue" is remembered, "Remind me later" asks again after a day. A quiet banner
 * on the phone layout can reopen it.
 */
export function SmallScreenAdvice() {
  const t = useTranslations("smallScreen");
  const small = useMediaQuery(QUERY);
  const saved = usePref<Choice>(CHOICE_KEY);
  const [reopened, setReopened] = useState(false);
  // Read once per mount so "later" doesn't flip back open while the page is in use.
  const [mountedAt] = useState(() => Date.now());

  const dismissed = saved?.choice === "continue" || (saved?.choice === "later" && mountedAt - saved.at < REMIND_AFTER_MS);
  const open = small && (reopened || !dismissed);

  const choose = (choice: Choice) => {
    writePref(CHOICE_KEY, choice);
    setReopened(false);
  };

  return (
    <>
      {small && !open && (
        <div className="no-print flex items-center justify-between gap-3 border-b border-sheet-edge bg-frame px-4 py-2 text-ds-body-xs text-text-muted md:hidden">
          <span>{t("banner")}</span>
          <button type="button" className="font-medium text-text-primary underline-offset-2 hover:underline" onClick={() => setReopened(true)}>
            {t("bannerAction")}
          </button>
        </div>
      )}
      <Dialog open={open} onOpenChange={(next) => !next && choose({ choice: "later", at: Date.now() })}>
        <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DesktopIcon className="size-6 text-data" aria-hidden />
            <DialogTitle className="font-heading text-ds-heading-4">{t("title")}</DialogTitle>
            <DialogDescription className="text-ds-body-sm text-text-secondary">{t("body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => choose({ choice: "later", at: Date.now() })}>
              {t("later")}
            </Button>
            <Button onClick={() => choose({ choice: "continue" })}>{t("continue")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
