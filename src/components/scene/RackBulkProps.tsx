import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildRackVisualChunks, RACK_HEIGHT, SPINE_DEPTH } from './warehouseLayout';

const BOX_COLORS = ['#c9924a', '#2563eb', '#dc2626', '#16a34a', '#7c3aed', '#ea580c', '#0891b2', '#fafafa'];

function hash(n: number): number {
  return ((n * 2654435761) >>> 0) % 1000;
}

/** Bulk product boxes on rack faces — decorative only (no collision). */
export function RackBulkProps() {
  const chunks = useMemo(() => buildRackVisualChunks(), []);

  const instances = useMemo(() => {
    const list: { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: string }[] = [];
    const shelfYs = [1.1, 2.4, 3.7];

    const addFaceBoxes = (cx: number, cz: number, faceSign: 1 | -1, span: number, seed: number) => {
      const count = Math.max(2, Math.floor(span / 1.4));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const x = cx - span / 2 + t * span;
        for (const y of shelfYs) {
          if (hash(seed + i * 7 + Math.floor(y)) % 5 === 0) continue;
          const w = 0.55 + (hash(seed + i) % 4) * 0.12;
          const h = 0.35 + (hash(seed + i + 1) % 3) * 0.1;
          const d = 0.42 + (hash(seed + i + 2) % 3) * 0.08;
          list.push({
            x,
            y,
            z: cz + faceSign * (SPINE_DEPTH / 2 + d / 2 + 0.02),
            sx: w,
            sy: h,
            sz: d,
            color: BOX_COLORS[hash(seed + i + Math.floor(y * 3)) % BOX_COLORS.length],
          });
        }
      }
    };

    chunks.forEach((chunk, ci) => {
      addFaceBoxes(chunk.x, chunk.z, chunk.faceSide, chunk.w, ci * 31);
    });

    return list;
  }, [chunks]);

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
export function RackUprights({ chunks }: { chunks: ReturnType<typeof buildRackVisualChunks> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = chunks.length * 2;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let i = 0;
    for (const chunk of chunks) {
      for (const sign of [-1, 1] as const) {
        dummy.position.set(chunk.x + sign * (chunk.w / 2 - 0.06), RACK_HEIGHT / 2, chunk.z);
        dummy.scale.set(0.08, RACK_HEIGHT, SPINE_DEPTH - 0.08);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [chunks, dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#e87722" roughness={0.42} metalness={0.55} envMapIntensity={1.1} />
    </instancedMesh>
  );
}
