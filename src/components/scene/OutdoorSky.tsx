import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OutdoorHorizon } from './OutdoorHorizon';

/** Canvas gradient with soft horizontal banding — cheery blue, not flat. */
function createSkyGradientTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0d47a1');
  grad.addColorStop(0.18, '#1565c0');
  grad.addColorStop(0.42, '#1e88e5');
  grad.addColorStop(0.62, '#42a5f5');
  grad.addColorStop(0.82, '#64b5f6');
  grad.addColorStop(1, '#90caf9');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 6; i++) {
    const y = h * (0.25 + i * 0.11);
    const band = ctx.createLinearGradient(0, y - 18, 0, y + 18);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, `rgba(255,255,255,${0.04 + (i % 2) * 0.02})`);
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, y - 18, w, 36);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const CLOUD_SEEDS: { pos: [number, number, number]; scale: number }[] = [
  { pos: [-42, 34, -10], scale: 1.15 },
  { pos: [34, 36, 8], scale: 1.05 },
  { pos: [-14, 32, 22], scale: 1.1 },
  { pos: [20, 35, -30], scale: 1.2 },
  { pos: [-50, 38, 16], scale: 0.95 },
  { pos: [48, 33, -6], scale: 1.08 },
  { pos: [2, 40, -48], scale: 1.25 },
  { pos: [-28, 34, -38], scale: 1.0 },
];

function CloudCluster({ scale }: { scale: number }) {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    [],
  );

  const puffs = [
    { pos: [0, 0, 0] as const, r: 2.0 },
    { pos: [-1.6, 0.15, 0.5] as const, r: 1.55 },
    { pos: [1.7, 0.1, -0.35] as const, r: 1.65 },
    { pos: [0.4, 0.25, 1.1] as const, r: 1.35 },
  ];

  return (
    <group scale={scale}>
      {puffs.map((puff, i) => (
        <mesh key={i} position={puff.pos} material={mat} renderOrder={-900}>
          <sphereGeometry args={[puff.r, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}

type CloudState = {
  baseX: number;
  baseY: number;
  baseZ: number;
  speed: number;
  wobble: number;
  phase: number;
  scale: number;
};

function CloudField() {
  const refs = useRef<Array<THREE.Group | null>>([]);
  const clouds = useMemo<CloudState[]>(
    () =>
      CLOUD_SEEDS.map((c, i) => ({
        baseX: c.pos[0],
        baseY: c.pos[1],
        baseZ: c.pos[2],
        speed: 0.7 + (i % 4) * 0.12,
        wobble: 0.8 + (i % 3) * 0.25,
        phase: i * 0.9,
        scale: c.scale,
      })),
    [],
  );

  useFrame(({ clock }, _delta) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < clouds.length; i++) {
      const ref = refs.current[i];
      if (!ref) continue;
      const c = clouds[i];
      // Slow eastward drift + tiny Z wobble; wrap so cloud count stays fixed.
      const driftX = ((c.baseX + t * c.speed + 68) % 136) - 68;
      const driftZ = c.baseZ + Math.sin(t * 0.12 + c.phase) * c.wobble;
      ref.position.set(driftX, c.baseY, driftZ);
    }
  });

  return (
    <>
      {clouds.map((c, i) => (
        <group
          key={i}
          ref={(node) => {
            refs.current[i] = node;
          }}
          position={[c.baseX, c.baseY, c.baseZ]}
        >
          <CloudCluster scale={c.scale} />
        </group>
      ))}
    </>
  );
}

/** Unlit gradient sky dome — immune to fog, bloom wash, and IBL blow-out. */
export function OutdoorSky() {
  const skyTex = useMemo(() => createSkyGradientTexture(), []);
  const skyMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: skyTex,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [skyTex],
  );

  return (
    <>
      <mesh material={skyMat} renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[280, 48, 32]} />
      </mesh>

      <mesh position={OUTDOOR_SUN_POSITION} renderOrder={-950}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial color="#fffde7" fog={false} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh position={OUTDOOR_SUN_POSITION} renderOrder={-951}>
        <sphereGeometry args={[12, 16, 16]} />
        <meshBasicMaterial color="#fff9c4" fog={false} toneMapped={false} transparent opacity={0.2} />
      </mesh>

      <CloudField />
      <OutdoorHorizon />
    </>
  );
}

export const OUTDOOR_SUN_POSITION: [number, number, number] = [60, 55, -25];

/** Match `<color attach="background">` and gl.setClearColor for letterboxing gaps. */
export const OUTDOOR_SKY_COLOR = '#42a5f5';
