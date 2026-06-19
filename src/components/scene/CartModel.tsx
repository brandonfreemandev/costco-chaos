import { useMemo } from 'react';
import * as THREE from 'three';

const CHROME = { color: '#bcc2cb', roughness: 0.2, metalness: 0.9, envMapIntensity: 1.35 };
const FRAME = { color: '#6d737c', roughness: 0.32, metalness: 0.82, envMapIntensity: 1.15 };
const HANDLE = { color: '#c41e3a', roughness: 0.35, metalness: 0.25 };
const WHEEL = { color: '#2a2d32', roughness: 0.65, metalness: 0.35 };
const RACK = { color: '#727984', roughness: 0.38, metalness: 0.72 };

/** Wheel centre height — wheel bottom sits at y=0 (ground). */
export const CART_WHEEL_Y = 0.1;

/** Rigid-body Y when parent floor is at `floorY`. */
export function cartBodyY(floorY = 0): number {
  return floorY + CART_WHEEL_Y + 0.42;
}

type WireBasketProps = {
  /** Half-width of basket interior. */
  halfW?: number;
  /** Length from back rail to front (local −Z). */
  depth?: number;
  /** Bottom of basket wire (local Y). */
  baseY?: number;
  /** Interior height of wire cage. */
  height?: number;
  /** Horizontal wire row count per side. */
  rows?: number;
  /** Include rear panel wires (full cart). */
  showBack?: boolean;
  /** Include front panel wires. */
  showFront?: boolean;
  /** Include lower flat rack under main basket. */
  showLowerRack?: boolean;
};

/**
 * Costco-style galvanized wire basket — horizontal chrome rods, open mesh sides.
 * Local frame: origin ≈ basket centre; −Z = roll direction; +Z = pusher / handle side.
 */
export function CostcoWireBasket({
  halfW = 0.35,
  depth = 0.92,
  baseY = 0.34,
  height = 0.44,
  rows = 11,
  showBack = true,
  showFront = true,
  showLowerRack = true,
}: WireBasketProps) {
  const wireGeo = useMemo(() => new THREE.CylinderGeometry(0.007, 0.007, 1, 6), []);
  const postGeo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 1, 6), []);

  const backZ = -depth / 2;
  const frontZ = depth / 2;
  const rimY = baseY + height + 0.02;

  const rowYs = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < rows; i++) {
      list.push(baseY + 0.04 + (i / (rows - 1)) * (height - 0.06));
    }
    return list;
  }, [baseY, height, rows]);

  /** Run a wire along local Z (front/back). */
  const runZ = (x: number, y: number, z0: number, z1: number, key: string, thick = false) => {
    const len = Math.abs(z1 - z0);
    const geo = thick ? postGeo : wireGeo;
    return (
      <mesh
        key={key}
        castShadow
        position={[x, y, (z0 + z1) / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        geometry={geo}
        scale={[1, len, 1]}
      >
        <meshStandardMaterial {...(thick ? FRAME : CHROME)} />
      </mesh>
    );
  };

  /** Run a wire along local X. */
  const runX = (z: number, y: number, x0: number, x1: number, key: string, thick = false) => (
    <mesh
      key={key}
      castShadow
      position={[(x0 + x1) / 2, y, z]}
      rotation={[0, 0, Math.PI / 2]}
      geometry={thick ? postGeo : wireGeo}
      scale={[1, x1 - x0, 1]}
    >
      <meshStandardMaterial {...(thick ? FRAME : CHROME)} />
    </mesh>
  );

  return (
    <group>
      {/* Corner posts */}
      {[
        [-halfW, backZ],
        [halfW, backZ],
        [-halfW, frontZ],
        [halfW, frontZ],
      ].map(([x, z], i) => (
        <mesh key={`post-${i}`} castShadow position={[x, baseY + height / 2, z]} geometry={postGeo} scale={[1, height, 1]}>
          <meshStandardMaterial {...FRAME} />
        </mesh>
      ))}

      {/* Side mesh — horizontal wires running front↔back (Costco look) */}
      {rowYs.flatMap((y, ri) => [
        runZ(-halfW, y, frontZ, backZ, `side-l-${ri}`),
        runZ(halfW, y, frontZ, backZ, `side-r-${ri}`),
      ])}

      {/* Back panel horizontal wires */}
      {showBack &&
        rowYs.map((y, ri) => runX(backZ, y, -halfW, halfW, `back-${ri}`))}

      {/* Front panel — lower half only (typical bulk cart) */}
      {showFront &&
        rowYs
          .filter((y) => y < baseY + height * 0.55)
          .map((y, ri) => runX(frontZ, y, -halfW, halfW, `front-${ri}`))}

      {/* Bottom wire grid */}
      {[-0.22, 0, 0.22].map((xOff) => runZ(xOff, baseY, frontZ + 0.04, backZ - 0.04, `floor-${xOff}`))}
      {[-0.28, -0.14, 0, 0.14, 0.28].map((zOff) =>
        runX(zOff, baseY, -halfW + 0.02, halfW - 0.02, `floor-x-${zOff}`),
      )}

      {/* Top rim — U shape (open toward pusher) */}
      {runX(backZ, rimY, -halfW - 0.02, halfW + 0.02, 'rim-back', true)}
      {runZ(-halfW - 0.02, rimY, frontZ, backZ, 'rim-l', true)}
      {runZ(halfW + 0.02, rimY, frontZ, backZ, 'rim-r', true)}

      {/* Child seat flap at back */}
      {showBack && (
        <mesh castShadow position={[0, baseY + height * 0.62, backZ + 0.04]} rotation={[0.32, 0, 0]}>
          <boxGeometry args={[halfW * 1.5, 0.028, 0.2]} />
          <meshStandardMaterial color="#5a6068" roughness={0.5} metalness={0.55} />
        </mesh>
      )}

      {showLowerRack && (
        <>
          <mesh castShadow position={[0, 0.18, 0]}>
            <boxGeometry args={[halfW * 2 + 0.04, 0.028, depth + 0.06]} />
            <meshStandardMaterial {...RACK} />
          </mesh>
          {[-0.18, 0, 0.18].map((zOff) => runX(zOff, 0.18, -halfW, halfW, `rack-${zOff}`))}
        </>
      )}
    </group>
  );
}

/**
 * Costco bulk wire cart — world / NPC visual.
 * Local origin = ground under wheels; −Z = roll direction; +Z = handle side.
 */
export function CartModel({
  showHandle = true,
  flipForward = false,
}: {
  showHandle?: boolean;
  flipForward?: boolean;
}) {
  const wheelGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12), []);

  const wheelPositions: [number, number, number][] = [
    [-0.28, CART_WHEEL_Y, 0.44],
    [0.28, CART_WHEEL_Y, 0.44],
    [-0.28, CART_WHEEL_Y, -0.34],
    [0.28, CART_WHEEL_Y, -0.34],
  ];

  return (
    <group rotation={flipForward ? [0, Math.PI, 0] : undefined}>
      {wheelPositions.map((pos, i) => (
        <mesh key={`wheel-${i}`} castShadow position={pos} rotation={[0, 0, Math.PI / 2]} geometry={wheelGeo}>
          <meshStandardMaterial {...WHEEL} />
        </mesh>
      ))}

      <group position={[0, 0, 0]}>
        <CostcoWireBasket />
      </group>

      {showHandle && (
        <group position={[0, 0.94, -0.48]}>
          <mesh castShadow>
            <boxGeometry args={[0.86, 0.055, 0.055]} />
            <meshStandardMaterial {...HANDLE} />
          </mesh>
          <mesh position={[-0.4, -0.12, 0.06]} rotation={[0.42, 0, 0]} castShadow>
            <boxGeometry args={[0.055, 0.28, 0.055]} />
            <meshStandardMaterial {...HANDLE} />
          </mesh>
          <mesh position={[0.4, -0.12, 0.06]} rotation={[0.42, 0, 0]} castShadow>
            <boxGeometry args={[0.055, 0.28, 0.055]} />
            <meshStandardMaterial {...HANDLE} />
          </mesh>
        </group>
      )}
    </group>
  );
}