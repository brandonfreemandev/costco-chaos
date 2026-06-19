import { RigidBody, interactionGroups } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import { COLLISION_GROUP } from '../../types/state';
import { BUILDING, ENTRANCE_ALCOVE } from './parkingLotLayout';

const WALL = { color: '#8a8580', roughness: 0.82, metalness: 0.1, envMapIntensity: 0.9 };
const CONCRETE = { color: '#b8b4ac', roughness: 0.88, metalness: 0.04 };
const SOFFIT = { color: '#6a6560', roughness: 0.78, metalness: 0.08 };
const RAIL = { color: '#9ca3af', roughness: 0.38, metalness: 0.78 };

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
        <meshStandardMaterial {...WALL} />
      </mesh>
    </RigidBody>
  );
}

/** Recessed cart-collection alcove with covered ceiling and doors at the back wall. */
function RecessedEntrance() {
  const { width, backZ, mouthZ, ceilingY, wallH } = ENTRANCE_ALCOVE;
  const halfW = width / 2;
  const midZ = (mouthZ + backZ) / 2;
  const alcoveLen = mouthZ - backZ;

  return (
    <group>
      {/* Alcove floor slab */}
      <mesh position={[0, 0.1, midZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width - 0.4, alcoveLen + 0.6]} />
        <meshStandardMaterial {...CONCRETE} />
      </mesh>

      {/* Covered ceiling / soffit */}
      <mesh castShadow position={[0, ceilingY, midZ]}>
        <boxGeometry args={[width, 0.35, alcoveLen + 0.5]} />
        <meshStandardMaterial {...SOFFIT} />
      </mesh>
      <mesh position={[0, ceilingY - 0.22, midZ]}>
        <boxGeometry args={[width - 0.6, 0.06, alcoveLen]} />
        <meshStandardMaterial color="#4a5568" roughness={0.55} metalness={0.2} />
      </mesh>

      {/* Side wing walls */}
      <WallSegment position={[-halfW, wallH / 2 + 0.1, midZ]} args={[0.45, wallH, alcoveLen + 0.4]} />
      <WallSegment position={[halfW, wallH / 2 + 0.1, midZ]} args={[0.45, wallH, alcoveLen + 0.4]} />

      {/* Back wall with sliding door bank */}
      <mesh castShadow position={[0, wallH / 2 + 0.1, backZ - 0.12]}>
        <boxGeometry args={[width - 0.8, wallH, 0.35]} />
        <meshStandardMaterial color="#3d4450" roughness={0.5} metalness={0.35} />
      </mesh>
      {[-2.4, 0, 2.4].map((x) => (
        <mesh key={x} position={[x, 2.6, backZ + 0.08]}>
          <boxGeometry args={[2.0, 4.6, 0.1]} />
          <meshStandardMaterial
            color="#93c5fd"
            transparent
            opacity={0.42}
            metalness={0.65}
            roughness={0.08}
            envMapIntensity={1.4}
          />
        </mesh>
      ))}

      {/* Cart-collection rails along alcove sides */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh castShadow position={[side * (halfW - 0.55), 0.55, midZ - 0.8]}>
            <boxGeometry args={[0.05, 0.05, alcoveLen - 1.6]} />
            <meshStandardMaterial {...RAIL} />
          </mesh>
          <mesh castShadow position={[side * (halfW - 0.55), 0.28, midZ - 0.8]}>
            <boxGeometry args={[0.04, 0.04, alcoveLen - 1.6]} />
            <meshStandardMaterial {...RAIL} />
          </mesh>
        </group>
      ))}

      {/* Scattered cart silhouettes in the alcove */}
      {[
        [-3.2, -1.2],
        [2.8, -2.4],
        [-1.5, -3.8],
      ].map(([x, zOff], i) => (
        <mesh key={i} castShadow position={[x, 0.42, midZ + zOff]}>
          <boxGeometry args={[0.55, 0.75, 0.85]} />
          <meshStandardMaterial color="#707780" roughness={0.55} metalness={0.45} />
        </mesh>
      ))}

      <Text position={[0, 4.2, mouthZ - 0.4]} fontSize={0.34} color="#dcfce7" anchorX="center">
        ENTRANCE
      </Text>

      <pointLight position={[0, ceilingY - 0.5, midZ]} intensity={1.1} color="#fff5e6" distance={16} decay={2} />
      <pointLight position={[0, 3.2, backZ + 1.2]} intensity={0.65} color="#dbeafe" distance={10} decay={2} />
    </group>
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
        <meshStandardMaterial color="#005dab" roughness={0.42} metalness={0.25} />
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

      <RecessedEntrance />

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

      <pointLight position={[0, height - 1.5, frontZ + 2]} intensity={0.8} color="#fff5e6" distance={14} decay={2} />
    </group>
  );
}
