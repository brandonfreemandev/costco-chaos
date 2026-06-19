import { useMemo } from 'react';
import * as THREE from 'three';

const FRAME = { color: '#6b7280', roughness: 0.38, metalness: 0.72, envMapIntensity: 1.2 };
const BASKET = { color: '#8a9098', roughness: 0.45, metalness: 0.55 };
const HANDLE = { color: '#c41e3a', roughness: 0.35, metalness: 0.25 };
const WHEEL = { color: '#2a2d32', roughness: 0.65, metalness: 0.35 };

/** Wheel centre height — wheel bottom sits at y=0 (ground). */
export const CART_WHEEL_Y = 0.09;

/** Rigid-body Y when parent floor is at `floorY`. */
export function cartBodyY(floorY = 0): number {
  return floorY + CART_WHEEL_Y + 0.36;
}

/**
 * Costco wire cart mesh. Local origin = ground under wheels.
 * Parent rigid body should be at `cartBodyY(floorY)`.
 */
export function CartModel({ showHandle = true }: { showHandle?: boolean }) {
  const wheelGeo = useMemo(() => new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), []);

  const postPositions: [number, number, number][] = [
    [-0.3, 0.45, 0.46],
    [0.3, 0.45, 0.46],
    [-0.3, 0.45, -0.34],
    [0.3, 0.45, -0.34],
  ];

  const wheelPositions: [number, number, number][] = [
    [-0.24, CART_WHEEL_Y, 0.4],
    [0.24, CART_WHEEL_Y, 0.4],
    [-0.24, CART_WHEEL_Y, -0.26],
    [0.24, CART_WHEEL_Y, -0.26],
  ];

  return (
    <group>
      {/* Wheels */}
      {wheelPositions.map((pos, i) => (
        <mesh key={`wheel-${i}`} castShadow position={pos} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo}>
          <meshStandardMaterial {...WHEEL} />
        </mesh>
      ))}

      {/* Bottom chassis rails */}
      <mesh castShadow position={[0, 0.17, 0.06]}>
        <boxGeometry args={[0.58, 0.04, 0.84]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh castShadow position={[0, 0.17, 0.5]}>
        <boxGeometry args={[0.58, 0.04, 0.04]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>

      {/* Corner posts — base (0.22) to top rail (0.68) */}
      {postPositions.map((pos, i) => (
        <mesh key={`post-${i}`} castShadow position={pos}>
          <boxGeometry args={[0.04, 0.46, 0.04]} />
          <meshStandardMaterial {...FRAME} />
        </mesh>
      ))}

      {/* Basket — rests on chassis, inside posts */}
      <mesh castShadow position={[0, 0.44, 0.06]}>
        <boxGeometry args={[0.58, 0.34, 0.84]} />
        <meshStandardMaterial {...BASKET} />
      </mesh>

      {/* Top rim */}
      <mesh castShadow position={[0, 0.68, 0.06]}>
        <boxGeometry args={[0.64, 0.04, 0.9]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>

      {/* Child seat back */}
      <mesh castShadow position={[0, 0.54, -0.28]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.46, 0.04, 0.2]} />
        <meshStandardMaterial color="#4b5563" roughness={0.55} />
      </mesh>

      {showHandle && (
        <>
          <mesh castShadow position={[0, 0.82, -0.4]}>
            <boxGeometry args={[0.72, 0.05, 0.05]} />
            <meshStandardMaterial {...HANDLE} />
          </mesh>
          <mesh castShadow position={[-0.34, 0.72, -0.34]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.05, 0.24, 0.05]} />
            <meshStandardMaterial {...HANDLE} />
          </mesh>
          <mesh castShadow position={[0.34, 0.72, -0.34]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.05, 0.24, 0.05]} />
            <meshStandardMaterial {...HANDLE} />
          </mesh>
        </>
      )}
    </group>
  );
}
