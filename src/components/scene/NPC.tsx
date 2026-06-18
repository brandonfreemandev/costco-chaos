import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody, interactionGroups } from '@react-three/rapier';
import * as THREE from 'three';
import type { NPCArchetype } from '../../types/state';
import { COLLISION_GROUP } from '../../types/state';

export interface NPCConfig {
  id: string;
  archetype: NPCArchetype;
  baseSpeed: number;
  obsessiveness: number;
  cartLoad: number;
  waypoints: [number, number, number][];
  color: string;
}

interface NPCProps {
  config: NPCConfig;
}

export function NPC({ config }: NPCProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const waypointIndex = useRef(0);
  const direction = useRef(1);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body || config.waypoints.length < 2) return;

    const target = config.waypoints[waypointIndex.current];
    const position = body.translation();
    const toTarget = new THREE.Vector3(
      target[0] - position.x,
      0,
      target[2] - position.z,
    );
    const distance = toTarget.length();

    if (distance < 0.6) {
      const nextIndex = waypointIndex.current + direction.current;
      if (nextIndex >= config.waypoints.length || nextIndex < 0) {
        direction.current *= -1;
      }
      waypointIndex.current = Math.max(
        0,
        Math.min(config.waypoints.length - 1, waypointIndex.current + direction.current),
      );
      return;
    }

    toTarget.normalize();
    const speed = config.baseSpeed * (config.archetype === 'AGGRESSOR' ? 1.25 : 1);
    body.setLinvel(
      {
        x: toTarget.x * speed,
        y: 0,
        z: toTarget.z * speed,
      },
      true,
    );

    const angle = Math.atan2(toTarget.x, toTarget.z);
    body.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0)), true);

    void delta;
  });

  const start = config.waypoints[0];

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicVelocity"
      colliders="cuboid"
      args={[0.45, 0.95, 0.45]}
      position={start}
      friction={0.8}
      userData={{ cartLoad: config.cartLoad, isNpc: true }}
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
