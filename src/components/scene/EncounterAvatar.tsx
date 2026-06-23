import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/** Eyes + mouth on a head sphere — matches ShopperAvatar styling. */
export function SimpleFace({
  skinTone,
  hairColor,
  hairStyle = 'short',
  expression = 'neutral',
}: {
  skinTone: string;
  hairColor: string;
  hairStyle?: 'short' | 'net' | 'hat' | 'bald';
  expression?: 'neutral' | 'stern' | 'smile';
}) {
  const browY = expression === 'stern' ? 1.58 : 1.56;
  const mouthW = expression === 'smile' ? 0.07 : 0.055;

  return (
    <group>
      <mesh castShadow position={[0, 1.52, 0]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color={skinTone} roughness={0.72} />
      </mesh>

      {hairStyle === 'short' && (
        <mesh castShadow position={[0, 1.66, -0.04]}>
          <sphereGeometry args={[0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>
      )}
      {hairStyle === 'net' && (
        <mesh position={[0, 1.64, 0]}>
          <sphereGeometry args={[0.215, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.55} roughness={0.35} />
        </mesh>
      )}
      {hairStyle === 'hat' && (
        <>
          <mesh castShadow position={[0, 1.68, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.07, 14]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} />
          </mesh>
          <mesh castShadow position={[0, 1.74, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} />
          </mesh>
        </>
      )}

      <mesh position={[-0.065, 1.54, 0.17]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshStandardMaterial color="#111318" roughness={0.35} />
      </mesh>
      <mesh position={[0.065, 1.54, 0.17]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshStandardMaterial color="#111318" roughness={0.35} />
      </mesh>
      {expression === 'stern' && (
        <>
          <mesh position={[-0.07, browY, 0.165]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.055, 0.01, 0.01]} />
            <meshStandardMaterial color="#1a1a22" />
          </mesh>
          <mesh position={[0.07, browY, 0.165]} rotation={[0, 0, -0.35]}>
            <boxGeometry args={[0.055, 0.01, 0.01]} />
            <meshStandardMaterial color="#1a1a22" />
          </mesh>
        </>
      )}
      <mesh position={[0, expression === 'smile' ? 1.46 : 1.47, 0.18]}>
        <boxGeometry args={[mouthW, 0.01, 0.01]} />
        <meshStandardMaterial color="#9f6060" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Standing booth NPC — torso, legs, face; optional vest layer. */
export function BoothStaffAvatar({
  skinTone,
  hairColor,
  shirtColor,
  pantsColor = '#1e293b',
  hairStyle = 'short',
  expression = 'neutral',
  vestColor,
  badge = false,
  rotationY = 0,
  animate = true,
  children,
}: {
  skinTone: string;
  hairColor: string;
  shirtColor: string;
  pantsColor?: string;
  hairStyle?: 'short' | 'net' | 'hat' | 'bald';
  expression?: 'neutral' | 'stern' | 'smile';
  vestColor?: string;
  badge?: boolean;
  rotationY?: number;
  animate?: boolean;
  children?: ReactNode;
}) {
  const bodyRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!animate || !bodyRef.current) return;
    bodyRef.current.position.y = Math.sin(clock.elapsedTime * 2.2) * 0.012;
  });

  return (
    <group rotation={[0, rotationY, 0]}>
      <group ref={bodyRef}>
        <RoundedBox castShadow position={[-0.1, 0.38, 0]} args={[0.14, 0.42, 0.16]} radius={0.03} smoothness={2}>
          <meshStandardMaterial color={pantsColor} roughness={0.86} />
        </RoundedBox>
        <RoundedBox castShadow position={[0.1, 0.38, 0]} args={[0.14, 0.42, 0.16]} radius={0.03} smoothness={2}>
          <meshStandardMaterial color={pantsColor} roughness={0.86} />
        </RoundedBox>

        <RoundedBox castShadow position={[0, 1.0, 0]} args={[0.48, 0.62, 0.28]} radius={0.05} smoothness={3}>
          <meshStandardMaterial color={shirtColor} roughness={0.72} />
        </RoundedBox>

        {vestColor && (
          <RoundedBox castShadow position={[0, 1.02, 0.02]} args={[0.52, 0.58, 0.3]} radius={0.04} smoothness={2}>
            <meshStandardMaterial color={vestColor} roughness={0.65} emissive={vestColor} emissiveIntensity={0.08} />
          </RoundedBox>
        )}

        {badge && (
          <mesh position={[0.14, 1.08, 0.16]}>
            <boxGeometry args={[0.08, 0.06, 0.02]} />
            <meshStandardMaterial color="#f8fafc" emissive="#fde047" emissiveIntensity={0.15} roughness={0.5} />
          </mesh>
        )}

        <RoundedBox castShadow position={[-0.28, 0.98, 0]} args={[0.11, 0.32, 0.11]} radius={0.025} smoothness={2}>
          <meshStandardMaterial color={vestColor ?? shirtColor} roughness={0.78} />
        </RoundedBox>
        <RoundedBox castShadow position={[0.28, 0.98, 0]} args={[0.11, 0.32, 0.11]} radius={0.025} smoothness={2}>
          <meshStandardMaterial color={vestColor ?? shirtColor} roughness={0.78} />
        </RoundedBox>

        <SimpleFace skinTone={skinTone} hairColor={hairColor} hairStyle={hairStyle} expression={expression} />
        {children}
      </group>
    </group>
  );
}
