import { useMemo } from 'react';
import { RigidBody, interactionGroups } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import { COLLISION_GROUP } from '../../types/state';
import { generateGauntletNPCs } from './CulledNPC';
import { CostcoBuilding } from './CostcoBuilding';
import { CartCorral } from './CartCorral';
import { ParkingStripes } from './ParkingStripes';
import { NpcCrowd } from './NpcCrowd';
import { CartModel, cartBodyY } from './CartModel';
import { OUTDOOR_GROUND_Y } from './npcGrounding';
import {
  carColliderCenterY,
  carColliderForStyle,
  carStyleFromId,
  ParkedCarVisual,
} from './ParkedCarVisual';
import {
  getAsphaltTexture,
  getConcreteTexture,
  makeMappedMaterial,
} from './materials/proceduralTextures';
import {
  BUILDING,
  CART_CORRALS,
  CROSSWALK,
  ENTRANCE_MARKER,
  APPROACH_CART_OBSTACLES,
  generateParkedCars,
  LOT,
  MAIN_DRIVE,
  SIDEWALK,
} from './parkingLotLayout';
import { invalidateParkingObstacleCache } from '../../systems/staticObstacles';

const asphaltMat = makeMappedMaterial(getAsphaltTexture(), { roughness: 0.92, metalness: 0.04 });
const concreteMat = makeMappedMaterial(getConcreteTexture(), { roughness: 0.88, metalness: 0.02 });

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

function ParkedCar({ id, x, z, rotation, color }: { id: string; x: number; z: number; rotation: number; color: string }) {
  const style = carStyleFromId(id);
  const collider = carColliderForStyle(style);
  const bodyY = carColliderCenterY(style);

  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      args={collider}
      position={[x, bodyY, z]}
      rotation={[0, rotation, 0]}
      friction={0.85}
      collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
    >
      <group position={[0, -bodyY - 0.04, 0]}>
        <ParkedCarVisual id={id} color={color} style={style} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={-1}>
          <planeGeometry args={[2.1, 4.2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </group>
    </RigidBody>
  );
}

function AbandonedCart({ x, z }: { x: number; z: number }) {
  const rot = (x + z) * 0.07;
  const bodyY = cartBodyY(OUTDOOR_GROUND_Y);

  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      args={[0.55, 0.72, 0.95]}
      position={[x, bodyY, z]}
      rotation={[0, rot, 0]}
      friction={0.9}
      collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
    >
      <CartModel />
    </RigidBody>
  );
}

/** Small landscaped island between row pairs (Costco-style). */
function ParkingIsland({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[2.8, 0.5, 5.5]} />
        <meshStandardMaterial color="#6b6560" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[0, 0.65, 0]}>
        <boxGeometry args={[2.2, 0.5, 2.2]} />
        <meshStandardMaterial color="#4a7c3f" roughness={0.9} />
      </mesh>
    </group>
  );
}

function CrosswalkStripes() {
  const stripes = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const x = -CROSSWALK.width / 2 + 0.8 + i * 1.35;
    stripes.push(
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.045, CROSSWALK.z]}>
        <planeGeometry args={[0.7, CROSSWALK.depth]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.75} />
      </mesh>,
    );
  }
  return <group>{stripes}</group>;
}

export function ParkingLot() {
  const parkedCars = useMemo(() => {
    invalidateParkingObstacleCache();
    return generateParkedCars();
  }, []);
  const gauntletNpcs = useMemo(() => generateGauntletNPCs(), []);
  const { width, depth, minX, maxX, minZ, maxZ } = LOT;

  return (
    <group>
      <RigidBody
        type="fixed"
        colliders="cuboid"
        args={[width, 0.25, depth]}
        position={[0, -0.12, (minZ + maxZ) / 2]}
        friction={1}
      >
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} material={asphaltMat}>
          <planeGeometry args={[width, depth]} />
        </mesh>
      </RigidBody>

      <ParkingStripes />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, (minZ + maxZ) / 2 + 8]} receiveShadow material={asphaltMat}>
        <planeGeometry args={[MAIN_DRIVE.maxX * 2, depth - 10]} />
      </mesh>

      <ParkingIsland x={-22} z={6.5} />
      <ParkingIsland x={22} z={6.5} />
      <ParkingIsland x={-22} z={21.5} />
      <ParkingIsland x={22} z={21.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, SIDEWALK.z]} receiveShadow material={concreteMat}>
        <planeGeometry args={[SIDEWALK.width, SIDEWALK.depth]} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.043, BUILDING.frontZ + 2]} receiveShadow material={concreteMat}>
        <planeGeometry args={[BUILDING.entranceWidth + 4, 4]} />
      </mesh>

      <CrosswalkStripes />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.044, CROSSWALK.z - 1.8]}>
        <planeGeometry args={[MAIN_DRIVE.maxX * 2 + 2, 0.35]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.85} emissive="#f59e0b" emissiveIntensity={0.06} />
      </mesh>

      <Text
        position={[0, 0.048, CROSSWALK.z + 1.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.32}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
        maxWidth={7}
      >
        PEDESTRIAN CROSSING
      </Text>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ENTRANCE_MARKER.x, 0.046, ENTRANCE_MARKER.z]}>
        <planeGeometry args={[ENTRANCE_MARKER.width, ENTRANCE_MARKER.depth]} />
        <meshStandardMaterial color="#15803d" emissive="#22c55e" emissiveIntensity={0.35} roughness={0.75} />
      </mesh>
      <pointLight position={[ENTRANCE_MARKER.x, 2.5, ENTRANCE_MARKER.z]} intensity={0.5} color="#4ade80" distance={8} decay={2} />

      <CostcoBuilding />

      {CART_CORRALS.map((corral) => (
        <CartCorral key={corral.id} spec={corral} />
      ))}

      {parkedCars.map((car) => (
        <ParkedCar key={car.id} id={car.id} x={car.x} z={car.z} rotation={car.rotation} color={car.color} />
      ))}

      <StaticCollider position={[0, 0.35, maxZ + 0.5]} args={[width + 2, 0.7, 1]} visible color="#6a6e65" />
      <StaticCollider position={[0, 0.35, minZ - 0.5]} args={[width + 2, 0.7, 1]} visible color="#6a6e65" />
      <StaticCollider position={[minX - 0.5, 0.35, (minZ + maxZ) / 2]} args={[1, 0.7, depth + 2]} visible color="#6a6e65" />
      <StaticCollider position={[maxX + 0.5, 0.35, (minZ + maxZ) / 2]} args={[1, 0.7, depth + 2]} visible color="#6a6e65" />

      {[-28, 28].map((x) => (
        <group key={`berm-${x}`}>
          <mesh castShadow position={[x, 1.2, (minZ + maxZ) / 2]}>
            <boxGeometry args={[3, 2.4, depth - 4]} />
            <meshStandardMaterial color="#5a8a42" roughness={0.92} />
          </mesh>
          <StaticCollider position={[x, 1.2, (minZ + maxZ) / 2]} args={[3, 2.4, depth - 4]} visible={false} />
        </group>
      ))}

      {APPROACH_CART_OBSTACLES.map((cart, i) => (
        <AbandonedCart key={`abandon-${i}`} x={cart.x} z={cart.z} />
      ))}

      <NpcCrowd configs={gauntletNpcs} alwaysActive cullDistance={24} wakeDistance={28} />
    </group>
  );
}
