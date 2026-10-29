"use client";

import { CaretLeftIcon, CaretRightIcon, CheckIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StageStatus } from "@/core/gating";
import { STAGES, type StageId } from "@/core/session";
import { cn } from "@/lib/utils";

/** The stage filmstrip along the foot of the workspace: done stages ticked, Compare locked until earned. */
export function Filmstrip({
  current,
  statuses,
  onSelect,
}: {
  current: StageId;
  statuses: StageStatus[];
  onSelect: (stage: StageId) => void;
}) {
  const t = useTranslations("stages");
  const tn = useTranslations("workspace.nav");
  const listRef = useRef<HTMLOListElement>(null);
  const currentIndex = STAGES.indexOf(current);
  const visible = statuses.filter((s) => s.state !== "skipped");
  const position = visible.findIndex((s) => s.stage === current);
  const prev = visible[position - 1];
  const next = visible[position + 1];

  useEffect(() => {
    listRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [current]);

  return (
    <nav aria-label="Stages" className="no-print sticky bottom-16 z-10 flex items-stretch gap-2 border-t border-rule bg-sheet px-2 py-2 md:bottom-0 md:px-4">
      <StepButton label={prev ? tn("previous", { stage: t(prev.stage) }) : undefined} disabled={!prev || prev.state !== "open"} onClick={() => prev && onSelect(prev.stage)}>
        <CaretLeftIcon />
      </StepButton>
      <ol ref={listRef} className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {visible.map((status) => {
          const index = STAGES.indexOf(status.stage);
          const isCurrent = status.stage === current;
          const isDone = index < currentIndex;
          const locked = status.state === "locked";
          const button = (
            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect(status.stage)}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex h-11 min-w-[112px] items-center gap-2 border px-3 text-left text-ds-label-sm whitespace-nowrap transition-colors",
                isCurrent ? "border-select text-text-primary" : "border-sheet-edge text-text-secondary hover:border-text-muted",
                locked && "cursor-not-allowed text-text-muted opacity-70 hover:border-sheet-edge",
              )}
            >
              <span className="flex-1">{t(status.stage)}</span>
              {locked ? (
                <LockSimpleIcon className="size-3.5" aria-label={t("locked")} />
              ) : isDone ? (
                <CheckIcon className="size-3.5 text-data" weight="bold" aria-hidden />
              ) : null}
            </button>
          );
          return (
            <li key={status.stage} className="shrink-0">
              {locked && status.reason ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-block" />}>{button}</TooltipTrigger>
                  <TooltipContent>{t(`why.${status.reason}`)}</TooltipContent>
                </Tooltip>
              ) : (
                button
              )}
            </li>
          );
        })}
      </ol>
      <StepButton label={next ? tn("next", { stage: t(next.stage) }) : undefined} disabled={!next || next.state !== "open"} onClick={() => next && onSelect(next.stage)} primary>
        <CaretRightIcon />
      </StepButton>
    </nav>
  );
}

function StepButton({
  children,
  label,
  disabled,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  label?: string;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex w-11 shrink-0 items-center justify-center border transition-colors disabled:opacity-40 [&_svg]:size-4",
        primary ? "border-primary bg-primary text-primary-foreground hover:bg-primary/85" : "border-sheet-edge hover:border-text-muted",
      )}
    >
      {children}
    </button>
  );
}
