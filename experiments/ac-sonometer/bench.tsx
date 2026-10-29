"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";

import { BenchCanvas, BenchShell, InstrumentCard } from "@/components/bench/kit";
import { benchSignal } from "@/components/bench/signal";
import { Sonometer, SONO, SONOMETER_CALLOUTS, SONOMETER_HOME, sonometerEye, xOfCm } from "@/components/bench/sonometer";
import { Button } from "@/components/ui/button";
import { useBench } from "@/components/workspace/bench-store";
import { startHum, type StruckFork } from "@/core/audio";
import type { Conditions } from "@/core/environment";

import { BridgeCard, LoadCard, useBridge } from "../stretched-wire/bench-ui";
import type { BenchProps } from "../types";
import { excitation, LOADS, tension, type AcSonometerWorld } from "./model";

interface AcSim {
  loadKg?: number;
  on: boolean;
  magnetCm?: number;
  riderCm?: number;
  thrownAt?: number;
  thrownFromCm?: number;
}

const BASE_CALLOUTS = [...SONOMETER_CALLOUTS, { label: "Step-down transformer", at: [-0.62, 0.12, 0.25] as [number, number, number] }];

/** Continuous AC drive: excitation from the model at the mains frequency, rider thrown once per placement. */
function AcDriver({ world, conditions, sim, bridgeCm, sound, onThrown }: { world: AcSonometerWorld; conditions: Conditions; sim: AcSim; bridgeCm: number; sound: React.RefObject<StruckFork | undefined>; onThrown: (magnetFraction: number) => void }) {
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
  }, [sim.riderCm]);
  useFrame(() => {
    let e = 0;
    const span = bridgeCm - SONO.FIXED_BRIDGE_CM;
    if (sim.on && sim.loadKg && sim.magnetCm !== undefined && span > 1) {
      const sm = (sim.magnetCm - SONO.FIXED_BRIDGE_CM) / span;
      const sr = sim.riderCm === undefined ? 0.5 : (sim.riderCm - SONO.FIXED_BRIDGE_CM) / span;
      const inside = sm > 0 && sm < 1;
      e = inside ? excitation(world, tension(world, sim.loadKg, conditions), span / 100, conditions.mainsHz, sm, Math.min(Math.max(sr, 0), 1)) : 0;
      if (e >= 1 && sim.riderCm !== undefined && sr > 0 && sr < 1 && !fired.current) {
        fired.current = true;
        onThrown(sm);
      }
    }
    sound.current?.setResonance(e);
    benchSignal.excitation = e;
  });
  return null;
}

function Transformer({ on }: { on: boolean }) {
  return (
    <group position={[-0.62, 0, 0.25]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.16, 0.1, 0.12]} />
        <meshStandardMaterial color="#3d4a52" roughness={0.6} />
      </mesh>
      {[-0.04, 0.04].map((x, i) => (
        <mesh key={x} position={[x, 0.105, 0.03]}>
          <cylinderGeometry args={[0.008, 0.008, 0.012, 16]} />
          <meshStandardMaterial color={i ? "#1b1b1b" : "#b3261e"} />
        </mesh>
      ))}
      <mesh position={[0, 0.105, -0.03]}>
        <sphereGeometry args={[0.007, 16, 16]} />
        <meshStandardMaterial color={on ? "#ffb020" : "#6b6b6b"} emissive={on ? "#ff9a00" : "#000000"} emissiveIntensity={on ? 1.2 : 0} />
      </mesh>
    </group>
  );
}

/** Leads from the transformer terminals to the two ends of the wire. */
function Leads() {
  return (
    <>
      <Line points={[[-0.66, 0.11, 0.28], [-0.6, 0.18, 0.12], [-0.535, SONO.TOP + 0.024, SONO.WIRE_Z]]} color="#b3261e" lineWidth={2} />
      <Line points={[[-0.58, 0.11, 0.28], [0.1, 0.03, 0.3], [0.62, 0.05, 0.1], [0.618, SONO.WIRE_Y - 0.03, SONO.WIRE_Z]]} color="#1b1b1b" lineWidth={2} />
    </>
  );
}

/** A horseshoe magnet with its poles either side of the wire. */
function Magnet({ cm }: { cm?: number }) {
  if (cm === undefined) return null;
  return (
    <group position={[xOfCm(cm), SONO.WIRE_Y, SONO.WIRE_Z]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.03, side * 0.018]} castShadow>
          <boxGeometry args={[0.02, 0.07, 0.012]} />
          <meshStandardMaterial color={side < 0 ? "#b3261e" : "#9aa0a6"} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[0.02, 0.014, 0.048]} />
        <meshStandardMaterial color="#b3261e" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function AcSonometerBench({ world: rawWorld, conditions, session, act }: BenchProps) {
  const world = rawWorld as AcSonometerWorld;
  const { bridgeCm, moveBridge } = useBridge(act);
  const setBench = useBench((s) => s.set);
  const sound = useRef<StruckFork | undefined>(undefined);
  const [sim, setSim] = useState<AcSim>(() => {
    const loads = session.actions.filter((a) => a.kind === "set-load");
    return { on: false, loadKg: loads.length ? Number(loads[loads.length - 1]!.detail?.kg) : undefined };
  });
  const simRef = useRef(sim);
  useEffect(() => {
    simRef.current = sim;
  }, [sim]);
  useEffect(() => () => sound.current?.stop(), []);

  const toggle = () => {
    const on = !sim.on;
    sound.current?.stop();
    sound.current = on ? startHum(conditions.mainsHz) : undefined;
    setSim((s) => ({ ...s, on }));
    act({ kind: "switch", detail: { on } });
  };
  const middle = () => Number(((SONO.FIXED_BRIDGE_CM + bridgeCm) / 2).toFixed(1));

  const onThrown = useCallback(
    (magnetFraction: number) => {
      const s = simRef.current;
      if (s.riderCm === undefined) return;
      const current = useBench.getState().bridgeCm;
      setBench({ lastThrown: { f: 0, bridgeCm: current, at: Date.now() } });
      act({ kind: "rider-thrown", detail: { bridgeCm: current, magnetFraction: Number(magnetFraction.toFixed(2)) } });
      setSim((prev) => ({ ...prev, riderCm: undefined, thrownAt: performance.now() / 1000, thrownFromCm: prev.riderCm }));
    },
    [act, setBench],
  );

  const callouts =
    sim.magnetCm === undefined
      ? BASE_CALLOUTS
      : [...BASE_CALLOUTS, { label: "Horseshoe magnet", at: [xOfCm(sim.magnetCm), SONO.WIRE_Y + 0.09, SONO.WIRE_Z] as [number, number, number] }];

  const status = !sim.loadKg
    ? "Hang a load on the wire."
    : sim.magnetCm === undefined
      ? "Place the horseshoe magnet so its poles straddle the wire."
      : !sim.on
        ? "Switch on the low-voltage AC supply."
        : sim.riderCm === undefined && sim.thrownAt
          ? "Maximum vibration: the rider was thrown. Read the bridge on the rule, then replace the rider."
          : sim.riderCm === undefined
            ? "Place the paper rider on the wire."
            : "Move the bridge slowly and watch for the wire to vibrate most strongly.";

  return (
    <BenchShell
      status={status}
      callouts={callouts}
      eyeLabel="Eye level at bridge"
      onView={(mode) => act({ kind: "view", detail: { mode } })}
      canvas={
        <BenchCanvas label="AC sonometer on the laboratory bench" home={SONOMETER_HOME} eye={sonometerEye(bridgeCm)} callouts={callouts}>
          <Sonometer bridgeCm={bridgeCm} loadKg={sim.loadKg} riderCm={sim.riderCm} thrownAt={sim.thrownAt} thrownFromCm={sim.thrownFromCm} slotKg={0.25} />
          <Transformer on={sim.on} />
          <Leads />
          <Magnet cm={sim.magnetCm} />
          <AcDriver world={world} conditions={conditions} sim={sim} bridgeCm={bridgeCm} sound={sound} onThrown={onThrown} />
        </BenchCanvas>
      }
      cards={
        <>
          <LoadCard
            loadKg={sim.loadKg}
            loads={LOADS}
            slotKg={0.25}
            onChange={(kg) => {
              setSim((s) => ({ ...s, loadKg: kg }));
              act({ kind: "set-load", detail: { kg } });
            }}
          />
          <InstrumentCard title="Supply and magnet">
            <Button size="sm" variant={sim.on ? "default" : "outline"} aria-pressed={sim.on} onClick={toggle}>
              {sim.on ? "AC supply: on" : "AC supply: off"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const at = middle();
                setSim((s) => ({ ...s, magnetCm: at }));
                act({ kind: "place-magnet", detail: { at } });
              }}
            >
              Move magnet to middle
            </Button>
            <span className="text-[11px] text-text-muted">Reel label: μ = {(world.muLabel * 1000).toFixed(2)} g m⁻¹</span>
          </InstrumentCard>
          <BridgeCard
            bridgeCm={bridgeCm}
            moveBridge={moveBridge}
            riderDisabled={!sim.loadKg}
            onRider={() => {
              const at = middle();
              setSim((s) => ({ ...s, riderCm: at, thrownAt: undefined, thrownFromCm: undefined }));
              act({ kind: "place-rider", detail: { at } });
            }}
          />
        </>
      }
    />
  );
}
