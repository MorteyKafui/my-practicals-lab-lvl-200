"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { makeRuleTexture } from "./kit";
import { benchSignal } from "./signal";

/*
 * The sonometer, shared by the stretched-wire and AC-frequency practicals. Layout in metres:
 * the rule's 0 cm mark is at x = −0.5 (a reading r cm sits at x = −0.5 + r/100), the box top is
 * at y = 0.10 and the wire runs 3 cm above it. What drives the wire (a fork, or AC in a magnetic
 * field) lives in each practical; it writes the excitation (≥ 1 throws the rider) into a ref.
 */

export const SONO = {
  X0: -0.5,
  TOP: 0.1,
  WIRE_Y: 0.13,
  WIRE_Z: -0.012,
  RULE_Z: 0.05,
  FIXED_BRIDGE_CM: 10,
  PULLEY_X: 0.6,
} as const;
export const xOfCm = (cm: number) => SONO.X0 + cm / 100;

const WOOD = "#b98a55";
const WOOD_DARK = "#8f6438";

export interface SonometerProps {
  bridgeCm: number;
  loadKg?: number;
  /** Rider position on the scale (cm), or undefined when it is off the wire. */
  riderCm?: number;
  thrownAt?: number;
  thrownFromCm?: number;
  /** Mass of each slotted mass on the hanger, kg. */
  slotKg?: number;
}

export function Sonometer({ bridgeCm, loadKg, riderCm, thrownAt, thrownFromCm, slotKg = 0.5 }: SonometerProps) {
  return (
    <group>
      <Box />
      <Rule />
      <Bridge x={xOfCm(SONO.FIXED_BRIDGE_CM)} />
      <Bridge x={xOfCm(bridgeCm)} selected />
      <Wire bridgeCm={bridgeCm} />
      <Rider riderCm={riderCm} thrownAt={thrownAt} thrownFromCm={thrownFromCm} />
      <Load kg={loadKg} slotKg={slotKg} />
    </group>
  );
}

/** The sonometer's callouts (anchors in world space). */
export const SONOMETER_CALLOUTS = [
  { label: "Fixed bridge", at: [xOfCm(SONO.FIXED_BRIDGE_CM), SONO.TOP + 0.05, 0] as [number, number, number] },
  { label: "Metre rule", at: [0.3, SONO.TOP, SONO.RULE_Z + 0.02] as [number, number, number] },
  { label: "Pulley", at: [0.6, SONO.TOP + 0.06, 0] as [number, number, number] },
  { label: "Load", at: [0.618, -0.24, 0] as [number, number, number] },
];

/** Eye-level pose: straight down at the rule above the movable bridge. */
export function sonometerEye(bridgeCm: number) {
  const x = xOfCm(bridgeCm);
  return {
    position: [x, 1.2, SONO.RULE_Z + 0.0001] as [number, number, number],
    target: [x, SONO.TOP, SONO.RULE_Z] as [number, number, number],
    up: [0, 0, -1] as [number, number, number],
    zoom: 5200,
  };
}

export const SONOMETER_HOME = { position: [1.6, 1.45, 1.9] as [number, number, number], target: [0, 0.08, 0] as [number, number, number], zoom: 520 };

function Box() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.12, 0.1, 0.14]} />
        <meshStandardMaterial color={WOOD} roughness={0.75} />
      </mesh>
      <mesh position={[0.1, 0.05, 0.0702]}>
        <circleGeometry args={[0.022, 32]} />
        <meshStandardMaterial color="#2a1c0f" />
      </mesh>
      {[-0.56, 0.56].map((x) => (
        <mesh key={x} position={[x, 0.055, 0]}>
          <boxGeometry args={[0.012, 0.11, 0.15]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      <mesh position={[-0.535, SONO.TOP + 0.012, SONO.WIRE_Z]}>
        <cylinderGeometry args={[0.006, 0.006, 0.024, 16]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[SONO.PULLEY_X, SONO.TOP + 0.005, SONO.WIRE_Z]}>
        <boxGeometry args={[0.03, 0.05, 0.04]} />
        <meshStandardMaterial color="#6b7076" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[SONO.PULLEY_X, SONO.WIRE_Y - 0.018, SONO.WIRE_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 32]} />
        <meshStandardMaterial color="#c9ccd0" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Rule() {
  const texture = useMemo(() => makeRuleTexture(100), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, SONO.TOP + 0.0006, SONO.RULE_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1, 1 / 32]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
}

/** A hardwood wedge across the box with a thin brass pointer reaching the scale. */
function Bridge({ x, selected }: { x: number; selected?: boolean }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.009, 0);
    s.lineTo(0.009, 0);
    s.lineTo(0.0008, 0.03);
    s.lineTo(-0.0008, 0.03);
    s.closePath();
    return s;
  }, []);
  return (
    <group position={[x, SONO.TOP, 0]}>
      <mesh position={[0, 0, -0.045]} castShadow>
        <extrudeGeometry args={[shape, { depth: 0.07, bevelEnabled: false }]} />
        <meshStandardMaterial color={selected ? "#d3481b" : "#5b3b1c"} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.0012, 0.033]}>
        <boxGeometry args={[0.0005, 0.0012, 0.03]} />
        <meshStandardMaterial color="#b08a2e" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Wire({ bridgeCm }: { bridgeCm: number }) {
  const lineRef = useRef<{ geometry: { setPositions: (p: number[]) => void } } | null>(null);
  const N = 48;
  const x1 = xOfCm(SONO.FIXED_BRIDGE_CM);
  const x2 = xOfCm(bridgeCm);

  useFrame(({ clock }) => {
    // Exaggerated, slowed picture of the fundamental loop between the bridges.
    const amp = Math.min(benchSignal.excitation, 1.6) * 0.004;
    const phase = Math.sin(clock.elapsedTime * 38);
    const pts: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push(x1 + (x2 - x1) * u, SONO.WIRE_Y + amp * Math.sin(Math.PI * u) * phase, SONO.WIRE_Z);
    }
    lineRef.current?.geometry.setPositions(pts);
  });

  const initial = useMemo(() => Array.from({ length: N + 1 }, (_, i) => new THREE.Vector3(x1 + (i / N) * (x2 - x1), SONO.WIRE_Y, SONO.WIRE_Z)), [x1, x2]);
  return (
    <>
      <Line points={[[-0.535, SONO.TOP + 0.024, SONO.WIRE_Z], [x1, SONO.WIRE_Y, SONO.WIRE_Z]]} color="#7c8288" lineWidth={1.6} />
      {/* @ts-expect-error drei's Line ref exposes the Line2 geometry we update per frame */}
      <Line ref={lineRef} points={initial} color="#4d5358" lineWidth={1.8} />
      <Line points={[[x2, SONO.WIRE_Y, SONO.WIRE_Z], [SONO.PULLEY_X, SONO.WIRE_Y, SONO.WIRE_Z]]} color="#7c8288" lineWidth={1.6} />
      <Line points={[[0.618, SONO.WIRE_Y - 0.018, SONO.WIRE_Z], [0.618, -0.2, SONO.WIRE_Z]]} color="#7c8288" lineWidth={1.6} />
    </>
  );
}

/** A folded paper rider astride the wire; when thrown it flips off. */
function Rider({ riderCm, thrownAt, thrownFromCm }: { riderCm?: number; thrownAt?: number; thrownFromCm?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    const fromCm = riderCm ?? thrownFromCm;
    if (!g) return;
    g.visible = fromCm !== undefined;
    if (fromCm === undefined) return;
    const x = xOfCm(fromCm);
    if (riderCm !== undefined) {
      g.position.set(x, SONO.WIRE_Y + 0.001, SONO.WIRE_Z);
      g.rotation.set(0, 0, 0);
    } else if (thrownAt) {
      const t = Math.min(performance.now() / 1000 - thrownAt, 0.6);
      g.position.set(x + t * 0.05, SONO.WIRE_Y + 0.001 + 0.12 * t - 0.45 * t * t, SONO.WIRE_Z + t * 0.12);
      g.rotation.set(t * 9, t * 4, t * 6);
    }
  });
  return (
    <group ref={ref} visible={false}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.004, side * 0.003]} rotation={[side * -0.75, 0, 0]}>
          <planeGeometry args={[0.012, 0.01]} />
          <meshStandardMaterial color="#fffaf0" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Hanger (0.5 kg) and 0.5 kg slotted masses over the pulley. */
function Load({ kg, slotKg }: { kg?: number; slotKg: number }) {
  const slots = kg ? Math.max(0, Math.round((kg - 0.5) / slotKg)) : 0;
  if (kg === undefined) return null;
  return (
    <group position={[0.618, -0.2, SONO.WIRE_Z]}>
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.08, 8]} />
        <meshStandardMaterial color="#8a9096" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.085, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.008, 32]} />
        <meshStandardMaterial color="#8a9096" metalness={0.8} roughness={0.3} />
      </mesh>
      {Array.from({ length: slots }, (_, i) => (
        <mesh key={i} position={[0, -0.08 + 0.01 * slotKg + i * (0.02 * slotKg + 0.001), 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02 * slotKg, 32]} />
          <meshStandardMaterial color={i % 2 ? "#8c7a4a" : "#9d8a55"} metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}
