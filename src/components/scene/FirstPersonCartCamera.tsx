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
/** Peak backward recoil distance (metres) on a max-damage bump. */
const PUNCH_MAX = 0.14;
const PUNCH_DECAY = 12; // exponential decay rate (higher = snappier return)

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
  const punchOffset = useRef(0);
  const lastDamagePulse = useRef(0);
  const phase = useGameStore((s) => s.phase);
  const damagePulse = useUIStore((s) => s.damagePulse);
  const lastDamageAmount = useUIStore((s) => s.lastDamageAmount);
  const hasCart = phase === 'PARKING' || phase === 'SHOPPING' || phase === 'CHECKOUT';

  useFrame((_, delta) => {
    const { position, yaw, speed } = useCartTransformStore.getState();

    if (damagePulse !== lastDamagePulse.current) {
      lastDamagePulse.current = damagePulse;
      if (damagePulse > 0) {
        shakeTime.current = SHAKE_DURATION;
        // Scale punch by damage magnitude (lastDamageAmount 1–15)
        const punchScale = Math.min(1, (lastDamageAmount ?? 6) / 15);
        punchOffset.current = PUNCH_MAX * (0.4 + 0.6 * punchScale);
      }
    }
    shakeTime.current = Math.max(0, shakeTime.current - delta);
    punchOffset.current = Math.max(0, punchOffset.current - punchOffset.current * PUNCH_DECAY * delta);

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

    // Punch recoils opposite to forward (backward along travel direction)
    const punch = punchOffset.current;
    if (hasCart) {
      camera.position.set(
        position.x - forwardX * PUSHER_OFFSET + shakeX + forwardX * punch,
        EYE_HEIGHT + bob + shakeY,
        position.z - forwardZ * PUSHER_OFFSET + shakeZ + forwardZ * punch,
      );
    } else {
      camera.position.set(position.x + shakeX + forwardX * punch, EYE_HEIGHT + shakeY, position.z + shakeZ + forwardZ * punch);
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
