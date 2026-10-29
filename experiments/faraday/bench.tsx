"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { MeterBox } from "@/components/bench/electrical";
import { BenchCanvas, BenchShell, InstrumentCard, Nudge, Readout, type CameraPose } from "@/components/bench/kit";
import { OscilloscopeScreen } from "@/components/bench/oscilloscope";
import { Button } from "@/components/ui/button";

import type { BenchProps } from "../types";
import { COIL_TURNS, LABEL_TURNS_PER_M, peakCurrent, peakEmf, VOLTS_PER_DIV, type FaradayWorld } from "./model";

const HOME: CameraPose = { position: [1.3, 1.1, 1.8], target: [0, 0.04, 0.12], zoom: 560 };
const CALLOUTS = [
  { label: "Solenoid", at: [-0.12, 0.16, 0] as [number, number, number] },
  { label: "Search coil (inside)", at: [0, 0.08, 0.09] as [number, number, number] },
  { label: "Signal generator", at: [-0.48, 0.14, 0.32] as [number, number, number] },
  { label: "Oscilloscope", at: [0.42, 0.2, 0.3] as [number, number, number] },
  { label: "a.c. ammeter", at: [-0.1, 0.1, 0.38] as [number, number, number] },
];
const label = (v: number) => (v < 1 ? `${Math.round(v * 1000)} mV` : `${v} V`);

/** A long solenoid: a former wound with closely spaced copper turns (drawn as a striped texture). */
function Solenoid() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 8;
    const g = c.getContext("2d")!;
    for (let x = 0; x < 1024; x += 4) {
      g.fillStyle = x % 8 === 0 ? "#b5652a" : "#d48a4a";
      g.fillRect(x, 0, 4, 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.5, 48, 1, true]} />
        <meshStandardMaterial map={texture} metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Search coil at the centre, seen through the open ends */}
      <mesh>
        <torusGeometry args={[0.01, 0.003, 12, 32]} />
        <meshStandardMaterial color="#2c5f9e" />
      </mesh>
      {[-0.26, 0.26].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 48, 1, true]} />
          <meshStandardMaterial color="#8f6438" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Scope({ on }: { on: boolean }) {
  return (
    <group position={[0.42, 0, 0.3]}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.24, 0.16, 0.2]} />
        <meshStandardMaterial color="#c9ccc4" roughness={0.6} />
      </mesh>
      <mesh position={[-0.03, 0.09, 0.101]}>
        <planeGeometry args={[0.13, 0.1]} />
        <meshStandardMaterial color="#0f1a12" emissive={on ? "#1e4d22" : "#000"} emissiveIntensity={on ? 0.6 : 0} />
      </mesh>
    </group>
  );
}

function Generator({ on }: { on: boolean }) {
  return (
    <group position={[-0.48, 0, 0.32]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.22, 0.12, 0.16]} />
        <meshStandardMaterial color="#d9dcd6" roughness={0.6} />
      </mesh>
      <mesh position={[-0.03, 0.075, 0.081]}>
        <planeGeometry args={[0.1, 0.03]} />
        <meshStandardMaterial color={on ? "#1f2a1f" : "#3a3a3a"} emissive={on ? "#4a8a40" : "#000"} emissiveIntensity={on ? 0.4 : 0} />
      </mesh>
    </group>
  );
}

export function FaradayBench({ world: rawWorld, act }: BenchProps) {
  const world = rawWorld as FaradayWorld;
  const [on, setOn] = useState(false);
  const [f, setF] = useState(500);
  const [amp, setAmp] = useState(1.5);
  const [vdiv, setVdiv] = useState(0.05);
  const [display, setDisplay] = useState(500);
  const timers = useRef<{ f?: ReturnType<typeof setTimeout>; a?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    const id = setTimeout(() => setDisplay(Math.round(f)), 120);
    return () => clearTimeout(id);
  }, [f]);
  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.f);
      clearTimeout(t.a);
    };
  }, []);

  const i0 = on ? peakCurrent(world, amp, f) : 0;
  const irmsShown = (i0 / Math.SQRT2) * (1 + world.ammeterError);
  const e0 = peakEmf(world, i0, f);

  const setFrequency = (next: number) => {
    const v = Math.min(3000, Math.max(100, next));
    setF(v);
    clearTimeout(timers.current.f);
    timers.current.f = setTimeout(() => act({ kind: "frequency", detail: { f: Math.round(v) } }), 600);
  };
  const setAmplitude = (next: number) => {
    const v = Math.min(10, Math.max(0, next));
    setAmp(v);
    clearTimeout(timers.current.a);
    timers.current.a = setTimeout(() => act({ kind: "amplitude", detail: { v: Number(v.toFixed(3)) } }), 600);
  };
  const knob = Math.log(f / 100) / Math.log(30);

  const status = !on
    ? "Switch on the generator's output."
    : "Choose a current and keep it constant: after each change of frequency, adjust the amplitude until the ammeter reads the same.";

  return (
    <BenchShell
      status={status}
      callouts={CALLOUTS}
      canvas={
        <BenchCanvas label="Solenoid with a search coil, signal generator and oscilloscope" home={HOME} callouts={CALLOUTS}>
          <Solenoid />
          <Generator on={on} />
          <Scope on={on} />
          <MeterBox position={[-0.1, 0, 0.38]} />
          <Line points={[[-0.4, 0.08, 0.24], [-0.32, 0.07, 0.05], [-0.26, 0.07, 0]]} color="#b3261e" lineWidth={2} />
          <Line points={[[-0.44, 0.06, 0.24], [-0.1, 0.05, 0.33], [0.2, 0.05, 0.1], [0.26, 0.07, 0]]} color="#1b1b1b" lineWidth={2} />
          <Line points={[[0.02, 0.07, 0.02], [0.27, 0.03, 0.12], [0.35, 0.08, 0.2]]} color="#2c5f9e" lineWidth={1.6} />
        </BenchCanvas>
      }
      cards={
        <>
          <InstrumentCard title="Signal generator" wide>
            <Readout value={on ? String(display) : "----"} unit="Hz" label="Signal generator frequency" />
            <input type="range" min={0} max={1} step={0.0005} value={knob} onChange={(e) => setFrequency(100 * 30 ** Number(e.target.value))} aria-label="Frequency knob" className="w-full accent-[var(--select)]" />
            <div className="flex items-center gap-1">
              <Nudge label="Down 1 Hz" onClick={() => setFrequency(f - 1)}>
                <MinusIcon />
              </Nudge>
              <Nudge label="Up 1 Hz" onClick={() => setFrequency(f + 1)}>
                <PlusIcon />
              </Nudge>
              <span className="ml-1 text-[11px] text-text-muted">Amplitude</span>
              <input type="range" min={0} max={10} step={0.005} value={amp} onChange={(e) => setAmplitude(Number(e.target.value))} aria-label="Amplitude knob" className="min-w-0 flex-1 accent-[var(--select)]" />
            </div>
            <Button
              size="sm"
              variant={on ? "default" : "outline"}
              aria-pressed={on}
              onClick={() => {
                setOn(!on);
                act({ kind: "power", detail: { on: !on } });
              }}
            >
              {on ? "Output on" : "Output off"}
            </Button>
          </InstrumentCard>
          <InstrumentCard title="a.c. ammeter (r.m.s.)">
            <Readout value={(irmsShown * 1000).toFixed(0)} unit="mA" label="a.c. ammeter" />
            <span className="text-[11px] text-text-muted">
              Solenoid: n = {LABEL_TURNS_PER_M} m⁻¹ · search coil: {COIL_TURNS} turns, d = {(world.coilDiameter * 100).toFixed(2)} cm (vernier)
            </span>
          </InstrumentCard>
          <InstrumentCard title="Oscilloscope" wide>
            <OscilloscopeScreen peakV={e0} voltsPerDiv={vdiv} on={on} />
            <label className="flex items-center gap-2 text-[11px] text-text-muted">
              Volts/div
              <select
                value={vdiv}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVdiv(v);
                  act({ kind: "volts-div", detail: { label: label(v) } });
                }}
                className="figure h-7 flex-1 border border-input bg-sheet px-1 text-ds-mono-xs text-text-primary"
              >
                {VOLTS_PER_DIV.map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </select>
            </label>
          </InstrumentCard>
        </>
      }
    />
  );
}
