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
import { PerimeterDepartments } from './PerimeterDepartments';
import { ShelfWallpaper } from './ShelfWallpaper';
import { DebugOverlay } from '../../world/DebugOverlay';
import { QuestCollectibles } from './ShelfProducts';
import { RackBulkProps, RackUprights } from './RackBulkProps';
import {
  getWarehouseAisleTexture,
  getWarehouseFloorTexture,
  makeMappedMaterial,
} from './materials/proceduralTextures';
import {
  AISLE_SPECS,
  buildRackVisualChunks,
  CROSS_AISLES_Z,
  RACETRACK_LOOP,
  RACK_HEIGHT,
  RACK_Z_MIN,
  RACK_Z_MAX,
  SPINE_DEPTH,
  WH_CEILING,
  WH_DEPTH,
  WH_WIDTH,
} from './warehouseLayout';

const STEEL = { color: '#b8bcc4', roughness: 0.32, metalness: 0.78, envMapIntensity: 1.15 };

const floorMat = makeMappedMaterial(getWarehouseFloorTexture(), {
  roughness: 0.38,
  metalness: 0.18,
  envMapIntensity: 0.95,
});

function RackInstances({ chunks }: { chunks: ReturnType<typeof buildRackVisualChunks> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    chunks.forEach((chunk, i) => {
      dummy.position.set(chunk.x, RACK_HEIGHT / 2, chunk.z);
      dummy.scale.set(chunk.w, RACK_HEIGHT, SPINE_DEPTH);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [chunks, dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, chunks.length]} castShadow frustumCulled>
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
  const aisleLen = RACK_Z_MAX - RACK_Z_MIN;
  const aisleZ = (RACK_Z_MIN + RACK_Z_MAX) / 2;

  return (
    <>
      {AISLE_SPECS.map(({ x, width }) => (
        <mesh key={`run-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, aisleZ]} receiveShadow material={aisleMat}>
          <planeGeometry args={[width, aisleLen]} />
        </mesh>
      ))}
    </>
  );
}

function RacetrackLoop() {
  const mat = useMemo(
    () => makeMappedMaterial(getWarehouseAisleTexture(), { roughness: 0.82, metalness: 0.02 }),
    [],
  );
  const { z0, z1, westX0, westX1, eastX0, eastX1, southZ0, southZ1 } = RACETRACK_LOOP;
  const loopZ = (z0 + z1) / 2;
  const loopLen = z1 - z0;
  const westW = westX1 - westX0;
  const eastW = eastX1 - eastX0;
  const southW = eastX1 - westX0;
  const southZ = (southZ0 + southZ1) / 2;

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(westX0 + westX1) / 2, 0.018, loopZ]} receiveShadow material={mat}>
        <planeGeometry args={[westW, loopLen]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(eastX0 + eastX1) / 2, 0.018, loopZ]} receiveShadow material={mat}>
        <planeGeometry args={[eastW, loopLen]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(westX0 + eastX1) / 2, 0.017, southZ]} receiveShadow material={mat}>
        <planeGeometry args={[southW, southZ1 - southZ0]} />
      </mesh>
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
    { z: CROSS_AISLES_Z[1], label: 'GROCERY', accent: '#005dab' },
    { z: CROSS_AISLES_Z[2], label: 'HOUSEHOLD', accent: '#0284c7' },
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

export function WarehouseAisles() {
  const rackChunks = useMemo(() => {
    invalidateWarehouseObstacleCache();
    return buildRackVisualChunks();
  }, []);
  const npcs = useMemo(() => generateWarehouseNPCs(), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[WH_WIDTH, WH_DEPTH]} />
      </mesh>

      <AisleRunners />
      <RacetrackLoop />
      <RackInstances chunks={rackChunks} />
      <RackUprights chunks={rackChunks} />
      <RackBulkProps />
      <ShelfWallpaper />
      <AisleMarkers />
      <AisleSigns />
      <PerimeterDepartments />
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

      {import.meta.env.DEV && <DebugOverlay />}

      <NpcCrowd configs={npcs} alwaysActive />
    </group>
  );
}
