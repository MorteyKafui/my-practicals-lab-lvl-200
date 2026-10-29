"use client";

import { CaretDoubleDownIcon, CaretDoubleUpIcon, CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

import { BenchCanvas, BenchShell, InstrumentCard, Nudge, Readout } from "@/components/bench/kit";
import { ResonanceTube, TUBE_CALLOUTS, TUBE_HOME, tubeEye } from "@/components/bench/resonance-tube";
import { SoundMeter } from "@/components/bench/meters";
import { benchSignal } from "@/components/bench/signal";
import { Button } from "@/components/ui/button";
import { useBench } from "@/components/workspace/bench-store";
import { strikeFork, type StruckFork } from "@/core/audio";
import type { Conditions } from "@/core/environment";
import { cn } from "@/lib/utils";

import type { BenchProps } from "../types";
import { forkAmplitude, loudness, type TubeWorld } from "./physics";

const LEVEL_MIN = 2;
const LEVEL_MAX = 98;

interface TubeSim {
  fork?: { nominal: number; actual: number };
  strikeAt?: number;
  ringing?: boolean;
}

function TubeDriver({ world, conditions, sim, levelCm, sound }: { world: TubeWorld; conditions: Conditions; sim: TubeSim; levelCm: number; sound: React.RefObject<StruckFork | undefined> }) {
  useFrame(() => {
    let level = 0;
    if (sim.fork && sim.strikeAt !== undefined) {
      const a = forkAmplitude(world, performance.now() / 1000 - sim.strikeAt);
      level = loudness(world, conditions, levelCm / 100, sim.fork.actual, a);
    }
    sound.current?.setResonance(level);
    benchSignal.excitation = level;
  });
  return null;
}

/** A digital thermometer: room temperature plus its small zero error, flickering in the last digit. */
function Thermometer({ world, conditions }: { world: TubeWorld; conditions: Conditions }) {
  const [reading, setReading] = useState(() => conditions.temperatureC + world.thermometerError);
  useEffect(() => {
    const id = setInterval(() => setReading(conditions.temperatureC + world.thermometerError + (Math.random() - 0.5) * 0.1), 1500);
    return () => clearInterval(id);
  }, [conditions.temperatureC, world.thermometerError]);
  return <Readout value={reading.toFixed(1)} unit="°C" label="Thermometer" />;
}

export function ResonanceTubeBench({ world: rawWorld, conditions, act }: BenchProps) {
  const world = rawWorld as TubeWorld;
  const levelCm = useBench((s) => s.bridgeCm);
  const setBench = useBench((s) => s.set);
  const sound = useRef<StruckFork | undefined>(undefined);
  const timers = useRef<{ move?: ReturnType<typeof setTimeout>; ring?: ReturnType<typeof setTimeout> }>({});
  const [sim, setSim] = useState<TubeSim>({});

  // The water level shares the bench store's position field (it is what the student reads on the rule).
  useEffect(() => {
    setBench({ bridgeCm: 20 });
    const t = timers.current;
    return () => {
      sound.current?.stop();
      clearTimeout(t.move);
      clearTimeout(t.ring);
    };
  }, [setBench]);

  const moveLevel = (to: number) => {
    const next = Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(to * 100) / 100));
    setBench({ bridgeCm: next });
    clearTimeout(timers.current.move);
    timers.current.move = setTimeout(() => act({ kind: "move-water", detail: { to: next } }), 500);
  };

  const strike = () => {
    if (!sim.fork) return;
    sound.current?.stop();
    sound.current = strikeFork(sim.fork.actual, { onPad: true, tau: world.tau, volume: 0.08 });
    setSim((s) => ({ ...s, strikeAt: performance.now() / 1000, ringing: true }));
    clearTimeout(timers.current.ring);
    timers.current.ring = setTimeout(() => setSim((s) => ({ ...s, ringing: false })), world.tau * 2000);
    act({ kind: "strike-fork", detail: { f: sim.fork.nominal, surface: "pad" } });
  };

  const markLoudest = () => {
    setBench({ lastThrown: { f: sim.fork?.nominal ?? 0, bridgeCm: levelCm, at: Date.now() } });
    act({ kind: "mark-resonance", detail: { f: sim.fork?.nominal ?? 0, levelCm, loudness: Number(benchSignal.excitation.toFixed(2)) } });
  };

  const status = !sim.fork
    ? "Choose a tuning fork."
    : !sim.ringing
      ? "Strike the fork on the rubber pad and hold it over the mouth of the tube."
      : "Raise or lower the water slowly and listen for the loudest sound.";

  return (
    <BenchShell
      status={status}
      callouts={TUBE_CALLOUTS}
      eyeLabel="Eye level at water"
      onView={(mode) => act({ kind: "view", detail: { mode } })}
      canvas={
        <BenchCanvas label="Resonance tube on a retort stand" home={TUBE_HOME} eye={tubeEye(levelCm)} callouts={TUBE_CALLOUTS}>
          <ResonanceTube levelCm={levelCm} forkOver={Boolean(sim.ringing)} />
          <TubeDriver world={world} conditions={conditions} sim={sim} levelCm={levelCm} sound={sound} />
        </BenchCanvas>
      }
      cards={
        <>
          <InstrumentCard title="Tuning forks" wide>
            <div className="grid grid-cols-4 gap-1">
              {world.forks.map((fork) => (
                <button
                  key={fork.nominal}
                  type="button"
                  aria-pressed={sim.fork?.nominal === fork.nominal}
                  onClick={() => setSim((s) => ({ ...s, fork }))}
                  className={cn("figure h-8 border px-1 text-ds-mono-xs", sim.fork?.nominal === fork.nominal ? "border-select" : "border-sheet-edge text-text-secondary hover:border-text-muted")}
                >
                  {fork.nominal}
                </button>
              ))}
            </div>
            <Button size="sm" disabled={!sim.fork} onClick={strike}>
              Strike and hold over the tube
            </Button>
          </InstrumentCard>
          <InstrumentCard title="Reservoir (water level)" wide>
            <input
              type="range"
              min={LEVEL_MIN}
              max={LEVEL_MAX}
              step={0.01}
              value={levelCm}
              onChange={(e) => moveLevel(Number(e.target.value))}
              aria-label="Water level in the tube (read it on the metre rule)"
              aria-valuetext="Read the level on the metre rule"
              className="w-full accent-[var(--select)]"
            />
            <div className="flex justify-between gap-1">
              <Nudge label="Raise water 1 cm" onClick={() => moveLevel(levelCm - 1)}>
                <CaretDoubleUpIcon />
              </Nudge>
              <Nudge label="Raise water 1 mm" onClick={() => moveLevel(levelCm - 0.1)}>
                <CaretUpIcon />
              </Nudge>
              <Button size="sm" variant="outline" className="flex-1" onClick={markLoudest} disabled={!sim.ringing}>
                Loudest here
              </Button>
              <Nudge label="Lower water 1 mm" onClick={() => moveLevel(levelCm + 0.1)}>
                <CaretDownIcon />
              </Nudge>
              <Nudge label="Lower water 1 cm" onClick={() => moveLevel(levelCm + 1)}>
                <CaretDoubleDownIcon />
              </Nudge>
            </div>
          </InstrumentCard>
          <InstrumentCard title="Sound level · thermometer">
            <SoundMeter />
            <Thermometer world={world} conditions={conditions} />
          </InstrumentCard>
        </>
      }
    />
  );
}
