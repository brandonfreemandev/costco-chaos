import { useLayoutEffect, useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import { SAMPLE_KIOSKS } from '../../systems/sampleStations';
import { generateWarehouseNPCs } from './CulledNPC';
import { NpcCrowd } from './NpcCrowd';
import { invalidateWarehouseObstacleCache } from '../../systems/staticObstacles';
import { SampleKiosk } from './SampleKiosk';
import { WarehouseCeilingLights } from './WarehouseCeilingLights';
import { WarehouseFloorGlow } from './WarehouseFloorGlow';
import { CheckoutMezzanine } from './CheckoutMezzanine';
import { ShelfWallpaper } from './ShelfWallpaper';
import { QuestCollectibles } from './ShelfProducts';
import { RackBulkProps, RackUprights } from './RackBulkProps';
import {
  getWarehouseAisleTexture,
  getWarehouseFloorTexture,
  makeMappedMaterial,
} from './materials/proceduralTextures';
import {
  AISLE_CENTERS_X,
  AISLE_WIDTH,
  buildRackSegments,
  CROSS_AISLES_Z,
  RACK_HEIGHT,
  SPINE_DEPTH,
  WH_CEILING,
  WH_DEPTH,
  WH_MAX_X,
  WH_MAX_Z,
  WH_MIN_X,
  WH_MIN_Z,
  WH_WIDTH,
} from './warehouseLayout';

const STEEL = { color: '#b8bcc4', roughness: 0.32, metalness: 0.78, envMapIntensity: 1.15 };

const floorMat = makeMappedMaterial(getWarehouseFloorTexture(), {
  roughness: 0.38,
  metalness: 0.18,
  envMapIntensity: 0.95,
});

function RackInstances({ segments }: { segments: ReturnType<typeof buildRackSegments> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    segments.forEach((seg, i) => {
      const len = seg.z1 - seg.z0;
      dummy.position.set(seg.x, RACK_HEIGHT / 2, (seg.z0 + seg.z1) / 2);
      dummy.scale.set(SPINE_DEPTH, RACK_HEIGHT, len);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [segments, dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, segments.length]} castShadow frustumCulled>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial {...STEEL} />
    </instancedMesh>
  );
}

function AisleRunners() {
  const aisleMat = useMemo(
    () => makeMappedMaterial(getWarehouseAisleTexture(), { roughness: 0.78, metalness: 0.04 }),
    [],
  );

  return (
    <>
      {AISLE_CENTERS_X.map((ax) => (
        <mesh key={`run-${ax}`} rotation={[-Math.PI / 2, 0, 0]} position={[ax, 0.02, 0]} receiveShadow material={aisleMat}>
          <planeGeometry args={[AISLE_WIDTH, WH_DEPTH - 6]} />
        </mesh>
      ))}
    </>
  );
}

function AisleMarkers() {
  const items = usePlayerStore((s) => s.inventory.items);

  return (
    <>
      {items
        .filter((item) => !item.collected)
        .map((item) => (
          <group key={item.id} position={[item.worldPosition.x, 0, item.worldPosition.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
              <ringGeometry args={[1.4, 1.85, 32]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.55} depthWrite={false} />
            </mesh>
            <pointLight position={[0, 2.5, 0]} intensity={0.35} color="#fbbf24" distance={5} decay={2} />
          </group>
        ))}
    </>
  );
}

function AisleSigns() {
  const signConfigs = [
    { z: CROSS_AISLES_Z[0], label: 'SAMPLES →', accent: '#f59e0b' },
    { z: CROSS_AISLES_Z[1], label: 'BAKERY', accent: '#d97706' },
    { z: CROSS_AISLES_Z[2], label: 'ELECTRONICS', accent: '#2563eb' },
    { z: CROSS_AISLES_Z[3], label: 'BULK PAPER', accent: '#64748b' },
  ];

  return (
    <>
      {signConfigs.map((sign) => (
        <group key={`sign-${sign.z}`} position={[0, RACK_HEIGHT + 0.8, sign.z]}>
          <mesh scale={[3.4, 1.3, 0.12]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.55} />
          </mesh>
          <mesh position={[0, 0, 0.08]} scale={[3.2, 0.12, 0.02]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={sign.accent} emissive={sign.accent} emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, 0, 0.1]}>
            <boxGeometry args={[3.2, 1.1, 0.02]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#fff8e8"
              emissiveIntensity={0.08}
              roughness={0.3}
            />
          </mesh>
          <Text position={[0, 0, 0.12]} fontSize={0.42} color={sign.accent} anchorX="center" anchorY="middle">
            {sign.label}
          </Text>
        </group>
      ))}
    </>
  );
}

function PerimeterWalls() {
  const h = WH_CEILING - 0.5;
  const cy = h / 2;
  const cz = (WH_MIN_Z + WH_MAX_Z) / 2;
  const mat = { color: '#9ca3af', roughness: 0.88, metalness: 0.06 };

  return (
    <group>
      <mesh position={[0, cy, WH_MIN_Z - 0.35]} receiveShadow>
        <boxGeometry args={[WH_WIDTH + 1, h, 0.5]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[WH_MIN_X - 0.35, cy, cz]} receiveShadow>
        <boxGeometry args={[0.5, h, WH_DEPTH]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[WH_MAX_X + 0.35, cy, cz]} receiveShadow>
        <boxGeometry args={[0.5, h, WH_DEPTH]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    </group>
  );
}

function MeatCooler() {
  return (
    <group position={[-11, 0, -24]}>
      <mesh castShadow position={[0, 2.6, 0]}>
        <boxGeometry args={[9, 5.2, 7]} />
        <meshStandardMaterial color="#b8dce8" roughness={0.18} metalness={0.45} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[0, 2.6, 3.55]}>
        <boxGeometry args={[8.4, 4.8, 0.08]} />
        <meshStandardMaterial
          color="#e0f2fe"
          roughness={0.05}
          metalness={0.2}
          transparent
          opacity={0.55}
          envMapIntensity={1.5}
        />
      </mesh>
      <mesh position={[0, 3.8, 3.2]}>
        <boxGeometry args={[7.5, 0.5, 0.15]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0284c7" emissiveIntensity={0.35} />
      </mesh>
      <pointLight position={[0, 3.5, 2]} intensity={0.6} color="#7dd3fc" distance={12} decay={2} />
      <Text position={[0, 4.2, 3.8]} fontSize={0.38} color="#0ea5e9" anchorX="center">
        MEAT / ROTISSERIE →
      </Text>
    </group>
  );
}

export function WarehouseAisles() {
  const rackSegments = useMemo(() => {
    invalidateWarehouseObstacleCache();
    return buildRackSegments();
  }, []);
  const npcs = useMemo(() => generateWarehouseNPCs(), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[WH_WIDTH, WH_DEPTH]} />
      </mesh>

      <AisleRunners />
      <RackInstances segments={rackSegments} />
      <RackUprights segments={rackSegments} />
      <RackBulkProps />
      <ShelfWallpaper />
      <AisleMarkers />
      <AisleSigns />
      <PerimeterWalls />
      <MeatCooler />
      <CheckoutMezzanine />
      <WarehouseFloorGlow />
      <WarehouseCeilingLights />

      <QuestCollectibles />

      <mesh position={[0, WH_CEILING, 0]} receiveShadow>
        <boxGeometry args={[WH_WIDTH, 0.35, WH_DEPTH]} />
        <meshStandardMaterial color="#2d3238" roughness={0.92} metalness={0.06} />
      </mesh>
      <mesh position={[0, WH_CEILING - 0.2, 0]}>
        <boxGeometry args={[WH_WIDTH - 2, 0.08, WH_DEPTH - 2]} />
        <meshStandardMaterial color="#3a4048" roughness={0.85} />
      </mesh>

      {SAMPLE_KIOSKS.map((kiosk) => (
        <SampleKiosk key={kiosk.id} kiosk={kiosk} />
      ))}

      <NpcCrowd configs={npcs} cullDistance={18} wakeDistance={22} />
    </group>
  );
}
