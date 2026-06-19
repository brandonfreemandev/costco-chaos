import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildRackSegments, RACK_HEIGHT, SPINE_DEPTH } from './warehouseLayout';
import { getDeptWallpaperTexture } from './shelfWallpaperTextures';

const FACE_OFFSET = SPINE_DEPTH / 2 + 0.02;

const DEPARTMENTS = [
  { name: 'bakery' as const, zMin: 16, zMax: Infinity },
  { name: 'electronics' as const, zMin: 4, zMax: 16 },
  { name: 'bulkPaper' as const, zMin: -8, zMax: 4 },
  { name: 'sample' as const, zMin: -Infinity, zMax: -8 },
];

function createMaterial(tex: THREE.Texture) {
  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.82,
    metalness: 0.04,
  });
}

function RackShelfFaces({
  segments,
  material,
}: {
  segments: ReturnType<typeof buildRackSegments>;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = segments.length * 2;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    let i = 0;
    for (const seg of segments) {
      const len = seg.z1 - seg.z0;
      const cz = (seg.z0 + seg.z1) / 2;

      for (const sign of [-1, 1] as const) {
        dummy.position.set(seg.x + sign * FACE_OFFSET, RACK_HEIGHT / 2, cz);
        dummy.rotation.set(0, sign > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        dummy.scale.set(len, RACK_HEIGHT, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [segments, dummy]);

  if (count === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, material, count]} frustumCulled>
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
}

function DepartmentWallpaper({
  dept,
  allSegments,
}: {
  dept: (typeof DEPARTMENTS)[number];
  allSegments: ReturnType<typeof buildRackSegments>;
}) {
  const material = useMemo(() => createMaterial(getDeptWallpaperTexture(dept.name)), [dept.name]);
  const segments = useMemo(
    () =>
      allSegments.filter((s) => {
        const cz = (s.z0 + s.z1) / 2;
        return cz >= dept.zMin && cz < dept.zMax;
      }),
    [allSegments, dept.zMin, dept.zMax],
  );

  return <RackShelfFaces segments={segments} material={material} />;
}

export function ShelfWallpaper() {
  const allSegments = useMemo(() => buildRackSegments(), []);

  return (
    <>
      {DEPARTMENTS.map((dept) => (
        <DepartmentWallpaper key={dept.name} dept={dept} allSegments={allSegments} />
      ))}
    </>
  );
}
