import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { WH_CEILING, WH_DEPTH, WH_MAX_X, WH_MAX_Z, WH_MIN_X, WH_MIN_Z, WH_WIDTH } from './warehouseLayout';
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
};

/** Service facades bake the title into the canvas texture — no floating duplicate. */
const TEXTURE_HAS_LABEL = new Set<PerimeterDeptKey>(['pharmacy', 'photo', 'optical']);

function DeptPanel({ spec }: { spec: DeptSpec }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: getPerimeterDeptTexture(spec.key),
        roughness: 0.72,
        metalness: 0.06,
      }),
    [spec.key],
  );

  const protrude = spec.protrude ?? 0;
  const px = spec.x + (spec.rotY === Math.PI / 2 ? protrude : spec.rotY === -Math.PI / 2 ? -protrude : 0);
  const pz = spec.z + (spec.rotY === 0 ? protrude : 0);

  return (
    <group position={[px, spec.h / 2 + 0.15, pz]} rotation={[0, spec.rotY, 0]}>
      <mesh receiveShadow material={mat}>
        <planeGeometry args={[spec.w, spec.h]} />
      </mesh>

      {spec.cooler && (
        <>
          <mesh position={[0, 0, 0.12]}>
            <planeGeometry args={[spec.w - 0.2, spec.h - 0.35]} />
            <meshStandardMaterial {...GLASS} />
          </mesh>
          <mesh position={[0, spec.h / 2 - 0.28, 0.18]}>
            <boxGeometry args={[spec.w - 0.15, 0.42, 0.06]} />
            <meshStandardMaterial
              color={spec.accent}
              emissive={spec.accent}
              emissiveIntensity={0.22}
              roughness={0.4}
            />
          </mesh>
        </>
      )}

      {!TEXTURE_HAS_LABEL.has(spec.key) && (
        <Text position={[0, spec.h / 2 - 0.05, 0.22]} fontSize={0.34} color="#f8fafc" anchorX="center" anchorY="middle">
          {spec.label}
        </Text>
      )}
    </group>
  );
}

/** Costco-style perimeter — fresh coolers on back/side walls, services on front-east. */
export function PerimeterDepartments() {
  const h = WH_CEILING - 0.5;
  const cy = h / 2;
  const cz = (WH_MIN_Z + WH_MAX_Z) / 2;
  const innerSouthZ = WH_MIN_Z + 0.42;

  const southDepts: DeptSpec[] = [
    { key: 'meat', label: 'MEAT & SEAFOOD', accent: '#dc2626', x: -11, z: innerSouthZ, rotY: 0, w: 7, h: 6.2, cooler: true, protrude: 0.45 },
    { key: 'bakery', label: 'BAKERY & CAKES', accent: '#d97706', x: -3.5, z: innerSouthZ, rotY: 0, w: 6, h: 5.8, cooler: true, protrude: 0.4 },
    { key: 'produce', label: 'PRODUCE', accent: '#16a34a', x: 5, z: innerSouthZ, rotY: 0, w: 7.5, h: 6.2, cooler: true, protrude: 0.45 },
    { key: 'produce', label: 'FLORAL', accent: '#db2777', x: 13, z: innerSouthZ, rotY: 0, w: 3.8, h: 4.8, cooler: false },
  ];

  const westDepts: DeptSpec[] = [
    { key: 'dairy', label: 'DAIRY', accent: '#0284c7', x: WH_MIN_X + 0.42, z: -18, rotY: Math.PI / 2, w: 9, h: 6.4, cooler: true, protrude: 0.4 },
    { key: 'frozen', label: 'FROZEN', accent: '#0369a1', x: WH_MIN_X + 0.42, z: -4, rotY: Math.PI / 2, w: 10, h: 6.4, cooler: true, protrude: 0.38 },
    { key: 'frozen', label: 'WALK-IN COOLER', accent: '#0ea5e9', x: WH_MIN_X + 0.42, z: 12, rotY: Math.PI / 2, w: 8, h: 5.6, cooler: true, protrude: 0.35 },
  ];

  const eastDepts: DeptSpec[] = [
    { key: 'pharmacy', label: 'PHARMACY', accent: '#16a34a', x: WH_MAX_X - 0.42, z: 22, rotY: -Math.PI / 2, w: 6.5, h: 5.2, cooler: false },
    { key: 'photo', label: 'PHOTO CENTER', accent: '#7c3aed', x: WH_MAX_X - 0.42, z: 13, rotY: -Math.PI / 2, w: 5.5, h: 4.8, cooler: false },
    { key: 'optical', label: 'OPTICAL', accent: '#005dab', x: WH_MAX_X - 0.42, z: 4, rotY: -Math.PI / 2, w: 4.5, h: 4.2, cooler: false },
  ];

  return (
    <group>
      {/* Structural shell */}
      <mesh position={[0, cy, WH_MIN_Z - 0.35]} receiveShadow>
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

      {/* Department facades (inner faces) */}
      {southDepts.map((spec, i) => (
        <DeptPanel key={`south-${i}`} spec={spec} />
      ))}
      {westDepts.map((spec, i) => (
        <DeptPanel key={`west-${i}`} spec={spec} />
      ))}
      {eastDepts.map((spec, i) => (
        <DeptPanel key={`east-${i}`} spec={spec} />
      ))}

      {/* Meat service counter lip (rotisserie cue) — flush to wall, inside perimeter aisle */}
      <mesh castShadow position={[-11, 1.05, WH_MIN_Z + 0.95]}>
        <boxGeometry args={[6.5, 1.1, 1.0]} />
        <meshStandardMaterial color="#64748b" roughness={0.45} metalness={0.55} />
      </mesh>
      <pointLight position={[-11, 4.5, WH_MIN_Z + 2.2]} intensity={0.55} color="#7dd3fc" distance={14} decay={2} />
      <pointLight position={[5, 4.5, WH_MIN_Z + 2.2]} intensity={0.45} color="#86efac" distance={12} decay={2} />
    </group>
  );
}
