import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody, interactionGroups } from '@react-three/rapier';
import * as THREE from 'three';
import { useCartInput, getCartInput } from '../../hooks/useCartInput';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import { useCheckoutStore } from '../../stores/checkoutStore';
import { pickSampleLine, useSampleStationStore, SAMPLE_MH_RESTORE } from '../../stores/sampleStationStore';
import { useUIStore } from '../../stores/uiStore';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { spatialAudio } from '../../audio/spatialAudioManager';
import { COLLISION_GROUP } from '../../types/state';
import {
  ACCEL,
  BASE_MASS,
  getCartMass,
  LINEAR_DAMPING,
  MAX_SPEED,
  REVERSE_ACCEL,
  TURN_RATE,
} from '../../systems/physicsController';
import { tryHandlePlayerNpcCollision } from '../../systems/handleCollision';
import { applyNpcBumps } from '../../systems/npcBumps';
import {
  getNpcObstacles,
  getParkingObstacles,
  getWarehouseObstacles,
  resolveCartMove,
} from '../../systems/staticObstacles';
import { PLAYER_SPAWN, WAREHOUSE_INTERIOR_SPAWN } from './parkingLotLayout';
import {
  CHECKOUT_MEZZANINE,
  getCheckoutFloorY,
  isInCheckoutApproach,
} from './checkoutLayout';
import { WH_MAX_X, WH_MAX_Z, WH_MIN_X, WH_MIN_Z } from './warehouseLayout';
import { CartModel, cartBodyY } from './CartModel';
import { OUTDOOR_GROUND_Y } from './npcGrounding';

const PLAYER_COLLISION_GROUPS = interactionGroups(COLLISION_GROUP.PLAYER, [COLLISION_GROUP.NPC]);

const yawQuat = new THREE.Quaternion();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const positionVec = new THREE.Vector3();

export function ShoppingCart() {
  const bodyRef = useRef<RapierRigidBody>(null);
  useCartInput();
  const inventoryWeight = usePlayerStore((s) => s.inventory.itemsRemaining * 4);
  const itemsRemaining = usePlayerStore((s) => s.inventory.itemsRemaining);
  const phase = useGameStore((s) => s.phase);
  const listCompleteFired = useRef(false);
  const lastCollisionAt = useRef(0);
  const yawRef = useRef<number>(PLAYER_SPAWN.yaw);
  const lastPhase = useRef<string | null>(null);
  const posRef = useRef({ x: PLAYER_SPAWN.x as number, z: PLAYER_SPAWN.z as number });
  const vxRef = useRef(0);
  const vzRef = useRef(0);

  useEffect(() => {
    if (phase === 'PARKING' && lastPhase.current !== 'PARKING') {
      yawRef.current = PLAYER_SPAWN.yaw;
      posRef.current = { x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.z };
      vxRef.current = 0;
      vzRef.current = 0;
    }
    if (phase === 'SHOPPING' && lastPhase.current !== 'SHOPPING') {
      if (lastPhase.current === 'PARKING' || lastPhase.current === 'MENU' || lastPhase.current === null) {
        yawRef.current = WAREHOUSE_INTERIOR_SPAWN.yaw;
        posRef.current = { x: WAREHOUSE_INTERIOR_SPAWN.x, z: WAREHOUSE_INTERIOR_SPAWN.z };
        vxRef.current = 0;
        vzRef.current = 0;
        listCompleteFired.current = false;
      }
    }
    lastPhase.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase !== 'SHOPPING') return;
    if (itemsRemaining > 0) return;
    if (listCompleteFired.current) return;

    listCompleteFired.current = true;
    useGameStore.getState().markShoppingComplete();
    useUIStore.setState({
      lastCollisionMessage:
        'List complete! Drive north to CHECKOUT at the front of the store. Press 1–6 in lane to switch.',
    });
  }, [phase, itemsRemaining]);

  useFrame((_, delta) => {
    const game = useGameStore.getState();
    if (game.phase !== 'PARKING' && game.phase !== 'SHOPPING' && game.phase !== 'CHECKOUT') return;

    const dt = Math.min(delta, 0.05);
    const input = getCartInput();
    const effectiveMass = getCartMass(inventoryWeight);
    const massFactor = BASE_MASS / effectiveMass;

    const forwardX = -Math.sin(yawRef.current);
    const forwardZ = -Math.cos(yawRef.current);

    let vx = vxRef.current;
    let vz = vzRef.current;

    if (input.forward) {
      vx += forwardX * ACCEL * massFactor * dt;
      vz += forwardZ * ACCEL * massFactor * dt;
    }
    if (input.backward) {
      vx -= forwardX * REVERSE_ACCEL * massFactor * dt;
      vz -= forwardZ * REVERSE_ACCEL * massFactor * dt;
    }

    const damping = Math.exp(-LINEAR_DAMPING * dt);
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
      yawRef.current -= input.steer * TURN_RATE * turnFactor * dt;
    }

    const staticObs =
      game.phase === 'PARKING' ? getParkingObstacles() : getWarehouseObstacles();
    const obstacles = staticObs.concat(getNpcObstacles());
    const intendedX = posRef.current.x + vx * dt;
    const intendedZ = posRef.current.z + vz * dt;
    const moved = resolveCartMove(posRef.current.x, posRef.current.z, vx * dt, vz * dt, obstacles);
    posRef.current.x = moved.x;
    posRef.current.z = moved.z;

    if (Math.abs(moved.x - intendedX) > 0.02) vx = 0;
    if (Math.abs(moved.z - intendedZ) > 0.02) vz = 0;

    if (game.phase === 'SHOPPING' || game.phase === 'CHECKOUT') {
      posRef.current.x = Math.max(WH_MIN_X + 1.5, Math.min(WH_MAX_X - 1.5, posRef.current.x));
      const maxZ =
        game.phase === 'CHECKOUT' || isInCheckoutApproach(posRef.current.x, posRef.current.z)
          ? WH_MAX_Z - 0.3
          : WH_MAX_Z - 1.5;
      posRef.current.z = Math.max(WH_MIN_Z + 1.5, Math.min(maxZ, posRef.current.z));

      if (game.phase === 'CHECKOUT') {
        posRef.current.x = Math.max(
          CHECKOUT_MEZZANINE.minX + 1,
          Math.min(CHECKOUT_MEZZANINE.maxX - 1, posRef.current.x),
        );
      }
    }

    vxRef.current = vx;
    vzRef.current = vz;

    const px = posRef.current.x;
    const pz = posRef.current.z;
    const floorLift = getCheckoutFloorY(px, pz);
    const baseFloor = game.phase === 'PARKING' ? OUTDOOR_GROUND_Y : 0;
    const cartY = cartBodyY(baseFloor + floorLift);

    const body = bodyRef.current;
    if (body) {
      euler.set(0, yawRef.current, 0);
      yawQuat.setFromEuler(euler);
      body.setTranslation({ x: px, y: cartY, z: pz }, true);
      body.setRotation({ x: yawQuat.x, y: yawQuat.y, z: yawQuat.z, w: yawQuat.w }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    positionVec.set(px, cartY, pz);
    useCartTransformStore.getState().setTransform(positionVec, yawRef.current, speed);

    applyNpcBumps(px, pz, speed);

    if (game.shoppingListComplete && game.phase === 'SHOPPING' && isInCheckoutApproach(px, pz)) {
      game.beginCheckout();
    }

    if (useGameStore.getState().phase === 'CHECKOUT') {
      useCheckoutStore.getState().tick(dt, px, pz);
    }

    if (game.phase === 'SHOPPING') {
      const result = useSampleStationStore.getState().tryTakeSample(px, pz);
      if (result.ok) {
        useUIStore.getState().triggerSampleFeedback(`${pickSampleLine()} (+${SAMPLE_MH_RESTORE} MH)`);
        if (useGameStore.getState().audioUnlocked) {
          spatialAudio.playCorporateDing();
        }
      }
    }

    usePlayerStore.getState().setCartPhysics({
      velocity: { x: vx, y: 0, z: vz },
      momentum: speed * effectiveMass,
      mass: effectiveMass,
    });

    if (useGameStore.getState().audioUnlocked) {
      spatialAudio.updateCartMotion(speed);
    }
  });

  if (phase !== 'PARKING' && phase !== 'SHOPPING' && phase !== 'CHECKOUT') return null;

  const spawn = phase === 'PARKING' ? PLAYER_SPAWN : WAREHOUSE_INTERIOR_SPAWN;
  const spawnFloor = phase === 'PARKING' ? OUTDOOR_GROUND_Y : 0;

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders="cuboid"
      args={[0.55, 0.9, 0.95]}
      position={[spawn.x, cartBodyY(spawnFloor), spawn.z]}
      enabledRotations={[false, true, false]}
      collisionGroups={PLAYER_COLLISION_GROUPS}
      onCollisionEnter={({ other }) => {
        const now = performance.now();
        if (now - lastCollisionAt.current < 350) return;
        const otherBody = other.rigidBody;
        const hit = tryHandlePlayerNpcCollision(
          Math.hypot(vxRef.current, vzRef.current),
          otherBody?.handle,
          otherBody?.linvel(),
        );
        if (hit) lastCollisionAt.current = now;
      }}
    >
      <CartModel showHandle={false} />
    </RigidBody>
  );
}
