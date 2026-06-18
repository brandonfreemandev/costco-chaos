import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody, interactionGroups } from '@react-three/rapier';
import * as THREE from 'three';
import { useCartInput, getCartInput } from '../../hooks/useCartInput';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { spatialAudio } from '../../audio/spatialAudioManager';
import { COLLISION_GROUP } from '../../types/state';
import {
  ACCEL,
  ANGULAR_DAMPING,
  BASE_MASS,
  CART_HEIGHT,
  getCartMass,
  LINEAR_DAMPING,
  MAX_SPEED,
  REVERSE_ACCEL,
  TURN_RATE,
} from '../../systems/physicsController';
import { handleCollision } from '../../systems/handleCollision';

const yawQuat = new THREE.Quaternion();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const positionVec = new THREE.Vector3();

import {
  PLAYER_SPAWN,
  WAREHOUSE_INTERIOR_SPAWN,
} from './parkingLotLayout';

const SPAWN = {
  PARKING: PLAYER_SPAWN,
  SHOPPING: WAREHOUSE_INTERIOR_SPAWN,
} as const;

function isActivePhase(phase: string) {
  return phase === 'PARKING' || phase === 'SHOPPING';
}

export function ShoppingCart() {
  const bodyRef = useRef<RapierRigidBody>(null);
  useCartInput();
  const mass = usePlayerStore((s) => s.cartPhysics.mass);
  const inventoryWeight = usePlayerStore((s) => s.inventory.itemsRemaining * 4);
  const phase = useGameStore((s) => s.phase);
  const lastCollisionAt = useRef(0);
  const yawRef = useRef(0);
  const lastPhase = useRef(phase);

  useEffect(() => {
    if (!isActivePhase(phase)) return;
    const body = bodyRef.current;
    if (!body) return;

    const spawn = phase === 'SHOPPING' ? SPAWN.SHOPPING : SPAWN.PARKING;
    yawRef.current = spawn.yaw;
    body.setTranslation({ x: spawn.x, y: CART_HEIGHT, z: spawn.z }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    euler.set(0, spawn.yaw, 0);
    yawQuat.setFromEuler(euler);
    body.setRotation({ x: yawQuat.x, y: yawQuat.y, z: yawQuat.z, w: yawQuat.w }, true);
    lastPhase.current = phase;
  }, [phase]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body || !isActivePhase(phase)) return;

    const input = getCartInput();
    const effectiveMass = getCartMass(inventoryWeight);
    const massFactor = BASE_MASS / effectiveMass;
    const linvel = body.linvel();
    let vx = linvel.x;
    let vz = linvel.z;

    const forwardX = -Math.sin(yawRef.current);
    const forwardZ = -Math.cos(yawRef.current);

    if (input.forward) {
      vx += forwardX * ACCEL * massFactor * delta;
      vz += forwardZ * ACCEL * massFactor * delta;
    }
    if (input.backward) {
      vx -= forwardX * REVERSE_ACCEL * massFactor * delta;
      vz -= forwardZ * REVERSE_ACCEL * massFactor * delta;
    }

    const damping = Math.exp(-LINEAR_DAMPING * delta);
    vx *= damping;
    vz *= damping;

    const speed = Math.hypot(vx, vz);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      vx *= scale;
      vz *= scale;
    }

    if (input.steer !== 0) {
      const turnFactor = speed > 0.05 ? Math.max(0.35, speed / MAX_SPEED) : 0.55;
      yawRef.current += input.steer * TURN_RATE * turnFactor * delta;
    }

    euler.set(0, yawRef.current, 0);
    yawQuat.setFromEuler(euler);
    body.setRotation({ x: yawQuat.x, y: yawQuat.y, z: yawQuat.z, w: yawQuat.w }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setLinvel({ x: vx, y: 0, z: vz }, true);

    const translation = body.translation();
    if (Math.abs(translation.y - CART_HEIGHT) > 0.001) {
      body.setTranslation({ x: translation.x, y: CART_HEIGHT, z: translation.z }, true);
    }

    positionVec.set(translation.x, CART_HEIGHT, translation.z);
    useCartTransformStore.getState().setTransform(positionVec, yawRef.current, speed);

    usePlayerStore.getState().setCartPhysics({
      velocity: { x: vx, y: 0, z: vz },
      momentum: speed * effectiveMass,
      mass: effectiveMass,
    });

    if (useGameStore.getState().audioUnlocked) {
      spatialAudio.updateCartMotion(speed);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders="cuboid"
      args={[0.55, 0.9, 0.95]}
      position={[SPAWN.PARKING.x, CART_HEIGHT, SPAWN.PARKING.z]}
      mass={mass}
      friction={0.85}
      restitution={0}
      linearDamping={0}
      angularDamping={ANGULAR_DAMPING}
      enabledRotations={[false, true, false]}
      gravityScale={0}
      collisionGroups={interactionGroups(COLLISION_GROUP.PLAYER, [COLLISION_GROUP.NPC, COLLISION_GROUP.STATIC])}
      onCollisionEnter={({ other }) => {
        const otherBody = other.rigidBody;
        const userData = otherBody?.userData as { isNpc?: boolean; cartLoad?: number } | undefined;
        if (!otherBody || !userData?.isNpc) return;

        const now = performance.now();
        if (now - lastCollisionAt.current < 400) return;
        lastCollisionAt.current = now;

        const body = bodyRef.current;
        if (!body) return;

        const playerSpeed = Math.hypot(body.linvel().x, body.linvel().z);
        const otherLinvel = otherBody.linvel();
        const entitySpeed = Math.hypot(otherLinvel.x, otherLinvel.z);
        handleCollision(playerSpeed, entitySpeed, userData.cartLoad ?? 1.5);
      }}
    />
  );
}
