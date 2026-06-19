import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { spatialAudio } from '../../audio/spatialAudioManager';
import type { ShoppingListItem } from '../../types/state';
import type { ProductKind } from './warehouseProducts';
import { QUEST_PRODUCT_VISUALS } from './warehouseProducts';

const PICKUP_RADIUS = 2.8;
const pulse = new THREE.Vector3();

function ProductMesh({
  kind,
  w,
  h,
  d,
  color,
  label,
  emissive = '#000000',
  emissiveIntensity = 0,
  showLabel = true,
}: {
  kind: ProductKind;
  w: number;
  h: number;
  d: number;
  color: string;
  label: string;
  emissive?: string;
  emissiveIntensity?: number;
  showLabel?: boolean;
}) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.62} metalness={0.08} />
      </mesh>
      {kind === 'shrinkPack' && (
        <mesh position={[0, 0, d / 2 + 0.008]}>
          <boxGeometry args={[w + 0.04, h + 0.04, 0.012]} />
          <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.35} transparent opacity={0.35} />
        </mesh>
      )}
      {kind === 'pallet' && (
        <mesh position={[0, -h / 2 + 0.06, 0]}>
          <boxGeometry args={[w + 0.06, 0.1, d + 0.06]} />
          <meshStandardMaterial color="#8b6914" roughness={0.9} />
        </mesh>
      )}
      {kind === 'appliance' && (
        <mesh position={[0, 0, d / 2 + 0.01]}>
          <boxGeometry args={[w * 0.88, h * 0.82, 0.02]} />
          <meshStandardMaterial color="#222228" roughness={0.2} metalness={0.6} emissive="#334" emissiveIntensity={0.15} />
        </mesh>
      )}
      {showLabel && (
        <Text
          position={[0, h * 0.15, d / 2 + 0.02]}
          fontSize={Math.min(0.14, w * 0.18)}
          color="#2a2520"
          anchorX="center"
          anchorY="middle"
          maxWidth={w * 0.92}
        >
          {label}
        </Text>
      )}
      {!showLabel && (
        <mesh position={[0, h * 0.1, d / 2 + 0.015]}>
          <planeGeometry args={[w * 0.7, h * 0.35]} />
          <meshStandardMaterial color="#f5f5f0" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

interface CollectibleProductProps {
  item: ShoppingListItem;
}

export function CollectibleProduct({ item }: CollectibleProductProps) {
  const meshRef = useRef<THREE.Group>(null);
  const collected = usePlayerStore((s) => s.inventory.items.find((i) => i.id === item.id)?.collected);
  const collectItem = usePlayerStore((s) => s.collectItem);
  const pickedUp = useRef(false);

  const visual = QUEST_PRODUCT_VISUALS[item.category];

  useFrame((state) => {
    if (collected || pickedUp.current) return;

    const playerPos = useCartTransformStore.getState().position;
    pulse.set(item.worldPosition.x, item.worldPosition.y, item.worldPosition.z);
    const dist = playerPos.distanceTo(pulse);

    if (meshRef.current) {
      const t = state.clock.elapsedTime;
      const pulseScale = 1 + Math.sin(t * 3.5) * 0.04;
      meshRef.current.scale.setScalar(pulseScale);
    }

    if (dist < PICKUP_RADIUS) {
      pickedUp.current = true;
      collectItem(item.id);
      useUIStore.setState({ lastCollisionMessage: `Added ${item.name} to cart ✓` });
      if (useGameStore.getState().audioUnlocked) {
        spatialAudio.playCorporateDing();
      }
      console.log(`[Inventory] Collected ${item.name}`);
    }
  });

  if (collected) return null;

  return (
    <group ref={meshRef} position={[item.worldPosition.x, item.worldPosition.y, item.worldPosition.z]}>
      <ProductMesh
        kind={visual.kind}
        w={visual.w}
        h={visual.h}
        d={visual.d}
        color={visual.color}
        label={visual.label}
        emissive="#ffcc00"
        emissiveIntensity={0.65}
        showLabel={false}
      />
      <mesh position={[0, visual.h / 2 + 0.08, 0]}>
        <boxGeometry args={[visual.w + 0.1, 0.06, visual.d + 0.1]} />
        <meshStandardMaterial color="#ffee88" emissive="#ffdd44" emissiveIntensity={1.4} transparent opacity={0.85} />
      </mesh>
      <Text position={[0, visual.h + 0.35, 0]} fontSize={0.22} color="#fde047" anchorX="center" maxWidth={2.2}>
        {item.name.split('(')[0].trim()}
      </Text>
    </group>
  );
}

interface DecoyShelfProductProps {
  kind: ProductKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  label: string;
  rotationY: number;
}

export function DecoyShelfProduct({ kind, x, y, z, w, h, d, color, label, rotationY }: DecoyShelfProductProps) {
  return (
    <group position={[x, y, z]} rotation={[0, rotationY, 0]}>
      <ProductMesh kind={kind} w={w} h={h} d={d} color={color} label={label} showLabel={false} />
    </group>
  );
}

export function QuestCollectibles() {
  const items = usePlayerStore((s) => s.inventory.items);

  return (
    <>
      {items.map((item) => (
        <CollectibleProduct key={item.id} item={item} />
      ))}
    </>
  );
}
