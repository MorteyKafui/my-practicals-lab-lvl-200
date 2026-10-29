"use client";

import { CaretDoubleLeftIcon, CaretDoubleRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { SupplyCard } from "@/components/bench/cards";
import { MeterBox, PowerSupply, Rheostat } from "@/components/bench/electrical";
import { BenchCanvas, BenchShell, InstrumentCard, makeRuleTexture, Nudge, Readout, type CameraPose } from "@/components/bench/kit";
import { Button } from "@/components/ui/button";
import { useBench } from "@/components/workspace/bench-store";

import type { BenchProps } from "../types";
import { probeReading, type SlinkyWorld } from "./model";

const X0 = -0.6;
const AXIS_Y = 0.07;
const RULE_Z = 0.09;
const L_MIN = 30;
const L_MAX = 145;
const I_MAX = 3;

const HOME: CameraPose = { position: [1.4, 1.3, 1.9], target: [0.05, 0.02, 0.1], zoom: 470 };
const eyeAt = (lengthCm: number): CameraPose => ({
  position: [X0 + lengthCm / 100, 1.2, RULE_Z + 0.0001],
  target: [X0 + lengthCm / 100, 0.001, RULE_Z],
  up: [0, 0, -1],
  zoom: 5200,
});

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private length: number,
    private turns: number,
    private radius: number,
  ) {
    super();
  }
  override getPoint(t: number, target = new THREE.Vector3()) {
    const a = 2 * Math.PI * this.turns * t;
    return target.set(X0 + this.length * t, AXIS_Y + this.radius * Math.cos(a), this.radius * Math.sin(a));
  }
}

function Slinky({ world, lengthM }: { world: SlinkyWorld; lengthM: number }) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(new Helix(lengthM, world.turns, world.diameter / 2), world.turns * 14, 0.0016, 6, false),
    [lengthM, world.turns, world.diameter],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color="#c9ccd0" metalness={0.85} roughness={0.25} />
    </mesh>
  );
}

function Clamp({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.04, 0.06, 0.1]} />
        <meshStandardMaterial color="#8f6438" />
      </mesh>
    </group>
  );
}

function BenchRule() {
  const texture = useMemo(() => makeRuleTexture(150), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[X0 + 0.75, 0.001, RULE_Z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.5, 0.032]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
}

export function SlinkyBench({ world: rawWorld, conditions, act }: BenchProps) {
  const world = rawWorld as SlinkyWorld;
  const lengthCm = useBench((s) => s.bridgeCm);
  const setBench = useBench((s) => s.set);
  const [on, setOn] = useState(false);
  const [knob, setKnob] = useState(1.5);
  const [zero, setZero] = useState(0);
  const [flicker, setFlicker] = useState(0);
  const timers = useRef<{ len?: ReturnType<typeof setTimeout>; cur?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    setBench({ bridgeCm: 60 });
    const t = timers.current;
    const id = setInterval(() => setFlicker((Math.random() - 0.5) * 2), 900);
    return () => {
      clearInterval(id);
      clearTimeout(t.len);
      clearTimeout(t.cur);
    };
  }, [setBench]);

  const current = on ? knob : 0;
  const tesla = probeReading(world, conditions, lengthCm / 100, current, zero) + flicker * 0.4e-6;
  const ammeter = current * (1 + world.ammeterError);
  const centreX = X0 + lengthCm / 200;

  const setLength = (cm: number) => {
    const next = Math.min(L_MAX, Math.max(L_MIN, Math.round(cm * 100) / 100));
    setBench({ bridgeCm: next });
    clearTimeout(timers.current.len);
    timers.current.len = setTimeout(() => act({ kind: "stretch", detail: { to: next } }), 500);
  };
  const setCurrent = (a: number) => {
    const next = Math.min(I_MAX, Math.max(0, a));
    setKnob(next);
    clearTimeout(timers.current.cur);
    timers.current.cur = setTimeout(() => act({ kind: "set-current", detail: { a: Number(next.toFixed(3)) } }), 600);
  };

  const status = zero === 0
    ? "With the supply off, zero the teslameter with the probe at the centre of the slinky."
    : !on
      ? "Switch on the supply and set a steady current."
      : "Stretch the slinky to a length, read L on the rule and B on the teslameter.";

  const callouts = [
    { label: "Slinky", at: [centreX, AXIS_Y + 0.06, 0] as [number, number, number] },
    { label: "Hall probe", at: [centreX, AXIS_Y, 0.22] as [number, number, number] },
    { label: "Metre rule", at: [0.6, 0, RULE_Z + 0.03] as [number, number, number] },
    { label: "Power supply", at: [-0.92, 0.14, 0.32] as [number, number, number] },
    { label: "Rheostat", at: [-0.5, 0.1, 0.36] as [number, number, number] },
  ];

  return (
    <BenchShell
      status={status}
      callouts={callouts}
      eyeLabel="Eye level at slinky end"
      onView={(mode) => act({ kind: "view", detail: { mode } })}
      canvas={
        <BenchCanvas label="Slinky stretched along a metre rule with a Hall probe at its centre" home={HOME} eye={eyeAt(lengthCm)} callouts={callouts}>
          <Slinky world={world} lengthM={lengthCm / 100} />
          <Clamp x={X0 - 0.02} />
          <Clamp x={X0 + lengthCm / 100 + 0.02} />
          <BenchRule />
          {/* Hall probe on its stand, tip at the centre of the slinky */}
          <mesh position={[centreX, AXIS_Y, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.32, 12]} />
            <meshStandardMaterial color="#2c2c2c" />
          </mesh>
          <MeterBox position={[centreX, 0, 0.38]} />
          <PowerSupply position={[-0.92, 0, 0.32]} on={on} />
          <Rheostat position={[-0.5, 0, 0.36]} fraction={knob / I_MAX} />
          <MeterBox position={[-0.2, 0, 0.38]} />
          <Line points={[[-0.9, 0.06, 0.24], [X0 - 0.02, 0.06, 0.05], [X0, AXIS_Y, 0]]} color="#b3261e" lineWidth={2} />
          <Line points={[[-0.84, 0.06, 0.24], [-0.5, 0.05, 0.3], [-0.2, 0.05, 0.33], [X0 + lengthCm / 100 + 0.03, 0.06, 0.05], [X0 + lengthCm / 100, AXIS_Y, 0]]} color="#1b1b1b" lineWidth={2} />
        </BenchCanvas>
      }
      cards={
        <>
          <SupplyCard
            on={on}
            knob={knob}
            max={I_MAX}
            ammeter={ammeter}
            onToggle={() => {
              setOn(!on);
              act({ kind: "power", detail: { on: !on } });
            }}
            onKnob={setCurrent}
          />
          <InstrumentCard title="Teslameter (Hall probe)">
            <Readout value={(tesla * 1000).toFixed(3)} unit="mT" label="Teslameter" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Zeroing subtracts everything the probe sees right now — including the slinky's field if the current is on.
                setZero(probeReading(world, conditions, lengthCm / 100, current, 0));
                act({ kind: "zero-probe", detail: { currentOn: on && knob > 0.001 } });
              }}
            >
              Zero
            </Button>
            <span className="text-[11px] text-text-muted">Background now: {zero === 0 ? "not zeroed" : "zeroed"}</span>
          </InstrumentCard>
          <InstrumentCard title="Slinky length" wide>
            <input
              type="range"
              min={L_MIN}
              max={L_MAX}
              step={0.01}
              value={lengthCm}
              onChange={(e) => setLength(Number(e.target.value))}
              aria-label="Slinky length (read it on the metre rule)"
              aria-valuetext="Read the length on the metre rule"
              className="w-full accent-[var(--select)]"
            />
            <div className="flex justify-between gap-1">
              <Nudge label="Shorter 1 cm" onClick={() => setLength(lengthCm - 1)}>
                <CaretDoubleLeftIcon />
              </Nudge>
              <Nudge label="Shorter 1 mm" onClick={() => setLength(lengthCm - 0.1)}>
                <CaretLeftIcon />
              </Nudge>
              <span className="flex-1 self-center text-center text-[11px] text-text-muted">{world.turns} turns (count on label)</span>
              <Nudge label="Longer 1 mm" onClick={() => setLength(lengthCm + 0.1)}>
                <CaretRightIcon />
              </Nudge>
              <Nudge label="Longer 1 cm" onClick={() => setLength(lengthCm + 1)}>
                <CaretDoubleRightIcon />
              </Nudge>
            </div>
          </InstrumentCard>
        </>
      }
    />
  );
}

