"use client";

import { Line } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { makeRuleTexture, type CameraPose, type Vec3 } from "./kit";

/*
 * A vertical resonance tube on a retort stand, its water level set by a reservoir on a sliding
 * clamp joined by rubber tubing. A metre rule beside the tube reads 0 cm at the mouth, increasing
 * downwards. The fork is held over the mouth. Layout in metres.
 */
export const TUBE = {
  X: 0,
  Z: 0,
  MOUTH_Y: 1.1,
  RULE_X: 0.045,
  RADIUS: 0.02,
  LENGTH: 1.0,
} as const;

export const yOfReading = (cm: number) => TUBE.MOUTH_Y - cm / 100;

export const TUBE_HOME: CameraPose = { position: [1.5, 1.6, 2.2], target: [0, 0.6, 0], zoom: 360 };

/** Eye level: square-on to the rule at the water surface. */
export function tubeEye(levelCm: number): CameraPose {
  const y = yOfReading(levelCm);
  return { position: [TUBE.RULE_X, y, 1.4], target: [TUBE.RULE_X, y, TUBE.Z], zoom: 2600 };
}

export const TUBE_CALLOUTS: { label: string; at: Vec3 }[] = [
  { label: "Resonance tube", at: [-0.05, 0.75, 0] },
  { label: "Metre rule", at: [0.09, 0.45, 0] },
  { label: "Water reservoir", at: [-0.36, 0.5, 0] },
  { label: "Thermometer", at: [0.42, 0.42, 0.18] },
];

export function ResonanceTube({ levelCm, forkOver }: { levelCm: number; forkOver: boolean }) {
  const waterY = yOfReading(levelCm);
  const bottomY = TUBE.MOUTH_Y - TUBE.LENGTH;
  const reservoirY = waterY - 0.05;
  const rule = useMemo(() => makeRuleTexture(100), []);
  useEffect(() => () => rule.dispose(), [rule]);

  return (
    <group>
      {/* Retort stand */}
      <mesh position={[-0.12, 0.01, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.25]} />
        <meshStandardMaterial color="#4a4f55" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[-0.2, 0.62, -0.06]}>
        <cylinderGeometry args={[0.008, 0.008, 1.22, 12]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.8} roughness={0.3} />
      </mesh>
      {[0.95, 0.35].map((y) => (
        <mesh key={y} position={[-0.1, y, -0.03]}>
          <boxGeometry args={[0.2, 0.012, 0.012]} />
          <meshStandardMaterial color="#6b7076" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Glass tube, water column and surface */}
      <mesh position={[TUBE.X, TUBE.MOUTH_Y - TUBE.LENGTH / 2, TUBE.Z]}>
        <cylinderGeometry args={[TUBE.RADIUS + 0.002, TUBE.RADIUS + 0.002, TUBE.LENGTH, 32, 1, true]} />
        <meshPhysicalMaterial color="#dff3ff" transparent opacity={0.28} roughness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[TUBE.X, (waterY + bottomY) / 2, TUBE.Z]}>
        <cylinderGeometry args={[TUBE.RADIUS, TUBE.RADIUS, Math.max(0.001, waterY - bottomY), 32]} />
        <meshStandardMaterial color="#5aa9d6" transparent opacity={0.7} />
      </mesh>

      {/* Reservoir on its clamp, joined to the tube's foot by rubber tubing */}
      <group position={[-0.36, reservoirY, 0]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 0.14, 32, 1, true]} />
          <meshPhysicalMaterial color="#dff3ff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.048, 0.048, 0.1, 32]} />
          <meshStandardMaterial color="#5aa9d6" transparent opacity={0.7} />
        </mesh>
      </group>
      <Line points={[[-0.36, reservoirY - 0.07, 0], [-0.3, 0.05, 0.05], [-0.05, 0.05, 0.05], [TUBE.X, bottomY, TUBE.Z]]} color="#3a3a3a" lineWidth={3} />

      {/* Rule beside the tube: 0 at the mouth, reading downwards */}
      <mesh position={[TUBE.RULE_X, TUBE.MOUTH_Y - 0.5, TUBE.Z]} rotation={[0, 0, -Math.PI / 2]}>
        <planeGeometry args={[1, 1 / 32]} />
        <meshStandardMaterial map={rule} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Thermometer in a clamp on the bench */}
      <group position={[0.42, 0, 0.18]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.4, 12]} />
          <meshPhysicalMaterial color="#f2f8ff" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.01, 16, 16]} />
          <meshStandardMaterial color="#c62828" />
        </mesh>
      </group>

      {/* Fork held over the mouth while sounding */}
      {forkOver && (
        <group position={[TUBE.X, TUBE.MOUTH_Y + 0.03, TUBE.Z]} rotation={[0, 0, Math.PI / 2]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.05, s * 0.008, 0]}>
              <boxGeometry args={[0.1, 0.005, 0.006]} />
              <meshStandardMaterial color="#d3481b" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[-0.02, 0, 0]}>
            <boxGeometry args={[0.04, 0.008, 0.008]} />
            <meshStandardMaterial color="#b9bec4" metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      )}
    </group>
  );
}
