import { RigidBody, interactionGroups } from '@react-three/rapier';
import { COLLISION_GROUP } from '../../types/state';
import { NPC, type NPCConfig } from './NPC';

const PARKING_NPCS: NPCConfig[] = [
  {
    id: 'npc-blocker-1',
    archetype: 'BLOCKER',
    baseSpeed: 1.1,
    obsessiveness: 20,
    cartLoad: 2.8,
    color: '#c4a882',
    waypoints: [
      [-4, 0.95, 4],
      [-4, 0.95, -2],
      [2, 0.95, -2],
      [2, 0.95, 4],
    ],
  },
  {
    id: 'npc-aggressor-1',
    archetype: 'AGGRESSOR',
    baseSpeed: 2.2,
    obsessiveness: 10,
    cartLoad: 1.0,
    color: '#d46a6a',
    waypoints: [
      [8, 0.95, 10],
      [8, 0.95, -8],
    ],
  },
  {
    id: 'npc-wanderer-1',
    archetype: 'SAMPLE_HUNTER',
    baseSpeed: 1.4,
    obsessiveness: 75,
    cartLoad: 1.4,
    color: '#8aa4c4',
    waypoints: [
      [-8, 0.95, -6],
      [-2, 0.95, -10],
      [4, 0.95, -6],
    ],
  },
  {
    id: 'npc-blocker-2',
    archetype: 'BLOCKER',
    baseSpeed: 0.9,
    obsessiveness: 35,
    cartLoad: 3.2,
    color: '#b0a090',
    waypoints: [
      [6, 0.95, 2],
      [6, 0.95, 8],
      [-2, 0.95, 8],
    ],
  },
  {
    id: 'npc-wanderer-2',
    archetype: 'BLOCKER',
    baseSpeed: 1.2,
    obsessiveness: 15,
    cartLoad: 1.8,
    color: '#9a9a9a',
    waypoints: [
      [-10, 0.95, 6],
      [-10, 0.95, 12],
      [-5, 0.95, 12],
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

function ParkedCar({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.8, 0.9, 3.6]} />
        <meshStandardMaterial color="#4a4f57" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.05, -0.3]}>
        <boxGeometry args={[1.6, 0.5, 1.8]} />
        <meshStandardMaterial color="#5c626b" roughness={0.65} />
      </mesh>
    </group>
  );
}

export function ParkingLot() {
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid" args={[50, 0.2, 50]} position={[0, -0.1, 0]} friction={1}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#5a5d62" roughness={0.95} metalness={0.05} />
        </mesh>
      </RigidBody>

      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 6 }, (_, col) => {
          const x = -12 + col * 4.5;
          const z = -8 + row * 5;
          if (row === 3 && col === 2) return null;
          return (
            <mesh
              key={`line-${row}-${col}`}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[x, 0.02, z]}
            >
              <planeGeometry args={[3.8, 1.8]} />
              <meshStandardMaterial color="#d8d2c8" />
            </mesh>
          );
        }),
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[4, 7]} />
        <meshStandardMaterial color="#3d7a3d" emissive="#1a4d1a" emissiveIntensity={0.15} />
      </mesh>

      <ParkedCar position={[-10, 0, -4]} rotation={0.1} />
      <ParkedCar position={[10, 0, 4]} rotation={-0.3} />
      <ParkedCar position={[-8, 0, 10]} rotation={1.2} />
      <ParkedCar position={[12, 0, -6]} rotation={0.5} />

      <Boundary position={[0, 1, -24]} args={[50, 3, 1]} />
      <Boundary position={[0, 1, 24]} args={[50, 3, 1]} />
      <Boundary position={[-24, 1, 0]} args={[1, 3, 50]} />
      <Boundary position={[24, 1, 0]} args={[1, 3, 50]} />

      {PARKING_NPCS.map((config) => (
        <NPC key={config.id} config={config} />
      ))}
    </group>
  );
}
