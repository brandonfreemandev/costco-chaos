import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody, interactionGroups } from '@react-three/rapier';
import * as THREE from 'three';
import type { NPCArchetype } from '../../types/state';
import { COLLISION_GROUP } from '../../types/state';
import { registerNpc, unregisterNpc, updateNpcRuntime } from '../../systems/npcRegistry';

export interface NPCConfig {
  id: string;
  archetype: NPCArchetype;
  baseSpeed: number;
  obsessiveness: number;
  cartLoad: number;
  waypoints: [number, number, number][];
  color: string;
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

export function NPC({ config }: NPCProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const waypointIndex = useRef(0);
  const direction = useRef(1);
  const registered = useRef(false);
  const pauseUntil = useRef(0);
  const wanderPhase = useRef(hashSeed(config.id) * 0.001);
  const chaos = config.chaos ?? 0.45 + (hashSeed(config.id) % 7) * 0.08;

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

    if (!registered.current) {
      registerNpc(body.handle, { isNpc: true, cartLoad: config.cartLoad, npcId: config.id });
      registered.current = true;
    }

    const position = body.translation();
    const now = performance.now();
    wanderPhase.current += delta * (1.2 + chaos * 2.4);

    if (now < pauseUntil.current) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      updateNpcRuntime(body.handle, { isNpc: true, cartLoad: config.cartLoad, npcId: config.id }, position.x, position.z, 0);
      return;
    }

    if (Math.random() < 0.006 * (0.5 + chaos)) {
      pauseUntil.current = now + 400 + Math.random() * 2200 * chaos;
    }

    if (config.waypoints.length < 2) return;

    const target = config.waypoints[waypointIndex.current];
    const toTarget = new THREE.Vector3(
      target[0] - position.x,
      0,
      target[2] - position.z,
    );
    const distance = toTarget.length();
    const arriveThreshold = 0.45 + chaos * 0.35;

    if (distance < arriveThreshold) {
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
      return;
    }

    toTarget.normalize();

    const lateral = new THREE.Vector3(-toTarget.z, 0, toTarget.x);
    const wobble = Math.sin(wanderPhase.current) * chaos * 0.55;
    toTarget.addScaledVector(lateral, wobble).normalize();

    const speedJitter =
      0.65 +
      Math.sin(wanderPhase.current * 1.7) * 0.22 +
      Math.cos(wanderPhase.current * 0.43) * 0.15;
    const archetypeBoost = config.archetype === 'AGGRESSOR' ? 1.25 : config.archetype === 'SAMPLE_HUNTER' ? 0.85 : 1;
    const speed = config.baseSpeed * speedJitter * archetypeBoost;

    body.setLinvel({ x: toTarget.x * speed, y: 0, z: toTarget.z * speed }, true);

    const angle = Math.atan2(toTarget.x, toTarget.z);
    body.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0)), true);

    updateNpcRuntime(
      body.handle,
      { isNpc: true, cartLoad: config.cartLoad, npcId: config.id },
      position.x,
      position.z,
      speed,
    );
  });

  const start = config.waypoints[0];
  const width = config.cartLoad > 1.5 ? 0.75 : 0.5;

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicVelocity"
      colliders="cuboid"
      args={[width, 0.95, config.cartLoad > 1.5 ? 1.1 : 0.5]}
      position={start}
      friction={0.8}
      collisionGroups={interactionGroups(COLLISION_GROUP.NPC, [COLLISION_GROUP.PLAYER, COLLISION_GROUP.STATIC])}
    >
      <group>
        <mesh castShadow position={[0, 0.45, 0]}>
          <capsuleGeometry args={[0.28, 0.7, 6, 12]} />
          <meshStandardMaterial color={config.color} roughness={0.85} />
        </mesh>
        {config.cartLoad > 1.5 && (
          <mesh castShadow position={[0, 0.35, 0.55]}>
            <boxGeometry args={[0.7, 0.5, 0.9]} />
            <meshStandardMaterial color="#8a6d4a" roughness={0.9} />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}
