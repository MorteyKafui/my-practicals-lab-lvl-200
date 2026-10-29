"use client";

import { Line } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

import { SupplyCard } from "@/components/bench/cards";
import { MeterBox, PowerSupply, Rheostat } from "@/components/bench/electrical";
import { BenchCanvas, BenchShell, InstrumentCard, Readout, type CameraPose } from "@/components/bench/kit";
import { Button } from "@/components/ui/button";

import type { BenchProps } from "../types";
import { balanceReading, POLE_WIDTH_CM, type CurrentBalanceWorld } from "./model";

const I_MAX = 5;
const HOME: CameraPose = { position: [1.1, 1.0, 1.5], target: [0, 0.05, 0.05], zoom: 640 };
const CALLOUTS = [
  { label: "Top-pan balance", at: [0, 0.02, 0.16] as [number, number, number] },
  { label: "Magnets on steel yoke", at: [0, 0.2, -0.02] as [number, number, number] },
  { label: "Copper rod", at: [0.24, 0.13, 0] as [number, number, number] },
  { label: "Power supply", at: [-0.5, 0.14, 0.25] as [number, number, number] },
  { label: "Rheostat", at: [-0.2, 0.1, 0.36] as [number, number, number] },
];

function Balance() {
  return (
    <group>
      <mesh position={[0, 0.03, 0.02]} castShadow>
        <boxGeometry args={[0.22, 0.06, 0.26]} />
        <meshStandardMaterial color="#e6e8e3" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.045, 0.14]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[0.1, 0.03]} />
        <meshStandardMaterial color="#1f2a1f" />
      </mesh>
      <mesh position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.008, 40]} />
        <meshStandardMaterial color="#b9bec4" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

/** A U-shaped steel yoke carrying two flat magnets facing each other across a gap. */
function Yoke() {
  return (
    <group position={[0, 0.069, 0]}>
      <mesh position={[0, 0.006, 0]}>
        <boxGeometry args={[0.07, 0.012, 0.09]} />
        <meshStandardMaterial color="#5f6670" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, 0.05, s * 0.039]}>
            <boxGeometry args={[0.07, 0.08, 0.012]} />
            <meshStandardMaterial color="#5f6670" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.06, s * 0.028]}>
            <boxGeometry args={[POLE_WIDTH_CM / 100, 0.04, 0.01]} />
            <meshStandardMaterial color={s < 0 ? "#b3261e" : "#2c5f9e"} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The rigid copper rod through the gap, held by two clamp stands so it never touches the magnets. */
function Rod() {
  const y = 0.129;
  return (
    <group>
      <mesh position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.002, 0.002, 0.5, 12]} />
        <meshStandardMaterial color="#c47a3a" metalness={0.8} roughness={0.3} />
      </mesh>
      {[-0.24, 0.24].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, y / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, y, 12]} />
            <meshStandardMaterial color="#9aa0a6" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.005, 0]}>
            <boxGeometry args={[0.08, 0.01, 0.08]} />
            <meshStandardMaterial color="#4a4f55" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function CurrentBalanceBench({ world: rawWorld, conditions, act }: BenchProps) {
  const world = rawWorld as CurrentBalanceWorld;
  const [on, setOn] = useState(false);
  const [knob, setKnob] = useState(2);
  const [reversed, setReversed] = useState(false);
  const [tare, setTare] = useState(0);
  const [flicker, setFlicker] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const id = setInterval(() => setFlicker(Math.round((Math.random() - 0.5) * 2)), 1200);
    return () => {
      clearInterval(id);
      clearTimeout(timer.current);
    };
  }, []);

  const current = on ? knob : 0;
  const reading = balanceReading(world, conditions, current, reversed) - tare + flicker * 0.01;
  const setCurrent = (a: number) => {
    const next = Math.min(I_MAX, Math.max(0, a));
    setKnob(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => act({ kind: "set-current", detail: { a: Number(next.toFixed(3)) } }), 600);
  };

  const status = !on
    ? "Note the balance reading with no current (or tare it), then switch on."
    : "Set a current, read the ammeter and the balance. Try reversing the current.";

  return (
    <BenchShell
      status={status}
      callouts={CALLOUTS}
      canvas={
        <BenchCanvas label="Current balance: magnets on a top-pan balance with a copper rod between the poles" home={HOME} callouts={CALLOUTS}>
          <Balance />
          <Yoke />
          <Rod />
          <PowerSupply position={[-0.5, 0, 0.25]} on={on} />
          <Rheostat position={[-0.2, 0, 0.36]} fraction={knob / I_MAX} />
          <MeterBox position={[0.36, 0, 0.3]} />
          <Line points={[[-0.45, 0.06, 0.17], [-0.3, 0.1, 0.05], [-0.25, 0.129, 0]]} color={reversed ? "#1b1b1b" : "#b3261e"} lineWidth={2} />
          <Line points={[[-0.41, 0.06, 0.17], [-0.2, 0.05, 0.3], [0.36, 0.05, 0.26], [0.3, 0.12, 0.05], [0.25, 0.129, 0]]} color={reversed ? "#b3261e" : "#1b1b1b"} lineWidth={2} />
        </BenchCanvas>
      }
      cards={
        <>
          <SupplyCard
            on={on}
            knob={knob}
            max={I_MAX}
            ammeter={current * (1 + world.ammeterError)}
            onToggle={() => {
              setOn(!on);
              act({ kind: "power", detail: { on: !on } });
            }}
            onKnob={setCurrent}
          >
            <Button
              size="sm"
              variant="outline"
              aria-pressed={reversed}
              onClick={() => {
                setReversed(!reversed);
                act({ kind: "reverse", detail: { reversed: !reversed } });
              }}
            >
              {reversed ? "Current: reversed" : "Current: forward"}
            </Button>
          </SupplyCard>
          <InstrumentCard title="Top-pan balance">
            <Readout value={reading.toFixed(2)} unit="g" label="Balance" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTare(balanceReading(world, conditions, current, reversed));
                act({ kind: "tare", detail: { currentOn: on && knob > 0.001 } });
              }}
            >
              Tare (zero)
            </Button>
            <span className="text-[11px] text-text-muted">Poles {POLE_WIDTH_CM.toFixed(1)} cm wide (measure with a ruler)</span>
          </InstrumentCard>
        </>
      }
    />
  );
}
