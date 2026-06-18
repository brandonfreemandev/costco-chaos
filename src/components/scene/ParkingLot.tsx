import { RigidBody, interactionGroups } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import { COLLISION_GROUP } from '../../types/state';
import { NPC, type NPCConfig } from './NPC';
import { CostcoBuilding } from './CostcoBuilding';
import {
  BUILDING,
  CROSSWALK,
  generateParkedCars,
  LOT,
  MAIN_DRIVE,
  SIDEWALK,
} from './parkingLotLayout';

const PARKING_NPCS: NPCConfig[] = [
  {
    id: 'lot-blocker-1',
    archetype: 'BLOCKER',
    baseSpeed: 0.95,
    obsessiveness: 30,
    cartLoad: 2.5,
    color: '#b8a48c',
    waypoints: [
      [-7, 0.95, 18],
      [-7, 0.95, 2],
      [-7, 0.95, -12],
    ],
  },
  {
    id: 'lot-blocker-2',
    archetype: 'BLOCKER',
    baseSpeed: 0.8,
    obsessiveness: 20,
    cartLoad: 2.8,
    color: '#9a9a9a',
    waypoints: [
      [7, 0.95, 22],
      [7, 0.95, 6],
      [7, 0.95, -10],
    ],
  },
  {
    id: 'lot-aggressor-1',
    archetype: 'AGGRESSOR',
    baseSpeed: 1.8,
    obsessiveness: 10,
    cartLoad: 1.1,
    color: '#c47a7a',
    waypoints: [
      [2.5, 0.95, 28],
      [2.5, 0.95, -8],
    ],
  },
];

function StaticCollider({
  position,
  args,
  visible = false,
  color = '#5a5d62',
}: {
  position: [number, number, number];
  args: [number, number, number];
  visible?: boolean;
  color?: string;
}) {
  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      args={args}
      position={position}
      friction={0.9}
      collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
    >
      <mesh visible={visible} castShadow={visible} receiveShadow={visible}>
        <boxGeometry args={args} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </RigidBody>
  );
}

function ParkedCar({ x, z, rotation, color }: { x: number; z: number; rotation: number; color: string }) {
  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      args={[0.95, 0.75, 1.9]}
      position={[x, 0.75, z]}
      rotation={[0, rotation, 0]}
      friction={0.85}
      collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
    >
      <group>
        <mesh castShadow position={[0, 0, 0]}>
          <boxGeometry args={[1.85, 0.85, 3.7]} />
          <meshStandardMaterial color={color} roughness={0.72} metalness={0.15} />
        </mesh>
        <mesh castShadow position={[0, 0.52, -0.35]}>
          <boxGeometry args={[1.65, 0.48, 1.75]} />
          <meshStandardMaterial color={darken(color)} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.35, 0.55]}>
          <boxGeometry args={[1.7, 0.4, 1.2]} />
          <meshStandardMaterial color="#1a1a22" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
    </RigidBody>
  );
}

function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 30);
  const g = Math.max(0, ((n >> 8) & 255) - 30);
  const b = Math.max(0, (n & 255) - 30);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function CrosswalkStripes() {
  const stripes = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const x = -CROSSWALK.width / 2 + 0.8 + i * 1.35;
    stripes.push(
      <mesh
        key={i}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[x, 0.045, CROSSWALK.z]}
      >
        <planeGeometry args={[0.7, CROSSWALK.depth]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.85} />
      </mesh>,
    );
  }
  return <group>{stripes}</group>;
}

function ParkingStall({ x, z, rotation = 0 }: { x: number; z: number; rotation?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, rotation, 0]} position={[x, 0.035, z]}>
      <planeGeometry args={[2.6, 5.2]} />
      <meshStandardMaterial color="#d8d2c8" roughness={0.95} />
    </mesh>
  );
}

export function ParkingLot() {
  const parkedCars = generateParkedCars();
  const { width, depth, minX, maxX, minZ, maxZ } = LOT;

  const stallPositions: [number, number][] = [];
  for (const x of [-24, -17.5, -11, 11, 17.5, 24]) {
    for (let i = 0; i < 6; i++) {
      stallPositions.push([x, 4 + i * 5.8]);
    }
  }

  return (
    <group>
      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[width, 0.25, depth]}
        position={[0, -0.12, (minZ + maxZ) / 2]}
        friction={1}
      >
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#5c5f64" roughness={0.94} metalness={0.06} />
        </mesh>
      </RigidBody>

      {stallPositions.map(([x, z], i) => (
        <ParkingStall key={`stall-${i}`} x={x} z={z} />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, (minZ + maxZ) / 2 + 8]}>
        <planeGeometry args={[MAIN_DRIVE.maxX * 2, depth - 10]} />
        <meshStandardMaterial color="#666a70" roughness={0.93} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, SIDEWALK.z]}>
        <planeGeometry args={[SIDEWALK.width, SIDEWALK.depth]} />
        <meshStandardMaterial color="#b8b4ac" roughness={0.96} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.043, BUILDING.frontZ + 2]}>
        <planeGeometry args={[BUILDING.entranceWidth + 4, 4]} />
        <meshStandardMaterial color="#b8b4ac" roughness={0.96} />
      </mesh>

      <CrosswalkStripes />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.044, CROSSWALK.z - 1.8]}>
        <planeGeometry args={[MAIN_DRIVE.maxX * 2 + 2, 0.35]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.9} />
      </mesh>

      <Text
        position={[5.5, 2.2, CROSSWALK.z]}
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
        fontSize={0.55}
        color="#f0f0f0"
        anchorX="center"
      >
        PEDESTRIAN CROSSING
      </Text>

      <mesh position={[0, 1.2, -30]}>
        <boxGeometry args={[3.5, 2.4, 0.2]} />
        <meshStandardMaterial color="#2a5a2a" emissive="#1a3a1a" emissiveIntensity={0.2} />
      </mesh>
      <Text position={[0, 2.1, -29.85]} fontSize={0.42} color="#e8ffe8" anchorX="center">
        ENTRANCE
      </Text>

      <CostcoBuilding />

      {parkedCars.map((car) => (
        <ParkedCar key={car.id} x={car.x} z={car.z} rotation={car.rotation} color={car.color} />
      ))}

      <StaticCollider position={[0, 0.35, maxZ + 0.5]} args={[width + 2, 0.7, 1]} visible color="#6a6e65" />
      <StaticCollider position={[0, 0.35, minZ - 0.5]} args={[width + 2, 0.7, 1]} visible color="#6a6e65" />
      <StaticCollider position={[minX - 0.5, 0.35, (minZ + maxZ) / 2]} args={[1, 0.7, depth + 2]} visible color="#6a6e65" />
      <StaticCollider position={[maxX + 0.5, 0.35, (minZ + maxZ) / 2]} args={[1, 0.7, depth + 2]} visible color="#6a6e65" />

      {[-28, 28].map((x) => (
        <group key={`berm-${x}`}>
          <mesh position={[x, 1.2, (minZ + maxZ) / 2]}>
            <boxGeometry args={[3, 2.4, depth - 4]} />
            <meshStandardMaterial color="#5a6b4a" roughness={0.95} />
          </mesh>
          <StaticCollider
            position={[x, 1.2, (minZ + maxZ) / 2]}
            args={[3, 2.4, depth - 4]}
            visible={false}
          />
        </group>
      ))}

      {PARKING_NPCS.map((config) => (
        <NPC key={config.id} config={config} />
      ))}
    </group>
  );
}
