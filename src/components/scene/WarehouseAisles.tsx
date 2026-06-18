import { useMemo } from 'react';
import { RigidBody, interactionGroups } from '@react-three/rapier';
import { usePlayerStore } from '../../stores/playerStore';
import { COLLISION_GROUP } from '../../types/state';
import { CulledNPC, generateWarehouseNPCs } from './CulledNPC';
import { CollectibleProduct, DecoyShelfProduct } from './ShelfProducts';
import { generateDecoyProducts, SHELF_INSET_X } from './warehouseProducts';

const MAIN_AISLE_LEN = 48;
const CROSS_AISLE_LEN = 22;
const CROSS_Z = -6;

function Boundary({ position, args }: { position: [number, number, number]; args: [number, number, number] }) {
  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      args={args}
      position={position}
      collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
    >
      <mesh visible={false}>
        <boxGeometry args={args} />
      </mesh>
    </RigidBody>
  );
}

function ShelfBay({ x, z, rotationY = 0 }: { x: number; z: number; rotationY?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[2.2, 2.6, 1.1]}
        position={[0, 1.3, 0]}
        collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.2, 2.6, 1.1]} />
          <meshStandardMaterial color="#6e5a45" roughness={0.88} />
        </mesh>
      </RigidBody>
      {[0.5, 1.2, 1.9].map((y) => (
        <mesh key={y} castShadow position={[0, y, 0.05]}>
          <boxGeometry args={[2.05, 0.1, 1.0]} />
          <meshStandardMaterial color="#4a3d30" roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
}

function buildShelfBays(): { x: number; z: number; rot: number }[] {
  const bays: { x: number; z: number; rot: number }[] = [];

  for (let z = -MAIN_AISLE_LEN / 2 + 1.5; z < MAIN_AISLE_LEN / 2; z += 2.4) {
    bays.push({ x: -5.8, z, rot: 0 });
    bays.push({ x: 5.8, z, rot: 0 });
  }

  for (let x = -CROSS_AISLE_LEN / 2 + 1.5; x < CROSS_AISLE_LEN / 2; x += 2.4) {
    if (Math.abs(x) < 4) continue;
    bays.push({ x, z: CROSS_Z - 5.8, rot: Math.PI / 2 });
    bays.push({ x, z: CROSS_Z + 5.8, rot: Math.PI / 2 });
  }

  return bays;
}

export function WarehouseAisles() {
  const items = usePlayerStore((s) => s.inventory.items);
  const shelfBays = useMemo(() => buildShelfBays(), []);
  const decoys = useMemo(() => generateDecoyProducts(MAIN_AISLE_LEN, SHELF_INSET_X), []);
  const npcs = useMemo(() => generateWarehouseNPCs(MAIN_AISLE_LEN), []);

  return (
    <group>
      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[26, 0.2, MAIN_AISLE_LEN]}
        position={[0, -0.1, 0]}
        friction={1}
      >
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[26, MAIN_AISLE_LEN]} />
          <meshStandardMaterial color="#6a6d72" roughness={0.92} metalness={0.1} />
        </mesh>
      </RigidBody>

      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[CROSS_AISLE_LEN, 0.2, 8]}
        position={[0, -0.1, CROSS_Z]}
        friction={1}
      >
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CROSS_AISLE_LEN, 8]} />
          <meshStandardMaterial color="#6a6d72" roughness={0.92} />
        </mesh>
      </RigidBody>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[4, MAIN_AISLE_LEN - 1]} />
        <meshStandardMaterial color="#e0dbd2" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, CROSS_Z]}>
        <planeGeometry args={[CROSS_AISLE_LEN - 1, 3.5]} />
        <meshStandardMaterial color="#e0dbd2" roughness={0.95} />
      </mesh>

      {shelfBays.map((bay, i) => (
        <ShelfBay key={`bay-${i}`} x={bay.x} z={bay.z} rotationY={bay.rot} />
      ))}

      {decoys.map((p) => (
        <DecoyShelfProduct key={p.id} {...p} />
      ))}

      {items.map((item) => (
        <CollectibleProduct key={item.id} item={item} />
      ))}

      <mesh position={[0, 5.5, 0]}>
        <boxGeometry args={[26, 0.35, MAIN_AISLE_LEN]} />
        <meshStandardMaterial color="#3a3d42" roughness={0.8} />
      </mesh>

      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[0, 5.35, -MAIN_AISLE_LEN / 2 + i * 3.5 + 1.5]}>
          <boxGeometry args={[10, 0.1, 0.7]} />
          <meshStandardMaterial color="#f5f5f0" emissive="#fff8e0" emissiveIntensity={0.9} roughness={0.3} />
        </mesh>
      ))}

      <Boundary position={[0, 2, -MAIN_AISLE_LEN / 2 - 0.5]} args={[26, 4, 1]} />
      <Boundary position={[0, 2, MAIN_AISLE_LEN / 2 + 0.5]} args={[26, 4, 1]} />
      <Boundary position={[-13.5, 2, 0]} args={[1, 4, MAIN_AISLE_LEN]} />
      <Boundary position={[13.5, 2, 0]} args={[1, 4, MAIN_AISLE_LEN]} />
      <Boundary position={[0, 2, CROSS_Z - 8]} args={[CROSS_AISLE_LEN, 4, 1]} />
      <Boundary position={[0, 2, CROSS_Z + 8]} args={[CROSS_AISLE_LEN, 4, 1]} />

      {npcs.map((config) => (
        <CulledNPC key={config.id} config={config} cullDistance={24} wakeDistance={28} />
      ))}
    </group>
  );
}
