"use client";

import type { Vec3 } from "./kit";

/** Bench electrical apparatus shared by the electromagnetism practicals. */

export function PowerSupply({ position, on }: { position: Vec3; on: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.22, 0.12, 0.16]} />
        <meshStandardMaterial color="#3d4a52" roughness={0.6} />
      </mesh>
      <mesh position={[-0.05, 0.07, 0.081]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 24]} />
        <meshStandardMaterial color="#1b1b1b" />
      </mesh>
      {[0.04, 0.08].map((x, i) => (
        <mesh key={x} position={[x, 0.05, 0.081]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.012, 16]} />
          <meshStandardMaterial color={i ? "#1b1b1b" : "#b3261e"} />
        </mesh>
      ))}
      <mesh position={[0.06, 0.095, 0.081]}>
        <sphereGeometry args={[0.006, 12, 12]} />
        <meshStandardMaterial color={on ? "#7bd34f" : "#555"} emissive={on ? "#5bb32f" : "#000"} emissiveIntensity={on ? 1 : 0} />
      </mesh>
    </group>
  );
}

/** A meter box with a dark display window (the reading is shown on its instrument card). */
export function MeterBox({ position, color = "#e6e8e3" }: { position: Vec3; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0.0505]}>
        <planeGeometry args={[0.08, 0.03]} />
        <meshStandardMaterial color="#1f2a1f" />
      </mesh>
    </group>
  );
}

export function Rheostat({ position, fraction }: { position: Vec3; fraction: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.26, 24]} />
        <meshStandardMaterial color="#c9b27a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.082, 0]}>
        <boxGeometry args={[0.28, 0.006, 0.008]} />
        <meshStandardMaterial color="#6b7076" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.12 + 0.24 * fraction, 0.077, 0]}>
        <boxGeometry args={[0.02, 0.02, 0.03]} />
        <meshStandardMaterial color="#1b1b1b" />
      </mesh>
    </group>
  );
}
