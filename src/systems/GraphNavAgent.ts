import type { NPCConfig } from '../types/npcConfig';
import { travelYawFromDirection } from './FacingConvention';
import {
  buildWalkabilityGraph,
  type WalkGraph,
  type WalkGraphNode,
} from './WalkabilityGraph';
import type {
  NavAgentState,
  NavAgentTickInput,
  NavAgentTickResult,
} from './NavAgent';
import {
  getNpcHalfExtents,
  getWarehouseObstacles,
  resolveCartMove,
} from './staticObstacles';

/**
 * Graph-driven shopper navigation.
 *
 * NPCs walk the precomputed WalkabilityGraph node→node. Every node and edge is
 * already validated clear of racks and kiosks, so there is no rack/kiosk
 * collision to recover from, and shoppers do not treat each other as obstacles
 * (player bumps come from `npcBumps.ts`). That structurally removes the
 * column×row intersection deadlocks that plagued the old waypoint agent — there
 * is simply nothing to get stuck on.
 *
 * Sample hunters break off the graph to orbit a live kiosk (the crowd/swarm),
 * then rejoin patrol when the sample goes on cooldown.
 */

const ARRIVE = 0.3;
const ORBIT_RING_RADIUS = 2.35;
const ORBIT_ANGULAR_SPEED = 0.65;
/** Distance to a live kiosk at which a hunter switches from approach to orbit.
 *  The nearest graph nodes flanking a kiosk sit ~5.5m out, so this must clear that. */
const ORBIT_ENTER_DIST = 6.5;

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

interface DispSample {
  x: number;
  z: number;
  at: number;
}

export class GraphNavAgent {
  readonly config: NPCConfig;
  readonly seed: number;
  readonly chaos: number;

  private graph: WalkGraph;
  private currentId: string;
  private prevId: string | null = null;
  private targetId: string | null = null;
  private pauseUntil = 0;
  private stuckAnchorX = 0;
  private stuckAnchorZ = 0;
  private stuckAnchorAt = 0;
  private anchoredTarget: string | null = null;
  private orbitAngle: number;
  private orbitDir: number;
  private rngState: number;
  private samples: DispSample[] = [];

  constructor(config: NPCConfig) {
    this.config = config;
    this.seed = hashSeed(config.id);
    this.chaos = config.chaos ?? 0.4;
    this.graph = buildWalkabilityGraph();
    const start = config.waypoints[0] ?? [0, 0, 0];
    this.currentId = this.nearestNodeId(start[0], start[2]);
    this.rngState = (this.seed >>> 0) || 1;
    this.orbitAngle = (Math.abs(this.seed) % 360) * (Math.PI / 180);
    this.orbitDir = this.seed % 2 === 0 ? 1 : -1;
  }

  /** No-op — start node is resolved in the constructor. Kept for NavAgent parity. */
  initPosition(_x: number, _z: number, _now: number): void {}

  /** Spawn position (graph node) so NPC.tsx can place the body exactly on-graph. */
  startPosition(): { x: number; z: number } {
    const node = this.graph.nodeById.get(this.currentId);
    if (node) return { x: node.x, z: node.z };
    const wp = this.config.waypoints[0] ?? [0, 0, 0];
    return { x: wp[0], z: wp[2] };
  }

  private rng(): number {
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 0xffffffff;
  }

  private node(id: string | null): WalkGraphNode | undefined {
    return id ? this.graph.nodeById.get(id) : undefined;
  }

  private neighbors(id: string): string[] {
    return this.graph.adjacency.get(id) ?? [];
  }

  private nearestNodeId(x: number, z: number): string {
    let bestId = this.graph.nodes[0]?.id ?? '';
    let bestDist = Infinity;
    for (const n of this.graph.nodes) {
      if ((this.graph.adjacency.get(n.id)?.length ?? 0) === 0) continue;
      const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
      if (d < bestDist) {
        bestDist = d;
        bestId = n.id;
      }
    }
    return bestId;
  }

  /** Random neighbour, avoiding an immediate U-turn unless it's a dead end. */
  private pickPatrolTarget(): string | null {
    const nbrs = this.neighbors(this.currentId);
    if (nbrs.length === 0) return null;
    const forward = nbrs.filter((n) => n !== this.prevId);
    const pool = forward.length > 0 ? forward : nbrs;
    return pool[Math.floor(this.rng() * pool.length)] ?? null;
  }

  /** Neighbour that most reduces distance to (tx,tz) — greedy descent toward a kiosk. */
  private greedyTarget(tx: number, tz: number): string | null {
    const nbrs = this.neighbors(this.currentId);
    if (nbrs.length === 0) return null;
    const here = this.node(this.currentId);
    const hereDist = here ? (here.x - tx) ** 2 + (here.z - tz) ** 2 : Infinity;
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const id of nbrs) {
      const n = this.node(id);
      if (!n) continue;
      const d = (n.x - tx) ** 2 + (n.z - tz) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    // If no neighbour is closer than where we stand, we've arrived as near as the graph allows.
    if (bestDist >= hereDist) return null;
    return bestId;
  }

  private recordDisplacement(x: number, z: number, now: number): number {
    this.samples.push({ x, z, at: now });
    const cutoff = now - 5000;
    while (this.samples.length > 0 && this.samples[0].at < cutoff) this.samples.shift();
    const oldest = this.samples[0];
    if (!oldest) return 0;
    return Math.hypot(x - oldest.x, z - oldest.z);
  }

  private travelSpeed(): number {
    const a = this.config.archetype;
    const boost = a === 'AGGRESSOR' ? 1.18 : a === 'SAMPLE_HUNTER' ? 0.95 : 1;
    return this.config.baseSpeed * boost;
  }

  private result(
    x: number,
    z: number,
    speed: number,
    yaw: number | null,
    paused: boolean,
    state: NavAgentState,
    targetNodeId: string | null,
    net: number,
  ): NavAgentTickResult {
    return {
      x,
      z,
      speed,
      yaw,
      paused,
      jittering: false,
      telemetry: {
        state,
        targetNodeId,
        netDisplacement5s: net,
        jitterScore: 0,
        blockedReason: undefined,
      },
    };
  }

  tick(input: NavAgentTickInput): NavAgentTickResult {
    const net = this.recordDisplacement(input.x, input.z, input.now);

    const swarm = input.warehouseNpc ? input.getSwarmTarget(this.config.id) : null;
    const a = this.config.archetype;
    const wantsSample =
      !!swarm && (a === 'SAMPLE_HUNTER' || this.config.obsessiveness > 55);

    if (swarm && wantsSample) {
      return this.tickSwarm(input, swarm, net);
    }
    return this.tickPatrol(input, net);
  }

  private tickPatrol(input: NavAgentTickInput, net: number): NavAgentTickResult {
    const x = input.x;
    const z = input.z;

    if (input.now < this.pauseUntil) {
      return this.result(x, z, 0, null, true, 'Yield', this.targetId, net);
    }

    if (!this.targetId) {
      this.targetId = this.pickPatrolTarget();
      if (!this.targetId) {
        // Orphan/dead node — should not happen on a validated graph; hold position.
        return this.result(x, z, 0, null, true, 'Yield', null, net);
      }
    }

    const target = this.node(this.targetId);
    if (!target) {
      this.targetId = null;
      return this.result(x, z, 0, null, true, 'Yield', null, net);
    }

    const dx = target.x - x;
    const dz = target.z - z;
    const dist = Math.hypot(dx, dz);
    const speed = this.travelSpeed();
    const step = speed * input.dt;

    if (dist <= Math.max(step, ARRIVE)) {
      this.prevId = this.currentId;
      this.currentId = this.targetId;
      this.targetId = null;
      if (this.rng() < 0.16 * (0.5 + this.chaos)) {
        this.pauseUntil = input.now + 250 + this.rng() * 900 * this.chaos;
      }
      const yaw =
        Math.abs(dx) > 1e-4 || Math.abs(dz) > 1e-4 ? travelYawFromDirection(dx, dz) : null;
      return this.result(target.x, target.z, speed, yaw, false, 'Patrol', this.currentId, net);
    }

    this.trackAnchor(x, z, input.now);
    const inv = 1 / dist;
    const moved = this.slideMove(x, z, dx * inv * step, dz * inv * step);

    if (this.wedged(moved.x, moved.z, input.now)) {
      const home = this.retreatToNode(moved.x, moved.z);
      return this.result(home.x, home.z, 0, null, true, 'Recover', this.currentId, net);
    }

    return this.result(
      moved.x,
      moved.z,
      speed,
      travelYawFromDirection(dx, dz),
      false,
      'Patrol',
      this.targetId,
      net,
    );
  }

  /**
   * Move while sliding along static rack/wall geometry — a hard backstop so a
   * body can never enter a rack, even on the diagonal hops a hunter makes when
   * breaking toward or leaving a kiosk. Static-only: shoppers still pass through
   * each other (bumps come from npcBumps), so this can't deadlock.
   */
  private slideMove(x: number, z: number, mx: number, mz: number): { x: number; z: number } {
    const { hx: shortH, hz: longH } = getNpcHalfExtents(this.config.cartLoad);
    const movingX = Math.abs(mx) >= Math.abs(mz);
    const moveHx = movingX ? longH : shortH;
    const moveHz = movingX ? shortH : longH;
    const r = resolveCartMove(x, z, mx, mz, getWarehouseObstacles(), moveHx, moveHz);
    return { x: r.x, z: r.z };
  }

  /** Re-anchor whenever the target changes, so wedge detection measures the
   *  current leg, not a stale one. */
  private trackAnchor(x: number, z: number, now: number): void {
    if (this.anchoredTarget !== this.targetId) {
      this.anchoredTarget = this.targetId;
      this.stuckAnchorX = x;
      this.stuckAnchorZ = z;
      this.stuckAnchorAt = now;
    }
  }

  /** True once the body has made no net headway for ~1s (jitter or hard wedge). */
  private wedged(x: number, z: number, now: number): boolean {
    const net = Math.hypot(x - this.stuckAnchorX, z - this.stuckAnchorZ);
    if (net > 0.5) {
      this.stuckAnchorX = x;
      this.stuckAnchorZ = z;
      this.stuckAnchorAt = now;
      return false;
    }
    return now - this.stuckAnchorAt > 900;
  }

  /** Retreat to the nearest clear node and avoid re-picking the blocked edge. */
  private retreatToNode(x: number, z: number): { x: number; z: number } {
    this.prevId = this.targetId;
    this.currentId = this.nearestNodeId(x, z);
    this.targetId = null;
    this.anchoredTarget = null;
    const home = this.node(this.currentId);
    return home ? { x: home.x, z: home.z } : { x, z };
  }

  private tickSwarm(
    input: NavAgentTickInput,
    swarm: { x: number; z: number },
    net: number,
  ): NavAgentTickResult {
    const x = input.x;
    const z = input.z;
    const distKiosk = Math.hypot(x - swarm.x, z - swarm.z);

    // Close enough → orbit the kiosk ring (rack-aware so corners never clip steel).
    if (distKiosk <= ORBIT_ENTER_DIST) {
      this.orbitAngle += input.dt * ORBIT_ANGULAR_SPEED * this.orbitDir;
      const ox = swarm.x + Math.cos(this.orbitAngle) * ORBIT_RING_RADIUS;
      const oz = swarm.z + Math.sin(this.orbitAngle) * ORBIT_RING_RADIUS;
      const dx = ox - x;
      const dz = oz - z;
      const speed = this.config.baseSpeed * 0.8;
      const { hx, hz } = getNpcHalfExtents(this.config.cartLoad);
      const moved = resolveCartMove(
        x,
        z,
        dx,
        dz,
        getWarehouseObstacles(),
        hx,
        hz,
      );
      // Keep the graph anchor synced so patrol resumes cleanly once the sample is taken.
      this.currentId = this.nearestNodeId(moved.x, moved.z);
      this.prevId = null;
      this.targetId = null;
      const yaw =
        Math.abs(dx) > 1e-4 || Math.abs(dz) > 1e-4 ? travelYawFromDirection(dx, dz) : null;
      return this.result(
        moved.x,
        moved.z,
        speed,
        yaw,
        false,
        'OrbitSample',
        `sample:${swarm.x.toFixed(1)},${swarm.z.toFixed(1)}`,
        net,
      );
    }

    // Otherwise greedily walk the graph toward the kiosk.
    if (this.targetId) {
      const cur = this.node(this.targetId);
      if (cur && Math.hypot(cur.x - x, cur.z - z) <= ARRIVE) {
        this.prevId = this.currentId;
        this.currentId = this.targetId;
        this.targetId = null;
      }
    }
    if (!this.targetId) {
      this.targetId = this.greedyTarget(swarm.x, swarm.z);
    }

    const targetId = this.targetId;
    const target = this.node(targetId);
    if (!targetId || !target) {
      // As close as the graph allows but still > orbit range — dwell briefly.
      return this.result(x, z, 0, null, true, 'Yield', targetId, net);
    }

    const dx = target.x - x;
    const dz = target.z - z;
    const dist = Math.hypot(dx, dz) || 1;
    const speed = this.travelSpeed() * 1.1;
    const step = speed * input.dt;

    if (dist <= Math.max(step, ARRIVE)) {
      this.prevId = this.currentId;
      this.currentId = targetId;
      this.targetId = null;
      return this.result(
        target.x,
        target.z,
        speed,
        travelYawFromDirection(dx, dz),
        false,
        'Patrol',
        this.currentId,
        net,
      );
    }

    this.trackAnchor(x, z, input.now);
    const inv = 1 / dist;
    const moved = this.slideMove(x, z, dx * inv * step, dz * inv * step);

    if (this.wedged(moved.x, moved.z, input.now)) {
      this.retreatToNode(moved.x, moved.z);
      return this.result(moved.x, moved.z, 0, null, true, 'Recover', this.currentId, net);
    }

    return this.result(
      moved.x,
      moved.z,
      speed,
      travelYawFromDirection(dx, dz),
      false,
      'Patrol',
      this.targetId,
      net,
    );
  }
}
