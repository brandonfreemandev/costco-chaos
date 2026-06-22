import { useMemo } from 'react';
import * as THREE from 'three';
import {
  buildRackVisualChunks,
  buildRacetrackGapVisualChunks,
  RACK_HEIGHT,
  RACK_PAIR_CENTERS_Z,
  SPINE_DEPTH,
  type CenterRackDept,
  type RackVisualChunk,
} from './warehouseLayout';
import {
  getDeptEndcapTexture,
  getDeptWallpaperTexture,
  wallpaperVariantCount,
} from './shelfWallpaperTextures';

const FACE_OFFSET = SPINE_DEPTH / 2 + 0.02;
/** Endcap sits just outside the rack's true X edge so it caps the long faces. */
const ENDCAP_X_OFFSET = 0.03;
/** Long faces tuck a hair under the endcap to hide the steel corner seam. */
const LONG_FACE_TUCK = 0.02;
const VARIANTS = wallpaperVariantCount();

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
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

function hash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rackVariant(dept: CenterRackDept, centerX: number, pairZ: number): number {
  const seed = `${dept}|${centerX.toFixed(2)}|${pairZ.toFixed(2)}`;
  return hash32(seed) % VARIANTS;
}

function RackLongFacade({
  chunk,
  material,
}: {
  chunk: RackVisualChunk;
  material: THREE.Material;
}) {
  const planeWidth = chunk.w + LONG_FACE_TUCK * 2;
  const facesNorth = chunk.faceSide === -1;
  const z = facesNorth ? chunk.z + FACE_OFFSET : chunk.z - FACE_OFFSET;
  const rotationY = facesNorth ? 0 : Math.PI;

  return (
    <mesh
      position={[chunk.x, RACK_HEIGHT / 2, z]}
      rotation={[0, rotationY, 0]}
      material={material}
      renderOrder={2}
    >
      <planeGeometry args={[planeWidth, RACK_HEIGHT]} />
    </mesh>
  );
}

function mergeFacadeChunks(chunks: RackVisualChunk[]): RackVisualChunk[] {
  type Bucket = RackVisualChunk[];
  const buckets = new Map<string, Bucket>();
  for (const c of chunks) {
    const key = `${c.dept}|${c.faceSide}|${c.z.toFixed(2)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(c);
    else buckets.set(key, [c]);
  }

  const merged: RackVisualChunk[] = [];
  for (const bucket of buckets.values()) {
    const sorted = [...bucket].sort((a, b) => (a.x - a.w / 2) - (b.x - b.w / 2));
    let start = sorted[0].x - sorted[0].w / 2;
    let end = sorted[0].x + sorted[0].w / 2;
    const exemplar = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const c = sorted[i];
      const left = c.x - c.w / 2;
      const right = c.x + c.w / 2;
      // Adjacent/overlapping chunks belong to one continuous facade.
      if (left <= end + 0.08) {
        end = Math.max(end, right);
      } else {
        merged.push({
          x: (start + end) / 2,
          w: end - start,
          z: exemplar.z,
          faceSide: exemplar.faceSide,
          dept: exemplar.dept,
        });
        start = left;
        end = right;
      }
    }
    merged.push({
      x: (start + end) / 2,
      w: end - start,
      z: exemplar.z,
      faceSide: exemplar.faceSide,
      dept: exemplar.dept,
    });
  }

  return merged;
}

interface EndcapQuad {
  centerX: number;
  pairZ: number;
  x: number;
  z: number;
  depth: number;
  sign: 1 | -1;
}

/**
 * Merge back-to-back row pairs into a single endcap per aisle end.
 *
 * Each rack pair is two rows ~SPINE_DEPTH apart in Z. Drawing one cap per row
 * left a visible gap ("double endcap"); instead emit one quad spanning the full
 * pair depth, centered between the rows.
 */
function nearestPairCenterZ(z: number): number {
  let best: number = RACK_PAIR_CENTERS_Z[0];
  for (const cz of RACK_PAIR_CENTERS_Z) {
    if (Math.abs(z - cz) < Math.abs(z - best)) best = cz;
  }
  return best;
}

function buildEndcapQuads(chunks: RackVisualChunk[]): EndcapQuad[] {
  const groups = new Map<
    string,
    { x: number; centerX: number; pairZ: number; sign: 1 | -1; minZ: number; maxZ: number }
  >();

  for (const chunk of chunks) {
    const halfW = chunk.w / 2;
    const pairZ = nearestPairCenterZ(chunk.z);
    for (const sign of [-1, 1] as const) {
      const endX = chunk.x + sign * halfW;
      const key = `${endX.toFixed(2)}|${sign}|${pairZ}`;
      const g = groups.get(key);
      if (!g) {
        groups.set(key, {
          x: endX,
          centerX: chunk.x,
          pairZ,
          sign,
          minZ: chunk.z,
          maxZ: chunk.z,
        });
      } else {
        g.minZ = Math.min(g.minZ, chunk.z);
        g.maxZ = Math.max(g.maxZ, chunk.z);
      }
    }
  }

  const quads: EndcapQuad[] = [];
  for (const g of groups.values()) {
    quads.push({
      centerX: g.centerX,
      pairZ: g.pairZ,
      x: g.x,
      z: (g.minZ + g.maxZ) / 2,
      // Span the full pair depth + a hair so the cap covers both long-face ends.
      depth: g.maxZ - g.minZ + SPINE_DEPTH + LONG_FACE_TUCK * 2,
      sign: g.sign,
    });
  }
  return quads;
}

/** ±X rack ends — cross-aisle views were blank steel before endcap wallpaper. */
function DepartmentEndcaps({
  dept,
  allChunks,
}: {
  dept: CenterRackDept;
  allChunks: RackVisualChunk[];
}) {
  const quads = useMemo(
    () => buildEndcapQuads(allChunks.filter((c) => c.dept === dept)),
    [allChunks, dept],
  );
  const westMaterials = useMemo(
    () =>
      Array.from({ length: VARIANTS }, (_, i) =>
        createMaterial(getDeptEndcapTexture(dept, false, i)),
      ),
    [dept],
  );
  const eastMaterials = useMemo(
    () =>
      Array.from({ length: VARIANTS }, (_, i) =>
        createMaterial(getDeptEndcapTexture(dept, false, i)),
      ),
    [dept],
  );

  return (
    <>
      {quads.map((q, i) => {
        const variant = rackVariant(dept, q.centerX, q.pairZ);
        return (
        <mesh
          key={`${dept}-end-${i}`}
          position={[q.x + q.sign * ENDCAP_X_OFFSET, RACK_HEIGHT / 2, q.z]}
          rotation={[0, q.sign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          material={q.sign > 0 ? eastMaterials[variant] : westMaterials[variant]}
          renderOrder={2}
        >
          <planeGeometry args={[q.depth, RACK_HEIGHT]} />
        </mesh>
        );
      })}
    </>
  );
}

function DepartmentFacades({
  dept,
  chunks,
}: {
  dept: CenterRackDept;
  chunks: RackVisualChunk[];
}) {
  const deptChunks = useMemo(() => chunks.filter((c) => c.dept === dept), [chunks, dept]);
  const materials = useMemo(
    () =>
      Array.from({ length: VARIANTS }, (_, i) => createMaterial(getDeptWallpaperTexture(dept, i))),
    [dept],
  );

  return (
    <>
      {deptChunks.map((chunk, i) => {
        const variant = rackVariant(dept, chunk.x, nearestPairCenterZ(chunk.z));
        return (
          <RackLongFacade
            key={`${dept}-${i}-${chunk.x.toFixed(2)}@${chunk.z.toFixed(2)}`}
            chunk={chunk}
            material={materials[variant]}
          />
        );
      })}
    </>
  );
}

export function ShelfWallpaper() {
  const mainChunks = useMemo(() => buildRackVisualChunks(), []);
  const gapChunks = useMemo(() => buildRacetrackGapVisualChunks(), []);
  const allChunks = useMemo(
    () => mergeFacadeChunks([...mainChunks, ...gapChunks]),
    [mainChunks, gapChunks],
  );

  return (
    <>
      {CENTER_RACK_DEPTS.map((dept) => (
        <DepartmentFacades key={dept} dept={dept} chunks={allChunks} />
      ))}
      {CENTER_RACK_DEPTS.map((dept) => (
        <DepartmentEndcaps key={`endcap-${dept}`} dept={dept} allChunks={allChunks} />
      ))}
    </>
  );
}
