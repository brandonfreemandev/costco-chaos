import { Billboard, Text } from '@react-three/drei';
import { useEncounterProximityTrigger } from '../../systems/encounterProximity';
import { BoothStaffAvatar } from './EncounterAvatar';
import { SAMPLE_KIOSKS } from '../../systems/sampleStations';

const KIOSK_ID = 'sample-mid';
const kiosk = SAMPLE_KIOSKS.find((k) => k.id === KIOSK_ID)!;
/** Linda stands between the west aisle and her counter — you meet her before the green ring. */
const LINDA = { x: kiosk.x + 1.4, z: kiosk.z } as const;
const TRIGGER_RADIUS = 5.5;

export function SampleInquisitorTrigger() {
  useEncounterProximityTrigger({
    personaId: 'sample-inquisitor',
    x: LINDA.x,
    z: LINDA.z,
    radius: TRIGGER_RADIUS,
  });

  return (
    <group position={[LINDA.x, 0, LINDA.z]}>
      <BoothStaffAvatar
        skinTone="#e8c4a8"
        hairColor="#5a4030"
        shirtColor="#e11d48"
        pantsColor="#1e293b"
        hairStyle="net"
        expression="stern"
        rotationY={-Math.PI / 2}
      />
      <mesh position={[0.32, 0.92, 0.08]} rotation={[0.15, -0.5, 0]}>
        <boxGeometry args={[0.18, 0.24, 0.03]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
      <Billboard position={[0, 2.05, 0]}>
        <Text fontSize={0.16} color="#fecaca" anchorX="center">
          Linda · Sample QA
        </Text>
      </Billboard>
    </group>
  );
}
