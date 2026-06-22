import { useMemo } from 'react';
import * as THREE from 'three';
import { WH_CEILING, WH_DEPTH, WH_MAX_X, WH_MAX_Z, WH_MIN_X, WH_MIN_Z, WH_WIDTH } from './warehouseLayout';
import { CHECKOUT_NORTH_EDGE_Z } from './checkoutLayout';
import { getPerimeterDeptTexture, type PerimeterDeptKey } from './perimeterDeptTextures';

const WALL = { color: '#8a9098', roughness: 0.88, metalness: 0.06 };
const GLASS = {
  color: '#e0f2fe',
  roughness: 0.06,
  metalness: 0.35,
  transparent: true,
  opacity: 0.35,
  envMapIntensity: 1.4,
};

type DeptSpec = {
  key: PerimeterDeptKey;
  label: string;
  accent: string;
  x: number;
  z: number;
  rotY: number;
  w: number;
  h: number;
  cooler?: boolean;
  protrude?: number;
  /** Free-standing display (not against a wall) — gets a solid double-faced body. */
  freestanding?: boolean;
};

function DeptPanel({ spec }: { spec: DeptSpec }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: getPerimeterDeptTexture(spec.key, spec.label),
        roughness: 0.72,
        metalness: 0.06,
      }),
    [spec.key, spec.label],
  );

  const protrude = spec.protrude ?? 0;
  const px = spec.x + (spec.rotY === Math.PI / 2 ? protrude : spec.rotY === -Math.PI / 2 ? -protrude : 0);
  const pz =
    spec.z +
    (spec.rotY === 0 ? protrude : spec.rotY === Math.PI ? -protrude : 0);

  return (
    <group position={[px, spec.h / 2 + 0.15, pz]} rotation={[0, spec.rotY, 0]}>
      <mesh receiveShadow material={mat}>
        <planeGeometry args={[spec.w, spec.h]} />
      </mesh>

      {spec.freestanding && (
        <>
          {/* Solid core so it's not a floating sheet */}
          <mesh position={[0, 0, -0.1]} receiveShadow castShadow>
            <boxGeometry args={[spec.w, spec.h, 0.2]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          {/* Back face shows the texture upright from the shopping (north) side — no mirror */}
          <mesh position={[0, 0, -0.21]} rotation={[0, Math.PI, 0]} receiveShadow material={mat}>
            <planeGeometry args={[spec.w, spec.h]} />
          </mesh>
        </>
      )}

      {spec.cooler && (() => {
        const headerWorld = spec.h * (34 / 192);
        const glassH = Math.max(0.5, spec.h - headerWorld - 0.25);
        return (
          <mesh position={[0, -headerWorld / 2 - 0.05, 0.12]}>
            <planeGeometry args={[spec.w - 0.2, glassH]} />
            <meshStandardMaterial {...GLASS} />
          </mesh>
        );
      })()}
    </group>
  );
}

/** Costco-style perimeter — fresh coolers on the back (north) wall; impulse buys at the entrance end. */
export function PerimeterDepartments() {
  const h = WH_CEILING - 0.5;
  const cy = h / 2;
  const cz = (WH_MIN_Z + WH_MAX_Z) / 2;
  const innerNorthZ = WH_MAX_Z - 0.42;
  const innerFrontZ = CHECKOUT_NORTH_EDGE_Z + 1.6;

  const northDepts: DeptSpec[] = [
    { key: 'meat', label: 'MEAT & SEAFOOD', accent: '#dc2626', x: -11, z: innerNorthZ, rotY: Math.PI, w: 7, h: 6.2, cooler: true, protrude: 0.45 },
    { key: 'bakery', label: 'BAKERY & CAKES', accent: '#d97706', x: -3.5, z: innerNorthZ, rotY: Math.PI, w: 6, h: 5.8, cooler: true, protrude: 0.4 },
    { key: 'produce', label: 'PRODUCE', accent: '#16a34a', x: 5, z: innerNorthZ, rotY: Math.PI, w: 7.5, h: 6.2, cooler: true, protrude: 0.45 },
    { key: 'produce', label: 'FLORAL', accent: '#db2777', x: 13, z: innerNorthZ, rotY: Math.PI, w: 3.8, h: 4.8, cooler: false },
  ];

  /** Impulse displays flush on the east wall at the front (near the entrance end). */
  const frontCourtDepts: DeptSpec[] = [
    { key: 'photo', label: 'ELECTRONICS', accent: '#005dab', x: WH_MAX_X - 0.42, z: innerFrontZ + 1.5, rotY: -Math.PI / 2, w: 8, h: 5.4, cooler: false },
    { key: 'pharmacy', label: 'HBA & VITAMINS', accent: '#16a34a', x: WH_MAX_X - 0.42, z: innerFrontZ + 9, rotY: -Math.PI / 2, w: 6, h: 5, cooler: false },
  ];

  const westDepts: DeptSpec[] = [
    { key: 'dairy', label: 'DAIRY', accent: '#0284c7', x: WH_MIN_X + 0.42, z: -8, rotY: Math.PI / 2, w: 9, h: 6.4, cooler: true, protrude: 0.4 },
    { key: 'frozen', label: 'FROZEN', accent: '#0369a1', x: WH_MIN_X + 0.42, z: 6, rotY: Math.PI / 2, w: 10, h: 6.4, cooler: true, protrude: 0.38 },
    { key: 'frozen', label: 'WALK-IN COOLER', accent: '#0ea5e9', x: WH_MIN_X + 0.42, z: 20, rotY: Math.PI / 2, w: 8, h: 5.6, cooler: true, protrude: 0.35 },
  ];

  const eastDepts: DeptSpec[] = [
    { key: 'pharmacy', label: 'PHARMACY', accent: '#16a34a', x: WH_MAX_X - 0.42, z: 22, rotY: -Math.PI / 2, w: 6.5, h: 5.2, cooler: false },
    { key: 'photo', label: 'PHOTO CENTER', accent: '#7c3aed', x: WH_MAX_X - 0.42, z: 13, rotY: -Math.PI / 2, w: 5.5, h: 4.8, cooler: false },
    { key: 'optical', label: 'OPTICAL', accent: '#005dab', x: WH_MAX_X - 0.42, z: 4, rotY: -Math.PI / 2, w: 4.5, h: 4.2, cooler: false },
  ];

  return (
    <group>
      <mesh position={[0, cy, WH_MIN_Z - 0.35]} receiveShadow>
        <boxGeometry args={[WH_WIDTH + 1, h, 0.5]} />
        <meshStandardMaterial {...WALL} />
      </mesh>
      <mesh position={[0, cy, WH_MAX_Z + 0.35]} receiveShadow>
        <boxGeometry args={[WH_WIDTH + 1, h, 0.5]} />
        <meshStandardMaterial {...WALL} />
      </mesh>
      <mesh position={[WH_MIN_X - 0.35, cy, cz]} receiveShadow>
        <boxGeometry args={[0.5, h, WH_DEPTH]} />
        <meshStandardMaterial {...WALL} />
      </mesh>
      <mesh position={[WH_MAX_X + 0.35, cy, cz]} receiveShadow>
        <boxGeometry args={[0.5, h, WH_DEPTH]} />
        <meshStandardMaterial {...WALL} />
      </mesh>

      {northDepts.map((spec, i) => (
        <DeptPanel key={`north-${i}`} spec={spec} />
      ))}
      {frontCourtDepts.map((spec, i) => (
        <DeptPanel key={`front-${i}`} spec={spec} />
      ))}
      {westDepts.map((spec, i) => (
        <DeptPanel key={`west-${i}`} spec={spec} />
      ))}
      {eastDepts.map((spec, i) => (
        <DeptPanel key={`east-${i}`} spec={spec} />
      ))}

      <mesh castShadow position={[-11, 1.05, WH_MAX_Z - 0.95]}>
        <boxGeometry args={[6.5, 1.1, 1.0]} />
        <meshStandardMaterial color="#64748b" roughness={0.45} metalness={0.55} />
      </mesh>
      <pointLight position={[-11, 4.5, WH_MAX_Z - 2.2]} intensity={0.55} color="#7dd3fc" distance={14} decay={2} />
      <pointLight position={[5, 4.5, WH_MAX_Z - 2.2]} intensity={0.45} color="#86efac" distance={12} decay={2} />
    </group>
  );
}
