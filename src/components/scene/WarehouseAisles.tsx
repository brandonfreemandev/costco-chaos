import { RigidBody, interactionGroups } from '@react-three/rapier';
import { COLLISION_GROUP } from '../../types/state';
import { NPC, type NPCConfig } from './NPC';

const WAREHOUSE_NPCS: NPCConfig[] = [
  {
    id: 'wh-blocker-1',
    archetype: 'BLOCKER',
    baseSpeed: 0.85,
    obsessiveness: 40,
    cartLoad: 3.0,
    color: '#b8a48c',
    waypoints: [
      [-1.8, 0.95, 10],
      [-1.8, 0.95, -2],
      [1.8, 0.95, -2],
    ],
  },
  {
    id: 'wh-blocker-2',
    archetype: 'BLOCKER',
    baseSpeed: 0.7,
    obsessiveness: 25,
    cartLoad: 2.6,
    color: '#9a9a9a',
    waypoints: [
      [2.2, 0.95, 14],
      [2.2, 0.95, 0],
    ],
  },
  {
    id: 'wh-aggressor-1',
    archetype: 'AGGRESSOR',
    baseSpeed: 1.5,
    obsessiveness: 15,
    cartLoad: 1.2,
    color: '#c47a7a',
    waypoints: [
      [-2.4, 0.95, -6],
      [-2.4, 0.95, 8],
    ],
  },
];

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

function ShelfRow({ x, length }: { x: number; length: number }) {
  const segments = Math.floor(length / 3);
  return (
    <group>
      {Array.from({ length: segments }, (_, i) => (
        <group key={i} position={[x, 0, -length / 2 + i * 3 + 1.5]}>
          <mesh castShadow position={[0, 1.4, 0]}>
            <boxGeometry args={[1.5, 2.8, 2.7]} />
            <meshStandardMaterial color="#6e5a45" roughness={0.88} />
          </mesh>
          <mesh castShadow position={[0, 2.2, 0]}>
            <boxGeometry args={[1.45, 0.55, 2.6]} />
            <meshStandardMaterial color="#c9b896" roughness={0.92} />
          </mesh>
          <mesh castShadow position={[0, 0.65, 0]}>
            <boxGeometry args={[1.45, 1.1, 2.6]} />
            <meshStandardMaterial color="#8a7358" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function WarehouseAisles() {
  const aisleLength = 52;
  const aisleWidth = 14;

  return (
    <group>
      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[aisleWidth, 0.2, aisleLength]}
        position={[0, -0.1, 0]}
        friction={1}
      >
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[aisleWidth, aisleLength]} />
          <meshStandardMaterial color="#6a6d72" roughness={0.92} metalness={0.1} />
        </mesh>
      </RigidBody>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[3.6, aisleLength - 2]} />
        <meshStandardMaterial color="#e0dbd2" roughness={0.95} />
      </mesh>

      <ShelfRow x={-5.4} length={aisleLength} />
      <ShelfRow x={5.4} length={aisleLength} />

      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[aisleWidth, 0.4, aisleLength]} />
        <meshStandardMaterial color="#3a3d42" roughness={0.8} />
      </mesh>

      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} position={[0, 4.85, -aisleLength / 2 + i * 4.5 + 2]}>
          <mesh>
            <boxGeometry args={[2.8, 0.1, 1.6]} />
            <meshStandardMaterial
              color="#e8f4ff"
              emissive="#cce0ff"
              emissiveIntensity={0.5}
              roughness={0.25}
            />
          </mesh>
          <pointLight intensity={22} distance={12} decay={2} color="#f0f8ff" />
        </group>
      ))}

      {Array.from({ length: 10 }, (_, i) => (
        <group key={`led-${i}`} position={[0, 4.6, -aisleLength / 2 + i * 5 + 2.5]}>
          <mesh>
            <boxGeometry args={[12, 0.12, 0.8]} />
            <meshStandardMaterial
              color="#f5f5f0"
              emissive="#fff8e0"
              emissiveIntensity={0.85}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}

      <Boundary position={[0, 2, -aisleLength / 2 - 0.5]} args={[aisleWidth, 4, 1]} />
      <Boundary position={[0, 2, aisleLength / 2 + 0.5]} args={[aisleWidth, 4, 1]} />
      <Boundary position={[-7.5, 2, 0]} args={[1, 4, aisleLength]} />
      <Boundary position={[7.5, 2, 0]} args={[1, 4, aisleLength]} />

      {WAREHOUSE_NPCS.map((config) => (
        <NPC key={config.id} config={config} />
      ))}
    </group>
  );
}
