import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { useEncounterStore } from '../../stores/encounterStore';

/** Demo booth location — center court, where the cart passes through. */
const BOOTH = { x: 0, z: -2 } as const;
const TRIGGER_RADIUS = 4.2;
const SKIN = '#d8a878';
const ROBE = '#7c3aed'; // purple "vestments"

/** One PA speaker on a pole, angled to face outward from the booth. */
function PASpeaker({ angle, radius }: { angle: number; radius: number }) {
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  return (
    <group position={[x, 0, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.8, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 1.9, 0]}>
        <boxGeometry args={[0.42, 0.6, 0.34]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* speaker cones */}
      <mesh position={[0, 2.02, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.78, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.04, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Brother Blendon — arms raised in blender-gospel rapture, headset mic. */
function ProphetAvatar() {
  const armRef = useRef<THREE.Group>(null);
  // Gentle preacher sway on the raised arms.
  useFrame(({ clock }) => {
    if (armRef.current) armRef.current.rotation.z = Math.sin(clock.elapsedTime * 2) * 0.12;
  });

  return (
    <group position={[0, 0, -0.55]}>
      {/* Body / vestments */}
      <mesh castShadow position={[0, 0.78, 0]}>
        <capsuleGeometry args={[0.32, 0.7, 6, 12]} />
        <meshStandardMaterial color={ROBE} roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.26, 20, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>

      {/* Headset band over the head */}
      <mesh position={[0, 1.66, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.27, 0.025, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Earpiece */}
      <mesh position={[0.26, 1.5, 0]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
      </mesh>
      {/* Mic boom arm + foam ball at the mouth */}
      <mesh position={[0.16, 1.42, 0.18]} rotation={[0.5, -0.6, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.34, 6]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
      </mesh>
      <mesh position={[0.02, 1.4, 0.26]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>

      {/* Raised arms (rapture) */}
      <group ref={armRef} position={[0, 1.1, 0]}>
        <mesh castShadow position={[-0.38, 0.25, 0]} rotation={[0, 0, 0.9]}>
          <capsuleGeometry args={[0.1, 0.6, 4, 8]} />
          <meshStandardMaterial color={ROBE} roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0.38, 0.25, 0]} rotation={[0, 0, -0.9]}>
          <capsuleGeometry args={[0.1, 0.6, 4, 8]} />
          <meshStandardMaterial color={ROBE} roughness={0.7} />
        </mesh>
        {/* hands */}
        <mesh position={[-0.62, 0.5, 0]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color={SKIN} roughness={0.8} /></mesh>
        <mesh position={[0.62, 0.5, 0]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color={SKIN} roughness={0.8} /></mesh>
      </group>
    </group>
  );
}

export function VitamixBooth() {
  const triggered = useRef(false);
  const probe = useRef(new THREE.Vector3());

  useFrame(() => {
    if (triggered.current) return;
    const p = useCartTransformStore.getState().position;
    probe.current.set(p.x - BOOTH.x, 0, p.z - BOOTH.z);
    if (probe.current.length() <= TRIGGER_RADIUS) {
      triggered.current = true;
      useEncounterStore.getState().trigger('vitamix-prophet');
    }
  });

  return (
    <group position={[BOOTH.x, 0, BOOTH.z]}>
      {/* Demo counter */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2.2, 1.0, 0.9]} />
        <meshStandardMaterial color="#e2e0db" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[2.3, 0.06, 1.0]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.4} />
      </mesh>

      {/* The Blender — base + pitcher */}
      <mesh castShadow position={[0, 1.18, 0.1]}>
        <boxGeometry args={[0.34, 0.26, 0.34]} />
        <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.55, 0.1]}>
        <cylinderGeometry args={[0.17, 0.13, 0.5, 16]} />
        <meshStandardMaterial color="#bfdbfe" transparent opacity={0.5} roughness={0.1} metalness={0.2} />
      </mesh>
      {/* smoothie inside */}
      <mesh position={[0, 1.46, 0.1]}>
        <cylinderGeometry args={[0.15, 0.12, 0.28, 16]} />
        <meshStandardMaterial color="#84cc16" roughness={0.5} />
      </mesh>

      <ProphetAvatar />

      {/* PA speaker ring */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <PASpeaker key={i} angle={(i / 6) * Math.PI * 2} radius={3.0} />
      ))}

      {/* Banner */}
      <Billboard position={[0, 3.0, 0]}>
        <mesh position={[0, 0, -0.03]}>
          <planeGeometry args={[4.4, 0.9]} />
          <meshStandardMaterial color="#4c1d95" emissive="#7c3aed" emissiveIntensity={0.3} roughness={0.6} />
        </mesh>
        <Text position={[0, 0.16, 0]} fontSize={0.34} color="#fde047" anchorX="center" anchorY="middle">
          BLEND &amp; BE SAVED
        </Text>
        <Text position={[0, -0.22, 0]} fontSize={0.16} color="#e9d5ff" anchorX="center" anchorY="middle">
          Vitamix™ Live Demo · Witness the 64oz Miracle
        </Text>
      </Billboard>

      <pointLight position={[0, 3.2, 0]} intensity={0.6} color="#a78bfa" distance={8} decay={2} />
    </group>
  );
}
