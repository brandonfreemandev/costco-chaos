import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { NPCArchetype } from '../../types/state';
import { CartModel } from './CartModel';
import { SHOPPER_FOOT_LOCAL_Y } from './npcGrounding';

/** Distance from shopper body origin to cart wheel ground (player push convention). */
export const NPC_CART_PUSH_OFFSET = 0.58;

function ShopperGagProp({ seed, archetype }: { seed: number; archetype: NPCArchetype }) {
  const gag = Math.abs(seed) % 7;

  if (archetype === 'SAMPLE_HUNTER') {
    return (
      <group position={[0.22, 1.02, 0.12]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.04, 0.1, 8]} />
          <meshStandardMaterial color="#e11d48" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.11, 0.02, 0.11]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.12, 0.08]} rotation={[0.2, 0, 0]}>
          <planeGeometry args={[0.22, 0.14]} />
          <meshStandardMaterial color="#fde68a" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (archetype === 'BLOCKER' && gag < 3) {
    return (
      <mesh position={[0.28, 1.05, 0.05]} rotation={[0, -0.35, 0]} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.12]} />
        <meshStandardMaterial color="#d4d4d0" roughness={0.82} />
      </mesh>
    );
  }

  if (gag === 0) {
    return (
      <mesh position={[0, 1.78, 0]} castShadow>
        <boxGeometry args={[0.34, 0.12, 0.34]} />
        <meshStandardMaterial color="#c9a227" metalness={0.35} roughness={0.45} />
      </mesh>
    );
  }
  if (gag === 1) {
    return (
      <group position={[-0.3, 1.2, 0.05]} rotation={[0, 0.4, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.14, 8, 8]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.18, 6]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
        </mesh>
      </group>
    );
  }
  if (gag === 2) {
    return (
      <group position={[0.24, 1.15, -0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.28, 0.08, 0.28]} />
          <meshStandardMaterial color="#b45309" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[0.26, 0.06, 0.26]} />
          <meshStandardMaterial color="#c2410c" roughness={0.75} />
        </mesh>
      </group>
    );
  }
  if (gag === 3) {
    return (
      <mesh position={[-0.26, 1.08, 0]} castShadow>
        <boxGeometry args={[0.22, 0.3, 0.14]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.35} metalness={0.25} />
      </mesh>
    );
  }
  if (gag === 4) {
    return (
      <mesh position={[0, 1.74, 0]} castShadow>
        <boxGeometry args={[0.38, 0.1, 0.22]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.65} />
      </mesh>
    );
  }
  if (gag === 5) {
    return (
      <group position={[0, 1.02, 0.16]}>
        <mesh>
          <boxGeometry args={[0.08, 0.05, 0.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.03, 0.2, 0.02]} />
          <meshStandardMaterial color="#e11d48" roughness={0.55} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={[0.2, 0.95, 0.14]} rotation={[0.4, -0.2, 0]}>
      <boxGeometry args={[0.16, 0.02, 0.16]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.8} />
    </mesh>
  );
}

export function ShopperAvatar({
  shirtColor,
  skinTone,
  hairColor,
  hasCart,
  seed = 0,
  archetype = 'BLOCKER',
  animate = true,
}: {
  shirtColor: string;
  skinTone: string;
  hairColor: string;
  hasCart: boolean;
  seed?: number;
  archetype?: NPCArchetype;
  /** Walk bob + arm swing — off for static queue poses at checkout. */
  animate?: boolean;
}) {
  const bodyRef = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const pantsColor = useMemo(() => {
    const c = new THREE.Color(shirtColor);
    c.multiplyScalar(0.55);
    return `#${c.getHexString()}`;
  }, [shirtColor]);
  const lean = archetype === 'AGGRESSOR' ? 0.12 : archetype === 'BLOCKER' ? -0.04 : 0;

  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime + seed * 0.01;
    const bob = Math.sin(t * 9) * 0.018;
    const swing = Math.sin(t * 9) * 0.42;
    if (bodyRef.current) bodyRef.current.position.y = bob;
    if (leftArm.current) leftArm.current.rotation.x = swing;
    if (rightArm.current) rightArm.current.rotation.x = -swing;
  });

  return (
    <group>
      <group ref={bodyRef} rotation={[lean, 0, 0]}>
        <RoundedBox castShadow position={[-0.11, 0.4, 0]} args={[0.15, 0.44, 0.17]} radius={0.04} smoothness={2}>
          <meshStandardMaterial color={pantsColor} roughness={0.86} />
        </RoundedBox>
        <RoundedBox castShadow position={[0.11, 0.4, 0]} args={[0.15, 0.44, 0.17]} radius={0.04} smoothness={2}>
          <meshStandardMaterial color={pantsColor} roughness={0.86} />
        </RoundedBox>

        <RoundedBox castShadow position={[0, 1.02, 0]} args={[0.5, 0.66, 0.3]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color={shirtColor} roughness={0.72} metalness={0.06} envMapIntensity={0.9} />
        </RoundedBox>

        <mesh position={[0, 0.88, 0.16]}>
          <boxGeometry args={[0.12, 0.08, 0.02]} />
          <meshStandardMaterial color="#f8fafc" emissive="#fde047" emissiveIntensity={0.12} roughness={0.5} />
        </mesh>

        <group ref={leftArm} position={[-0.3, 1.02, 0]}>
          <RoundedBox castShadow position={[0, -0.16, 0]} args={[0.12, 0.34, 0.12]} radius={0.03} smoothness={2}>
            <meshStandardMaterial color={shirtColor} roughness={0.78} />
          </RoundedBox>
        </group>
        <group ref={rightArm} position={[0.3, 1.02, 0]}>
          <RoundedBox castShadow position={[0, -0.16, 0]} args={[0.12, 0.34, 0.12]} radius={0.03} smoothness={2}>
            <meshStandardMaterial color={shirtColor} roughness={0.78} />
          </RoundedBox>
        </group>

        <mesh castShadow position={[0, 1.52, 0]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshStandardMaterial color={skinTone} roughness={0.72} />
        </mesh>

        <mesh castShadow position={[0, 1.66, -0.04]}>
          <sphereGeometry args={[0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>

        <mesh position={[-0.065, 1.54, 0.17]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#111318" roughness={0.35} />
        </mesh>
        <mesh position={[0.065, 1.54, 0.17]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#111318" roughness={0.35} />
        </mesh>
        {archetype === 'AGGRESSOR' && (
          <>
            <mesh position={[-0.07, 1.6, 0.165]} rotation={[0, 0, 0.35]}>
              <boxGeometry args={[0.06, 0.012, 0.012]} />
              <meshStandardMaterial color="#1a1a22" />
            </mesh>
            <mesh position={[0.07, 1.6, 0.165]} rotation={[0, 0, -0.35]}>
              <boxGeometry args={[0.06, 0.012, 0.012]} />
              <meshStandardMaterial color="#1a1a22" />
            </mesh>
          </>
        )}
        <mesh position={[0, 1.46, 0.18]}>
          <boxGeometry args={[0.055, 0.012, 0.012]} />
          <meshStandardMaterial color="#9f6060" roughness={0.6} />
        </mesh>

        <ShopperGagProp seed={seed} archetype={archetype} />
      </group>

      {hasCart && (
        <group position={[0, SHOPPER_FOOT_LOCAL_Y, NPC_CART_PUSH_OFFSET]}>
          <CartModel showHandle />
        </group>
      )}
    </group>
  );
}

/** Costco vest + badge — default faces +X (right wall / cart side) at checkout. */
export function CashierAvatar({
  skinTone,
  hairColor,
  rotationY = -Math.PI / 2,
}: {
  skinTone: string;
  hairColor: string;
  rotationY?: number;
}) {
  return (
    <group rotation={[0, rotationY, 0]}>
      <RoundedBox castShadow position={[-0.08, 0.32, 0]} args={[0.12, 0.36, 0.14]} radius={0.02} smoothness={2}>
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </RoundedBox>
      <RoundedBox castShadow position={[0.08, 0.32, 0]} args={[0.12, 0.36, 0.14]} radius={0.02} smoothness={2}>
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </RoundedBox>
      <RoundedBox castShadow position={[0, 0.88, 0]} args={[0.44, 0.58, 0.24]} radius={0.04} smoothness={2}>
        <meshStandardMaterial color="#005dab" roughness={0.78} />
      </RoundedBox>
      <mesh castShadow position={[0, 0.88, 0.14]}>
        <boxGeometry args={[0.38, 0.52, 0.04]} />
        <meshStandardMaterial color="#e11d48" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.38, 0]}>
        <sphereGeometry args={[0.17, 8, 8]} />
        <meshStandardMaterial color={skinTone} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, 1.5, -0.03]}>
        <sphereGeometry args={[0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} roughness={0.9} />
      </mesh>
      <mesh position={[0.14, 1.05, 0.14]}>
        <boxGeometry args={[0.1, 0.06, 0.02]} />
        <meshStandardMaterial color="#f8fafc" emissive="#fde047" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

const SHIRT_PALETTE = ['#4a6741', '#6b4423', '#2d4a6e', '#7a3030', '#5a5080', '#8a6040'];
const SKIN_PALETTE = ['#e8c4a8', '#d4a574', '#c68642', '#f0d5be', '#8d5524'];
const HAIR_PALETTE = ['#2a2018', '#5a4030', '#8a7060', '#1a1a22', '#6a5038'];

export function queueNpcLook(laneId: string, slot: number) {
  const seed = (laneId.charCodeAt(0) * 17 + slot * 31) | 0;
  return {
    shirt: SHIRT_PALETTE[Math.abs(seed) % SHIRT_PALETTE.length],
    skin: SKIN_PALETTE[Math.abs(seed >> 2) % SKIN_PALETTE.length],
    hair: HAIR_PALETTE[Math.abs(seed >> 4) % HAIR_PALETTE.length],
  };
}

export function cashierLook(laneId: string) {
  const seed = laneId.charCodeAt(0) * 13;
  return {
    skin: SKIN_PALETTE[Math.abs(seed) % SKIN_PALETTE.length],
    hair: HAIR_PALETTE[Math.abs(seed >> 3) % HAIR_PALETTE.length],
  };
}
