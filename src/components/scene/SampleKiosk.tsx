import { useEffect, useRef, useState } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import * as THREE from 'three';
import { useSampleStationStore } from '../../stores/sampleStationStore';
import { usePlayerStore } from '../../stores/playerStore';
import type { SampleKioskSpec } from '../../systems/sampleStations';

const COOLDOWN_MS = 28_000;

interface SampleKioskProps {
  kiosk: SampleKioskSpec;
}

export function SampleKiosk({ kiosk }: SampleKioskProps) {
  const lastTaken = useSampleStationStore((s) => s.lastTakenAt[kiosk.id]);
  const atMaxMh = usePlayerStore((s) => s.mentalHealth >= 100);
  const [, setCooldownTick] = useState(0);
  const ringRef = useRef<Mesh>(null);
  const ringMatRef = useRef<MeshBasicMaterial>(null);

  const ready = lastTaken === undefined || Date.now() - lastTaken >= COOLDOWN_MS;

  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => setCooldownTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [ready, lastTaken]);

  useFrame(({ clock }) => {
    if (!ready || !ringRef.current || !ringMatRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.2) * 0.08;
    ringRef.current.scale.set(pulse, pulse, 1);
    ringMatRef.current.opacity = 0.65 + Math.sin(clock.elapsedTime * 3.2) * 0.2;
  });

  return (
    <group position={[kiosk.x, 0, kiosk.z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} renderOrder={10}>
        <ringGeometry args={[2.0, 2.85, 48]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={ready ? '#22c55e' : '#64748b'}
          transparent
          opacity={ready ? 0.85 : 0.4}
          depthWrite={false}
        />
      </mesh>
      {ready && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.081, 0]} renderOrder={11}>
            <circleGeometry args={[1.85, 48]} />
            <meshBasicMaterial color="#4ade80" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <pointLight position={[0, 2, 0]} intensity={0.4} color="#4ade80" distance={6} decay={2} />
        </>
      )}

      {/* Counter base */}
      <mesh castShadow position={[0, 0.48, 0]}>
        <boxGeometry args={[1.6, 0.85, 0.55]} />
        <meshStandardMaterial color="#d4d0c8" roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[1.7, 0.12, 0.65]} />
        <meshStandardMaterial color="#8a8580" roughness={0.7} />
      </mesh>

      {/* Heat lamp */}
      <mesh position={[0, 1.35, 0.12]}>
        <cylinderGeometry args={[0.5, 0.65, 0.18, 16, 1, true]} />
        <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.22, 0.12]}>
        <sphereGeometry args={[0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={ready ? '#fff8dc' : '#777'}
          emissive={ready ? '#ffaa33' : '#000000'}
          emissiveIntensity={ready ? 1.6 : 0}
          roughness={0.25}
          transparent
          opacity={0.85}
        />
      </mesh>
      {ready && (
        <pointLight position={[0, 1.1, 0.2]} intensity={0.55} color="#ffb347" distance={4} decay={2} />
      )}

      {/* Sample tray */}
      <mesh position={[0, 0.96, 0.18]}>
        <boxGeometry args={[0.9, 0.04, 0.45]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.35} metalness={0.2} />
      </mesh>

      <Billboard position={[0, 1.5, 0]}>
        <Text position={[0, 0.16, 0]} fontSize={0.3} color={ready ? '#fde047' : '#94a3b8'} anchorX="center">
          {ready ? 'FREE SAMPLE' : 'RESTOCKING…'}
        </Text>
        <Text position={[0, -0.17, 0]} fontSize={0.2} color="#e2e8f0" anchorX="center" maxWidth={2.2}>
          {kiosk.sampleName}
        </Text>
      </Billboard>
      {ready && (
        <Billboard position={[0, 0.35, 0.55]}>
          <Text fontSize={0.18} color={atMaxMh ? '#94a3b8' : '#86efac'} anchorX="center" maxWidth={2.4}>
            {atMaxMh ? 'Already at 100% MH' : 'Roll cart through green ring'}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
