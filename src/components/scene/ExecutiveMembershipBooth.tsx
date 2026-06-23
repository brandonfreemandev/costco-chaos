import { Billboard, Text } from '@react-three/drei';
import { CHECKOUT_NORTH_EDGE_Z } from './checkoutLayout';
import { BoothStaffAvatar } from './EncounterAvatar';
import { useEncounterProximityTrigger } from '../../systems/encounterProximity';

/** Executive Membership kiosk — front court, east side of the entrance path. */
const BOOTH = { x: 6, z: CHECKOUT_NORTH_EDGE_Z + 1.4 } as const;
const TRIGGER_RADIUS = 3.8;

export function ExecutiveMembershipBooth() {
  useEncounterProximityTrigger({
    personaId: 'executive-rep',
    x: BOOTH.x,
    z: BOOTH.z,
    radius: TRIGGER_RADIUS,
  });

  return (
    <group position={[BOOTH.x, 0, BOOTH.z]}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.8, 0.9, 0.7]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.55} metalness={0.12} />
      </mesh>
      <mesh position={[0.55, 0.72, 0.15]} rotation={[-0.35, 0.2, 0]}>
        <boxGeometry args={[0.42, 0.28, 0.04]} />
        <meshStandardMaterial color="#1e293b" roughness={0.35} />
      </mesh>

      <group position={[-0.35, 0, 0.15]}>
        <BoothStaffAvatar
          skinTone="#f0d5be"
          hairColor="#8a7060"
          shirtColor="#005dab"
          pantsColor="#334155"
          hairStyle="short"
          expression="smile"
          badge
          rotationY={Math.PI / 2}
        />
      </group>

      <Billboard position={[0, 2.35, 0]}>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[3.2, 0.75]} />
          <meshStandardMaterial color="#005dab" emissive="#0ea5e9" emissiveIntensity={0.2} roughness={0.5} />
        </mesh>
        <Text position={[0, 0.1, 0]} fontSize={0.26} color="#fff" anchorX="center">
          EXECUTIVE MEMBERSHIP
        </Text>
        <Text position={[0, -0.2, 0]} fontSize={0.14} color="#bfdbfe" anchorX="center">
          Tiffany · Elevate your journey™
        </Text>
      </Billboard>
    </group>
  );
}
