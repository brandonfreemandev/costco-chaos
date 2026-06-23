import { Billboard, Text } from '@react-three/drei';
import { useGameStore } from '../../stores/gameStore';
import { CART_CORRALS } from './parkingLotLayout';
import { BoothStaffAvatar } from './EncounterAvatar';
import { useEncounterProximityTrigger } from '../../systems/encounterProximity';

const corral = CART_CORRALS.find((c) => c.id === 'corral-entrance-r')!;
const BOOTH = { x: corral.x - 2.2, z: corral.z + 1.2 } as const;
const TRIGGER_RADIUS = 4.5;

export function CartReturnSheriff() {
  const phase = useGameStore((s) => s.phase);

  useEncounterProximityTrigger({
    personaId: 'cart-return-sheriff',
    x: BOOTH.x,
    z: BOOTH.z,
    radius: TRIGGER_RADIUS,
    enabled: phase === 'PARKING',
  });

  return (
    <group position={[BOOTH.x, 0, BOOTH.z]}>
      <BoothStaffAvatar
        skinTone="#c68642"
        hairColor="#78350f"
        shirtColor="#1e3a5f"
        pantsColor="#0f172a"
        hairStyle="hat"
        expression="stern"
        vestColor="#f59e0b"
        badge
        rotationY={0.35}
      >
        <mesh position={[0.34, 0.88, 0.18]} rotation={[0.15, -0.55, 0]}>
          <boxGeometry args={[0.26, 0.34, 0.04]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
        <mesh position={[0.38, 0.72, 0.2]} rotation={[0.1, -0.4, 0]}>
          <boxGeometry args={[0.04, 0.22, 0.02]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.45} metalness={0.3} />
        </mesh>
      </BoothStaffAvatar>

      <Billboard position={[0, 2.2, 0]}>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[3.4, 0.7]} />
          <meshStandardMaterial color="#b91c1c" emissive="#ef4444" emissiveIntensity={0.12} roughness={0.55} />
        </mesh>
        <Text position={[0, 0.08, 0]} fontSize={0.22} color="#fff" anchorX="center">
          CART RETURN ZONE
        </Text>
        <Text position={[0, -0.18, 0]} fontSize={0.13} color="#fecaca" anchorX="center">
          Officer Dale · Lot Safety
        </Text>
      </Billboard>
    </group>
  );
}
