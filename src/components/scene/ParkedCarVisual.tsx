import { useMemo } from 'react';
import * as THREE from 'three';

export type CarBodyStyle = 'sedan' | 'crossover' | 'minivan';

const GLASS = {
  color: '#1e2838',
  roughness: 0.04,
  metalness: 0.85,
  transparent: true,
  opacity: 0.72,
  envMapIntensity: 1.4,
};

const TIRE = { color: '#1a1c20', roughness: 0.92, metalness: 0.05 };
const RIM = { color: '#b8bcc4', roughness: 0.35, metalness: 0.75, envMapIntensity: 1.2 };
const CHROME = { color: '#d0d4dc', roughness: 0.18, metalness: 0.92, envMapIntensity: 1.3 };

function darken(hex: string, amount = 28): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - amount);
  const g = Math.max(0, ((n >> 8) & 255) - amount);
  const b = Math.max(0, (n & 255) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function Wheel({ position }: { position: [number, number, number] }) {
  const tireGeo = useMemo(() => new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16), []);
  const rimGeo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.2, 0.26, 12), []);

  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} geometry={tireGeo} castShadow>
        <meshStandardMaterial {...TIRE} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} geometry={rimGeo}>
        <meshStandardMaterial {...RIM} />
      </mesh>
    </group>
  );
}

function SedanBody({ color }: { color: string }) {
  const paint = { color, roughness: 0.32, metalness: 0.45, envMapIntensity: 1.15 };
  const trim = { color: darken(color, 18), roughness: 0.4, metalness: 0.35 };

  return (
    <group>
      <mesh castShadow position={[0, 0.34, 0]}>
        <boxGeometry args={[1.82, 0.38, 3.5]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh castShadow position={[0, 0.52, 1.05]}>
        <boxGeometry args={[1.76, 0.18, 1.25]} />
        <meshStandardMaterial {...trim} />
      </mesh>
      <mesh castShadow position={[0, 0.76, -0.12]}>
        <boxGeometry args={[1.7, 0.48, 1.72]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh castShadow position={[0, 1.0, -0.15]}>
        <boxGeometry args={[1.54, 0.08, 1.52]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh castShadow position={[0, 0.54, -1.28]}>
        <boxGeometry args={[1.8, 0.24, 0.88]} />
        <meshStandardMaterial {...trim} />
      </mesh>

      <mesh position={[0, 0.86, 0.58]} rotation={[-0.42, 0, 0]} castShadow>
        <boxGeometry args={[1.58, 0.32, 0.05]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <mesh position={[0, 0.84, -0.88]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[1.5, 0.28, 0.05]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <mesh position={[0.91, 0.78, -0.1]}>
        <boxGeometry args={[0.04, 0.32, 1.35]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <mesh position={[-0.91, 0.78, -0.1]}>
        <boxGeometry args={[0.04, 0.32, 1.35]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>

      <mesh position={[0, 0.28, 1.82]}>
        <boxGeometry args={[1.78, 0.22, 0.18]} />
        <meshStandardMaterial color="#2a2d32" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.28, -1.82]}>
        <boxGeometry args={[1.78, 0.22, 0.16]} />
        <meshStandardMaterial color="#2a2d32" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.42, 1.88]}>
        <boxGeometry args={[1.5, 0.12, 0.06]} />
        <meshStandardMaterial color="#111318" roughness={0.4} />
      </mesh>

      <mesh position={[-0.68, 0.44, 1.78]}>
        <boxGeometry args={[0.28, 0.1, 0.06]} />
        <meshStandardMaterial color="#fff8e8" emissive="#fff4cc" emissiveIntensity={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[0.68, 0.44, 1.78]}>
        <boxGeometry args={[0.28, 0.1, 0.06]} />
        <meshStandardMaterial color="#fff8e8" emissive="#fff4cc" emissiveIntensity={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[-0.68, 0.46, -1.78]}>
        <boxGeometry args={[0.32, 0.12, 0.05]} />
        <meshStandardMaterial color="#991b1b" emissive="#ef4444" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0.68, 0.46, -1.78]}>
        <boxGeometry args={[0.32, 0.12, 0.05]} />
        <meshStandardMaterial color="#991b1b" emissive="#ef4444" emissiveIntensity={0.55} />
      </mesh>

      <mesh position={[0.92, 0.62, 0.35]}>
        <boxGeometry args={[0.08, 0.06, 0.14]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      <mesh position={[-0.92, 0.62, 0.35]}>
        <boxGeometry args={[0.08, 0.06, 0.14]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>

      <Wheel position={[-0.82, 0.34, 1.15]} />
      <Wheel position={[0.82, 0.34, 1.15]} />
      <Wheel position={[-0.82, 0.34, -1.15]} />
      <Wheel position={[0.82, 0.34, -1.15]} />
    </group>
  );
}

function CrossoverBody({ color }: { color: string }) {
  const paint = { color, roughness: 0.3, metalness: 0.48, envMapIntensity: 1.15 };

  return (
    <group>
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[1.92, 0.48, 3.65]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh castShadow position={[0, 0.88, -0.05]}>
        <boxGeometry args={[1.82, 0.62, 2.05]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh castShadow position={[0, 1.18, -0.08]}>
        <boxGeometry args={[1.68, 0.1, 1.88]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh position={[0, 0.98, 0.72]} rotation={[-0.48, 0, 0]}>
        <boxGeometry args={[1.7, 0.38, 0.05]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <mesh position={[0, 0.95, -1.02]} rotation={[0.38, 0, 0]}>
        <boxGeometry args={[1.62, 0.32, 0.05]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <mesh position={[0.96, 0.88, 0]}>
        <boxGeometry args={[0.04, 0.38, 1.55]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <mesh position={[-0.96, 0.88, 0]}>
        <boxGeometry args={[0.04, 0.38, 1.55]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <mesh position={[0, 0.36, 1.88]}>
        <boxGeometry args={[1.88, 0.28, 0.2]} />
        <meshStandardMaterial color="#2a2d32" roughness={0.5} />
      </mesh>
      <mesh position={[-0.72, 0.5, 1.84]}>
        <boxGeometry args={[0.3, 0.12, 0.06]} />
        <meshStandardMaterial color="#fff8e8" emissive="#fff4cc" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0.72, 0.5, 1.84]}>
        <boxGeometry args={[0.3, 0.12, 0.06]} />
        <meshStandardMaterial color="#fff8e8" emissive="#fff4cc" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[-0.72, 0.52, -1.86]}>
        <boxGeometry args={[0.34, 0.14, 0.05]} />
        <meshStandardMaterial color="#991b1b" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.72, 0.52, -1.86]}>
        <boxGeometry args={[0.34, 0.14, 0.05]} />
        <meshStandardMaterial color="#991b1b" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Wheel position={[-0.88, 0.34, 1.2]} />
      <Wheel position={[0.88, 0.34, 1.2]} />
      <Wheel position={[-0.88, 0.34, -1.2]} />
      <Wheel position={[0.88, 0.34, -1.2]} />
    </group>
  );
}

function MinivanBody({ color }: { color: string }) {
  const paint = { color, roughness: 0.34, metalness: 0.4, envMapIntensity: 1.1 };

  return (
    <group>
      <mesh castShadow position={[0, 0.46, 0]}>
        <boxGeometry args={[1.88, 0.52, 4.05]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh castShadow position={[0, 0.98, 0.05]}>
        <boxGeometry args={[1.82, 0.78, 2.45]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh castShadow position={[0, 1.32, 0.02]}>
        <boxGeometry args={[1.74, 0.1, 2.28]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh position={[0, 1.02, 0.95]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[1.68, 0.42, 0.05]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      {[-0.55, 0, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.95, -0.35]}>
          <boxGeometry args={[0.04, 0.42, 1.1]} />
          <meshStandardMaterial {...GLASS} />
        </mesh>
      ))}
      <mesh position={[0, 0.95, -1.15]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[1.62, 0.38, 0.05]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      <Wheel position={[-0.86, 0.34, 1.35]} />
      <Wheel position={[0.86, 0.34, 1.35]} />
      <Wheel position={[-0.86, 0.34, -1.35]} />
      <Wheel position={[0.86, 0.34, -1.35]} />
    </group>
  );
}

export function carStyleFromId(id: string): CarBodyStyle {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  if (h % 5 === 0) return 'minivan';
  if (h % 3 === 0) return 'crossover';
  return 'sedan';
}

/** Low-poly parked vehicle — sedan, crossover, or minivan. */
export function ParkedCarVisual({ color, style }: { color: string; style: CarBodyStyle }) {
  if (style === 'crossover') return <CrossoverBody color={color} />;
  if (style === 'minivan') return <MinivanBody color={color} />;
  return <SedanBody color={color} />;
}

export function carColliderForStyle(style: CarBodyStyle): [number, number, number] {
  if (style === 'minivan') return [1.0, 0.78, 2.05];
  if (style === 'crossover') return [0.98, 0.76, 1.95];
  return [0.95, 0.72, 1.9];
}

/** Collider center Y so the box bottom rests on y=0 (visuals are nudged down separately). */
export function carColliderCenterY(style: CarBodyStyle): number {
  return carColliderForStyle(style)[1] / 2;
}
