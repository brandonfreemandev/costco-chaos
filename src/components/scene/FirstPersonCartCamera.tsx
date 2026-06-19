import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';

const EYE_HEIGHT = 1.62;
const CAMERA_BEHIND = 0.32;
const BOB_AMPLITUDE = 0.022;
const SHAKE_INTENSITY = 0.08;
const SHAKE_DURATION = 0.18;

const HANDLE = { color: '#c41e3a', roughness: 0.3, metalness: 0.35, envMapIntensity: 1.1 };
const GRIP = { color: '#2e3136', roughness: 0.45, metalness: 0.5 };

/** First-person cart handle — locked to cart yaw (not camera shake) so it stays aligned with the body. */
export function FirstPersonCartCamera() {
  const { camera } = useThree();
  const handleRef = useRef<THREE.Group>(null);
  const bobPhase = useRef(0);
  const localOffset = useRef(new THREE.Vector3(0, -0.32, -0.72));
  const worldOffset = useRef(new THREE.Vector3());
  const yawQuat = useRef(new THREE.Quaternion());
  const shakeTime = useRef(0);
  const phase = useGameStore((s) => s.phase);
  const damagePulse = useUIStore((s) => s.damagePulse);
  const hasCart = phase === 'PARKING' || phase === 'SHOPPING' || phase === 'CHECKOUT';

  useFrame((_, delta) => {
    const { position, yaw, speed } = useCartTransformStore.getState();

    if (damagePulse > 0) {
      shakeTime.current = SHAKE_DURATION;
    }
    shakeTime.current = Math.max(0, shakeTime.current - delta);

    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);

    bobPhase.current += delta * (2.5 + speed * 1.8);
    const bob = Math.sin(bobPhase.current) * BOB_AMPLITUDE * Math.min(1, speed / 2.5);

    const shakeAmount = Math.max(0, shakeTime.current / SHAKE_DURATION);
    const shakeX =
      (Math.sin(shakeTime.current * 47) + Math.cos(shakeTime.current * 73)) * shakeAmount * SHAKE_INTENSITY;
    const shakeY =
      (Math.sin(shakeTime.current * 61) + Math.cos(shakeTime.current * 89)) * shakeAmount * SHAKE_INTENSITY;
    const shakeZ =
      (Math.sin(shakeTime.current * 53) + Math.cos(shakeTime.current * 97)) * shakeAmount * SHAKE_INTENSITY;

    const behind = hasCart ? CAMERA_BEHIND : 0;
    camera.position.set(
      position.x - forwardX * behind + shakeX,
      EYE_HEIGHT + bob + shakeY,
      position.z - forwardZ * behind + shakeZ,
    );
    camera.rotation.set(0, yaw, 0, 'YXZ');

    if (handleRef.current && hasCart) {
      yawQuat.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      worldOffset.current.copy(localOffset.current).applyQuaternion(yawQuat.current);
      handleRef.current.position.set(
        position.x + worldOffset.current.x,
        EYE_HEIGHT + worldOffset.current.y + bob * 0.35,
        position.z + worldOffset.current.z,
      );
      handleRef.current.rotation.set(0.08, yaw, 0, 'YXZ');
      handleRef.current.visible = true;
    } else if (handleRef.current) {
      handleRef.current.visible = false;
    }
  });

  return (
    <group ref={handleRef} visible={hasCart}>
      <mesh castShadow>
        <boxGeometry args={[0.82, 0.055, 0.06]} />
        <meshStandardMaterial {...HANDLE} />
      </mesh>
      <mesh position={[-0.38, -0.08, 0.02]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.24, 0.05]} />
        <meshStandardMaterial {...GRIP} />
      </mesh>
      <mesh position={[0.38, -0.08, 0.02]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.24, 0.05]} />
        <meshStandardMaterial {...GRIP} />
      </mesh>
      <mesh position={[0, -0.2, 0.14]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[0.86, 0.04, 0.38]} />
        <meshStandardMaterial color="#5c6068" roughness={0.55} metalness={0.35} />
      </mesh>
    </group>
  );
}
