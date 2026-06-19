import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildRackSegments, RACK_HEIGHT, SPINE_DEPTH } from './warehouseLayout';

const BOX_COLORS = ['#c9924a', '#2563eb', '#dc2626', '#16a34a', '#7c3aed', '#ea580c', '#0891b2', '#fafafa'];

function hash(n: number): number {
  return ((n * 2654435761) >>> 0) % 1000;
}

/** Bulk product boxes on rack faces — decorative only (no collision). */
export function RackBulkProps() {
  const segments = useMemo(() => buildRackSegments(), []);

  const instances = useMemo(() => {
    const list: { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: string }[] = [];
    const shelfYs = [1.1, 2.4, 3.7];

    const addFaceBoxes = (cx: number, cz: number, faceSign: 1 | -1, span: number, seed: number) => {
      const count = Math.max(2, Math.floor(span / 1.4));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const z = cz - span / 2 + t * span;
        for (const y of shelfYs) {
          if (hash(seed + i * 7 + Math.floor(y)) % 5 === 0) continue;
          const w = 0.55 + (hash(seed + i) % 4) * 0.12;
          const h = 0.35 + (hash(seed + i + 1) % 3) * 0.1;
          const d = 0.42 + (hash(seed + i + 2) % 3) * 0.08;
          list.push({
            x: cx + faceSign * (SPINE_DEPTH / 2 + d / 2 + 0.02),
            y,
            z,
            sx: w,
            sy: h,
            sz: d,
            color: BOX_COLORS[hash(seed + i + Math.floor(y * 3)) % BOX_COLORS.length],
          });
        }
      }
    };

    segments.forEach((seg, si) => {
      const len = seg.z1 - seg.z0;
      const cz = (seg.z0 + seg.z1) / 2;
      addFaceBoxes(seg.x, cz, seg.faceSide, len, si * 31);
    });

    return list;
  }, [segments]);

  if (instances.length === 0) return null;

  return (
    <group>
      {instances.map((inst, i) => (
        <mesh key={i} position={[inst.x, inst.y, inst.z]} scale={[inst.sx, inst.sy, inst.sz]} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={inst.color} roughness={0.68} metalness={0.06} envMapIntensity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Orange rack upright accents (Costco pallet-rack color). */
export function RackUprights({ segments }: { segments: ReturnType<typeof buildRackSegments> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = segments.length * 2;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let i = 0;
    for (const seg of segments) {
      const len = seg.z1 - seg.z0;
      for (const sign of [-1, 1] as const) {
        dummy.position.set(seg.x + sign * (SPINE_DEPTH / 2 - 0.06), RACK_HEIGHT / 2, (seg.z0 + seg.z1) / 2);
        dummy.scale.set(0.08, RACK_HEIGHT, len);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [segments, dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#e87722" roughness={0.42} metalness={0.55} envMapIntensity={1.1} />
    </instancedMesh>
  );
}
