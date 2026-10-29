"use client";

import { ContactShadows, Html, Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { useBench } from "@/components/workspace/bench-store";
import type { StruckFork } from "@/core/audio";
import type { Conditions } from "@/core/environment";
import { readPref } from "@/lib/prefs";

import { FIXED_BRIDGE_CM, forkAmplitude, riderExcitation, tension, type StretchedWireWorld } from "./model";

/*
 * World layout, in metres. The rule's 0 cm mark is at x = −0.5, so a scale reading r cm sits
 * at x = −0.5 + r/100. The box top is at y = 0.10; the wire runs 3 cm above it.
 */
const X0 = -0.5;
const TOP = 0.1;
const WIRE_Y = TOP + 0.03;
const WIRE_Z = -0.012;
const RULE_Z = 0.05;
const xOf = (cm: number) => X0 + cm / 100;

export interface BenchSim {
  loadKg?: number;
  fork?: { nominal: number; actual: number };
  strike?: { at: number; onPad: boolean };
  /** Rider position on the scale, cm; undefined when it is off the wire. */
  riderCm?: number;
  /** When the rider was thrown, and from where, for its flight animation. */
  thrownAt?: number;
  thrownFromCm?: number;
  /** The struck fork is still sounding (set by the strike, cleared a few seconds later). */
  ringing?: boolean;
}

export function SonometerScene({
  world,
  conditions,
  sim,
  labels,
  onThrown,
  sound,
}: {
  world: StretchedWireWorld;
  conditions: Conditions;
  sim: BenchSim;
  labels: boolean;
  onThrown: () => void;
  sound: React.RefObject<StruckFork | undefined>;
}) {
  const view = useBench((s) => s.view);
  const quality = readPref<"low" | "medium" | "high">("quality") ?? "medium";

  return (
    <Canvas
      dpr={quality === "low" ? 1 : [1, 1.5]}
      shadows={quality === "high"}
      gl={{ antialias: quality !== "low", preserveDrawingBuffer: true }}
      className="touch-none"
      aria-label="Sonometer on the laboratory bench"
    >
      <color attach="background" args={["#f5f6f2"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow={quality === "high"} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <Rig />
      <OrbitControls
        enabled={view === "bench"}
        enablePan={false}
        minPolarAngle={0.35}
        maxPolarAngle={1.25}
        minZoom={250}
        maxZoom={2400}
        target={[0, 0.08, 0]}
      />
      <Table />
      <Sonometer />
      <MetreRule />
      <Bridges />
      <Wire world={world} conditions={conditions} sim={sim} onThrown={onThrown} sound={sound} />
      <Rider sim={sim} />
      <Load kg={sim.loadKg} />
      <ForkRack world={world} sim={sim} />
      {quality !== "low" && <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={3} blur={2.2} far={0.6} resolution={512} />}
      {labels && view === "bench" && <Callouts />}
    </Canvas>
  );
}

/** Isometric bench camera, or an eye-level look straight down at the scale above the bridge. */
function Rig() {
  const view = useBench((s) => s.view);
  const bridgeCm = useBench((s) => s.bridgeCm);
  const target = useMemo(() => new THREE.Vector3(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const camera = state.camera as THREE.OrthographicCamera;
    const controls = state.controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    const k = 1 - Math.exp(-dt * 6);
    if (view === "eye") {
      const x = xOf(bridgeCm);
      goal.set(x, 1.2, RULE_Z + 0.0001);
      target.set(x, TOP, RULE_Z);
      camera.position.lerp(goal, k);
      camera.zoom += (5200 - camera.zoom) * k;
      camera.up.set(0, 0, -1);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    } else if (camera.up.z !== 0) {
      camera.up.set(0, 1, 0);
      camera.position.set(1.6, 1.45, 1.9);
      camera.zoom = 520;
      controls?.target.set(0, 0.08, 0);
      controls?.update();
      camera.updateProjectionMatrix();
    }
  });

  return <OrthographicCamera makeDefault position={[1.6, 1.45, 1.9]} zoom={520} near={0.01} far={20} />;
}

function Table() {
  return (
    <mesh position={[-0.12, -0.02, 0.05]} receiveShadow>
      <boxGeometry args={[1.5, 0.04, 0.9]} />
      <meshStandardMaterial color="#d8cfb8" roughness={0.9} />
    </mesh>
  );
}

const WOOD = "#b98a55";
const WOOD_DARK = "#8f6438";

function Sonometer() {
  return (
    <group>
      {/* Hollow box: top, sides, end blocks and a sound hole */}
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
      {/* Wire anchor peg at the left end */}
      <mesh position={[-0.535, TOP + 0.012, WIRE_Z]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.024, 16]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Pulley on its bracket */}
      <mesh position={[0.6, TOP + 0.005, WIRE_Z]}>
        <boxGeometry args={[0.03, 0.05, 0.04]} />
        <meshStandardMaterial color="#6b7076" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.6, WIRE_Y - 0.018, WIRE_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 32]} />
        <meshStandardMaterial color="#c9ccd0" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

/** The metre rule: a canvas texture with mm, half-cm and cm ticks and every cm numbered. */
function MetreRule() {
  const texture = useMemo(() => {
    const W = 8192;
    const H = 256;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#f4eedb";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#1a1a1a";
    const pxPerMm = W / 1000;
    for (let mm = 0; mm <= 1000; mm++) {
      const x = mm * pxPerMm;
      const len = mm % 10 === 0 ? 120 : mm % 5 === 0 ? 80 : 48;
      g.fillRect(Math.round(x) - 1, 0, mm % 10 === 0 ? 3 : 2, len);
      if (mm % 10 === 0) {
        g.font = "500 40px Inter, Arial, sans-serif";
        g.textAlign = mm === 0 ? "left" : mm === 1000 ? "right" : "center";
        g.fillText(String(mm / 10), x, 190);
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={[0, TOP + 0.0006, RULE_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1, 1 / 32]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
}

/** A bridge: a hardwood wedge across the box with a brass pointer reaching the scale. */
function BridgeShape({ x, selected }: { x: number; selected?: boolean }) {
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
    <group position={[x, TOP, 0]}>
      <mesh position={[0, 0, -0.045]} castShadow>
        <extrudeGeometry args={[shape, { depth: 0.07, bevelEnabled: false }]} />
        <meshStandardMaterial color={selected ? "#d3481b" : "#5b3b1c"} roughness={0.6} />
      </mesh>
      {/* Pointer: a thin brass tongue ending in an index edge at the bridge's apex line */}
      <mesh position={[0, 0.0012, 0.033]}>
        <boxGeometry args={[0.0005, 0.0012, 0.03]} />
        <meshStandardMaterial color="#b08a2e" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Bridges() {
  const bridgeCm = useBench((s) => s.bridgeCm);
  return (
    <>
      <BridgeShape x={xOf(FIXED_BRIDGE_CM)} />
      <BridgeShape x={xOf(bridgeCm)} selected />
    </>
  );
}

/** The wire: fixed span, vibrating segment animated from the resonance model, run to the pulley. */
function Wire({
  world,
  conditions,
  sim,
  onThrown,
  sound,
}: {
  world: StretchedWireWorld;
  conditions: Conditions;
  sim: BenchSim;
  onThrown: () => void;
  sound: React.RefObject<StruckFork | undefined>;
}) {
  const lineRef = useRef<{ geometry: { setPositions: (p: number[]) => void } } | null>(null);
  const bridgeCm = useBench((s) => s.bridgeCm);
  const N = 48;
  const thrownRef = useRef(false);

  useEffect(() => {
    thrownRef.current = sim.riderCm === undefined;
  }, [sim.riderCm]);

  useFrame(({ clock }) => {
    const x1 = xOf(FIXED_BRIDGE_CM);
    const x2 = xOf(bridgeCm);
    let excitation = 0;
    if (sim.fork && sim.strike && sim.loadKg) {
      const t = performance.now() / 1000 - sim.strike.at;
      const a = forkAmplitude(world, t, sim.strike.onPad);
      const T = tension(world, sim.loadKg, conditions);
      const l = (bridgeCm - FIXED_BRIDGE_CM) / 100;
      const s = sim.riderCm === undefined ? 0.5 : (sim.riderCm - FIXED_BRIDGE_CM) / (bridgeCm - FIXED_BRIDGE_CM);
      excitation = l > 0.01 ? riderExcitation(world, T, l, sim.fork.actual, Math.min(Math.max(s, 0), 1), a) : 0;
      sound.current?.setResonance(excitation);
      if (excitation >= 1 && sim.riderCm !== undefined && s > 0 && s < 1 && !thrownRef.current) {
        thrownRef.current = true;
        onThrown();
      }
    }
    // Visual amplitude (exaggerated, slowed) of the fundamental loop between the bridges.
    const amp = Math.min(excitation, 1.6) * 0.004;
    const phase = Math.sin(clock.elapsedTime * 38);
    const pts: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push(x1 + (x2 - x1) * u, WIRE_Y + amp * Math.sin(Math.PI * u) * phase, WIRE_Z);
    }
    lineRef.current?.geometry.setPositions(pts);
  });

  const initial = useMemo(() => Array.from({ length: 49 }, (_, i) => new THREE.Vector3(xOf(FIXED_BRIDGE_CM) + (i / 48) * 0.2, WIRE_Y, WIRE_Z)), []);
  return (
    <>
      <Line points={[[-0.535, TOP + 0.024, WIRE_Z], [xOf(FIXED_BRIDGE_CM), WIRE_Y, WIRE_Z]]} color="#7c8288" lineWidth={1.6} />
      {/* @ts-expect-error drei's Line ref exposes the Line2 geometry we update per frame */}
      <Line ref={lineRef} points={initial} color="#4d5358" lineWidth={1.8} />
      <Line points={[[xOf(bridgeCm), WIRE_Y, WIRE_Z], [0.6, WIRE_Y, WIRE_Z]]} color="#7c8288" lineWidth={1.6} />
      <Line points={[[0.618, WIRE_Y - 0.018, WIRE_Z], [0.618, -0.2, WIRE_Z]]} color="#7c8288" lineWidth={1.6} />
    </>
  );
}

/** A folded paper rider: sits astride the wire; when thrown it flips off and lands on the box. */
function Rider({ sim }: { sim: BenchSim }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = ref.current;
    const fromCm = sim.riderCm ?? sim.thrownFromCm;
    if (!g || fromCm === undefined) return;
    const x = xOf(fromCm);
    g.visible = true;
    if (sim.riderCm !== undefined) {
      g.position.set(x, WIRE_Y + 0.001, WIRE_Z);
      g.rotation.set(0, 0, 0);
    } else if (sim.thrownAt) {
      const t = Math.min(performance.now() / 1000 - sim.thrownAt, 0.6);
      g.position.set(x + t * 0.05, WIRE_Y + 0.001 + 0.12 * t - 0.45 * t * t, WIRE_Z + t * 0.12);
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

/** Hanger (0.5 kg) and 0.5 kg slotted masses hanging over the pulley. */
function Load({ kg }: { kg?: number }) {
  const slots = kg ? Math.max(0, Math.round((kg - 0.5) / 0.5)) : 0;
  return (
    <group position={[0.618, -0.2, WIRE_Z]}>
      {kg !== undefined && (
        <>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.003, 0.003, 0.08, 8]} />
            <meshStandardMaterial color="#8a9096" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.085, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.008, 32]} />
            <meshStandardMaterial color="#8a9096" metalness={0.8} roughness={0.3} />
          </mesh>
          {Array.from({ length: slots }, (_, i) => (
            <mesh key={i} position={[0, -0.075 + i * 0.011, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.01, 32]} />
              <meshStandardMaterial color={i % 2 ? "#8c7a4a" : "#9d8a55"} metalness={0.5} roughness={0.45} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/** Forks standing in their block in front of the sonometer, with a rubber pad. The ringing fork stands on the box. */
function ForkRack({ world, sim }: { world: StretchedWireWorld; sim: BenchSim }) {
  const ringing = Boolean(sim.ringing);
  return (
    <>
      <group position={[-0.25, 0, 0.27]}>
        <mesh position={[0, 0.015, 0]} castShadow>
          <boxGeometry args={[0.5, 0.03, 0.06]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        {world.forks.map((fork, i) =>
          ringing && sim.fork?.nominal === fork.nominal ? null : (
            <Fork key={fork.nominal} position={[-0.21 + i * 0.06, 0.03, 0]} prong={0.11 - i * 0.006} active={sim.fork?.nominal === fork.nominal} />
          ),
        )}
        <mesh position={[0.36, 0.008, 0]} receiveShadow>
          <boxGeometry args={[0.1, 0.016, 0.07]} />
          <meshStandardMaterial color="#2c2c2c" roughness={0.95} />
        </mesh>
      </group>
      {ringing && sim.fork && (
        <Fork position={[xOf(4), TOP, 0.035]} prong={0.11 - world.forks.findIndex((f) => f.nominal === sim.fork!.nominal) * 0.006} active />
      )}
    </>
  );
}

/** A tuning fork: stem and two prongs (higher frequency, shorter prongs). */
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

function Callouts() {
  const items: [string, [number, number, number]][] = [
    ["Fixed bridge", [xOf(FIXED_BRIDGE_CM), TOP + 0.05, 0]],
    ["Metre rule", [0.3, TOP, RULE_Z + 0.02]],
    ["Pulley", [0.6, TOP + 0.06, 0]],
    ["Load", [0.618, -0.24, 0]],
    ["Tuning forks", [-0.3, 0.16, 0.27]],
    ["Rubber pad", [0.11, 0.05, 0.27]],
  ];
  return (
    <>
      {items.map(([label, pos]) => (
        <Html key={label} position={pos} center zIndexRange={[10, 0]}>
          <span className="pointer-events-none bg-[#111] px-1.5 py-0.5 text-[11px] whitespace-nowrap text-white">{label}</span>
        </Html>
      ))}
    </>
  );
}
