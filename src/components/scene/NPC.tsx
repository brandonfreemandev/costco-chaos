import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody, interactionGroups } from '@react-three/rapier';
import * as THREE from 'three';
import { COLLISION_GROUP } from '../../types/state';
import { registerNpc, unregisterNpc, updateNpcRuntime, type NpcPatrolAxis } from '../../systems/npcRegistry';
import { useSampleStationStore } from '../../stores/sampleStationStore';
import { useGameStore } from '../../stores/gameStore';
import { getNpcObstacleExtents, getNpcMovementObstacles } from '../../systems/staticObstacles';
import { NavAgent } from '../../systems/NavAgent';
import { GraphNavAgent } from '../../systems/GraphNavAgent';
import { gridPatrolYaw } from '../../systems/FacingConvention';
import type { NPCConfig } from '../../types/npcConfig';
import { ShopperAvatar } from './ShopperAvatar';
import { NPC_BODY_CENTER_Y, SHOPPER_AVATAR_Y_OFFSET } from './npcGrounding';

export type { NPCConfig };

interface NPCProps {
  config: NPCConfig;
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

function patrolAxisFor(config: NPCConfig): NpcPatrolAxis {
  const col = config.waypoints[0][0];
  const row = config.waypoints[0][2];
  if (config.waypoints.every((wp) => Math.abs(wp[0] - col) < 0.35)) return 'column';
  if (config.waypoints.every((wp) => Math.abs(wp[2] - row) < 0.35)) return 'row';
  return 'free';
}

function applyBodyHeading(body: RapierRigidBody, yaw: number): void {
  body.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), true);
}

export function NPC({ config }: NPCProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const agentRef = useRef<NavAgent | GraphNavAgent | null>(null);
  const registered = useRef(false);
  const seed = hashSeed(config.id);

  const skinTones = ['#e8c4a8', '#d4a574', '#c68642', '#f0d5be', '#8d5524'];
  const hairColors = ['#2a2018', '#5a4030', '#8a7060', '#1a1a22', '#6a5038', '#9098a0'];

  if (!agentRef.current || agentRef.current.config.id !== config.id) {
    // Warehouse shoppers navigate the WalkabilityGraph; the parking gauntlet
    // keeps the free-roam NavAgent.
    agentRef.current = config.outdoor ? new NavAgent(config) : new GraphNavAgent(config);
    registered.current = false;
  }

  useEffect(() => {
    return () => {
      const body = bodyRef.current;
      if (body) unregisterNpc(body.handle);
      registered.current = false;
    };
  }, [config.id]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const agent = agentRef.current;
    if (!body || !agent) return;

    const position = body.translation();
    const phase = useGameStore.getState().phase;
    const warehouseNpc = !config.outdoor && (phase === 'SHOPPING' || phase === 'CHECKOUT');
    const patrolAxis = patrolAxisFor(config);
    const meta = {
      isNpc: true as const,
      cartLoad: config.cartLoad,
      npcId: config.id,
      patrolAxis,
    };
    const { hx, hz } = getNpcObstacleExtents(config.cartLoad, patrolAxis);
    const movementSelf = warehouseNpc
      ? { x: position.x, z: position.z, hx, hz, patrolAxis }
      : undefined;
    const obstacles = getNpcMovementObstacles(phase, config.id, movementSelf);
    const now = performance.now();

    if (!registered.current) {
      registerNpc(body.handle, meta);
      registered.current = true;
      if (warehouseNpc) {
        const start =
          agent instanceof GraphNavAgent
            ? agent.startPosition()
            : { x: config.waypoints[0][0], z: config.waypoints[0][2] };
        body.setTranslation({ x: start.x, y: NPC_BODY_CENTER_Y, z: start.z }, true);
        agent.initPosition(start.x, start.z, now);
        const heading = gridPatrolYaw(config, 0, 1);
        if (heading !== null) applyBodyHeading(body, heading);
      }
    }

    const result = agent.tick({
      x: position.x,
      z: position.z,
      dt: Math.min(delta, 0.05),
      now,
      warehouseNpc,
      obstacles,
      selfId: config.id,
      patrolAxis,
      getSwarmTarget: (id) => useSampleStationStore.getState().getSwarmTarget(id),
    });

    body.setTranslation({ x: result.x, y: NPC_BODY_CENTER_Y, z: result.z }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    if (result.yaw !== null) applyBodyHeading(body, result.yaw);

    updateNpcRuntime(
      body.handle,
      meta,
      result.x,
      result.z,
      result.speed,
      result.paused,
      result.jittering,
      result.telemetry,
    );
  }, -1);

  const spawnWp = config.waypoints[0];
  const hasCart = config.cartLoad > 1.2;
  const width = hasCart ? 0.72 : 0.42;

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders="cuboid"
      args={[width, 1.05, hasCart ? 1.35 : 0.42]}
      position={[spawnWp[0], NPC_BODY_CENTER_Y, spawnWp[2]]}
      friction={0.8}
      collisionGroups={interactionGroups(COLLISION_GROUP.NPC, [])}
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
