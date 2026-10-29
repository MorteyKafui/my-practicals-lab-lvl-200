"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { BenchCanvas, BenchShell, InstrumentCard, Nudge, Readout, type CameraPose } from "@/components/bench/kit";
import { SoundMeter } from "@/components/bench/meters";
import { benchSignal } from "@/components/bench/signal";
import { Button } from "@/components/ui/button";
import { startTone, type Tone } from "@/core/audio";
import type { Conditions } from "@/core/environment";

import type { BenchProps } from "../types";
import { response, type HelmholtzWorld } from "./model";

const HOME: CameraPose = { position: [1.2, 0.95, 1.6], target: [0.02, -0.03, 0.05], zoom: 760 };
const CALLOUTS = [
  { label: "Flask resonator", at: [0, 0.2, 0] as [number, number, number] },
  { label: "Loudspeaker", at: [0.13, 0.27, 0] as [number, number, number] },
  { label: "Signal generator", at: [-0.3, 0.12, 0.05] as [number, number, number] },
  { label: "Measuring cylinder", at: [0.28, 0.2, 0.15] as [number, number, number] },
];
const BULB_R = 0.05;
const CAPACITY_CM3 = 420;

/** Height of water in a spherical bulb of radius R holding `volume` (spherical cap, solved numerically). */
function waterHeight(volumeM3: number) {
  let lo = 0;
  let hi = 2 * BULB_R;
  for (let i = 0; i < 30; i++) {
    const h = (lo + hi) / 2;
    const v = (Math.PI * h * h * (3 * BULB_R - h)) / 3;
    if (v < volumeM3) lo = h;
    else hi = h;
  }
  return lo;
}

function Flask({ waterM3 }: { waterM3: number }) {
  const h = waterHeight(waterM3);
  const cy = BULB_R + 0.005;
  // Keep only the part of the inner sphere below the water surface.
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.005 + h)], [h]);
  return (
    <group>
      <mesh position={[0, cy, 0]}>
        <sphereGeometry args={[BULB_R, 48, 32]} />
        <meshPhysicalMaterial color="#e8f6ff" transparent opacity={0.3} roughness={0.05} side={THREE.DoubleSide} />
      </mesh>
      {h > 0.0005 && (
        <mesh position={[0, cy, 0]}>
          <sphereGeometry args={[BULB_R - 0.002, 48, 32]} />
          <meshStandardMaterial color="#5aa9d6" transparent opacity={0.75} clippingPlanes={clip} />
        </mesh>
      )}
      <mesh position={[0, 2 * BULB_R + 0.04, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.08, 32, 1, true]} />
        <meshPhysicalMaterial color="#e8f6ff" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.003, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.006, 32]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>
    </group>
  );
}

function Speaker({ on }: { on: boolean }) {
  const cone = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (cone.current) cone.current.position.x = on ? -0.012 + Math.sin(clock.elapsedTime * 60) * 0.0008 * (0.3 + benchSignal.excitation) : -0.012;
  });
  return (
    <group position={[0.11, 2 * BULB_R + 0.09, 0]} rotation={[0, 0, Math.PI / 2.4]}>
      <mesh>
        <boxGeometry args={[0.03, 0.06, 0.06]} />
        <meshStandardMaterial color="#2e2e2e" />
      </mesh>
      <mesh ref={cone} position={[-0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.025, 0.012, 32, 1, true]} />
        <meshStandardMaterial color="#5a5a5a" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Generator({ on }: { on: boolean }) {
  return (
    <group position={[-0.3, 0, 0.05]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.14]} />
        <meshStandardMaterial color="#d9dcd6" roughness={0.6} />
      </mesh>
      <mesh position={[-0.03, 0.065, 0.0705]}>
        <planeGeometry args={[0.09, 0.03]} />
        <meshStandardMaterial color={on ? "#1f2a1f" : "#3a3a3a"} emissive={on ? "#4a8a40" : "#000"} emissiveIntensity={on ? 0.4 : 0} />
      </mesh>
      <mesh position={[0.06, 0.05, 0.075]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.012, 24]} />
        <meshStandardMaterial color="#2e2e2e" />
      </mesh>
    </group>
  );
}

function Cylinder3D() {
  return (
    <group position={[0.28, 0, 0.15]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.2, 24, 1, true]} />
        <meshPhysicalMaterial color="#eef8ff" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.004, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.008, 24]} />
        <meshStandardMaterial color="#2c6fb0" />
      </mesh>
    </group>
  );
}

function Driver({ world, conditions, waterM3, f, on, tone }: { world: HelmholtzWorld; conditions: Conditions; waterM3: number; f: number; on: boolean; tone: React.RefObject<Tone | undefined> }) {
  useFrame(() => {
    const level = on ? Math.min(1.2, response(world, conditions, waterM3, f)) : 0;
    benchSignal.excitation = level;
    tone.current?.setResonance(level);
  });
  return null;
}

/**
 * A 100 ml measuring cylinder with 1 ml graduations. Left: the whole cylinder. Right: a magnified
 * view around the meniscus (as if your eye were level with it) so 1 ml divisions can be read.
 */
function MeasuringCylinder({ ml }: { ml: number }) {
  const top = 12;
  const bottom = 212;
  const y = (v: number) => bottom - (v / 100) * (bottom - top);
  // Magnified window: 7 px per ml, centred on the meniscus.
  const k = 7;
  const centre = 112;
  const yz = (v: number) => centre - (v - ml) * k;
  const lo = Math.max(0, Math.floor(ml - 15));
  const hi = Math.min(100, Math.ceil(ml + 15));
  return (
    <svg viewBox="0 0 240 224" className="h-44 w-full" role="img" aria-label="Measuring cylinder scale, with a magnified view of the meniscus">
      <defs>
        <clipPath id="zoom">
          <rect x="110" y="8" width="126" height="208" />
        </clipPath>
      </defs>
      {/* Whole cylinder */}
      <rect x="30" y={top - 6} width="34" height={bottom - top + 6} fill="#f4fbff" stroke="#9aa0a6" />
      <rect x="31" y={y(ml)} width="32" height={Math.max(0, bottom - y(ml))} fill="#b9dcf2" />
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i}>
          <line x1={64} x2={72} y1={y(i * 10)} y2={y(i * 10)} stroke="#111" strokeWidth={0.8} />
          <text x={75} y={y(i * 10) + 3} fontSize="8" fill="#111">
            {i * 10}
          </text>
        </g>
      ))}
      <rect x="28" y={y(ml) - 8} width="38" height="16" fill="none" stroke="#d3481b" strokeWidth="1" />
      <line x1="66" y1={y(ml)} x2="110" y2={centre} stroke="#d3481b" strokeWidth="0.6" />
      {/* Magnified view */}
      <rect x="110" y="8" width="126" height="208" fill="#ffffff" stroke="#9aa0a6" />
      <g clipPath="url(#zoom)">
        <rect x="111" y={yz(ml)} width="70" height="220" fill="#b9dcf2" />
        <path d={`M111 ${yz(ml) - 4} Q146 ${yz(ml) + 6} 181 ${yz(ml) - 4}`} fill="none" stroke="#2f6fa0" strokeWidth="1.5" />
        {Array.from({ length: hi - lo + 1 }, (_, i) => {
          const v = lo + i;
          return (
            <g key={v}>
              <line x1={181} x2={v % 5 === 0 ? 205 : 195} y1={yz(v)} y2={yz(v)} stroke="#111" strokeWidth={v % 5 === 0 ? 1.2 : 0.8} />
              {v % 5 === 0 && (
                <text x={208} y={yz(v) + 4} fontSize="11" fill="#111">
                  {v}
                </text>
              )}
            </g>
          );
        })}
      </g>
      <text x="4" y="20" fontSize="8" fill="#5a5042">
        ml
      </text>
    </svg>
  );
}

export function HelmholtzBench({ world: rawWorld, conditions, act }: BenchProps) {
  const world = rawWorld as HelmholtzWorld;
  const [waterM3, setWater] = useState(0);
  const [cylinderMl, setCylinder] = useState(0);
  const [f, setF] = useState(150);
  const [on, setOn] = useState(false);
  const [display, setDisplay] = useState(150);
  const tone = useRef<Tone | undefined>(undefined);
  const sweepTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    tone.current?.setFrequency(f);
    // The display shows whole hertz, settling a moment after the knob stops.
    const id = setTimeout(() => setDisplay(Math.round(f)), 120);
    return () => clearTimeout(id);
  }, [f]);
  useEffect(
    () => () => {
      tone.current?.stop();
      clearTimeout(sweepTimer.current);
    },
    [],
  );

  const setFrequency = (next: number) => {
    const clamped = Math.min(900, Math.max(50, next));
    setF(clamped);
    clearTimeout(sweepTimer.current);
    sweepTimer.current = setTimeout(() => act({ kind: "sweep", detail: { f: Math.round(clamped) } }), 600);
  };

  const toggle = () => {
    const next = !on;
    tone.current?.stop();
    tone.current = next ? startTone(f) : undefined;
    setOn(next);
    act({ kind: "speaker", detail: { on: next } });
  };

  const pour = () => {
    const added = Math.min(cylinderMl * 1e-6, CAPACITY_CM3 * 1e-6 - waterM3);
    if (added <= 0) return;
    setWater((w) => w + added);
    setCylinder(0);
    act({ kind: "pour", detail: { trueCm3: Number((added * 1e6).toFixed(2)) } });
  };

  const status = !on
    ? "Switch on the loudspeaker at the mouth of the flask."
    : "Sweep the frequency slowly and find where the flask resonates (loudest). Then add water from the measuring cylinder.";

  // Logarithmic coarse knob: 50–900 Hz.
  const knob = Math.log(f / 50) / Math.log(900 / 50);

  return (
    <BenchShell
      status={status}
      callouts={CALLOUTS}
      canvas={
        <BenchCanvas label="Flask resonator with loudspeaker and signal generator" home={HOME} callouts={CALLOUTS}>
          <Flask waterM3={waterM3} />
          <Speaker on={on} />
          <Generator on={on} />
          <Cylinder3D />
          <Driver world={world} conditions={conditions} waterM3={waterM3} f={f} on={on} tone={tone} />
        </BenchCanvas>
      }
      cards={
        <>
          <InstrumentCard title="Signal generator" wide>
            <Readout value={on ? String(display) : "----"} unit="Hz" label="Signal generator frequency" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.0005}
              value={knob}
              onChange={(e) => setFrequency(50 * (900 / 50) ** Number(e.target.value))}
              aria-label="Frequency knob"
              className="w-full accent-[var(--select)]"
            />
            <div className="flex gap-1">
              <Nudge label="Down 1 Hz" onClick={() => setFrequency(f - 1)}>
                <MinusIcon />
              </Nudge>
              <Button size="sm" variant={on ? "default" : "outline"} className="flex-1" aria-pressed={on} onClick={toggle}>
                {on ? "Loudspeaker on" : "Loudspeaker off"}
              </Button>
              <Nudge label="Up 1 Hz" onClick={() => setFrequency(f + 1)}>
                <PlusIcon />
              </Nudge>
            </div>
          </InstrumentCard>
          <InstrumentCard title="Measuring cylinder">
            <MeasuringCylinder ml={cylinderMl} />
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={cylinderMl}
              onChange={(e) => setCylinder(Number(e.target.value))}
              onPointerUp={() => act({ kind: "fill-cylinder" })}
              aria-label="Fill the cylinder (read the volume on its scale)"
              aria-valuetext="Read the volume on the cylinder's scale"
              className="w-full accent-[var(--select)]"
            />
            <Button size="sm" onClick={pour} disabled={cylinderMl <= 0}>
              Pour into flask
            </Button>
          </InstrumentCard>
          <InstrumentCard title="Flask · thermometer">
            <SoundMeter />
            <Readout value={conditions.temperatureC.toFixed(1)} unit="°C" label="Thermometer" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setWater(0);
                act({ kind: "empty" });
              }}
            >
              Empty flask
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setWater(world.unknownWater);
                act({ kind: "empty", detail: { reason: "unknown" } });
                act({ kind: "unknown" });
              }}
            >
              Pour in the unknown sample
            </Button>
          </InstrumentCard>
        </>
      }
    />
  );
}
