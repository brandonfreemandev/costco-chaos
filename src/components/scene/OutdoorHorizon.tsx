import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LOT } from './parkingLotLayout';

type BuildingSpec = {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
};

type TreeSpec = {
  x: number;
  z: number;
  scale: number;
  hue: number;
};

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildHorizonLayout(): { buildings: BuildingSpec[]; trees: TreeSpec[] } {
  const buildings: BuildingSpec[] = [];
  const trees: TreeSpec[] = [];
  const palette = ['#8a9199', '#7d848c', '#9aa3ad', '#6f7882', '#a8b0b8', '#5c6770'];
  let seed = 71;

  // North strip — low office / retail park beyond the lot.
  for (let i = 0; i < 18; i++) {
    seed += 13;
    const x = THREE.MathUtils.lerp(LOT.minX - 18, LOT.maxX + 18, i / 17) + (hash01(seed) - 0.5) * 4;
    const z = LOT.maxZ + 10 + hash01(seed + 1) * 14;
    buildings.push({
      x,
      z,
      w: 5 + hash01(seed + 2) * 9,
      h: 6 + hash01(seed + 3) * 16,
      d: 4 + hash01(seed + 4) * 6,
      color: palette[Math.floor(hash01(seed + 5) * palette.length)],
    });
  }

  // East / west tree lines with occasional mid-rise blocks.
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 14; i++) {
      seed += 17;
      const z = THREE.MathUtils.lerp(LOT.minZ + 4, LOT.maxZ + 6, i / 13) + (hash01(seed) - 0.5) * 5;
      const x = side * (LOT.maxX + 14 + hash01(seed + 1) * 10);
      trees.push({
        x,
        z,
        scale: 0.75 + hash01(seed + 2) * 0.65,
        hue: 0.28 + hash01(seed + 3) * 0.08,
      });
      if (hash01(seed + 4) > 0.72) {
        buildings.push({
          x: x + side * (3 + hash01(seed + 6) * 4),
          z,
          w: 4 + hash01(seed + 7) * 5,
          h: 8 + hash01(seed + 8) * 12,
          d: 4 + hash01(seed + 9) * 4,
          color: palette[Math.floor(hash01(seed + 10) * palette.length)],
        });
      }
    }
  }

  // Sparse south-side skyline peek (behind the warehouse mass).
  for (let i = 0; i < 8; i++) {
    seed += 19;
    const x = THREE.MathUtils.lerp(LOT.minX - 10, LOT.maxX + 10, i / 7);
    const z = LOT.minZ - 16 - hash01(seed) * 10;
    if (hash01(seed + 1) > 0.35) {
      buildings.push({
        x,
        z,
        w: 6 + hash01(seed + 2) * 8,
        h: 5 + hash01(seed + 3) * 10,
        d: 4 + hash01(seed + 4) * 5,
        color: palette[Math.floor(hash01(seed + 5) * palette.length)],
      });
    }
    trees.push({
      x: x + (hash01(seed + 6) - 0.5) * 6,
      z: z + 4,
      scale: 0.6 + hash01(seed + 7) * 0.5,
      hue: 0.3 + hash01(seed + 8) * 0.06,
    });
  }

  return { buildings, trees };
}

function DistantBuilding({ spec }: { spec: BuildingSpec }) {
  return (
    <mesh position={[spec.x, spec.h / 2, spec.z]} castShadow receiveShadow>
      <boxGeometry args={[spec.w, spec.h, spec.d]} />
      <meshStandardMaterial color={spec.color} roughness={0.92} metalness={0.02} />
    </mesh>
  );
}

function DistantTree({ spec }: { spec: TreeSpec }) {
  const trunkH = 1.6 * spec.scale;
  const crown = 2.1 * spec.scale;
  const green = useMemo(() => new THREE.Color().setHSL(spec.hue, 0.42, 0.34), [spec.hue]);
  const bark = '#5a4638';

  return (
    <group position={[spec.x, 0, spec.z]} scale={spec.scale}>
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, trunkH, 6]} />
        <meshStandardMaterial color={bark} roughness={0.95} />
      </mesh>
      <mesh position={[0, trunkH + crown * 0.45, 0]} castShadow>
        <coneGeometry args={[crown * 0.55, crown, 7]} />
        <meshStandardMaterial color={green} roughness={0.88} />
      </mesh>
      <mesh position={[0.35, trunkH + crown * 0.25, 0.2]} castShadow>
        <coneGeometry args={[crown * 0.4, crown * 0.75, 6]} />
        <meshStandardMaterial color={green} roughness={0.88} />
      </mesh>
    </group>
  );
}

type BirdPath = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  y: number;
  speed: number;
  phase: number;
  wingRate: number;
};

const BIRD_PATHS: BirdPath[] = [
  {
    start: new THREE.Vector3(-55, 0, 8),
    end: new THREE.Vector3(58, 0, 22),
    y: 31,
    speed: 0.11,
    phase: 0,
    wingRate: 14,
  },
  {
    start: new THREE.Vector3(50, 0, -10),
    end: new THREE.Vector3(-48, 0, 18),
    y: 36,
    speed: 0.09,
    phase: 2.4,
    wingRate: 12,
  },
  {
    start: new THREE.Vector3(-40, 0, 34),
    end: new THREE.Vector3(42, 0, 40),
    y: 28,
    speed: 0.13,
    phase: 5.1,
    wingRate: 16,
  },
];

function Bird({ path }: { path: BirdPath }) {
  const ref = useRef<THREE.Group>(null);
  const leftWing = useRef<THREE.Mesh>(null);
  const rightWing = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * path.speed + path.phase;
    const u = (t % 1 + 1) % 1;
    const x = THREE.MathUtils.lerp(path.start.x, path.end.x, u);
    const z = THREE.MathUtils.lerp(path.start.z, path.end.z, u);
    const y = path.y + Math.sin(t * Math.PI * 2) * 1.2;
    const dx = path.end.x - path.start.x;
    const dz = path.end.z - path.start.z;
    const yaw = Math.atan2(dx, dz);

    if (ref.current) {
      ref.current.position.set(x, y, z);
      ref.current.rotation.set(0, yaw, 0);
    }

    const flap = Math.abs(Math.sin(clock.elapsedTime * path.wingRate)) * 0.55;
    if (leftWing.current) leftWing.current.rotation.z = 0.35 + flap;
    if (rightWing.current) rightWing.current.rotation.z = -0.35 - flap;
  });

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[0.12, 0.05, 0.22]} />
        <meshBasicMaterial color="#2f3640" toneMapped={false} />
      </mesh>
      <mesh ref={leftWing} position={[-0.12, 0.02, 0]}>
        <boxGeometry args={[0.22, 0.02, 0.08]} />
        <meshBasicMaterial color="#3d4654" toneMapped={false} />
      </mesh>
      <mesh ref={rightWing} position={[0.12, 0.02, 0]}>
        <boxGeometry args={[0.22, 0.02, 0.08]} />
        <meshBasicMaterial color="#3d4654" toneMapped={false} />
      </mesh>
    </group>
  );
}

function BirdField() {
  return (
    <>
      {BIRD_PATHS.map((path, i) => (
        <Bird key={i} path={path} />
      ))}
    </>
  );
}

/** Distant skyline ring — buildings, tree lines, and occasional birds. */
export function OutdoorHorizon() {
  const layout = useMemo(() => buildHorizonLayout(), []);

  return (
    <group>
      {layout.buildings.map((b, i) => (
        <DistantBuilding key={`b-${i}`} spec={b} />
      ))}
      {layout.trees.map((t, i) => (
        <DistantTree key={`t-${i}`} spec={t} />
      ))}
      <BirdField />
    </group>
  );
}
