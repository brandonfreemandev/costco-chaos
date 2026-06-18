import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { spatialAudio } from '../../audio/spatialAudioManager';
import type { ShoppingListItem } from '../../types/state';
import { QUEST_PRODUCT_VISUALS } from './warehouseProducts';

const PICKUP_RADIUS = 2.8;
const pulse = new THREE.Vector3();

interface CollectibleProductProps {
  item: ShoppingListItem;
}

export function CollectibleProduct({ item }: CollectibleProductProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const collected = usePlayerStore((s) => s.inventory.items.find((i) => i.id === item.id)?.collected);
  const collectItem = usePlayerStore((s) => s.collectItem);
  const pickedUp = useRef(false);

  const visual = QUEST_PRODUCT_VISUALS[item.category];

  useFrame((state) => {
    if (collected || pickedUp.current) return;

    const playerPos = useCartTransformStore.getState().position;
    pulse.set(item.worldPosition.x, item.worldPosition.y, item.worldPosition.z);
    const dist = playerPos.distanceTo(pulse);

    const t = state.clock.elapsedTime;
    const pulseScale = 1 + Math.sin(t * 3.5) * 0.06;
    const emissive = 0.55 + Math.sin(t * 4) * 0.35;

    if (meshRef.current) {
      meshRef.current.scale.setScalar(pulseScale);
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = emissive;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.2 + Math.sin(t * 4) * 0.8;
    }

    if (dist < PICKUP_RADIUS) {
      pickedUp.current = true;
      collectItem(item.id);
      spatialAudio.playCorporateDing();
      console.log(`[Inventory] Collected ${item.name}`);
    }
  });

  if (collected) return null;

  return (
    <group position={[item.worldPosition.x, item.worldPosition.y, item.worldPosition.z]}>
      <pointLight
        ref={lightRef}
        color="#ffe566"
        intensity={1.5}
        distance={5}
        decay={2}
      />
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[visual.w, visual.h, visual.d]} />
        <meshStandardMaterial
          color={visual.color}
          emissive="#ffcc00"
          emissiveIntensity={0.7}
          roughness={0.55}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, visual.h / 2 + 0.08, 0]}>
        <boxGeometry args={[visual.w + 0.1, 0.06, visual.d + 0.1]} />
        <meshStandardMaterial
          color="#ffee88"
          emissive="#ffdd44"
          emissiveIntensity={1.2}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

interface DecoyShelfProductProps {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
}

export function DecoyShelfProduct({ x, y, z, w, h, d, color }: DecoyShelfProductProps) {
  return (
    <mesh position={[x, y, z]} castShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.82} metalness={0.05} />
    </mesh>
  );
}
