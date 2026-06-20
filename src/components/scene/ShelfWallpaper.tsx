import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  buildRackVisualChunks,
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

export function ShelfWallpaper() {
  const allChunks = useMemo(() => buildRackVisualChunks(), []);

  return (
    <>
      {CENTER_RACK_DEPTS.map((dept) => (
        <DepartmentWallpaper key={dept} dept={dept} allChunks={allChunks} />
      ))}
    </>
  );
}
