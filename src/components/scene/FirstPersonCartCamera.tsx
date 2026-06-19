import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import { CartModel } from './CartModel';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';

const EYE_HEIGHT = 1.62;
const PUSHER_OFFSET = 0.42;
const BOB_AMPLITUDE = 0.026;
const SHAKE_INTENSITY = 0.08;
const SHAKE_DURATION = 0.18;

/**
 * Camera-local offsets tuned to match a real Costco push POV:
 * red handle in the lower third, wire basket extending into the scene.
 * Model origin = wheel ground; handle bar ≈ y 0.94 on the model.
 */
const VIEW_Y = -1.28;
const VIEW_Z = 0.02;
const VIEW_PITCH = 0.045;

/**
 * First-person cart — view-model locked to the camera (always visible),
 * world camera still follows cart transform for movement.
 */
export function FirstPersonCartCamera() {
  const { camera } = useThree();
  const rigRef = useRef<Group>(null);
  const bobRef = useRef<Group>(null);
  const bobPhase = useRef(0);
  const shakeTime = useRef(0);
  const lastDamagePulse = useRef(0);
  const phase = useGameStore((s) => s.phase);
  const damagePulse = useUIStore((s) => s.damagePulse);
  const hasCart = phase === 'PARKING' || phase === 'SHOPPING' || phase === 'CHECKOUT';

  useFrame((_, delta) => {
    const { position, yaw, speed } = useCartTransformStore.getState();

    if (damagePulse !== lastDamagePulse.current) {
      lastDamagePulse.current = damagePulse;
      if (damagePulse > 0) {
        shakeTime.current = SHAKE_DURATION;
      }
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

    if (hasCart) {
      camera.position.set(
        position.x - forwardX * PUSHER_OFFSET + shakeX,
        EYE_HEIGHT + bob + shakeY,
        position.z - forwardZ * PUSHER_OFFSET + shakeZ,
      );
    } else {
      camera.position.set(position.x + shakeX, EYE_HEIGHT + shakeY, position.z + shakeZ);
    }
    camera.rotation.set(0, yaw, 0, 'YXZ');

    if (rigRef.current) {
      if (hasCart) {
        rigRef.current.position.copy(camera.position);
        rigRef.current.quaternion.copy(camera.quaternion);
        rigRef.current.visible = true;
      } else {
        rigRef.current.visible = false;
      }
    }

    if (bobRef.current && hasCart) {
      bobRef.current.position.set(0, VIEW_Y + bob * 0.85, VIEW_Z);
      bobRef.current.rotation.set(VIEW_PITCH + bob * 0.18, 0, 0);
    }
  });

  if (!hasCart) return null;

  return (
    <group ref={rigRef}>
      <group ref={bobRef}>
        <CartModel showHandle />
      </group>
    </group>
  );
}
