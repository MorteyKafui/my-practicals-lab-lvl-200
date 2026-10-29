"use client";

import { ArrowCounterClockwiseIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatElapsed, type LabAction } from "@/core/action-log";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 2, 4, 8] as const;

/**
 * The lab log with replay: play the session back in (scaled) real time to see how you worked —
 * where you hurried, what you repeated, what you never did.
 */
export function LogReplay({ actions, line }: { actions: readonly LabAction[]; line: (a: LabAction) => string }) {
  const t = useTranslations("workspace.replay");
  const end = actions.length ? actions[actions.length - 1]!.t : 0;
  const [cursor, setCursor] = useState<number | null>(null); // null = show everything (live log)
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4);
  const last = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = (now: number) => {
      const dt = last.current === undefined ? 0 : now - last.current;
      last.current = now;
      setCursor((c) => {
        const next = (c ?? 0) + dt * speed;
        if (next >= end) {
          setPlaying(false);
          return end;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = undefined;
    };
  }, [playing, speed, end]);

  const shown = cursor === null ? actions : actions.filter((a) => a.t <= cursor);
  const current = cursor === null ? undefined : shown[shown.length - 1];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="outline"
          aria-label={playing ? t("pause") : t("play")}
          onClick={() => {
            if (!playing && (cursor === null || cursor >= end)) setCursor(0);
            setPlaying(!playing);
          }}
          disabled={actions.length === 0}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label={t("restart")}
          onClick={() => {
            setPlaying(false);
            setCursor(null);
          }}
        >
          <ArrowCounterClockwiseIcon />
        </Button>
        <input
          type="range"
          min={0}
          max={Math.max(end, 1)}
          value={cursor ?? end}
          onChange={(e) => {
            setPlaying(false);
            setCursor(Number(e.target.value));
          }}
          aria-label={t("scrub")}
          className="mx-2 min-w-0 flex-1 accent-[var(--select)]"
        />
        <span className="figure w-12 text-right text-ds-mono-xs text-text-muted">{formatElapsed(cursor ?? end)}</span>
        <select
          aria-label={t("speed")}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}
          className="figure h-7 border border-input bg-sheet px-1 text-ds-mono-xs"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </div>
      {actions.length === 0 ? (
        <p className="text-ds-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <ol className="figure flex max-h-[60vh] flex-col overflow-y-auto text-ds-mono-xs" aria-live="polite">
          {[...shown].reverse().slice(0, 300).map((a, i) => (
            <li key={`${a.t}-${i}`} className={cn("flex gap-3 border-b border-rule py-1.5", a === current && "bg-status-warning-bg/60")}>
              <span className="text-text-muted">{formatElapsed(a.t)}</span>
              <span className="min-w-0 flex-1 font-sans text-ds-body-xs text-text-secondary">{line(a)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
