import { RigidBody, interactionGroups } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import { COLLISION_GROUP } from '../../types/state';
import { BUILDING } from './parkingLotLayout';
import {
  BUILDING_ENTRANCE,
  BUILDING_VESTIBULE_DOORS,
  doorWallFillSegments,
} from './buildingFacadeLayout';
import { BuildingWestVestibuleExterior } from './BuildingSideDoorBank';

function WallSegment({
  position,
  args,
}: {
  position: [number, number, number];
  args: [number, number, number];
}) {
  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      args={args}
      position={position}
      collisionGroups={interactionGroups(COLLISION_GROUP.STATIC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.NPC])}
    />
  );
}

export function CostcoBuilding() {
  const { width, height, depth, frontZ, centerY, centerZ } = BUILDING;
  const halfW = width / 2;
  const wallThickness = 0.6;
  const wallHeight = height;
  const wallDepth = depth;
  /** Single flush plane for vestibule doors + windows — no extra bump-out boxes. */
  const facadeZ = frontZ + 0.08;
  const fillSegments = doorWallFillSegments(-halfW, halfW, BUILDING_VESTIBULE_DOORS);

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, centerY, centerZ]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#9a9590"
          roughness={0.78}
          metalness={0.12}
          envMapIntensity={0.85}
        />
      </mesh>

      {/* Brand band — only element slightly proud of the shell */}
      <mesh castShadow position={[0, height - 0.8, facadeZ + 0.22]}>
        <boxGeometry args={[width - 2, 1.4, 0.28]} />
        <meshStandardMaterial color="#005dab" roughness={0.42} metalness={0.25} />
      </mesh>
      <mesh position={[0, height - 0.8, facadeZ + 0.38]}>
        <boxGeometry args={[width - 6, 0.55, 0.12]} />
        <meshStandardMaterial
          color="#e31837"
          roughness={0.38}
          metalness={0.2}
          emissive="#e31837"
          emissiveIntensity={0.08}
        />
      </mesh>

      <Text
        position={[0, height - 0.75, facadeZ + 0.48]}
        fontSize={1.35}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
        outlineWidth={0.02}
        outlineColor="#003d73"
      >
        COSTCO WHOLESALE
      </Text>

      <BuildingWestVestibuleExterior facadeZ={facadeZ} />

      <mesh position={[BUILDING_ENTRANCE.x, 0.12, facadeZ + 0.55]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BUILDING_ENTRANCE.w + 1.2, 3]} />
        <meshStandardMaterial color="#c8c4bc" roughness={0.88} />
      </mesh>

      {fillSegments.map(({ x, w }, i) => (
        <WallSegment
          key={`col-${i}`}
          position={[x, wallHeight / 2, centerZ]}
          args={[w, wallHeight, wallDepth]}
        />
      ))}

      <WallSegment
        position={[0, wallHeight / 2, centerZ - depth / 2 - wallThickness / 2]}
        args={[width, wallHeight, wallThickness]}
      />
      <WallSegment
        position={[-halfW - wallThickness / 2, wallHeight / 2, centerZ]}
        args={[wallThickness, wallHeight, depth]}
      />
      <WallSegment
        position={[halfW + wallThickness / 2, wallHeight / 2, centerZ]}
        args={[wallThickness, wallHeight, depth]}
      />

      <pointLight position={[BUILDING_ENTRANCE.x, height - 1.5, facadeZ + 1.2]} intensity={0.8} color="#fff5e6" distance={14} decay={2} />
    </group>
  );
}
