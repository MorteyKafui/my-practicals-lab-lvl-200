"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { benchSignal } from "@/components/bench/signal";
import { SONO, xOfCm } from "@/components/bench/sonometer";
import type { StruckFork } from "@/core/audio";
import type { Conditions } from "@/core/environment";

import { forkAmplitude, riderExcitation, tension, type StretchedWireWorld } from "./model";

export interface ForkSim {
  loadKg?: number;
  fork?: { nominal: number; actual: number };
  strike?: { at: number; onPad: boolean };
  riderCm?: number;
  thrownAt?: number;
  thrownFromCm?: number;
  /** The struck fork is still sounding (set by the strike, cleared a few seconds later). */
  ringing?: boolean;
}

const WOOD_DARK = "#8f6438";

/**
 * Drives the wire from the struck fork: every frame it works out the rider's excitation from
 * the model (fork amplitude decaying, damped resonance, rider position) and throws the rider at 1.
 */
export function ForkDriver({
  world,
  conditions,
  sim,
  bridgeCm,
  sound,
  onThrown,
}: {
  world: StretchedWireWorld;
  conditions: Conditions;
  sim: ForkSim;
  bridgeCm: number;
  sound: React.RefObject<StruckFork | undefined>;
  onThrown: () => void;
}) {
  // Fire once per placement of the rider.
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
  }, [sim.riderCm]);

  useFrame(() => {
    let e = 0;
    if (sim.fork && sim.strike && sim.loadKg) {
      const t = performance.now() / 1000 - sim.strike.at;
      const a = forkAmplitude(world, t, sim.strike.onPad);
      const T = tension(world, sim.loadKg, conditions);
      const l = (bridgeCm - SONO.FIXED_BRIDGE_CM) / 100;
      const s = sim.riderCm === undefined ? 0.5 : (sim.riderCm - SONO.FIXED_BRIDGE_CM) / (bridgeCm - SONO.FIXED_BRIDGE_CM);
      e = l > 0.01 ? riderExcitation(world, T, l, sim.fork.actual, Math.min(Math.max(s, 0), 1), a) : 0;
      sound.current?.setResonance(e);
      if (e >= 1 && sim.riderCm !== undefined && s > 0 && s < 1 && !fired.current) {
        fired.current = true;
        onThrown();
      }
    }
    benchSignal.excitation = e;
  });
  return null;
}

/** Forks in their block in front of the sonometer, and the rubber pad. The ringing fork stands on the box. */
export function ForkRack({ world, sim }: { world: StretchedWireWorld; sim: ForkSim }) {
  const ringing = Boolean(sim.ringing);
  const prong = (nominal: number) => 0.11 - world.forks.findIndex((f) => f.nominal === nominal) * 0.006;
  return (
    <>
      <group position={[-0.25, 0, 0.27]}>
        <mesh position={[0, 0.015, 0]} castShadow>
          <boxGeometry args={[0.5, 0.03, 0.06]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        {world.forks.map((fork, i) =>
          ringing && sim.fork?.nominal === fork.nominal ? null : (
            <Fork key={fork.nominal} position={[-0.21 + i * 0.06, 0.03, 0]} prong={prong(fork.nominal)} active={sim.fork?.nominal === fork.nominal} />
          ),
        )}
        <mesh position={[0.36, 0.008, 0]} receiveShadow>
          <boxGeometry args={[0.1, 0.016, 0.07]} />
          <meshStandardMaterial color="#2c2c2c" roughness={0.95} />
        </mesh>
      </group>
      {ringing && sim.fork && <Fork position={[xOfCm(4), SONO.TOP, 0.035]} prong={prong(sim.fork.nominal)} active />}
    </>
  );
}

function Fork({ position, prong, active }: { position: [number, number, number]; prong: number; active: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.04, 12]} />
        <meshStandardMaterial color="#b9bec4" metalness={0.9} roughness={0.25} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.008, 0.04 + prong / 2, 0]}>
          <boxGeometry args={[0.005, prong, 0.006]} />
          <meshStandardMaterial color={active ? "#d3481b" : "#c4c9ce"} metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

export const FORK_CALLOUTS = [
  { label: "Tuning forks", at: [-0.3, 0.16, 0.27] as [number, number, number] },
  { label: "Rubber pad", at: [0.11, 0.05, 0.27] as [number, number, number] },
];
