import { CartModel } from './CartModel';
import { SHOPPER_FOOT_LOCAL_Y } from './npcGrounding';

export function ShopperAvatar({
  shirtColor,
  skinTone,
  hairColor,
  hasCart,
}: {
  shirtColor: string;
  skinTone: string;
  hairColor: string;
  hasCart: boolean;
}) {
  return (
    <group>
      <mesh castShadow position={[-0.1, 0.38, 0]}>
        <boxGeometry args={[0.14, 0.42, 0.16]} />
        <meshStandardMaterial color="#3a4550" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.1, 0.38, 0]}>
        <boxGeometry args={[0.14, 0.42, 0.16]} />
        <meshStandardMaterial color="#3a4550" roughness={0.85} />
      </mesh>

      <mesh castShadow position={[0, 0.98, 0]}>
        <boxGeometry args={[0.46, 0.62, 0.28]} />
        <meshStandardMaterial color={shirtColor} roughness={0.78} metalness={0.04} envMapIntensity={0.85} />
      </mesh>

      <mesh castShadow position={[0, 1.48, 0]}>
        <sphereGeometry args={[0.19, 8, 8]} />
        <meshStandardMaterial color={skinTone} roughness={0.75} />
      </mesh>

      <mesh castShadow position={[0, 1.62, -0.04]}>
        <sphereGeometry args={[0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} roughness={0.9} />
      </mesh>

      <mesh position={[-0.06, 1.5, 0.16]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.4} />
      </mesh>
      <mesh position={[0.06, 1.5, 0.16]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.42, 0.17]}>
        <boxGeometry args={[0.05, 0.012, 0.012]} />
        <meshStandardMaterial color="#8a6060" roughness={0.6} />
      </mesh>

      {hasCart && (
        <group position={[0, SHOPPER_FOOT_LOCAL_Y, 0.58]}>
          <CartModel showHandle />
        </group>
      )}
    </group>
  );
}

/** Costco vest + badge — default faces +X (right wall / cart side) at checkout. */
export function CashierAvatar({
  skinTone,
  hairColor,
  rotationY = -Math.PI / 2,
}: {
  skinTone: string;
  hairColor: string;
  rotationY?: number;
}) {
  return (
    <group rotation={[0, rotationY, 0]}>
      <mesh castShadow position={[-0.08, 0.32, 0]}>
        <boxGeometry args={[0.12, 0.36, 0.14]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.08, 0.32, 0]}>
        <boxGeometry args={[0.12, 0.36, 0.14]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.88, 0]}>
        <boxGeometry args={[0.44, 0.58, 0.24]} />
        <meshStandardMaterial color="#005dab" roughness={0.78} />
      </mesh>
      <mesh castShadow position={[0, 0.88, 0.14]}>
        <boxGeometry args={[0.38, 0.52, 0.04]} />
        <meshStandardMaterial color="#e11d48" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.38, 0]}>
        <sphereGeometry args={[0.17, 8, 8]} />
        <meshStandardMaterial color={skinTone} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, 1.5, -0.03]}>
        <sphereGeometry args={[0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} roughness={0.9} />
      </mesh>
      <mesh position={[0.14, 1.05, 0.14]}>
        <boxGeometry args={[0.1, 0.06, 0.02]} />
        <meshStandardMaterial color="#f8fafc" emissive="#fde047" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

const SHIRT_PALETTE = ['#4a6741', '#6b4423', '#2d4a6e', '#7a3030', '#5a5080', '#8a6040'];
const SKIN_PALETTE = ['#e8c4a8', '#d4a574', '#c68642', '#f0d5be', '#8d5524'];
const HAIR_PALETTE = ['#2a2018', '#5a4030', '#8a7060', '#1a1a22', '#6a5038'];

export function queueNpcLook(laneId: string, slot: number) {
  const seed = (laneId.charCodeAt(0) * 17 + slot * 31) | 0;
  return {
    shirt: SHIRT_PALETTE[Math.abs(seed) % SHIRT_PALETTE.length],
    skin: SKIN_PALETTE[Math.abs(seed >> 2) % SKIN_PALETTE.length],
    hair: HAIR_PALETTE[Math.abs(seed >> 4) % HAIR_PALETTE.length],
  };
}

export function cashierLook(laneId: string) {
  const seed = laneId.charCodeAt(0) * 13;
  return {
    skin: SKIN_PALETTE[Math.abs(seed) % SKIN_PALETTE.length],
    hair: HAIR_PALETTE[Math.abs(seed >> 3) % HAIR_PALETTE.length],
  };
}
