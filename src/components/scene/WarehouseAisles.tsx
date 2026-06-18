import { useMemo } from 'react';
import { RigidBody, interactionGroups } from '@react-three/rapier';
import { usePlayerStore } from '../../stores/playerStore';
import { COLLISION_GROUP } from '../../types/state';
import { CulledNPC, generateWarehouseNPCs } from './CulledNPC';
import { CollectibleProduct, DecoyShelfProduct } from './ShelfProducts';
import { generateDecoyProducts } from './warehouseProducts';

const AISLE_LENGTH = 52;
const AISLE_WIDTH = 14;

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

function ShelfStructure({ x, length }: { x: number; length: number }) {
  const segments = Math.floor(length / 3);
  return (
    <group>
      {Array.from({ length: segments }, (_, i) => (
        <group key={i} position={[x, 0, -length / 2 + i * 3 + 1.5]}>
          <mesh castShadow position={[0, 1.4, 0]}>
            <boxGeometry args={[1.5, 2.8, 2.7]} />
            <meshStandardMaterial color="#6e5a45" roughness={0.88} />
          </mesh>
          <mesh castShadow position={[0, 0.15, 0]}>
            <boxGeometry args={[1.55, 0.12, 2.75]} />
            <meshStandardMaterial color="#4a3d30" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function WarehouseAisles() {
  const items = usePlayerStore((s) => s.inventory.items);
  const decoys = useMemo(() => generateDecoyProducts(AISLE_LENGTH), []);
  const npcs = useMemo(() => generateWarehouseNPCs(AISLE_LENGTH), []);

  return (
    <group>
      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[AISLE_WIDTH, 0.2, AISLE_LENGTH]}
        position={[0, -0.1, 0]}
        friction={1}
      >
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[AISLE_WIDTH, AISLE_LENGTH]} />
          <meshStandardMaterial color="#6a6d72" roughness={0.92} metalness={0.1} />
        </mesh>
      </RigidBody>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[3.6, AISLE_LENGTH - 2]} />
        <meshStandardMaterial color="#e0dbd2" roughness={0.95} />
      </mesh>

      <ShelfStructure x={-5.4} length={AISLE_LENGTH} />
      <ShelfStructure x={5.4} length={AISLE_LENGTH} />

      {decoys.map((p) => (
        <DecoyShelfProduct
          key={p.id}
          x={p.x}
          y={p.y}
          z={p.z}
          w={p.w}
          h={p.h}
          d={p.d}
          color={p.color}
        />
      ))}

      {items.map((item) => (
        <CollectibleProduct key={item.id} item={item} />
      ))}

      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[AISLE_WIDTH, 0.4, AISLE_LENGTH]} />
        <meshStandardMaterial color="#3a3d42" roughness={0.8} />
      </mesh>

      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} position={[0, 4.85, -AISLE_LENGTH / 2 + i * 4.5 + 2]}>
          <mesh>
            <boxGeometry args={[2.8, 0.1, 1.6]} />
            <meshStandardMaterial
              color="#e8f4ff"
              emissive="#cce0ff"
              emissiveIntensity={0.5}
              roughness={0.25}
            />
          </mesh>
          <pointLight intensity={18} distance={12} decay={2} color="#f0f8ff" />
        </group>
      ))}

      {Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={`led-${i}`}
          position={[0, 4.6, -AISLE_LENGTH / 2 + i * 5 + 2.5]}
        >
          <boxGeometry args={[12, 0.12, 0.8]} />
          <meshStandardMaterial
            color="#f5f5f0"
            emissive="#fff8e0"
            emissiveIntensity={0.85}
            roughness={0.3}
          />
        </mesh>
      ))}

      <Boundary position={[0, 2, -AISLE_LENGTH / 2 - 0.5]} args={[AISLE_WIDTH, 4, 1]} />
      <Boundary position={[0, 2, AISLE_LENGTH / 2 + 0.5]} args={[AISLE_WIDTH, 4, 1]} />
      <Boundary position={[-7.5, 2, 0]} args={[1, 4, AISLE_LENGTH]} />
      <Boundary position={[7.5, 2, 0]} args={[1, 4, AISLE_LENGTH]} />

      {npcs.map((config) => (
        <CulledNPC key={config.id} config={config} />
      ))}
    </group>
  );
}
