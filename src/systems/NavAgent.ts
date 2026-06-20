import * as THREE from 'three';
import type { NPCConfig } from '../types/npcConfig';
import { gridPatrolYaw, travelYawFromDirection } from './FacingConvention';
import {
  getActiveNpcRuntimes,
  type NpcPatrolAxis,
} from './npcRegistry';
import {
  SAMPLE_SWARM_RADIUS,
  SAMPLE_KIOSKS,
  sampleApproachPoint,
} from './sampleStations';
import {
  getNpcObstacleExtents,
  resolveCartMove,
  type Aabb,
} from './staticObstacles';
import {
  AISLE_CENTERS_X,
  clampEastPatrolX,
  clampWarehouseNpcPoint,
  clampWestPatrolX,
  eastRacetrackPatrolX,
  isEastRacetrackPatrolX,
  isInsideRackFootprint,
  isWestRacetrackPatrolX,
  sanitizeWarehouseWaypoint,
  snapCrossAisleZ,
  westRacetrackPatrolX,
} from '../components/scene/warehouseLayout';
import { isInsideKioskCore, KIOSK_NO_GO_RADIUS } from './WalkabilityGraph';

export type NavAgentState = 'Patrol' | 'Yield' | 'Recover' | 'OrbitSample';

export interface NavAgentTelemetry {
  state: NavAgentState;
  targetNodeId: string | null;
  netDisplacement5s: number;
  jitterScore: number;
  blockedReason?: string;
}

export interface NavAgentTickInput {
  x: number;
  z: number;
  dt: number;
  now: number;
  warehouseNpc: boolean;
  obstacles: Aabb[];
  selfId: string;
  patrolAxis: NpcPatrolAxis;
  getSwarmTarget: (id: string) => { x: number; z: number } | null;
  playerX: number;
  playerZ: number;
}

export interface NavAgentTickResult {
  x: number;
  z: number;
  speed: number;
  yaw: number | null;
  paused: boolean;
  jittering: boolean;
  telemetry: NavAgentTelemetry;
}

const ORBIT_RING_RADIUS = 2.35;
const ORBIT_ANGULAR_SPEED = 0.55;

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

function isColumnPatrol(config: NPCConfig): boolean {
  const col = config.waypoints[0][0];
  return config.waypoints.every((wp) => Math.abs(wp[0] - col) < 0.35);
}

function isRowPatrol(config: NPCConfig): boolean {
  const row = config.waypoints[0][2];
  return config.waypoints.every((wp) => Math.abs(wp[2] - row) < 0.35);
}

function isPerimeterColumnPatrol(config: NPCConfig): boolean {
  if (!isColumnPatrol(config)) return false;
  const col = config.waypoints[0][0];
  return isWestRacetrackPatrolX(col) || isEastRacetrackPatrolX(col);
}

function clampLoopPatrolX(x: number, hx: number, config: NPCConfig): number {
  if (config.waypoints.length < 2) return x;
  const col = config.waypoints[0][0];
  if (Math.abs(col - config.waypoints[1][0]) > 0.25) return x;
  if (isWestRacetrackPatrolX(col)) return clampWestPatrolX(x, hx);
  if (isEastRacetrackPatrolX(col)) return clampEastPatrolX(x, hx);
  return x;
}

function snapPatrolPosition(
  x: number,
  z: number,
  hx: number,
  config: NPCConfig,
): { x: number; z: number } {
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

function axisLockDirection(toTarget: THREE.Vector3, config: NPCConfig): void {
  if (isColumnPatrol(config)) toTarget.x = 0;
  else if (isRowPatrol(config)) toTarget.z = 0;
  else if (Math.abs(toTarget.x) > 0.12 && Math.abs(toTarget.z) > 0.12) {
    if (Math.abs(toTarget.x) > Math.abs(toTarget.z)) toTarget.z = 0;
    else toTarget.x = 0;
  }
  if (toTarget.lengthSq() > 1e-8) toTarget.normalize();
}

function npcColumnTraffic(
  px: number,
  pz: number,
  toTarget: THREE.Vector3,
  hx: number,
  hz: number,
  selfId: string,
): 'yield' | 'reverse' | false {
  if (Math.abs(toTarget.z) <= Math.abs(toTarget.x)) return false;
  for (const npc of getActiveNpcRuntimes()) {
    if (npc.meta.npcId === selfId) continue;
    const ohx = getNpcObstacleExtents(npc.meta.cartLoad, npc.meta.patrolAxis ?? 'free').hx;
    const ohz = getNpcObstacleExtents(npc.meta.cartLoad, npc.meta.patrolAxis ?? 'free').hz;
    if (Math.abs(npc.x - px) > hx + ohx + 0.45) continue;
    const dz = npc.z - pz;
    if (Math.abs(dz) >= hz + ohz + 2.4) continue;
    const sameDir = toTarget.z > 0 ? dz > 0 : dz < 0;
    if (sameDir) {
      if (npc.speed < 0.12 && Math.abs(dz) < hz + ohz + 1.35) continue;
      return 'yield';
    }
    if (selfId.localeCompare(npc.meta.npcId) < 0) return 'reverse';
    return 'yield';
  }
  return false;
}

function sampleKioskFor(config: NPCConfig) {
  if (!config.id.startsWith('wh-sample-')) return null;
  const kioskId = config.id.slice('wh-sample-'.length);
  return SAMPLE_KIOSKS.find((k) => k.id === kioskId) ?? null;
}

function targetNodeLabel(x: number, z: number): string {
  return `${x.toFixed(2)}@${z.toFixed(2)}`;
}

export class NavAgent {
  readonly config: NPCConfig;
  readonly chaos: number;
  readonly seed: number;

  waypointIndex = 0;
  direction = 1;
  pauseUntil = 0;
  sampleCooldownUntil = 0;
  wanderPhase = 0;
  blockedFrames = 0;
  stuckEscalation = 0;
  jitterFrames = 0;
  lastArriveAt = 0;
  orbitAngle = 0;
  orbitDir = 1;
  lastProgressAt = 0;

  private anchorAt = 0;
  private displacementSamples: { x: number; z: number; at: number }[] = [];

  constructor(config: NPCConfig) {
    this.config = config;
    this.seed = hashSeed(config.id);
    this.chaos = config.chaos ?? 0.45 + (this.seed % 7) * 0.08;
    this.wanderPhase = this.seed * 0.001;
    this.orbitAngle = (Math.abs(this.seed) % 360) * (Math.PI / 180);
    this.orbitDir = this.seed % 2 === 0 ? 1 : -1;
  }

  initPosition(_x: number, _z: number, now: number): void {
    this.anchorAt = now;
    this.lastProgressAt = now;
  }

  private recordDisplacement(x: number, z: number, now: number): number {
    this.displacementSamples.push({ x, z, at: now });
    const cutoff = now - 5000;
    this.displacementSamples = this.displacementSamples.filter((s) => s.at >= cutoff);
    const oldest = this.displacementSamples[0];
    if (!oldest) return 0;
    return Math.hypot(x - oldest.x, z - oldest.z);
  }

  private gridPatrolEnabled(warehouseNpc: boolean): boolean {
    if (!warehouseNpc || this.config.waypoints.length < 2) return false;
    if (!isColumnPatrol(this.config) && !isRowPatrol(this.config)) return false;
    const dz = Math.abs(this.config.waypoints[0][2] - this.config.waypoints[1][2]);
    const dx = Math.abs(this.config.waypoints[0][0] - this.config.waypoints[1][0]);
    if (isColumnPatrol(this.config) && dz < 2.5) return false;
    if (isRowPatrol(this.config) && dx < 2.5) return false;
    return true;
  }

  tick(input: NavAgentTickInput): NavAgentTickResult {
    const { config } = this;
    const { hx, hz } = getNpcObstacleExtents(config.cartLoad, input.patrolAxis);
    const gridPatrol = this.gridPatrolEnabled(input.warehouseNpc);
    let state: NavAgentState = 'Patrol';
    let blockedReason: string | undefined;
    let targetNodeId: string | null = null;
    let x = input.x;
    let z = input.z;
    let speed = 0;
    let yaw: number | null = null;
    let paused = false;
    let jittering = false;

    const netDisplacement5s = this.recordDisplacement(x, z, input.now);

    const finish = (): NavAgentTickResult => ({
      x,
      z,
      speed,
      yaw,
      paused,
      jittering,
      telemetry: {
        state,
        targetNodeId,
        netDisplacement5s,
        jitterScore: this.jitterFrames,
        blockedReason,
      },
    });

    const kiosk = sampleKioskFor(config);
    if (kiosk && input.warehouseNpc && !(config.archetype === 'SAMPLE_HUNTER' && gridPatrol)) {
      const distKiosk = Math.hypot(x - kiosk.x, z - kiosk.z);
      if (distKiosk < 6.5 && distKiosk > KIOSK_NO_GO_RADIUS + 0.25) {
        state = 'OrbitSample';
        this.orbitAngle += input.dt * ORBIT_ANGULAR_SPEED * this.orbitDir;
        const ox = kiosk.x + Math.cos(this.orbitAngle) * ORBIT_RING_RADIUS;
        const oz = kiosk.z + Math.sin(this.orbitAngle) * ORBIT_RING_RADIUS;
        if (isInsideKioskCore(ox, oz)) {
          blockedReason = 'kiosk';
        } else {
          const toOrbit = new THREE.Vector3(ox - x, 0, oz - z);
          if (toOrbit.lengthSq() > 1e-6) {
            toOrbit.normalize();
            speed = config.baseSpeed * 0.75;
            const moved = resolveCartMove(
              x,
              z,
              toOrbit.x * speed * input.dt,
              toOrbit.z * speed * input.dt,
              input.obstacles,
              hx,
              hz,
            );
            const snapped = snapPatrolPosition(moved.x, moved.z, hx, config);
            x = snapped.x;
            z = snapped.z;
            yaw = travelYawFromDirection(toOrbit.x, toOrbit.z);
            targetNodeId = `orbit:${kiosk.id}`;
          }
        }
        return finish();
      }
      if (distKiosk <= KIOSK_NO_GO_RADIUS + 0.25) {
        state = 'Recover';
        blockedReason = 'kiosk';
        const pushX = x - kiosk.x;
        const pushZ = z - kiosk.z;
        const pushLen = Math.hypot(pushX, pushZ) || 1;
        x = kiosk.x + (pushX / pushLen) * (ORBIT_RING_RADIUS + 0.15);
        z = kiosk.z + (pushZ / pushLen) * (ORBIT_RING_RADIUS + 0.15);
        yaw = travelYawFromDirection(pushX, pushZ);
        return finish();
      }
    }

    if (
      input.warehouseNpc &&
      gridPatrol &&
      input.now - this.anchorAt > 4000 &&
      input.now >= this.pauseUntil &&
      netDisplacement5s < 0.4
    ) {
      state = 'Recover';
      this.stuckEscalation += 1;
      if (this.stuckEscalation > 2) {
        this.stuckEscalation = 0;
        this.waypointIndex = this.direction > 0 ? 0 : config.waypoints.length - 1;
        const far = config.waypoints[this.waypointIndex];
        const snapped = snapPatrolPosition(far[0], far[2], hx, config);
        x = snapped.x;
        z = far[2];
        jittering = true;
      } else {
        this.direction *= -1;
        paused = true;
        jittering = true;
      }
      this.pauseUntil = input.now + 600 + Math.random() * 400;
      this.anchorAt = input.now;
      yaw = gridPatrolYaw(config, this.waypointIndex, this.direction);
      return finish();
    }

    if (input.now < this.pauseUntil) {
      state = 'Yield';
      paused = true;
      jittering = this.jitterFrames > 4;
      yaw = gridPatrol ? gridPatrolYaw(config, this.waypointIndex, this.direction) : null;
      return finish();
    }

    if (input.warehouseNpc && gridPatrol && isInsideRackFootprint(x, z, 0.45)) {
      state = 'Recover';
      blockedReason = 'rack';
      if (isRowPatrol(config)) {
        const xEnds = config.waypoints.map((wp) => wp[0]);
        const nearest = xEnds.reduce((best, tx) =>
          Math.abs(tx - x) < Math.abs(best - x) ? tx : best, xEnds[0]);
        x = nearest;
        z = config.waypoints[0][2];
      } else {
        const wp = config.waypoints[this.waypointIndex];
        x = wp[0];
        z = wp[2];
      }
      paused = true;
      return finish();
    }

    if (!isColumnPatrol(config) && !isRowPatrol(config) && Math.random() < 0.006 * (0.5 + this.chaos)) {
      this.pauseUntil = input.now + 400 + Math.random() * 2200 * this.chaos;
    }

    if (config.waypoints.length < 2) return finish();

    const swarm = input.warehouseNpc ? input.getSwarmTarget(config.id) : null;
    const toTarget = new THREE.Vector3();
    let chasingSample = false;
    let swarmDist = Infinity;

    if (swarm && input.now >= this.sampleCooldownUntil && !gridPatrol && !config.id.startsWith('wh-sample')) {
      const sdx = swarm.x - x;
      const sdz = swarm.z - z;
      swarmDist = Math.hypot(sdx, sdz);
      const swarmLimit = gridPatrol ? 12 : SAMPLE_SWARM_RADIUS;
      const wantsSample =
        swarmDist < swarmLimit &&
        (config.archetype === 'SAMPLE_HUNTER' ||
          config.obsessiveness > 38 ||
          config.archetype === 'AGGRESSOR');
      if (wantsSample) {
        const approach = sampleApproachPoint(swarm.x, swarm.z, config.id);
        toTarget.set(approach.x - x, 0, approach.z - z);
        chasingSample = true;
        targetNodeId = `sample:${swarm.x.toFixed(1)},${swarm.z.toFixed(1)}`;
      }
    }

    if (!chasingSample) {
      const target = config.waypoints[this.waypointIndex];
      toTarget.set(target[0] - x, 0, target[2] - z);
      targetNodeId = targetNodeLabel(target[0], target[2]);
      if (input.warehouseNpc) axisLockDirection(toTarget, config);
    } else if (input.warehouseNpc && Math.abs(toTarget.x) > 0.12 && Math.abs(toTarget.z) > 0.12) {
      if (Math.abs(toTarget.x) > Math.abs(toTarget.z)) toTarget.z = 0;
      else toTarget.x = 0;
      if (toTarget.lengthSq() > 1e-8) toTarget.normalize();
    }

    const distance = toTarget.length();
    const arriveThreshold = chasingSample ? 0.55 : gridPatrol ? 0.55 : 0.45 + this.chaos * 0.35;
    const junctionStall =
      !chasingSample &&
      gridPatrol &&
      distance < 1.2 &&
      distance >= arriveThreshold &&
      (this.jitterFrames > 5 || this.blockedFrames > 2);

    if (!chasingSample && (distance < arriveThreshold || junctionStall)) {
      if (input.now - this.lastArriveAt < (gridPatrol ? 600 : 120)) {
        paused = true;
        yaw = gridPatrol ? gridPatrolYaw(config, this.waypointIndex, this.direction) : null;
        return finish();
      }
      this.lastArriveAt = input.now;
      const nextIndex = this.waypointIndex + this.direction;
      if (nextIndex >= config.waypoints.length || nextIndex < 0) {
        this.direction *= -1;
        if (!gridPatrol && Math.random() < 0.25 * this.chaos) {
          this.pauseUntil = input.now + 300 + Math.random() * 1200;
        }
      }
      this.waypointIndex = Math.max(
        0,
        Math.min(config.waypoints.length - 1, this.waypointIndex + this.direction),
      );
      if (gridPatrol) this.pauseUntil = input.now + 80 + Math.random() * 100;
      paused = true;
      yaw = gridPatrol ? gridPatrolYaw(config, this.waypointIndex, this.direction) : null;
      return finish();
    }

    if (chasingSample && distance < arriveThreshold) {
      this.pauseUntil = input.now + 2500 + Math.random() * 2500;
      this.sampleCooldownUntil = input.now + 6000 + Math.random() * 5000;
      return finish();
    }

    if (toTarget.lengthSq() > 1e-8) toTarget.normalize();

    if (!chasingSample && !gridPatrol && this.blockedFrames === 0) {
      const lateral = new THREE.Vector3(-toTarget.z, 0, toTarget.x);
      const wobble = Math.sin(this.wanderPhase) * this.chaos * 0.08;
      toTarget.addScaledVector(lateral, wobble).normalize();
    }

    this.wanderPhase += input.dt * (1.2 + this.chaos * 2.4);

    const speedJitter =
      0.65 + Math.sin(this.wanderPhase * 1.7) * 0.22 + Math.cos(this.wanderPhase * 0.43) * 0.15;
    const archetypeBoost =
      config.archetype === 'AGGRESSOR' ? 1.25 : config.archetype === 'SAMPLE_HUNTER' ? 0.85 : 1;
    const sampleBoost = chasingSample ? (config.archetype === 'SAMPLE_HUNTER' ? 1.65 : 1.35) : 1;
    speed = config.baseSpeed * speedJitter * archetypeBoost * sampleBoost;
    speed = Math.max(speed, config.baseSpeed * (gridPatrol ? 0.5 : 0.35));

    if (!chasingSample && isColumnPatrol(config) && input.warehouseNpc) {
      const traffic = npcColumnTraffic(x, z, toTarget, hx, hz, config.id);
      if (traffic === 'reverse') {
        state = 'Yield';
        this.direction *= -1;
        this.waypointIndex = Math.max(
          0,
          Math.min(config.waypoints.length - 1, this.waypointIndex + this.direction),
        );
        this.pauseUntil = input.now + 700 + Math.random() * 500;
        const hold = snapPatrolPosition(x, z, hx, config);
        x = hold.x;
        z = hold.z;
        paused = true;
        blockedReason = 'npc';
        yaw = gridPatrolYaw(config, this.waypointIndex, this.direction);
        return finish();
      }
      if (traffic === 'yield') {
        state = 'Yield';
        this.pauseUntil = input.now + 450 + Math.random() * 550;
        const hold = snapPatrolPosition(x, z, hx, config);
        x = hold.x;
        z = hold.z;
        paused = true;
        blockedReason = 'npc';
        yaw = gridPatrolYaw(config, this.waypointIndex, this.direction);
        return finish();
      }
    }

    let moveHx = hx;
    let moveHz = hz;
    if (gridPatrol && isRowPatrol(config)) {
      moveHx = hz;
      moveHz = hx;
    }
    const dx = toTarget.x * speed * input.dt;
    const dz = toTarget.z * speed * input.dt;
    const moved = resolveCartMove(x, z, dx, dz, input.obstacles, moveHx, moveHz);
    const movedDist = Math.hypot(moved.x - x, moved.z - z);
    const intentDist = Math.hypot(dx, dz);
    const blocked = moved.blockedX && moved.blockedZ;
    const sliding = !blocked && intentDist > 0.04 && movedDist < intentDist * 0.12;
    const isJittering = (sliding || (intentDist > 0.03 && movedDist < 0.004)) && !chasingSample;

    if (isJittering) this.jitterFrames += 1;
    else this.jitterFrames = 0;

    const shouldRecover = !chasingSample && (blocked || this.jitterFrames > 8);
    if (shouldRecover) {
      state = 'Recover';
      this.blockedFrames += 1;
      blockedReason = blocked ? 'rack' : 'kiosk';
      if (this.blockedFrames > 5) {
        this.blockedFrames = 0;
        this.jitterFrames = 0;
        this.stuckEscalation += 1;

        if (gridPatrol) {
          if (this.stuckEscalation > 2) {
            this.stuckEscalation = 0;
            this.waypointIndex = this.direction > 0 ? 0 : config.waypoints.length - 1;
            const far = config.waypoints[this.waypointIndex];
            const snapped = snapPatrolPosition(far[0], far[2], hx, config);
            x = snapped.x;
            z = far[2];
            jittering = true;
          } else {
            this.direction *= -1;
            this.waypointIndex = Math.max(
              0,
              Math.min(config.waypoints.length - 1, this.waypointIndex + this.direction),
            );
            this.pauseUntil = input.now + 500 + Math.random() * 400;
            const hold = snapPatrolPosition(x, z, hx, config);
            x = hold.x;
            z = hold.z;
            paused = true;
            jittering = true;
          }
          yaw = gridPatrolYaw(config, this.waypointIndex, this.direction);
          return finish();
        }

        this.direction *= -1;
        this.waypointIndex = Math.max(
          0,
          Math.min(config.waypoints.length - 1, this.waypointIndex + this.direction),
        );
        const target = config.waypoints[this.waypointIndex];
        let escapeX = target[0];
        let escapeZ = target[2];
        if (input.warehouseNpc) {
          const [tx, , tz] = sanitizeWarehouseWaypoint(target[0], 0, target[2]);
          escapeX = snapPatrolPosition(tx, tz, hx, config).x;
          if (this.stuckEscalation > 3) {
            this.stuckEscalation = 0;
            escapeX = config.waypoints[0][0];
            if (isWestRacetrackPatrolX(escapeX)) escapeX = westRacetrackPatrolX();
            else if (isEastRacetrackPatrolX(escapeX)) escapeX = eastRacetrackPatrolX();
            escapeX = snapPatrolPosition(escapeX, escapeZ, hx, config).x;
            const clamped = clampWarehouseNpcPoint(escapeX, tz);
            escapeX = clamped.x;
            escapeZ = clamped.z;
          } else {
            escapeZ = tz;
          }
        }
        x = escapeX;
        z = escapeZ;
        this.pauseUntil = input.now + 1600 + Math.random() * 1200;
        return finish();
      }
    } else if (!blocked && !isJittering) {
      this.blockedFrames = 0;
      this.stuckEscalation = 0;
    }

    if (chasingSample && blocked && (distance < 3.5 || swarmDist < 4.5)) {
      this.pauseUntil = input.now + 2000 + Math.random() * 2000;
      this.sampleCooldownUntil = input.now + 5000 + Math.random() * 4000;
      x = moved.x;
      z = moved.z;
      return finish();
    }

    if (movedDist > 0.025) {
      this.lastProgressAt = input.now;
    } else if (
      !chasingSample &&
      gridPatrol &&
      distance > arriveThreshold &&
      input.now - this.lastProgressAt > 2500
    ) {
      this.lastProgressAt = input.now;
      this.blockedFrames = 0;
      this.jitterFrames = 0;
      this.direction *= -1;
      this.waypointIndex = Math.max(
        0,
        Math.min(config.waypoints.length - 1, this.waypointIndex + this.direction),
      );
      this.pauseUntil = input.now;
      blockedReason = 'junction';
      yaw = gridPatrolYaw(config, this.waypointIndex, this.direction);
      const hold = snapPatrolPosition(x, z, hx, config);
      x = hold.x;
      z = hold.z;
      return finish();
    }

    if (gridPatrol) {
      yaw = gridPatrolYaw(config, this.waypointIndex, this.direction);
    } else if (intentDist > 0.06) {
      yaw = travelYawFromDirection(toTarget.x, toTarget.z);
    }

    const finalPos = input.warehouseNpc
      ? snapPatrolPosition(moved.x, moved.z, hx, config)
      : { x: moved.x, z: moved.z };
    x = finalPos.x;
    z = finalPos.z;
    speed = blocked || isJittering ? 0 : speed;
    paused = input.now < this.pauseUntil;
    jittering = isJittering;

    if (movedDist > 0.1) {
      this.anchorAt = input.now;
    }

    return finish();
  }
}
