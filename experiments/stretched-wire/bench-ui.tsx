"use client";

import { CaretDoubleLeftIcon, CaretDoubleRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BenchCanvas, BenchShell, InstrumentCard, Nudge } from "@/components/bench/kit";
import { Sonometer, SONOMETER_CALLOUTS, SONOMETER_HOME, sonometerEye, SONO } from "@/components/bench/sonometer";
import { Button } from "@/components/ui/button";
import { useBench } from "@/components/workspace/bench-store";
import { strikeFork, type StruckFork } from "@/core/audio";
import { cn } from "@/lib/utils";

import type { BenchProps } from "../types";
import { FORK_CALLOUTS, ForkDriver, ForkRack, type ForkSim } from "./bench";
import type { StretchedWireWorld } from "./model";

const LOADS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
export const BRIDGE_MIN = 12;
export const BRIDGE_MAX = 98;
const CALLOUTS = [...SONOMETER_CALLOUTS, ...FORK_CALLOUTS];

/** Moving the bridge: immediate on the bench, logged once the student stops. */
export function useBridge(act: BenchProps["act"]) {
  const bridgeCm = useBench((s) => s.bridgeCm);
  const set = useBench((s) => s.set);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const moveBridge = useCallback(
    (to: number) => {
      const next = Math.min(BRIDGE_MAX, Math.max(BRIDGE_MIN, Math.round(to * 100) / 100));
      set({ bridgeCm: next });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => act({ kind: "move-bridge", detail: { to: next } }), 500);
    },
    [act, set],
  );
  return { bridgeCm, moveBridge };
}

/** The sonometer bench driven by tuning forks. */
export function StretchedWireBench({ world: rawWorld, conditions, session, act }: BenchProps) {
  const world = rawWorld as StretchedWireWorld;
  const { bridgeCm, moveBridge } = useBridge(act);
  const setBench = useBench((s) => s.set);
  const sound = useRef<StruckFork | undefined>(undefined);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The load survives a reload (it is in the log); the rider must be placed again.
  const [sim, setSim] = useState<ForkSim>(() => {
    const loads = session.actions.filter((a) => a.kind === "set-load");
    return { loadKg: loads.length ? Number(loads[loads.length - 1]!.detail?.kg) : undefined };
  });
  useEffect(
    () => () => {
      sound.current?.stop();
      clearTimeout(ringTimer.current);
    },
    [],
  );

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
    const at = (SONO.FIXED_BRIDGE_CM + bridgeCm) / 2;
    setSim((s) => ({ ...s, riderCm: at, thrownAt: undefined, thrownFromCm: undefined }));
    act({ kind: "place-rider", detail: { at: Number(at.toFixed(1)) } });
  };

  const simRef = useRef(sim);
  useEffect(() => {
    simRef.current = sim;
  }, [sim]);

  const onThrown = useCallback(() => {
    const s = simRef.current;
    if (s.riderCm === undefined) return;
    const current = useBench.getState().bridgeCm;
    setBench({ lastThrown: { f: s.fork?.nominal ?? 0, bridgeCm: current, at: Date.now() } });
    act({ kind: "rider-thrown", detail: { f: s.fork?.nominal ?? 0, bridgeCm: current } });
    setSim((prev) => ({ ...prev, riderCm: undefined, thrownAt: performance.now() / 1000, thrownFromCm: prev.riderCm }));
  }, [act, setBench]);

  const status = !sim.loadKg
    ? "Hang a load on the wire to tension it."
    : sim.riderCm === undefined && !sim.thrownAt
      ? "Place the paper rider on the wire."
      : sim.thrownAt && sim.riderCm === undefined
        ? "The rider was thrown off. Read the bridge position on the metre rule, then place the rider again."
        : !sim.fork
          ? "Choose a tuning fork."
          : sim.ringing
            ? "The fork is sounding on the box. Move the bridge slowly."
            : "Strike the fork on the rubber pad.";

  return (
    <BenchShell
      status={status}
      callouts={CALLOUTS}
      eyeLabel="Eye level at bridge"
      onView={(mode) => act({ kind: "view", detail: { mode } })}
      canvas={
        <BenchCanvas label="Sonometer on the laboratory bench" home={SONOMETER_HOME} eye={sonometerEye(bridgeCm)} callouts={CALLOUTS}>
          <Sonometer bridgeCm={bridgeCm} loadKg={sim.loadKg} riderCm={sim.riderCm} thrownAt={sim.thrownAt} thrownFromCm={sim.thrownFromCm} />
          <ForkRack world={world} sim={sim} />
          <ForkDriver world={world} conditions={conditions} sim={sim} bridgeCm={bridgeCm} sound={sound} onThrown={onThrown} />
        </BenchCanvas>
      }
      cards={
        <>
          <LoadCard loadKg={sim.loadKg} onChange={(kg) => {
            setSim((s) => ({ ...s, loadKg: kg }));
            act({ kind: "set-load", detail: { kg } });
          }} />
          <InstrumentCard title="Tuning forks" wide>
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
          </InstrumentCard>
          <BridgeCard bridgeCm={bridgeCm} moveBridge={moveBridge} onRider={placeRider} riderDisabled={!sim.loadKg} />
        </>
      }
    />
  );
}

export function LoadCard({ loadKg, onChange, loads = LOADS, slotKg = 0.5 }: { loadKg?: number; onChange: (kg: number) => void; loads?: number[]; slotKg?: number }) {
  return (
    <InstrumentCard title="Load">
      <select
        aria-label="Total load on the wire"
        value={loadKg ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="figure h-8 border border-input bg-sheet px-2 text-ds-mono-sm"
      >
        <option value="" disabled>
          Choose…
        </option>
        {loads.map((kg) => (
          <option key={kg} value={kg}>
            {kg.toFixed(2)} kg
          </option>
        ))}
      </select>
      <span className="text-[11px] text-text-muted">hanger 0.5 kg + {slotKg} kg slotted masses</span>
    </InstrumentCard>
  );
}

/** The movable bridge: no number shown — the student reads the metre rule. */
export function BridgeCard({ bridgeCm, moveBridge, onRider, riderDisabled }: { bridgeCm: number; moveBridge: (to: number) => void; onRider: () => void; riderDisabled: boolean }) {
  return (
    <InstrumentCard title="Movable bridge" wide>
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
        <Button size="sm" variant="outline" className="flex-1" onClick={onRider} disabled={riderDisabled}>
          Place rider at middle
        </Button>
        <Nudge label="Forward 1 mm" onClick={() => moveBridge(bridgeCm + 0.1)}>
          <CaretRightIcon />
        </Nudge>
        <Nudge label="Forward 1 cm" onClick={() => moveBridge(bridgeCm + 1)}>
          <CaretDoubleRightIcon />
        </Nudge>
      </div>
    </InstrumentCard>
  );
}
