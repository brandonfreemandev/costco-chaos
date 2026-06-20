import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody, interactionGroups } from '@react-three/rapier';
import * as THREE from 'three';
import type { NPCArchetype } from '../../types/state';
import { COLLISION_GROUP } from '../../types/state';
import { registerNpc, unregisterNpc, updateNpcRuntime, getActiveNpcRuntimes, type NpcPatrolAxis } from '../../systems/npcRegistry';
import { useSampleStationStore } from '../../stores/sampleStationStore';
import { useGameStore } from '../../stores/gameStore';
import { SAMPLE_SWARM_RADIUS, sampleApproachPoint } from '../../systems/sampleStations';
import {
  getNpcHalfExtents,
  getNpcObstacleExtents,
  getNpcMovementObstacles,
  resolveCartMove,
} from '../../systems/staticObstacles';
import { sanitizeWarehouseWaypoint, clampWarehouseNpcPoint, clampWestPatrolX, clampEastPatrolX, isWestRacetrackPatrolX, isEastRacetrackPatrolX, westRacetrackPatrolX, eastRacetrackPatrolX, AISLE_CENTERS_X, snapCrossAisleZ, isInsideRackFootprint } from './warehouseLayout';

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
  /** Parking-lot gauntlet — never snap to warehouse patrol grid. */
  outdoor?: boolean;
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

/** N–S loop patrol locks X to the perimeter corridor so slide/depenetration cannot drift into racks. */
function clampLoopPatrolX(x: number, hx: number, config: NPCConfig): number {
  if (config.waypoints.length < 2) return x;
  const col = config.waypoints[0][0];
  if (Math.abs(col - config.waypoints[1][0]) > 0.25) return x;
  if (isWestRacetrackPatrolX(col)) return clampWestPatrolX(x, hx);
  if (isEastRacetrackPatrolX(col)) return clampEastPatrolX(x, hx);
  return x;
}

function isColumnPatrol(config: NPCConfig): boolean {
  const col = config.waypoints[0][0];
  return config.waypoints.every((wp) => Math.abs(wp[0] - col) < 0.35);
}

function isRowPatrol(config: NPCConfig): boolean {
  const row = config.waypoints[0][2];
  return config.waypoints.every((wp) => Math.abs(wp[2] - row) < 0.35);
}

/** Costco aisles are grid-aligned — diagonals clip rack endcaps and cause jitter. */
function axisLockDirection(toTarget: THREE.Vector3, config: NPCConfig): void {
  if (isColumnPatrol(config)) {
    toTarget.x = 0;
  } else if (isRowPatrol(config)) {
    toTarget.z = 0;
  } else if (Math.abs(toTarget.x) > 0.12 && Math.abs(toTarget.z) > 0.12) {
    if (Math.abs(toTarget.x) > Math.abs(toTarget.z)) toTarget.z = 0;
    else toTarget.x = 0;
  }
  if (toTarget.lengthSq() > 1e-8) toTarget.normalize();
}

function isPerimeterColumnPatrol(config: NPCConfig): boolean {
  if (!isColumnPatrol(config)) return false;
  const col = config.waypoints[0][0];
  return isWestRacetrackPatrolX(col) || isEastRacetrackPatrolX(col);
}

function snapPatrolPosition(x: number, z: number, hx: number, config: NPCConfig): { x: number; z: number } {
  let nx = x;
  let nz = z;
  if (isPerimeterColumnPatrol(config)) {
    nx = isWestRacetrackPatrolX(config.waypoints[0][0])
      ? clampWestPatrolX(x, hx)
      : clampEastPatrolX(x, hx);
  } else if (isColumnPatrol(config)) {
    nx = config.waypoints[0][0];
    for (const ax of AISLE_CENTERS_X) {
      if (Math.abs(config.waypoints[0][0] - ax) < 0.35) nx = ax;
    }
    if (config.waypoints.length >= 2) {
      const zLo = Math.min(config.waypoints[0][2], config.waypoints[1][2]);
      const zHi = Math.max(config.waypoints[0][2], config.waypoints[1][2]);
      nz = Math.max(zLo, Math.min(zHi, nz));
    }
  } else {
    nx = clampLoopPatrolX(x, hx, config);
  }
  if (isRowPatrol(config)) {
    nz = snapCrossAisleZ(config.waypoints[0][2]);
    if (config.waypoints.length >= 2) {
      const xLo = Math.min(config.waypoints[0][0], config.waypoints[1][0]);
      const xHi = Math.max(config.waypoints[0][0], config.waypoints[1][0]);
      nx = Math.max(xLo, Math.min(xHi, nx));
    }
  }
  return { x: nx, z: nz };
}

function patrolAxisFor(config: NPCConfig): NpcPatrolAxis {
  if (isColumnPatrol(config)) return 'column';
  if (isRowPatrol(config)) return 'row';
  return 'free';
}

/** Grid patrol — avatar +Z is forward; cart sits at local +Z ahead of handle. */
function gridPatrolHeading(config: NPCConfig, wpIdx: number, dir: number): number | null {
  if (!isColumnPatrol(config) && !isRowPatrol(config)) return null;
  const nextIdx = Math.max(0, Math.min(config.waypoints.length - 1, wpIdx + dir));
  const here = config.waypoints[wpIdx];
  const next = config.waypoints[nextIdx];
  if (isColumnPatrol(config)) {
    const dz = nextIdx === wpIdx ? here[2] - next[2] : next[2] - here[2];
    return dz >= 0 ? 0 : Math.PI;
  }
  const dx = nextIdx === wpIdx ? here[0] - next[0] : next[0] - here[0];
  return dx >= 0 ? Math.PI / 2 : -Math.PI / 2;
}

function applyBodyHeading(body: RapierRigidBody, yaw: number): void {
  body.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), true);
}

/** Same-column traffic — yield behind, reverse on head-on. */
function npcColumnTraffic(
  px: number,
  pz: number,
  toTarget: THREE.Vector3,
  hx: number,
  hz: number,
  selfId: string,
): 'yield' | 'reverse' | false {
  const moveZ = Math.abs(toTarget.z) > Math.abs(toTarget.x);
  if (!moveZ) return false;

  for (const npc of getActiveNpcRuntimes()) {
    if (npc.meta.npcId === selfId) continue;
    const { hx: ohx, hz: ohz } = getNpcHalfExtents(npc.meta.cartLoad);
    if (Math.abs(npc.x - px) > hx + ohx + 0.45) continue;

    const dz = npc.z - pz;
    const close = Math.abs(dz) < hz + ohz + 2.4;
    if (!close) continue;

    const sameDir = toTarget.z > 0 ? dz > 0 : dz < 0;
    if (sameDir) {
      if (npc.speed < 0.12 && Math.abs(dz) < hz + ohz + 1.35) continue;
      return 'yield';
    }

    // Head-on — lower id reverses so the pair breaks stalemates
    if (selfId.localeCompare(npc.meta.npcId) < 0) return 'reverse';
    return 'yield';
  }
  return false;
}

import { ShopperAvatar } from './ShopperAvatar';
import { NPC_BODY_CENTER_Y, SHOPPER_AVATAR_Y_OFFSET } from './npcGrounding';

export function NPC({ config }: NPCProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const waypointIndex = useRef(0);
  const direction = useRef(1);
  const registered = useRef(false);
  const pauseUntil = useRef(0);
  const sampleCooldownUntil = useRef(0);
  const wanderPhase = useRef(hashSeed(config.id) * 0.001);
  const blockedFrames = useRef(0);
  const stuckEscalation = useRef(0);
  const jitterFrames = useRef(0);
  const lastArriveAt = useRef(0);
  const lastProgress = useRef({ x: 0, z: 0, at: 0 });
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

    const applyPosition = (x: number, z: number, speed: number, paused = false, jittering = false) => {
      body.setTranslation({ x, y: NPC_BODY_CENTER_Y, z }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      updateNpcRuntime(body.handle, meta, x, z, speed, paused, jittering);
    };

    let speed = 0;

    let gridPatrol =
      warehouseNpc &&
      config.waypoints.length >= 2 &&
      (isColumnPatrol(config) || isRowPatrol(config));
    if (gridPatrol) {
      const dz = Math.abs(config.waypoints[0][2] - config.waypoints[1][2]);
      const dx = Math.abs(config.waypoints[0][0] - config.waypoints[1][0]);
      if (isColumnPatrol(config) && dz < 2.5) gridPatrol = false;
      if (isRowPatrol(config) && dx < 2.5) gridPatrol = false;
    }

    if (!registered.current) {
      registerNpc(body.handle, meta);
      registered.current = true;
      lastProgress.current = { x: position.x, z: position.z, at: performance.now() };
      if (warehouseNpc) {
        const startWp = config.waypoints[waypointIndex.current];
        applyPosition(startWp[0], startWp[2], 0);
        const heading = gridPatrolHeading(config, waypointIndex.current, direction.current);
        if (heading !== null) applyBodyHeading(body, heading);
      }
    }

    const now = performance.now();
    wanderPhase.current += delta * (1.2 + chaos * 2.4);

    const movedRecently = Math.hypot(position.x - lastProgress.current.x, position.z - lastProgress.current.z);
    if (movedRecently > 0.1) {
      lastProgress.current = { x: position.x, z: position.z, at: now };
    } else if (
      warehouseNpc &&
      now - lastProgress.current.at > 4000 &&
      now >= pauseUntil.current
    ) {
      if (gridPatrol) {
        stuckEscalation.current += 1;
        if (stuckEscalation.current > 2) {
          stuckEscalation.current = 0;
          const farIdx =
            direction.current > 0 ? 0 : config.waypoints.length - 1;
          waypointIndex.current = farIdx;
          const far = config.waypoints[farIdx];
          const snapped = snapPatrolPosition(far[0], far[2], hx, config);
          applyPosition(snapped.x, far[2], 0, false, true);
        } else {
          direction.current *= -1;
          applyPosition(position.x, position.z, 0, true, true);
        }
      } else {
        direction.current *= -1;
        applyPosition(position.x, position.z, 0, true);
      }
      blockedFrames.current = 0;
      jitterFrames.current = 0;
      pauseUntil.current = now + 600 + Math.random() * 400;
      lastProgress.current.at = now;
      return;
    }

    if (now < pauseUntil.current) {
      if (gridPatrol) {
        const heading = gridPatrolHeading(config, waypointIndex.current, direction.current);
        if (heading !== null) applyBodyHeading(body, heading);
      }
      applyPosition(position.x, position.z, 0, true, jitterFrames.current > 4);
      return;
    }

    if (
      warehouseNpc &&
      gridPatrol &&
      isInsideRackFootprint(position.x, position.z, 0.45)
    ) {
      const wp = config.waypoints[waypointIndex.current];
      applyPosition(wp[0], wp[2], 0, true);
      return;
    }

    if (!isColumnPatrol(config) && !isRowPatrol(config) && Math.random() < 0.006 * (0.5 + chaos)) {
      pauseUntil.current = now + 400 + Math.random() * 2200 * chaos;
    }

    if (config.waypoints.length < 2) {
      applyPosition(position.x, position.z, 0);
      return;
    }

    const swarm = warehouseNpc ? useSampleStationStore.getState().getSwarmTarget(config.id) : null;
    let toTarget = new THREE.Vector3();
    let chasingSample = false;
    let swarmDist = Infinity;

    if (swarm && now >= sampleCooldownUntil.current && !gridPatrol && !config.id.startsWith('wh-sample')) {
      const sdx = swarm.x - position.x;
      const sdz = swarm.z - position.z;
      swarmDist = Math.hypot(sdx, sdz);
      const swarmLimit = gridPatrol ? 12 : SAMPLE_SWARM_RADIUS;
      const wantsSample =
        swarmDist < swarmLimit &&
        (config.archetype === 'SAMPLE_HUNTER' ||
          config.obsessiveness > 38 ||
          config.archetype === 'AGGRESSOR');

      if (wantsSample) {
        const approach = sampleApproachPoint(swarm.x, swarm.z, config.id);
        toTarget.set(approach.x - position.x, 0, approach.z - position.z);
        chasingSample = true;
      }
    }

    if (!chasingSample) {
      const target = config.waypoints[waypointIndex.current];
      toTarget.set(target[0] - position.x, 0, target[2] - position.z);
      if (warehouseNpc) axisLockDirection(toTarget, config);
    } else if (warehouseNpc && Math.abs(toTarget.x) > 0.12 && Math.abs(toTarget.z) > 0.12) {
      if (Math.abs(toTarget.x) > Math.abs(toTarget.z)) toTarget.z = 0;
      else toTarget.x = 0;
      if (toTarget.lengthSq() > 1e-8) toTarget.normalize();
    }

    const distance = toTarget.length();
    const arriveThreshold = chasingSample ? 0.55 : gridPatrol ? 0.55 : 0.45 + chaos * 0.35;

    if (!chasingSample && distance < arriveThreshold) {
      if (now - lastArriveAt.current < (gridPatrol ? 600 : 120)) {
        applyPosition(position.x, position.z, 0, true);
        return;
      }
      lastArriveAt.current = now;

      const nextIndex = waypointIndex.current + direction.current;
      if (nextIndex >= config.waypoints.length || nextIndex < 0) {
        direction.current *= -1;
        if (!gridPatrol && Math.random() < 0.25 * chaos) {
          pauseUntil.current = now + 300 + Math.random() * 1200;
        }
      }
      waypointIndex.current = Math.max(
        0,
        Math.min(config.waypoints.length - 1, waypointIndex.current + direction.current),
      );
      if (gridPatrol) {
        pauseUntil.current = now + 180 + Math.random() * 220;
      }
      applyPosition(position.x, position.z, 0, true);
      return;
    }

    if (chasingSample && distance < arriveThreshold) {
      pauseUntil.current = now + 2500 + Math.random() * 2500;
      sampleCooldownUntil.current = now + 6000 + Math.random() * 5000;
      applyPosition(position.x, position.z, 0);
      return;
    }

    if (toTarget.lengthSq() > 1e-8) toTarget.normalize();

    if (!chasingSample && !gridPatrol && blockedFrames.current === 0) {
      const lateral = new THREE.Vector3(-toTarget.z, 0, toTarget.x);
      const wobble = Math.sin(wanderPhase.current) * chaos * 0.08;
      toTarget.addScaledVector(lateral, wobble).normalize();
    }

    const speedJitter =
      0.65 + Math.sin(wanderPhase.current * 1.7) * 0.22 + Math.cos(wanderPhase.current * 0.43) * 0.15;
    const archetypeBoost =
      config.archetype === 'AGGRESSOR' ? 1.25 : config.archetype === 'SAMPLE_HUNTER' ? 0.85 : 1;
    const sampleBoost = chasingSample ? (config.archetype === 'SAMPLE_HUNTER' ? 1.65 : 1.35) : 1;
    speed = config.baseSpeed * speedJitter * archetypeBoost * sampleBoost;

    speed = Math.max(speed, config.baseSpeed * (gridPatrol ? 0.5 : 0.35));

    if (!chasingSample && isColumnPatrol(config) && warehouseNpc) {
      const traffic = npcColumnTraffic(position.x, position.z, toTarget, hx, hz, config.id);
      if (traffic === 'reverse') {
        direction.current *= -1;
        waypointIndex.current = Math.max(
          0,
          Math.min(config.waypoints.length - 1, waypointIndex.current + direction.current),
        );
        pauseUntil.current = now + 700 + Math.random() * 500;
        const hold = snapPatrolPosition(position.x, position.z, hx, config);
        applyPosition(hold.x, hold.z, 0, true);
        return;
      }
      if (traffic === 'yield') {
        pauseUntil.current = now + 450 + Math.random() * 550;
        const hold = snapPatrolPosition(position.x, position.z, hx, config);
        applyPosition(hold.x, hold.z, 0, true);
        return;
      }
    }

    const dt = Math.min(delta, 0.05);
    const dx = toTarget.x * speed * dt;
    const dz = toTarget.z * speed * dt;
    let moveHx = hx;
    let moveHz = hz;
    if (gridPatrol && isRowPatrol(config)) {
      moveHx = hz;
      moveHz = hx;
    }
    const moved = resolveCartMove(position.x, position.z, dx, dz, obstacles, moveHx, moveHz);
    const movedDist = Math.hypot(moved.x - position.x, moved.z - position.z);
    const intentDist = Math.hypot(dx, dz);
    const blocked = moved.blockedX && moved.blockedZ;
    const sliding = !blocked && intentDist > 0.04 && movedDist < intentDist * 0.12;
    const jittering = sliding || (intentDist > 0.03 && movedDist < 0.004);
    const isJittering = jittering && !chasingSample;

    if (jittering && !chasingSample) {
      jitterFrames.current += 1;
    } else {
      jitterFrames.current = 0;
    }

    const shouldRecover =
      !chasingSample && (blocked || jitterFrames.current > 8);
    if (shouldRecover) {
      blockedFrames.current += 1;
      if (blockedFrames.current > 5) {
        blockedFrames.current = 0;
        jitterFrames.current = 0;
        stuckEscalation.current += 1;

        if (gridPatrol) {
          if (stuckEscalation.current > 2) {
            stuckEscalation.current = 0;
            const farIdx =
              direction.current > 0 ? 0 : config.waypoints.length - 1;
            waypointIndex.current = farIdx;
            const far = config.waypoints[farIdx];
            let escapeX = far[0];
            let escapeZ = far[2];
            const snapped = snapPatrolPosition(escapeX, escapeZ, hx, config);
            escapeX = snapped.x;
            applyPosition(escapeX, escapeZ, 0, false, true);
            const heading = gridPatrolHeading(
              config,
              waypointIndex.current,
              direction.current,
            );
            if (heading !== null) applyBodyHeading(body, heading);
            pauseUntil.current = now + 700 + Math.random() * 500;
            return;
          }

          direction.current *= -1;
          waypointIndex.current = Math.max(
            0,
            Math.min(config.waypoints.length - 1, waypointIndex.current + direction.current),
          );
          pauseUntil.current = now + 500 + Math.random() * 400;
          const hold = snapPatrolPosition(position.x, position.z, hx, config);
          applyPosition(hold.x, hold.z, 0, true, true);
          const heading = gridPatrolHeading(config, waypointIndex.current, direction.current);
          if (heading !== null) applyBodyHeading(body, heading);
          return;
        }

        direction.current *= -1;
        waypointIndex.current = Math.max(
          0,
          Math.min(config.waypoints.length - 1, waypointIndex.current + direction.current),
        );

        const target = config.waypoints[waypointIndex.current];
        let escapeX = target[0];
        let escapeZ = target[2];
        if (warehouseNpc) {
          const [tx, , tz] = sanitizeWarehouseWaypoint(target[0], 0, target[2]);
          escapeX = tx;
          escapeZ = tz;
          const snappedEscape = snapPatrolPosition(escapeX, escapeZ, hx, config);
          escapeX = snappedEscape.x;

          if (stuckEscalation.current > 3) {
            stuckEscalation.current = 0;
            escapeX = config.waypoints[0][0];
            if (isWestRacetrackPatrolX(escapeX)) {
              escapeX = westRacetrackPatrolX();
            } else if (isEastRacetrackPatrolX(escapeX)) {
              escapeX = eastRacetrackPatrolX();
            }
            escapeX = snapPatrolPosition(escapeX, escapeZ, hx, config).x;
            const clamped = clampWarehouseNpcPoint(escapeX, tz);
            escapeX = clamped.x;
            escapeZ = clamped.z;
          }
        }

        applyPosition(escapeX, escapeZ, 0);
        pauseUntil.current = now + 1600 + Math.random() * 1200;
        return;
      }
    } else if (!blocked && !jittering) {
      blockedFrames.current = 0;
      stuckEscalation.current = 0;
    }

    if (chasingSample && blocked && (distance < 3.5 || swarmDist < 4.5)) {
      pauseUntil.current = now + 2000 + Math.random() * 2000;
      sampleCooldownUntil.current = now + 5000 + Math.random() * 4000;
      applyPosition(moved.x, moved.z, 0);
      return;
    }

    if (gridPatrol) {
      const heading = gridPatrolHeading(config, waypointIndex.current, direction.current);
      if (heading !== null) applyBodyHeading(body, heading);
    } else if (intentDist > 0.06) {
      applyBodyHeading(body, Math.atan2(toTarget.x, toTarget.z));
    }

    const finalPos = warehouseNpc
      ? snapPatrolPosition(moved.x, moved.z, hx, config)
      : { x: moved.x, z: moved.z };
    const reportSpeed = blocked || isJittering ? 0 : speed;
    applyPosition(finalPos.x, finalPos.z, reportSpeed, now < pauseUntil.current, isJittering);
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
