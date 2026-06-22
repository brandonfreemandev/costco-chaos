import { Text } from '@react-three/drei';
import {
  BUILDING_CLERESTORY_WINDOWS,
  CLERESTORY_CENTER_Y,
  CLERESTORY_WINDOW_H,
  CLERESTORY_WINDOW_W,
  VESTIBULE_BARRIER_X,
  VESTIBULE_DOOR_BASE_Y,
  VESTIBULE_DOOR_DEPTH,
  VESTIBULE_DOOR_HEIGHT,
  VESTIBULE_ENTRANCE,
  VESTIBULE_EXIT,
} from './buildingFacadeLayout';

const FRAME = { color: '#374151', metalness: 0.45, roughness: 0.38 };
const GLASS = {
  color: '#93c5fd',
  transparent: true,
  opacity: 0.5,
  metalness: 0.65,
  roughness: 0.08,
  envMapIntensity: 1.2,
};

/** Matching sliding-door vestibule — entrance or receipt-check exit. */
function VestibuleDoor({
  x,
  w,
  z,
  kind,
}: {
  x: number;
  w: number;
  z: number;
  kind: 'entrance' | 'exit';
}) {
  const h = VESTIBULE_DOOR_HEIGHT;
  const d = VESTIBULE_DOOR_DEPTH;
  const frame = 0.14;
  const panelW = Math.min(1.2, w * 0.36);
  const glassH = h - frame * 2 - 0.3;
  const offsets = [-w * 0.22, 0, w * 0.22].filter((off) => Math.abs(off) <= w / 2 - panelW / 2 - frame - 0.05);
  const signY = h / 2 - frame - 0.22;

  return (
    <group position={[x, VESTIBULE_DOOR_BASE_Y, z]}>
      <mesh position={[0, h / 2 - frame / 2, 0]} castShadow>
        <boxGeometry args={[w, frame, d]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[-w / 2 + frame / 2, 0, 0]} castShadow>
        <boxGeometry args={[frame, h, d]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[w / 2 - frame / 2, 0, 0]} castShadow>
        <boxGeometry args={[frame, h, d]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[0, -h / 2 + 0.16, d * 0.35]} castShadow>
        <boxGeometry args={[w + 0.12, 0.28, 0.75]} />
        <meshStandardMaterial color="#6a6560" roughness={0.85} />
      </mesh>

      {offsets.map((off) => (
        <mesh key={off} position={[off, -0.05, d * 0.42]}>
          <boxGeometry args={[panelW, glassH, 0.06]} />
          <meshStandardMaterial {...GLASS} />
        </mesh>
      ))}

      <mesh position={[0, signY, d * 0.52]}>
        <boxGeometry args={[w * 0.72, 0.34, 0.06]} />
        <meshStandardMaterial
          color={kind === 'exit' ? '#dc2626' : '#166534'}
          emissive={kind === 'exit' ? '#ef4444' : '#22c55e'}
          emissiveIntensity={0.85}
          roughness={0.4}
        />
      </mesh>
      <Text position={[0, signY, d * 0.58]} fontSize={0.2} color="#fff" anchorX="center">
        {kind === 'exit' ? 'EXIT' : 'ENTER'}
      </Text>
    </group>
  );
}

/** Flush west vestibule cluster — parking-lot facade (entrance + exit + windows). */
export function BuildingWestVestibuleExterior({ facadeZ }: { facadeZ: number }) {
  return (
    <group>
      <VestibuleDoor x={VESTIBULE_ENTRANCE.x} w={VESTIBULE_ENTRANCE.w} z={facadeZ} kind="entrance" />
      <VestibuleDoor x={VESTIBULE_EXIT.x} w={VESTIBULE_EXIT.w} z={facadeZ} kind="exit" />

      <mesh position={[VESTIBULE_BARRIER_X, 1.4, facadeZ + VESTIBULE_DOOR_DEPTH * 0.5]} castShadow>
        <boxGeometry args={[0.12, 2.5, 0.12]} />
        <meshStandardMaterial color="#64748b" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[VESTIBULE_BARRIER_X, 2.55, facadeZ + VESTIBULE_DOOR_DEPTH * 0.5]}>
        <boxGeometry args={[2.2, 0.07, 0.07]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.4} />
      </mesh>

      <BuildingClerestoryWindows z={facadeZ} faceSouth />
    </group>
  );
}

/** Interior south wall — mirrors the exterior: entrance + receipt-check exit side-by-side. */
export function BuildingWestVestibuleInterior({ facadeZ }: { facadeZ: number }) {
  return (
    <group>
      <VestibuleDoor x={VESTIBULE_ENTRANCE.x} w={VESTIBULE_ENTRANCE.w} z={facadeZ} kind="entrance" />
      <VestibuleDoor x={VESTIBULE_EXIT.x} w={VESTIBULE_EXIT.w} z={facadeZ} kind="exit" />
      <BuildingClerestoryWindows z={facadeZ} />
    </group>
  );
}

export function BuildingClerestoryWindows({
  z,
  faceSouth = false,
}: {
  z: number;
  faceSouth?: boolean;
}) {
  const zOffset = faceSouth ? VESTIBULE_DOOR_DEPTH * 0.5 : -VESTIBULE_DOOR_DEPTH * 0.5;
  return (
    <>
      {BUILDING_CLERESTORY_WINDOWS.map((x, i) => (
        <group key={`clerestory-${i}`} position={[x, CLERESTORY_CENTER_Y, z + zOffset]}>
          <mesh>
            <boxGeometry args={[CLERESTORY_WINDOW_W, CLERESTORY_WINDOW_H, 0.1]} />
            <meshStandardMaterial
              color="#7dd3fc"
              emissive="#0ea5e9"
              emissiveIntensity={faceSouth ? 0.65 : 0.9}
              roughness={0.05}
              metalness={0.2}
            />
          </mesh>
          <mesh position={[0, 0, faceSouth ? -0.02 : 0.02]}>
            <boxGeometry args={[CLERESTORY_WINDOW_W + 0.15, CLERESTORY_WINDOW_H + 0.12, 0.05]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.55} />
          </mesh>
        </group>
      ))}
    </>
  );
}
