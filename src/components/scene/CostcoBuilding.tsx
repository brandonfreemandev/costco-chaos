import { RigidBody, interactionGroups } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import { COLLISION_GROUP } from '../../types/state';
import { BUILDING } from './parkingLotLayout';

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
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#8a8580" roughness={0.82} metalness={0.1} envMapIntensity={0.9} />
      </mesh>
    </RigidBody>
  );
}

export function CostcoBuilding() {
  const { width, height, depth, frontZ, centerY, centerZ, entranceWidth } = BUILDING;
  const halfW = width / 2;
  const doorHalf = entranceWidth / 2;
  const wallThickness = 0.6;
  const wallHeight = height;
  const wallDepth = depth;

  const leftWallWidth = halfW - doorHalf;
  const rightWallWidth = leftWallWidth;

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, centerY, centerZ]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#9a9590" roughness={0.78} metalness={0.12} envMapIntensity={0.85} />
      </mesh>

      {/* Blue band */}
      <mesh castShadow position={[0, height - 0.8, frontZ + 0.35]}>
        <boxGeometry args={[width - 2, 1.4, 0.4]} />
        <meshStandardMaterial color="#005daa" roughness={0.42} metalness={0.25} />
      </mesh>
      {/* Red stripe */}
      <mesh position={[0, height - 0.8, frontZ + 0.7]}>
        <boxGeometry args={[width - 6, 0.55, 0.15]} />
        <meshStandardMaterial color="#e31837" roughness={0.38} metalness={0.2} emissive="#e31837" emissiveIntensity={0.08} />
      </mesh>

      <Text
        position={[0, height - 0.75, frontZ + 1.05]}
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

      <group position={[0, 2.8, frontZ + 0.55]}>
        <mesh castShadow>
          <boxGeometry args={[entranceWidth, 5.2, 0.25]} />
          <meshStandardMaterial color="#2d3748" metalness={0.45} roughness={0.38} />
        </mesh>
        {[-2.2, 0, 2.2].map((x) => (
          <mesh key={x} position={[x, 0, 0.2]}>
            <boxGeometry args={[1.8, 4.8, 0.08]} />
            <meshStandardMaterial
              color="#93c5fd"
              transparent
              opacity={0.45}
              metalness={0.65}
              roughness={0.08}
              envMapIntensity={1.4}
            />
          </mesh>
        ))}
        <mesh position={[0, -2.2, 0.5]}>
          <boxGeometry args={[entranceWidth + 0.4, 0.35, 1.2]} />
          <meshStandardMaterial color="#6a6560" roughness={0.85} />
        </mesh>
      </group>

      <mesh position={[0, 0.12, frontZ + 2.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[entranceWidth + 2, 3]} />
        <meshStandardMaterial color="#c8c4bc" roughness={0.88} />
      </mesh>

      <WallSegment
        position={[-(doorHalf + leftWallWidth / 2), wallHeight / 2, centerZ]}
        args={[leftWallWidth, wallHeight, wallDepth]}
      />
      <WallSegment
        position={[doorHalf + rightWallWidth / 2, wallHeight / 2, centerZ]}
        args={[rightWallWidth, wallHeight, wallDepth]}
      />
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

      <mesh position={[0, height - 0.2, frontZ + 1.8]} rotation={[-Math.PI / 4, 0, 0]}>
        <boxGeometry args={[entranceWidth + 1, 0.08, 2.5]} />
        <meshStandardMaterial color="#fff8e8" emissive="#ffe8c0" emissiveIntensity={0.45} roughness={0.35} />
      </mesh>
      <pointLight position={[0, height - 1.5, frontZ + 2]} intensity={0.8} color="#fff5e6" distance={14} decay={2} />
    </group>
  );
}
