import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody, interactionGroups } from '@react-three/rapier';
import * as THREE from 'three';
import type { NPCArchetype } from '../../types/state';
import { COLLISION_GROUP } from '../../types/state';
import { registerNpc, unregisterNpc, updateNpcRuntime } from '../../systems/npcRegistry';
import { useSampleStationStore } from '../../stores/sampleStationStore';
import { SAMPLE_SWARM_RADIUS } from '../../systems/sampleStations';

export interface NPCConfig {
  id: string;
  archetype: NPCArchetype;
  baseSpeed: number;
  obsessiveness: number;
  cartLoad: number;
  waypoints: [number, number, number][];
  color: string;
  skinTone?: string;
  hairColor?: string;
  /** 0–1: higher = more erratic Costco chaos */
  chaos?: number;
}

interface NPCProps {
  config: NPCConfig;
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return h;
}

import { ShopperAvatar } from './ShopperAvatar';
import { NPC_BODY_CENTER_Y, SHOPPER_AVATAR_Y_OFFSET } from './npcGrounding';

export function NPC({ config }: NPCProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const waypointIndex = useRef(0);
  const direction = useRef(1);
  const registered = useRef(false);
  const pauseUntil = useRef(0);
  const wanderPhase = useRef(hashSeed(config.id) * 0.001);
  const chaos = config.chaos ?? 0.45 + (hashSeed(config.id) % 7) * 0.08;
  const seed = hashSeed(config.id);

  const skinTones = ['#e8c4a8', '#d4a574', '#c68642', '#f0d5be', '#8d5524'];
  const hairColors = ['#2a2018', '#5a4030', '#8a7060', '#1a1a22', '#6a5038', '#9098a0'];

  useEffect(() => {
    return () => {
      const body = bodyRef.current;
      if (body) unregisterNpc(body.handle);
      registered.current = false;
    };
  }, [config.id]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    const position = body.translation();
    const meta = { isNpc: true as const, cartLoad: config.cartLoad, npcId: config.id };
    let speed = 0;

    if (!registered.current) {
      registerNpc(body.handle, meta);
      registered.current = true;
    }

    const now = performance.now();
    wanderPhase.current += delta * (1.2 + chaos * 2.4);

    if (now < pauseUntil.current) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      updateNpcRuntime(body.handle, meta, position.x, position.z, 0);
      return;
    }

    if (Math.random() < 0.006 * (0.5 + chaos)) {
      pauseUntil.current = now + 400 + Math.random() * 2200 * chaos;
    }

    if (config.waypoints.length < 2) {
      updateNpcRuntime(body.handle, meta, position.x, position.z, 0);
      return;
    }

    const swarm = useSampleStationStore.getState().getSwarmTarget();
    let toTarget = new THREE.Vector3();
    let chasingSample = false;

    if (swarm) {
      const sdx = swarm.x - position.x;
      const sdz = swarm.z - position.z;
      const swarmDist = Math.hypot(sdx, sdz);
      const wantsSample =
        swarmDist < SAMPLE_SWARM_RADIUS &&
        (config.archetype === 'SAMPLE_HUNTER' ||
          config.obsessiveness > 38 ||
          config.archetype === 'AGGRESSOR');

      if (wantsSample) {
        toTarget.set(sdx, 0, sdz);
        chasingSample = true;
      }
    }

    if (!chasingSample) {
      const target = config.waypoints[waypointIndex.current];
      toTarget.set(target[0] - position.x, 0, target[2] - position.z);
    }

    const distance = toTarget.length();
    const arriveThreshold = chasingSample ? 1.1 : 0.45 + chaos * 0.35;

    if (!chasingSample && distance < arriveThreshold) {
      const nextIndex = waypointIndex.current + direction.current;
      if (nextIndex >= config.waypoints.length || nextIndex < 0) {
        direction.current *= -1;
        if (Math.random() < 0.25 * chaos) {
          pauseUntil.current = now + 300 + Math.random() * 1200;
        }
      }
      waypointIndex.current = Math.max(
        0,
        Math.min(config.waypoints.length - 1, waypointIndex.current + direction.current),
      );
      updateNpcRuntime(body.handle, meta, position.x, position.z, 0);
      return;
    }

    toTarget.normalize();

    if (!chasingSample) {
      const lateral = new THREE.Vector3(-toTarget.z, 0, toTarget.x);
      const wobble = Math.sin(wanderPhase.current) * chaos * 0.55;
      toTarget.addScaledVector(lateral, wobble).normalize();
    }

    const speedJitter =
      0.65 + Math.sin(wanderPhase.current * 1.7) * 0.22 + Math.cos(wanderPhase.current * 0.43) * 0.15;
    const archetypeBoost =
      config.archetype === 'AGGRESSOR' ? 1.25 : config.archetype === 'SAMPLE_HUNTER' ? 0.85 : 1;
    const sampleBoost = chasingSample ? (config.archetype === 'SAMPLE_HUNTER' ? 1.65 : 1.35) : 1;
    speed = config.baseSpeed * speedJitter * archetypeBoost * sampleBoost;

    body.setLinvel({ x: toTarget.x * speed, y: 0, z: toTarget.z * speed }, true);

    const angle = Math.atan2(toTarget.x, toTarget.z);
    body.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0)), true);

    updateNpcRuntime(body.handle, meta, position.x, position.z, speed);
  }, -1);

  const start = config.waypoints[0];
  const hasCart = config.cartLoad > 1.2;
  const width = hasCart ? 0.72 : 0.42;

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicVelocity"
      colliders="cuboid"
      args={[width, 1.05, hasCart ? 1.35 : 0.42]}
      position={[start[0], NPC_BODY_CENTER_Y, start[2]]}
      friction={0.8}
      collisionGroups={interactionGroups(COLLISION_GROUP.NPC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.STATIC])}
    >
      <group position={[0, SHOPPER_AVATAR_Y_OFFSET, 0]}>
        <ShopperAvatar
          shirtColor={config.color}
          skinTone={config.skinTone ?? skinTones[Math.abs(seed) % skinTones.length]}
          hairColor={config.hairColor ?? hairColors[Math.abs(seed >> 3) % hairColors.length]}
          hasCart={hasCart}
        />
      </group>
    </RigidBody>
  );
}
