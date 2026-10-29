"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";

/** The interactive anatomy figure (light or dark to match the app) with its downloads. */
export function AnatomyView({ figure, title }: { figure: string; title: string }) {
  const t = useTranslations("apparatusPage");
  const { resolvedTheme } = useTheme();
  const src = `/anatomy/${figure}${resolvedTheme === "dark" ? "" : "-light"}.html`;
  return (
    <div className="flex flex-col gap-4">
      <iframe key={src} src={src} title={title} className="aspect-[650/500] w-full max-w-[760px] border border-sheet-edge bg-sheet" />
      <div className="flex flex-wrap gap-2">
        {(["svg", "png", "pdf"] as const).map((ext) => (
          <a key={ext} href={`/anatomy/${figure}.${ext}`} download className={buttonVariants({ variant: "outline", size: "sm" })}>
            <DownloadSimpleIcon data-icon="inline-start" />
            {t(`download.${ext}`)}
          </a>
        ))}
      </div>
      <p className="text-ds-body-xs text-text-muted">{t("controls")}</p>
    </div>
  );
}
