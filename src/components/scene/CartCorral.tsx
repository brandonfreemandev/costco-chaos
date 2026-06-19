import { Text } from '@react-three/drei';
import { RigidBody, interactionGroups } from '@react-three/rapier';
import { useMemo } from 'react';
import * as THREE from 'three';
import { COLLISION_GROUP } from '../../types/state';
import type { CartCorralSpec } from './parkingLotLayout';
import { CartModel } from './CartModel';

const RAIL = { color: '#9ca3af', roughness: 0.38, metalness: 0.78, envMapIntensity: 1.1 };
const POST = { color: '#6b7280', roughness: 0.42, metalness: 0.82 };

const _up = new THREE.Vector3(0, 1, 0);

/** Horizontal pipe segment in the XZ plane (baluster rails). */
function PipeSegment({
  from,
  to,
  y = 0.92,
  radius = 0.028,
}: {
  from: [number, number];
  to: [number, number];
  y?: number;
  radius?: number;
}) {
  const { mid, quaternion, len } = useMemo(() => {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const length = Math.hypot(dx, dz);
    const dir = new THREE.Vector3(dx, 0, dz).normalize();
    return {
      mid: [(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2] as [number, number, number],
      quaternion: new THREE.Quaternion().setFromUnitVectors(_up, dir),
      len: length,
    };
  }, [from[0], from[1], to[0], to[1], y]);

  if (len < 0.02) return null;

  return (
    <mesh castShadow position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, len, 10]} />
      <meshStandardMaterial {...RAIL} />
    </mesh>
  );
}

function VerticalPost({ x, z, h = 0.92 }: { x: number; z: number; h?: number }) {
  return (
    <mesh castShadow position={[x, h / 2, z]}>
      <cylinderGeometry args={[0.038, 0.042, h, 10]} />
      <meshStandardMaterial {...POST} />
    </mesh>
  );
}

function SideRun({ x, z0, z1 }: { x: number; z0: number; z1: number }) {
  const count = Math.max(2, Math.floor(Math.abs(z1 - z0) / 0.45));
  return (
    <>
      <PipeSegment from={[x, z0]} to={[x, z1]} y={0.92} />
      <PipeSegment from={[x, z0]} to={[x, z1]} y={0.55} radius={0.022} />
      {Array.from({ length: count + 1 }).map((_, i) => {
        const t = i / count;
        const z = z0 + (z1 - z0) * t;
        return (
          <mesh key={`bal-${x}-${i}`} castShadow position={[x, 0.55, z]}>
            <cylinderGeometry args={[0.014, 0.014, 0.74, 6]} />
            <meshStandardMaterial {...RAIL} />
          </mesh>
        );
      })}
    </>
  );
}

function CorralCart({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <CartModel showHandle />
    </group>
  );
}

/**
 * Costco cart return — U-shaped pipe corral, open mouth at +Z, tall sign above the back rail.
 * Local +Z = entry (push carts in); −Z = back/sign wall.
 */
export function CartCorral({ spec }: { spec: CartCorralSpec }) {
  const { x, z, rotation, cartCount, id } = spec;
  const w = 4.8;
  const d = 3.5;
  const halfW = w / 2;
  const backZ = -d / 2;
  const mouthZ = d / 2;
  const signY = 2.05;

  const asphaltMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#525860', roughness: 0.92 }),
    [],
  );

  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} receiveShadow material={asphaltMat}>
        <planeGeometry args={[w - 0.15, d - 0.1]} />
      </mesh>

      {/* Tall sign header — above rail height so carts don't block branding */}
      <mesh castShadow position={[0, signY, backZ + 0.04]}>
        <boxGeometry args={[w - 0.15, 0.95, 0.08]} />
        <meshStandardMaterial color="#374151" roughness={0.75} metalness={0.35} />
      </mesh>
      <mesh position={[0, signY, backZ + 0.1]}>
        <boxGeometry args={[w - 0.35, 0.82, 0.04]} />
        <meshStandardMaterial color="#005dab" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, signY - 0.28, backZ + 0.12]}>
        <boxGeometry args={[w - 0.55, 0.14, 0.03]} />
        <meshStandardMaterial color="#e31837" roughness={0.4} emissive="#e31837" emissiveIntensity={0.15} />
      </mesh>
      <Text
        position={[0, signY + 0.08, backZ + 0.14]}
        rotation={[0, 0, 0]}
        fontSize={0.28}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        COSTCO
      </Text>
      <Text
        position={[0, signY - 0.22, backZ + 0.14]}
        rotation={[0, 0, 0]}
        fontSize={0.14}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
      >
        CART RETURN
      </Text>

      {/* Pipe rails — U shape, open at +Z mouth */}
      <PipeSegment from={[-halfW, backZ]} to={[halfW, backZ]} y={0.92} />
      <PipeSegment from={[-halfW, backZ]} to={[halfW, backZ]} y={0.55} radius={0.022} />
      <SideRun x={-halfW} z0={backZ} z1={mouthZ - 0.1} />
      <SideRun x={halfW} z0={backZ} z1={mouthZ - 0.1} />

      <VerticalPost x={-halfW} z={backZ} />
      <VerticalPost x={halfW} z={backZ} />
      <VerticalPost x={-halfW} z={mouthZ - 0.1} h={0.55} />
      <VerticalPost x={halfW} z={mouthZ - 0.1} h={0.55} />

      {/* Mouth entry guides only — no rail across opening */}
      <mesh castShadow position={[-halfW + 0.14, 0.06, mouthZ - 0.06]}>
        <cylinderGeometry args={[0.035, 0.04, 0.12, 8]} />
        <meshStandardMaterial {...POST} />
      </mesh>
      <mesh castShadow position={[halfW - 0.14, 0.06, mouthZ - 0.06]}>
        <cylinderGeometry args={[0.035, 0.04, 0.12, 8]} />
        <meshStandardMaterial {...POST} />
      </mesh>

      {/* Carts nose-in toward back wall — handles toward mouth, sign stays visible */}
      {Array.from({ length: cartCount }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return (
          <CorralCart
            key={`${id}-cart-${i}`}
            x={-1.2 + col * 1.2}
            z={-0.15 + row * 0.95}
            rot={Math.PI + (i % 2) * 0.04}
          />
        );
      })}

      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[0.12, 1.05, d - 0.25]}
        position={[-halfW, 0.52, 0]}
        friction={0.9}
        collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
      />
      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[0.12, 1.05, d - 0.25]}
        position={[halfW, 0.52, 0]}
        friction={0.9}
        collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
      />
      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[w, 1.05, 0.12]}
        position={[0, 0.52, backZ]}
        friction={0.9}
        collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
      />
    </group>
  );
}
