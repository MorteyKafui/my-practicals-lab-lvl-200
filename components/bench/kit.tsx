"use client";

import { ContactShadows, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { CubeIcon, EyeIcon, TagIcon } from "@phosphor-icons/react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

import { Button } from "@/components/ui/button";
import { useBench } from "@/components/workspace/bench-store";
import { readPref } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/**
 * Shared pieces for every practical's bench: the canvas (lights, isometric camera, eye-level
 * view, shadows by quality), the callout labels, and the instrument cards around it.
 *
 * Callouts are plain DOM over the canvas, moved each frame by projecting their 3D anchors —
 * not drei <Html>, which mounts a React root per label and crashes when unmounted mid-render.
 */

export type Vec3 = [number, number, number];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  zoom: number;
  up?: Vec3;
}

export interface Callout {
  label: string;
  at: Vec3;
}

type Quality = "low" | "medium" | "high";

export function BenchCanvas({
  label,
  home,
  eye,
  callouts = [],
  children,
}: {
  label: string;
  home: CameraPose;
  /** Where the eye-level view looks (computed by the bench from its state). */
  eye?: CameraPose;
  callouts?: Callout[];
  children: ReactNode;
}) {
  const view = useBench((s) => s.view);
  const [quality] = useState<Quality>(() => readPref<Quality>("quality") ?? "medium");

  return (
    <Canvas
      dpr={quality === "low" ? 1 : [1, 1.5]}
      shadows={quality === "high"}
      gl={{ antialias: quality !== "low", preserveDrawingBuffer: true }}
      className="touch-none"
      aria-label={label}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
    >
      <color attach="background" args={["#f5f6f2"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow={quality === "high"} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <OrthographicCamera makeDefault position={home.position} zoom={home.zoom} near={0.01} far={30} />
      <Rig home={home} eye={view === "eye" ? eye : undefined} />
      <OrbitControls
        makeDefault
        enabled={view === "bench"}
        enablePan={false}
        minPolarAngle={0.3}
        maxPolarAngle={1.3}
        minZoom={home.zoom * 0.45}
        maxZoom={home.zoom * 4.5}
        target={home.target}
      />
      <BenchTable />
      {children}
      {quality !== "low" && <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={3.4} blur={2.2} far={0.8} resolution={512} />}
      <CalloutTracker callouts={callouts} />
    </Canvas>
  );
}

/** Eases the camera into the eye-level pose, and snaps back to the bench pose when leaving it. */
function Rig({ home, eye }: { home: CameraPose; eye?: CameraPose }) {
  const goal = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const wasEye = useRef(false);

  useFrame((state, dt) => {
    const camera = state.camera as THREE.OrthographicCamera;
    const controls = state.controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (eye) {
      const k = 1 - Math.exp(-dt * 6);
      goal.set(...eye.position);
      target.set(...eye.target);
      camera.position.lerp(goal, k);
      camera.zoom += (eye.zoom - camera.zoom) * k;
      camera.up.set(...(eye.up ?? [0, 1, 0]));
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      wasEye.current = true;
    } else if (wasEye.current) {
      wasEye.current = false;
      camera.up.set(0, 1, 0);
      camera.position.set(...home.position);
      camera.zoom = home.zoom;
      controls?.target.set(...home.target);
      controls?.update();
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function BenchTable() {
  return (
    <mesh position={[0, -0.02, 0.05]} receiveShadow>
      <boxGeometry args={[2, 0.04, 1.1]} />
      <meshStandardMaterial color="#d8cfb8" roughness={0.9} />
    </mesh>
  );
}

/** Moves the DOM callout labels to where their 3D anchors land on screen. */
function CalloutTracker({ callouts }: { callouts: Callout[] }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size, gl }) => {
    const layer = gl.domElement.closest("[data-bench]")?.querySelector<HTMLElement>("[data-callouts]");
    if (!layer) return;
    callouts.forEach((c, i) => {
      const el = layer.children[i] as HTMLElement | undefined;
      if (!el) return;
      v.set(...c.at).project(camera);
      const hidden = v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05;
      el.style.opacity = hidden ? "0" : "1";
      el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
    });
  });
  return null;
}

/**
 * The bench frame: canvas on top, status line and view controls over it, instrument cards
 * overlaid from md up and stacked below the canvas on phones.
 */
export function BenchShell({
  canvas,
  status,
  callouts = [],
  eyeLabel,
  onView,
  cards,
}: {
  canvas: ReactNode;
  status: string;
  callouts?: Callout[];
  /** Label for the eye-level button; omit when the bench has no eye-level view. */
  eyeLabel?: string;
  onView?: (view: "bench" | "eye") => void;
  cards: ReactNode;
}) {
  const view = useBench((s) => s.view);
  const set = useBench((s) => s.set);
  const [labels, setLabels] = useState(true);

  return (
    <div className="relative w-full bg-well" data-bench>
      <div className="relative h-[46vh] min-h-[300px] overflow-hidden md:h-[62vh] md:min-h-[440px]">
        {canvas}
        <div data-callouts aria-hidden className={cn("pointer-events-none absolute inset-0 z-10", (!labels || view === "eye") && "hidden")}>
          {callouts.map((c) => (
            <span key={c.label} className="absolute top-0 left-0 bg-[#111] px-1.5 py-0.5 text-[11px] whitespace-nowrap text-white opacity-0">
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <p className="absolute top-3 left-3 z-20 max-w-[min(420px,calc(100%-120px))] bg-sheet/95 px-3 py-2 text-ds-body-sm text-text-primary shadow-sm" aria-live="polite">
        {status}
      </p>

      <div className="absolute top-3 right-3 z-20 flex gap-1">
        {eyeLabel && (
          <Button
            size="sm"
            variant={view === "eye" ? "default" : "outline"}
            className={view === "eye" ? "" : "bg-sheet"}
            onClick={() => {
              const next = view === "eye" ? "bench" : "eye";
              set({ view: next });
              onView?.(next);
            }}
          >
            {view === "eye" ? <CubeIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
            {view === "eye" ? "Bench view" : eyeLabel}
          </Button>
        )}
        {callouts.length > 0 && (
          <Button size="icon-sm" variant={labels ? "default" : "outline"} aria-label="Show labels" aria-pressed={labels} onClick={() => setLabels((l) => !l)}>
            <TagIcon />
          </Button>
        )}
      </div>

      <div className="relative z-20 flex flex-wrap items-end gap-2 p-3 md:absolute md:inset-x-3 md:bottom-3 md:p-0">{cards}</div>
    </div>
  );
}

export function InstrumentCard({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={cn("flex flex-col gap-1.5 border border-sheet-edge bg-sheet p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]", wide ? "w-full sm:w-[280px]" : "w-full sm:w-[180px]")}>
      <h3 className="text-ds-label-sm">{title}</h3>
      {children}
    </section>
  );
}

export function Nudge({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Button size="icon-sm" variant="outline" aria-label={label} onClick={onClick}>
      {children}
    </Button>
  );
}

/** A digital instrument display: the student copies what it shows, flicker and all. */
export function Readout({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div role="status" aria-label={`${label} display`} className="flex items-baseline justify-end gap-1.5 bg-[#1f2a1f] px-2.5 py-1.5 text-[#b8f5b0]">
      <span className="figure text-ds-mono-lg tracking-wider">{value}</span>
      <span className="figure text-ds-mono-xs text-[#8fcf88]">{unit}</span>
    </div>
  );
}

/** A metre-rule texture: mm, half-cm and cm ticks, every cm numbered. Ticks hang from the top edge. */
export function makeRuleTexture(lengthCm = 100): THREE.CanvasTexture {
  const W = Math.min(8192, Math.round(lengthCm * 82));
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#f4eedb";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#1a1a1a";
  const mmCount = lengthCm * 10;
  const pxPerMm = W / mmCount;
  for (let mm = 0; mm <= mmCount; mm++) {
    const x = mm * pxPerMm;
    const len = mm % 10 === 0 ? 120 : mm % 5 === 0 ? 80 : 48;
    g.fillRect(Math.round(x) - 1, 0, mm % 10 === 0 ? 3 : 2, len);
    if (mm % 10 === 0) {
      g.font = "500 40px Inter, Arial, sans-serif";
      g.textAlign = mm === 0 ? "left" : mm === mmCount ? "right" : "center";
      g.fillText(String(mm / 10), x, 190);
    }
  }
  const t = new THREE.CanvasTexture(canvas);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A plain flat rule: `lengthM` long, 1/32 of that wide per 100 cm, lying in its local XY plane. */
export function RuleMesh({ lengthCm, position, rotation }: { lengthCm: number; position: Vec3; rotation: Vec3 }) {
  const texture = useMemo(() => makeRuleTexture(lengthCm), [lengthCm]);
  const width = 0.032;
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[lengthCm / 100, width]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
}
