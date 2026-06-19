import { useMemo } from 'react';
import * as THREE from 'three';

const FRAME = { color: '#707780', roughness: 0.38, metalness: 0.72, envMapIntensity: 1.2 };
const BASKET = { color: '#8a9098', roughness: 0.45, metalness: 0.55 };
const WIRE = { color: '#9aa0a8', roughness: 0.42, metalness: 0.62 };
const HANDLE = { color: '#c41e3a', roughness: 0.35, metalness: 0.25 };
const WHEEL = { color: '#2a2d32', roughness: 0.65, metalness: 0.35 };
const SHELF = { color: '#5c6370', roughness: 0.5, metalness: 0.58 };

/** Wheel centre height — wheel bottom sits at y=0 (ground). */
export const CART_WHEEL_Y = 0.1;

/** Rigid-body Y when parent floor is at `floorY`. */
export function cartBodyY(floorY = 0): number {
  return floorY + CART_WHEEL_Y + 0.42;
}

/**
 * Costco bulk wire cart — deep basket, lower stow shelf, red push handle.
 * Local origin = ground under wheels.
 */
export function CartModel({ showHandle = true }: { showHandle?: boolean }) {
  const wheelGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12), []);

  const postPositions: [number, number, number][] = [
    [-0.36, 0.52, 0.58],
    [0.36, 0.52, 0.58],
    [-0.36, 0.52, -0.42],
    [0.36, 0.52, -0.42],
  ];

  const wheelPositions: [number, number, number][] = [
    [-0.28, CART_WHEEL_Y, 0.5],
    [0.28, CART_WHEEL_Y, 0.5],
    [-0.28, CART_WHEEL_Y, -0.34],
    [0.28, CART_WHEEL_Y, -0.34],
  ];

  return (
    <group>
      {wheelPositions.map((pos, i) => (
        <mesh key={`wheel-${i}`} castShadow position={pos} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo}>
          <meshStandardMaterial {...WHEEL} />
        </mesh>
      ))}

      {/* Lower stow deck — bulk cases / water flats */}
      <mesh castShadow position={[0, 0.2, 0.1]}>
        <boxGeometry args={[0.72, 0.04, 1.02]} />
        <meshStandardMaterial {...SHELF} />
      </mesh>
      <mesh castShadow position={[0, 0.14, 0.1]}>
        <boxGeometry args={[0.68, 0.08, 0.96]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>

      {postPositions.map((pos, i) => (
        <mesh key={`post-${i}`} castShadow position={pos}>
          <boxGeometry args={[0.045, 0.56, 0.045]} />
          <meshStandardMaterial {...FRAME} />
        </mesh>
      ))}

      {/* Deep main basket */}
      <mesh castShadow position={[0, 0.52, 0.1]}>
        <boxGeometry args={[0.72, 0.44, 1.02]} />
        <meshStandardMaterial {...BASKET} />
      </mesh>

      {/* Wire slats — read as mesh, not solid block */}
      {[-0.22, 0, 0.22].map((yOff) => (
        <mesh key={`slat-${yOff}`} castShadow position={[0, 0.38 + yOff, 0.1]}>
          <boxGeometry args={[0.68, 0.025, 0.98]} />
          <meshStandardMaterial {...WIRE} />
        </mesh>
      ))}

      {/* Top rim + child seat flap */}
      <mesh castShadow position={[0, 0.78, 0.1]}>
        <boxGeometry args={[0.78, 0.045, 1.08]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh castShadow position={[0, 0.62, -0.38]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.56, 0.035, 0.24]} />
        <meshStandardMaterial color="#4b5563" roughness={0.55} />
      </mesh>

      {showHandle && (
        <>
          <mesh castShadow position={[0, 0.94, -0.48]}>
            <boxGeometry args={[0.86, 0.055, 0.055]} />
            <meshStandardMaterial {...HANDLE} />
          </mesh>
          <mesh castShadow position={[-0.4, 0.82, -0.42]} rotation={[0.42, 0, 0]}>
            <boxGeometry args={[0.055, 0.28, 0.055]} />
            <meshStandardMaterial {...HANDLE} />
          </mesh>
          <mesh castShadow position={[0.4, 0.82, -0.42]} rotation={[0.42, 0, 0]}>
            <boxGeometry args={[0.055, 0.28, 0.055]} />
            <meshStandardMaterial {...HANDLE} />
          </mesh>
        </>
      )}
    </group>
  );
}
