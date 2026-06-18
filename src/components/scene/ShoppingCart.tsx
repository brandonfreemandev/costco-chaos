import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody, interactionGroups } from '@react-three/rapier';
import * as THREE from 'three';
import { useCartInput } from '../../hooks/useCartInput';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import { spatialAudio } from '../../audio/spatialAudioManager';
import { COLLISION_GROUP } from '../../types/state';
import {
  ACCEL,
  ANGULAR_DAMPING,
  BASE_MASS,
  getCartMass,
  LINEAR_DAMPING,
  MAX_SPEED,
  REVERSE_ACCEL,
  TURN_RATE,
} from '../../systems/physicsController';
import { handleCollision } from '../../systems/handleCollision';

const forward = new THREE.Vector3();
const impulse = new THREE.Vector3();

interface ShoppingCartProps {
  onPositionChange?: (position: THREE.Vector3) => void;
}

export function ShoppingCart({ onPositionChange }: ShoppingCartProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const input = useCartInput();
  const mass = usePlayerStore((s) => s.cartPhysics.mass);
  const inventoryWeight = usePlayerStore((s) => s.inventory.itemsRemaining * 4);
  const phase = useGameStore((s) => s.phase);
  const lastCollisionAt = useRef(0);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body || phase !== 'PARKING') return;

    const rotation = body.rotation();
    const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    forward.set(0, 0, -1).applyQuaternion(quat);

    const effectiveMass = getCartMass(inventoryWeight);
    const linvel = body.linvel();
    const speed = Math.hypot(linvel.x, linvel.z);

    if (input.forward) {
      impulse.copy(forward).multiplyScalar(ACCEL * (BASE_MASS / effectiveMass));
      body.applyImpulse(impulse, true);
    }
    if (input.backward) {
      impulse.copy(forward).multiplyScalar(-REVERSE_ACCEL * (BASE_MASS / effectiveMass));
      body.applyImpulse(impulse, true);
    }

    const turnFactor = Math.max(0.25, speed / MAX_SPEED);
    body.setAngvel({ x: 0, y: input.steer * TURN_RATE * turnFactor, z: 0 }, true);

    body.setLinearDamping(LINEAR_DAMPING);
    body.setAngularDamping(ANGULAR_DAMPING);

    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      body.setLinvel({ x: linvel.x * scale, y: linvel.y, z: linvel.z * scale }, true);
    }

    const position = body.translation();
    onPositionChange?.(new THREE.Vector3(position.x, position.y, position.z));

    usePlayerStore.getState().setCartPhysics({
      velocity: { x: linvel.x, y: linvel.y, z: linvel.z },
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
      position={[0, 0.9, 18]}
      mass={mass}
      friction={0.6}
      restitution={0.05}
      linearDamping={LINEAR_DAMPING}
      angularDamping={ANGULAR_DAMPING}
      collisionGroups={interactionGroups(COLLISION_GROUP.PLAYER, [COLLISION_GROUP.NPC, COLLISION_GROUP.STATIC])}
      onCollisionEnter={({ other }) => {
        const now = performance.now();
        if (now - lastCollisionAt.current < 350) return;
        lastCollisionAt.current = now;

        const body = bodyRef.current;
        if (!body) return;

        const playerSpeed = Math.hypot(body.linvel().x, body.linvel().z);
        const otherBody = other.rigidBody;
        const otherLinvel = otherBody?.linvel();
        const entitySpeed = otherLinvel
          ? Math.hypot(otherLinvel.x, otherLinvel.z)
          : 0;
        const cartLoad =
          (otherBody?.userData as { cartLoad?: number } | undefined)?.cartLoad ?? 1.2;

        handleCollision(playerSpeed, entitySpeed, cartLoad);
      }}
    >
      <group>
        <mesh castShadow position={[0, 0.1, 0]}>
          <boxGeometry args={[0.9, 0.75, 1.2]} />
          <meshStandardMaterial color="#6b6f76" metalness={0.35} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.55, -0.55]}>
          <boxGeometry args={[0.85, 0.08, 0.08]} />
          <meshStandardMaterial color="#3d4045" />
        </mesh>
        {[-0.42, 0.42].map((x) => (
          <mesh key={x} position={[x, -0.25, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        ))}
      </group>
    </RigidBody>
  );
}
