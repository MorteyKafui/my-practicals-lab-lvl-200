"use client";

import { CaretDoubleLeftIcon, CaretDoubleRightIcon, CaretLeftIcon, CaretRightIcon, EyeIcon, TagIcon, CubeIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useBench } from "@/components/workspace/bench-store";
import { strikeFork, type StruckFork } from "@/core/audio";
import { cn } from "@/lib/utils";

import type { BenchProps } from "../types";
import { SonometerScene, type BenchSim } from "./bench";
import { FIXED_BRIDGE_CM, type StretchedWireWorld } from "./model";

const LOADS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const BRIDGE_MIN = 12;
const BRIDGE_MAX = 98;

/** The sonometer bench: the 3D scene plus the instrument cards the student works with. */
export function StretchedWireBench({ world: rawWorld, conditions, session, act }: BenchProps) {
  const world = rawWorld as StretchedWireWorld;
  const { bridgeCm, view, set } = useBench();
  const [labels, setLabels] = useState(true);
  const sound = useRef<StruckFork | undefined>(undefined);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Restore the bench from the log: load and rider position survive a reload.
  const [sim, setSim] = useState<BenchSim>(() => {
    const loads = session.actions.filter((a) => a.kind === "set-load");
    return { loadKg: loads.length ? Number(loads[loads.length - 1]!.detail?.kg) : undefined };
  });
  const ringTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ringing = Boolean(sim.ringing);
  useEffect(
    () => () => {
      sound.current?.stop();
      clearTimeout(ringTimer.current);
    },
    [],
  );

  const moveBridge = (to: number) => {
    const next = Math.min(BRIDGE_MAX, Math.max(BRIDGE_MIN, Math.round(to * 100) / 100));
    set({ bridgeCm: next });
    clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(() => act({ kind: "move-bridge", detail: { to: next } }), 500);
  };

  const strike = (onPad: boolean) => {
    if (!sim.fork) return;
    sound.current?.stop();
    sound.current = strikeFork(sim.fork.actual, { onPad, tau: world.tau });
    setSim((s) => ({ ...s, strike: { at: performance.now() / 1000, onPad }, ringing: true }));
    clearTimeout(ringTimer.current);
    ringTimer.current = setTimeout(() => setSim((s) => ({ ...s, ringing: false })), world.tau * 2000);
    act({ kind: "strike-fork", detail: { f: sim.fork.nominal, surface: onPad ? "pad" : "bench" } });
  };

  const placeRider = () => {
    const at = (FIXED_BRIDGE_CM + bridgeCm) / 2;
    setSim((s) => ({ ...s, riderCm: at, thrownAt: undefined }));
    act({ kind: "place-rider", detail: { at: Number(at.toFixed(1)) } });
  };

  const onThrown = () => {
    const at = performance.now() / 1000;
    setSim((s) => ({ ...s, riderCm: undefined, thrownAt: at, thrownFromCm: s.riderCm }));
    const current = useBench.getState().bridgeCm;
    set({ lastThrown: { f: sim.fork?.nominal ?? 0, bridgeCm: current, at: Date.now() } });
    act({ kind: "rider-thrown", detail: { f: sim.fork?.nominal ?? 0, bridgeCm: current } });
  };

  const status = !sim.loadKg
    ? "Hang a load on the wire to tension it."
    : sim.riderCm === undefined && !sim.thrownAt
      ? "Place the paper rider on the wire."
      : sim.thrownAt && sim.riderCm === undefined
        ? "The rider was thrown off. Read the bridge position on the metre rule, then place the rider again."
        : !sim.fork
          ? "Choose a tuning fork."
          : ringing
            ? "The fork is sounding on the box. Move the bridge slowly."
            : "Strike the fork on the rubber pad.";

  return (
    <div className="relative w-full bg-well">
      <div className="h-[46vh] min-h-[300px] md:h-[62vh] md:min-h-[440px]">
        <SonometerScene world={world} conditions={conditions} sim={sim} labels={labels} onThrown={onThrown} sound={sound} />
      </div>

      {/* Status: what to do next, like a lab partner reading the instructions */}
      <p className="absolute top-3 left-3 z-20 max-w-[min(420px,calc(100%-120px))] bg-sheet/95 px-3 py-2 text-ds-body-sm text-text-primary shadow-sm" aria-live="polite">
        {status}
      </p>

      {/* View controls */}
      <div className="absolute top-3 right-3 z-20 flex gap-1">
        <Button
          size="sm"
          variant={view === "eye" ? "default" : "outline"}
          className="bg-sheet"
          onClick={() => {
            const next = view === "eye" ? "bench" : "eye";
            set({ view: next });
            act({ kind: "view", detail: { mode: next } });
          }}
        >
          {view === "eye" ? <CubeIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
          {view === "eye" ? "Bench view" : "Eye level at bridge"}
        </Button>
        <Button size="icon-sm" variant={labels ? "default" : "outline"} aria-label="Show labels" aria-pressed={labels} onClick={() => setLabels((l) => !l)}>
          <TagIcon />
        </Button>
      </div>

      {/* Instrument cards */}
      <div className="relative z-20 flex flex-wrap items-end gap-2 p-3 md:absolute md:inset-x-3 md:bottom-3 md:p-0">
        <Card title="Load">
          <select
            aria-label="Total load on the wire"
            value={sim.loadKg ?? ""}
            onChange={(e) => {
              const kg = Number(e.target.value);
              setSim((s) => ({ ...s, loadKg: kg }));
              act({ kind: "set-load", detail: { kg } });
            }}
            className="figure h-8 border border-input bg-sheet px-2 text-ds-mono-sm"
          >
            <option value="" disabled>
              Choose…
            </option>
            {LOADS.map((kg) => (
              <option key={kg} value={kg}>
                {kg.toFixed(1)} kg
              </option>
            ))}
          </select>
          <span className="text-[11px] text-text-muted">hanger 0.5 kg + slotted masses</span>
        </Card>

        <Card title="Tuning forks" wide>
          <div className="grid grid-cols-4 gap-1">
            {world.forks.map((fork) => (
              <button
                key={fork.nominal}
                type="button"
                aria-pressed={sim.fork?.nominal === fork.nominal}
                onClick={() => setSim((s) => ({ ...s, fork }))}
                className={cn(
                  "figure h-8 border px-1 text-ds-mono-xs",
                  sim.fork?.nominal === fork.nominal ? "border-select text-text-primary" : "border-sheet-edge text-text-secondary hover:border-text-muted",
                )}
              >
                {fork.nominal}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="flex-1" disabled={!sim.fork} onClick={() => strike(true)}>
              Strike on rubber pad
            </Button>
            <Button size="sm" variant="outline" disabled={!sim.fork} onClick={() => strike(false)}>
              On bench
            </Button>
          </div>
        </Card>

        <Card title="Movable bridge" wide>
          <input
            type="range"
            min={BRIDGE_MIN}
            max={BRIDGE_MAX}
            step={0.01}
            value={bridgeCm}
            onChange={(e) => moveBridge(Number(e.target.value))}
            aria-label="Movable bridge position (read it on the metre rule)"
            aria-valuetext="Read the position on the metre rule"
            className="w-full accent-[var(--select)]"
          />
          <div className="flex justify-between gap-1">
            <Nudge label="Back 1 cm" onClick={() => moveBridge(bridgeCm - 1)}>
              <CaretDoubleLeftIcon />
            </Nudge>
            <Nudge label="Back 1 mm" onClick={() => moveBridge(bridgeCm - 0.1)}>
              <CaretLeftIcon />
            </Nudge>
            <Button size="sm" variant="outline" className="flex-1" onClick={placeRider} disabled={!sim.loadKg}>
              Place rider at middle
            </Button>
            <Nudge label="Forward 1 mm" onClick={() => moveBridge(bridgeCm + 0.1)}>
              <CaretRightIcon />
            </Nudge>
            <Nudge label="Forward 1 cm" onClick={() => moveBridge(bridgeCm + 1)}>
              <CaretDoubleRightIcon />
            </Nudge>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={cn("flex flex-col gap-1.5 border border-sheet-edge bg-sheet p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]", wide ? "w-full sm:w-[280px]" : "w-full sm:w-[170px]")}>
      <h3 className="text-ds-label-sm">{title}</h3>
      {children}
    </section>
  );
}

function Nudge({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button size="icon-sm" variant="outline" aria-label={label} onClick={onClick}>
      {children}
    </Button>
  );
}
