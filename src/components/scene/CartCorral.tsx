import { Text } from '@react-three/drei';
import { RigidBody, interactionGroups } from '@react-three/rapier';
import { COLLISION_GROUP } from '../../types/state';
import type { CartCorralSpec } from './parkingLotLayout';
import { CartModel } from './CartModel';

const RAIL = { color: '#6b7280', roughness: 0.45, metalness: 0.65 };
const SIGN = { color: '#005dab', roughness: 0.5 };

function CorralCart({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <CartModel showHandle={false} />
    </group>
  );
}

/** Metal cart-return corral with queued carts. */
export function CartCorral({ spec }: { spec: CartCorralSpec }) {
  const { x, z, rotation, cartCount, id } = spec;
  const w = 4.2;
  const d = 3.2;
  const postH = 1.05;

  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {(
        [
          [-w / 2, -d / 2],
          [w / 2, -d / 2],
          [w / 2, d / 2],
          [-w / 2, d / 2],
        ] as [number, number][]
      ).map(([px, pz], i) => (
        <mesh key={`post-${i}`} castShadow position={[px, postH / 2, pz]}>
          <boxGeometry args={[0.08, postH, 0.08]} />
          <meshStandardMaterial {...RAIL} />
        </mesh>
      ))}

      <mesh position={[0, 0.55, -d / 2]}>
        <boxGeometry args={[w, 0.06, 0.06]} />
        <meshStandardMaterial {...RAIL} />
      </mesh>
      <mesh position={[0, 0.55, d / 2]}>
        <boxGeometry args={[w, 0.06, 0.06]} />
        <meshStandardMaterial {...RAIL} />
      </mesh>
      <mesh position={[-w / 2, 0.55, 0]}>
        <boxGeometry args={[0.06, 0.06, d]} />
        <meshStandardMaterial {...RAIL} />
      </mesh>
      <mesh position={[w / 2, 0.55, 0]}>
        <boxGeometry args={[0.06, 0.06, d]} />
        <meshStandardMaterial {...RAIL} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <planeGeometry args={[w - 0.2, d - 0.2]} />
        <meshStandardMaterial color="#4b5563" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0.12, -d / 2 - 0.08]}>
        <boxGeometry args={[w + 0.15, 0.14, 0.1]} />
        <meshStandardMaterial color="#374151" roughness={0.7} />
      </mesh>

      {Array.from({ length: cartCount }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return (
          <CorralCart
            key={`${id}-cart-${i}`}
            x={-1.1 + col * 1.1}
            z={-0.5 + row * 1.05}
            rot={(i % 2) * 0.08}
          />
        );
      })}

      <mesh position={[0, 1.15, -d / 2 - 0.35]}>
        <boxGeometry args={[2.4, 0.55, 0.06]} />
        <meshStandardMaterial {...SIGN} />
      </mesh>
      <Text position={[0, 1.15, -d / 2 - 0.32]} fontSize={0.22} color="#ffffff" anchorX="center" anchorY="middle">
        CART RETURN
      </Text>

      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[w, 1.1, d]}
        position={[0, 0.55, 0]}
        friction={0.9}
        collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
      />
    </group>
  );
}
