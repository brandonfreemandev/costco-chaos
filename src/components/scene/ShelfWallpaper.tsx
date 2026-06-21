import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  buildRackVisualChunks,
  buildRacetrackGapVisualChunks,
  RACK_HEIGHT,
  SPINE_DEPTH,
  type CenterRackDept,
  type RackVisualChunk,
} from './warehouseLayout';
import { getDeptWallpaperTexture } from './shelfWallpaperTextures';

const FACE_OFFSET = SPINE_DEPTH / 2 + 0.02;

/** Center-steel departments only — fresh/coolers live on perimeter facades. */
const CENTER_RACK_DEPTS: CenterRackDept[] = [
  'electronics',
  'seasonal',
  'grocery',
  'household',
  'bulkPaper',
];

function createMaterial(tex: THREE.Texture) {
  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.82,
    metalness: 0.04,
  });
}

function RackShelfFaces({
  chunks,
  material,
}: {
  chunks: RackVisualChunk[];
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = chunks.length * 2;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    let i = 0;
    for (const chunk of chunks) {
      for (const sign of [-1, 1] as const) {
        dummy.position.set(chunk.x, RACK_HEIGHT / 2, chunk.z + sign * FACE_OFFSET);
        dummy.rotation.set(0, sign > 0 ? 0 : Math.PI, 0);
        dummy.scale.set(chunk.w, RACK_HEIGHT, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [chunks, dummy]);

  if (count === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, material, count]} frustumCulled>
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
}

function DepartmentWallpaper({
  dept,
  allChunks,
}: {
  dept: CenterRackDept;
  allChunks: RackVisualChunk[];
}) {
  const material = useMemo(() => createMaterial(getDeptWallpaperTexture(dept)), [dept]);
  const chunks = useMemo(() => allChunks.filter((c) => c.dept === dept), [allChunks, dept]);

  return <RackShelfFaces chunks={chunks} material={material} />;
}

/**
 * Racetrack-gap filler facade. These strips are much narrower than a full rack,
 * so stretching the whole texture across them squishes the wallpaper and leaves
 * a hard seam. Instead show a horizontal *slice* of the texture at the same
 * texel density as the adjacent rack, so products stay the same physical size.
 */
function GapFacade({
  chunk,
  refW,
  texture,
}: {
  chunk: RackVisualChunk;
  refW: number;
  texture: THREE.Texture;
}) {
  const material = useMemo(() => {
    const tex = texture.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(0.05, chunk.w / refW), 1);
    tex.needsUpdate = true;
    return createMaterial(tex);
  }, [texture, chunk.w, refW]);

  return (
    <>
      {([-1, 1] as const).map((sign) => (
        <mesh
          key={sign}
          position={[chunk.x, RACK_HEIGHT / 2, chunk.z + sign * FACE_OFFSET]}
          rotation={[0, sign > 0 ? 0 : Math.PI, 0]}
          material={material}
        >
          <planeGeometry args={[chunk.w, RACK_HEIGHT]} />
        </mesh>
      ))}
    </>
  );
}

function GapDepartmentFacades({
  dept,
  gapChunks,
  mainChunks,
}: {
  dept: CenterRackDept;
  gapChunks: RackVisualChunk[];
  mainChunks: RackVisualChunk[];
}) {
  const texture = useMemo(() => getDeptWallpaperTexture(dept), [dept]);
  const gaps = useMemo(() => gapChunks.filter((c) => c.dept === dept), [gapChunks, dept]);
  const mains = useMemo(() => mainChunks.filter((c) => c.dept === dept), [mainChunks, dept]);

  return (
    <>
      {gaps.map((gap, i) => {
        // Match the texel density of the nearest same-dept rack row.
        const ref = mains.reduce<RackVisualChunk | undefined>((best, m) => {
          if (!best) return m;
          return Math.abs(m.z - gap.z) < Math.abs(best.z - gap.z) ? m : best;
        }, undefined);
        return (
          <GapFacade
            key={`${dept}-gap-${i}`}
            chunk={gap}
            refW={ref ? ref.w : gap.w}
            texture={texture}
          />
        );
      })}
    </>
  );
}

export function ShelfWallpaper() {
  const mainChunks = useMemo(() => buildRackVisualChunks(), []);
  const gapChunks = useMemo(() => buildRacetrackGapVisualChunks(), []);

  return (
    <>
      {CENTER_RACK_DEPTS.map((dept) => (
        <DepartmentWallpaper key={dept} dept={dept} allChunks={mainChunks} />
      ))}
      {CENTER_RACK_DEPTS.map((dept) => (
        <GapDepartmentFacades
          key={`gap-${dept}`}
          dept={dept}
          gapChunks={gapChunks}
          mainChunks={mainChunks}
        />
      ))}
    </>
  );
}
