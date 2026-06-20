import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { useGameStore } from '../../stores/gameStore';
import { NPC, type NPCConfig } from './NPC';
import { CROSSWALK } from './parkingLotLayout';
import { SAMPLE_KIOSKS } from '../../systems/sampleStations';
import { AISLE_CENTERS_X, QUEST_SHELF_POSITIONS, clampWarehouseWaypoint, eastRacetrackPatrolX, isColumnPathWalkable, isNearWarehouseEntry, loopPatrolLaneZs, snapCrossAisleZ, westRacetrackPatrolX } from './warehouseLayout';
import { getNpcHalfExtents, getWarehouseObstacles } from '../../systems/staticObstacles';

const DEFAULT_CULL_DISTANCE = 28;
const DEFAULT_WAKE_DISTANCE = 32;
/** Global walk-speed multiplier for all shoppers. */
const NPC_SPEED_MUL = 1.85;

interface CulledNPCProps {
  config: NPCConfig;
  cullDistance?: number;
  wakeDistance?: number;
  alwaysActiveInGauntlet?: boolean;
}

export function CulledNPC({
  config,
  cullDistance = DEFAULT_CULL_DISTANCE,
  wakeDistance = DEFAULT_WAKE_DISTANCE,
  alwaysActiveInGauntlet = false,
}: CulledNPCProps) {
  const [active, setActive] = useState(alwaysActiveInGauntlet);
  const lastCheck = useRef(0);
  const anchor = useRef(new THREE.Vector3(...config.waypoints[0]));
  const phase = useGameStore((s) => s.phase);

  useFrame(() => {
    if (phase !== 'PARKING' && phase !== 'SHOPPING') return;

    if (alwaysActiveInGauntlet && phase === 'PARKING') {
      if (!active) setActive(true);
      return;
    }

    const now = performance.now();
    if (now - lastCheck.current < 120) return;
    lastCheck.current = now;

    const playerPos = useCartTransformStore.getState().position;
    const dist = playerPos.distanceTo(anchor.current);
    const shouldBeActive = active ? dist < wakeDistance : dist < cullDistance;

    if (shouldBeActive !== active) {
      setActive(shouldBeActive);
    }
  });

  if (!active) return null;

  return <NPC config={config} />;
}

function rnd(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function jitter(seed: number, amp: number): number {
  return (rnd(seed) - 0.5) * amp;
}

/** Chaotic Costco crowd — staggered paths, pauses, and diagonal cuts. */
export function generateGauntletNPCs(): NPCConfig[] {
  const npcs: NPCConfig[] = [];
  const colors = ['#b8a48c', '#9a9a9a', '#c47a7a', '#8aa4c4', '#d4c4a8', '#a89078', '#7a8a9a'];
  const archetypes = ['BLOCKER', 'BLOCKER', 'AGGRESSOR', 'SAMPLE_HUNTER'] as const;
  let id = 0;
  let seed = 42;

  const crossZ = CROSSWALK.z;

  for (let i = 0; i < 5; i++) {
    seed += 17;
    const fromLeft = rnd(seed) > 0.5;
    const z = crossZ + jitter(seed + 1, 5);
    const midX = jitter(seed + 2, 3);
    const midZ = z + jitter(seed + 3, 2.5);
    const archetype = archetypes[Math.floor(rnd(seed + 4) * archetypes.length)];

    npcs.push({
      id: `gauntlet-x-${id++}`,
      archetype,
      baseSpeed: (0.85 + rnd(seed + 5) * 1.6) * NPC_SPEED_MUL,
      obsessiveness: 20 + rnd(seed + 6) * 60,
      cartLoad: 0.9 + rnd(seed + 7) * 2.2,
      color: colors[Math.floor(rnd(seed + 8) * colors.length)],
      chaos: 0.35 + rnd(seed + 9) * 0.55,
      waypoints: fromLeft
        ? [
            [-8 + jitter(seed + 10, 2), 0.95, z],
            [midX, 0.95, midZ],
            [8 + jitter(seed + 11, 2), 0.95, z + jitter(seed + 12, 1.5)],
          ]
        : [
            [8 + jitter(seed + 10, 2), 0.95, z + jitter(seed + 11, 2)],
            [midX, 0.95, midZ],
            [-8 + jitter(seed + 12, 2), 0.95, z],
          ],
    });
  }

  for (let i = 0; i < 4; i++) {
    seed += 23;
    const x = jitter(seed, 5.5);
    const zStart = -14 + rnd(seed + 1) * 10;
    const zEnd = -33 + rnd(seed + 2) * 4;
  const archetype = archetypes[Math.floor(rnd(seed + 3) * archetypes.length)];

    npcs.push({
      id: `gauntlet-z-${id++}`,
      archetype,
      baseSpeed: (0.75 + rnd(seed + 4) * 1.3) * NPC_SPEED_MUL,
      obsessiveness: 30 + rnd(seed + 5) * 50,
      cartLoad: 1.2 + rnd(seed + 6) * 1.8,
      color: colors[Math.floor(rnd(seed + 7) * colors.length)],
      chaos: 0.4 + rnd(seed + 8) * 0.5,
      waypoints: [
        [x, 0.95, zStart],
        [x + jitter(seed + 9, 2.8), 0.95, (zStart + zEnd) / 2 + jitter(seed + 10, 3)],
        [x + jitter(seed + 11, 1.5), 0.95, zEnd],
      ],
    });
  }

  for (let i = 0; i < 3; i++) {
    seed += 31;
    const side = rnd(seed) > 0.5 ? 1 : -1;
    const laneX = side * (5.5 + rnd(seed + 1) * 2.5);
    const z = -8 - rnd(seed + 2) * 18;

    npcs.push({
      id: `gauntlet-lot-${id++}`,
      archetype: 'BLOCKER',
      baseSpeed: (0.7 + rnd(seed + 3) * 1.1) * NPC_SPEED_MUL,
      obsessiveness: 15 + rnd(seed + 4) * 40,
      cartLoad: 1.4 + rnd(seed + 5) * 1.2,
      color: colors[Math.floor(rnd(seed + 6) * colors.length)],
      chaos: 0.5 + rnd(seed + 7) * 0.45,
      waypoints: [
        [laneX, 0.95, z],
        [laneX + side * jitter(seed + 8, 3), 0.95, z - 4 - rnd(seed + 9) * 8],
        [laneX - side * jitter(seed + 10, 2), 0.95, z - 8 - rnd(seed + 11) * 6],
      ],
    });
  }

  for (let i = 0; i < 2; i++) {
    seed += 37;
    const z = 6 - i * 3.5 + jitter(seed, 1.2);
    const x = jitter(seed + 1, 3.2);

    npcs.push({
      id: `gauntlet-approach-${id++}`,
      archetype: rnd(seed + 2) > 0.6 ? 'AGGRESSOR' : 'SAMPLE_HUNTER',
      baseSpeed: (0.8 + rnd(seed + 3) * 1.2) * NPC_SPEED_MUL,
      obsessiveness: 25,
      cartLoad: 1.0 + rnd(seed + 4) * 1.5,
      color: colors[Math.floor(rnd(seed + 5) * colors.length)],
      chaos: 0.55 + rnd(seed + 6) * 0.4,
      waypoints: [
        [x - 2, 0.95, z],
        [x + jitter(seed + 7, 2), 0.95, z - 2],
        [x + 2.5, 0.95, z - 1 + jitter(seed + 8, 2)],
        [x, 0.95, z + 1],
      ],
    });
  }

  return npcs.map((n) => ({ ...n, outdoor: true }));
}

function wp(x: number, y: number, z: number): [number, number, number] {
  return clampWarehouseWaypoint(x, y, z);
}

function routeNearEntry(waypoints: [number, number, number][]): boolean {
  return waypoints.some((w) => isNearWarehouseEntry(w[0], w[2]));
}

/** Quest friction — patrol on the item aisle (wide N–S lanes, not the racetrack pinch). */
function questPatrolX(aisle: number): number {
  return aisle;
}

function pickQuestAltZ(seed: number, patrolZ: number, maxSpan = 14): number {
  const lanes = loopPatrolLaneZs().filter(
    (z) => Math.abs(z - patrolZ) > 3 && Math.abs(z - patrolZ) <= maxSpan,
  );
  if (lanes.length === 0) {
    return loopPatrolLaneZs().find((z) => Math.abs(z - patrolZ) > 3) ?? patrolZ;
  }
  let idx = Math.floor(rnd(seed) * lanes.length);
  if (Math.abs(lanes[idx] - patrolZ) < 3 && lanes.length > 1) {
    idx = (idx + 1) % lanes.length;
  }
  return lanes[idx];
}

/** Two-waypoint route — null when sanitization collapses both ends to the same tile. */
function columnPatrol(x: number, zA: number, zB: number): [number, number, number][] | null {
  const a = wp(x, 0, zA);
  const b = wp(x, 0, zB);
  if (Math.abs(a[2] - b[2]) < 2.5) return null;
  return [a, b];
}

function rowPatrol(z: number, xA: number, xB: number): [number, number, number][] | null {
  const a = wp(xA, 0, z);
  const b = wp(xB, 0, z);
  if (Math.abs(a[0] - b[0]) < 2.5) return null;
  return [a, b];
}

const WEST_LOOP_X = AISLE_CENTERS_X[0];
const EAST_LOOP_X = AISLE_CENTERS_X[2];

function columnRouteKey(x: number, zA: number, zB: number): string {
  return `${x.toFixed(1)}:${Math.min(zA, zB).toFixed(1)}-${Math.max(zA, zB).toFixed(1)}`;
}

function pathCrossesRacksRow(x0: number, x1: number, z: number, cartLoad = 1.8): boolean {
  const { hx, hz } = getNpcHalfExtents(cartLoad);
  const [, , pz] = clampWarehouseWaypoint(x0, 0, z);
  const obstacles = getWarehouseObstacles();
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const [px] = clampWarehouseWaypoint(x, 0, pz);
    for (const box of obstacles) {
      if (px + hx > box.minX && px - hx < box.maxX && pz + hz > box.minZ && pz - hz < box.maxZ) {
        return true;
      }
    }
  }
  return false;
}

function pathCrossesRacks(x: number, z0: number, z1: number, cartLoad = 1.8): boolean {
  const { hx, hz } = getNpcHalfExtents(cartLoad);
  const [px, , pz0] = clampWarehouseWaypoint(x, 0, z0);
  const [, , pz1] = clampWarehouseWaypoint(x, 0, z1);
  const obstacles = getWarehouseObstacles();
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = pz0 + (pz1 - pz0) * t;
    for (const box of obstacles) {
      if (px + hx > box.minX && px - hx < box.maxX && z + hz > box.minZ && z - hz < box.maxZ) {
        return true;
      }
    }
  }
  return false;
}

function rowRouteKey(z: number, xA: number, xB: number): string {
  return `row:${z.toFixed(1)}:${Math.min(xA, xB).toFixed(1)}-${Math.max(xA, xB).toFixed(1)}`;
}

type ColumnSegment = { x: number; zLo: number; zHi: number };
type RowSegment = { z: number; xLo: number; xHi: number };

function columnSpan(zA: number, zB: number): { zLo: number; zHi: number } {
  return { zLo: Math.min(zA, zB), zHi: Math.max(zA, zB) };
}

function columnSegmentOverlaps(
  x: number,
  zA: number,
  zB: number,
  segments: ColumnSegment[],
): boolean {
  const { zLo, zHi } = columnSpan(zA, zB);
  for (const seg of segments) {
    if (Math.abs(seg.x - x) > 0.1) continue;
    if (zLo + 0.25 < seg.zHi && zHi - 0.25 > seg.zLo) return true;
  }
  return false;
}

function rowSegmentOverlaps(
  z: number,
  xA: number,
  xB: number,
  segments: RowSegment[],
): boolean {
  const xLo = Math.min(xA, xB);
  const xHi = Math.max(xA, xB);
  for (const seg of segments) {
    if (Math.abs(seg.z - z) > 0.1) continue;
    if (xLo + 0.25 < seg.xHi && xHi - 0.25 > seg.xLo) return true;
  }
  return false;
}

function registerColumnSegment(segments: ColumnSegment[], x: number, zA: number, zB: number): void {
  const { zLo, zHi } = columnSpan(zA, zB);
  segments.push({ x, zLo, zHi });
}

function registerRowSegment(segments: RowSegment[], z: number, xA: number, xB: number): void {
  segments.push({ z, xLo: Math.min(xA, xB), xHi: Math.max(xA, xB) });
}

function columnEndpointKey(x: number, z: number): string {
  return `${x.toFixed(1)},${z.toFixed(1)}`;
}

function registerColumnEndpoints(
  used: Set<string>,
  x: number,
  zA: number,
  zB: number,
): void {
  used.add(columnEndpointKey(x, zA));
  used.add(columnEndpointKey(x, zB));
}

function columnEndpointTaken(used: Set<string>, x: number, zA: number, zB: number): boolean {
  return used.has(columnEndpointKey(x, zA)) || used.has(columnEndpointKey(x, zB));
}

/** Short N–S leg on racetrack perimeter — never shares ±7.5 zone column endpoints. */
function sampleRacetrackPatrol(
  kiosk: (typeof SAMPLE_KIOSKS)[number],
  usedKeys: Set<string>,
  columnSegments: ColumnSegment[],
  columnEndpoints: Set<string>,
): [number, number, number][] | null {
  const snapZ = snapCrossAisleZ(kiosk.z);
  const lanes = loopPatrolLaneZs();
  const idx = lanes.findIndex((lz) => Math.abs(lz - snapZ) < 1);
  const zHere = idx >= 0 ? lanes[idx] : snapZ;
  const zPairs: [number, number][] = [];
  if (idx >= 0) {
    if (lanes[idx + 1] !== undefined) zPairs.push([zHere, lanes[idx + 1]]);
    if (lanes[idx - 1] !== undefined) zPairs.push([zHere, lanes[idx - 1]]);
  }
  zPairs.sort(([a, b], [c, d]) => {
    const dist = (zA: number, zB: number) => Math.min(Math.abs(zA - kiosk.z), Math.abs(zB - kiosk.z));
    return dist(a, b) - dist(c, d);
  });

  const patrolXs =
    kiosk.x >= 0
      ? [eastRacetrackPatrolX(), westRacetrackPatrolX()]
      : [westRacetrackPatrolX(), eastRacetrackPatrolX()];

  for (const px of patrolXs) {
    for (const [zA, zB] of zPairs) {
      if (Math.abs(zB - zA) < 3) continue;
      if (columnEndpointTaken(columnEndpoints, px, zA, zB)) continue;
      if (!isColumnPathWalkable(px, zA, zB, 1.2)) continue;
      if (columnSegmentOverlaps(px, zA, zB, columnSegments)) continue;
      const wps = columnPatrol(px, zA, zB);
      if (!wps || routeNearEntry(wps)) continue;
      const key = columnRouteKey(px, zA, zB);
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      registerColumnSegment(columnSegments, px, zA, zB);
      registerColumnEndpoints(columnEndpoints, px, zA, zB);
      return wps;
    }
  }
  return null;
}

/** Cross-aisle pass through a quest shelf — blocks the pickup lane. */
function questCrossWaypoints(
  shelf: (typeof QUEST_SHELF_POSITIONS)[number],
  seed: number,
): [number, number, number][] | null {
  const crossZ = snapCrossAisleZ(shelf.z);
  const startIdx = Math.max(0, AISLE_CENTERS_X.findIndex((x) => Math.abs(x - shelf.aisle) < 0.1));
  for (let attempt = 0; attempt < 8; attempt++) {
    let endIdx = Math.floor(rnd(seed + attempt) * AISLE_CENTERS_X.length);
    if (endIdx === startIdx) endIdx = (endIdx + 1) % AISLE_CENTERS_X.length;
    const xStart = AISLE_CENTERS_X[startIdx];
    const xEnd = AISLE_CENTERS_X[endIdx];
    if (pathCrossesRacksRow(xStart, xEnd, crossZ)) continue;
    const wps = rowPatrol(crossZ, xStart, xEnd);
    if (wps) return wps;
  }
  // Fallback: half-width cross-blockers only — never block every aisle at once
  if (Math.abs(shelf.aisle - (-7.5)) < 0.1 && !pathCrossesRacksRow(-7.5, 0, crossZ)) {
    return rowPatrol(crossZ, -7.5, 0);
  }
  if (Math.abs(shelf.aisle - 7.5) < 0.1 && !pathCrossesRacksRow(0, 7.5, crossZ)) {
    return rowPatrol(crossZ, 0, 7.5);
  }
  if (Math.abs(shelf.aisle) < 0.1 && !pathCrossesRacksRow(-7.5, 7.5, crossZ)) {
    return rowPatrol(crossZ, -7.5, 7.5);
  }
  return null;
}

export function generateWarehouseNPCs(): NPCConfig[] {
  const npcs: NPCConfig[] = [];
  const colors = ['#b8a48c', '#9a9a9a', '#c4a882', '#8aa4c4', '#d46a6a', '#a89078', '#7a8a9a'];
  let ci = 0;
  const usedColumnRoutes = new Set<string>();
  const usedRowRoutes = new Set<string>();
  const columnSegments: ColumnSegment[] = [];
  const rowSegments: RowSegment[] = [];
  const columnEndpoints = new Set<string>();

  const lanes = loopPatrolLaneZs();
  const lane = (i: number, fallback: number) => lanes[i] ?? fallback;

  function tint() {
    return colors[ci++ % colors.length];
  }

  function add(config: NPCConfig): void {
    npcs.push(config);
  }

  function tryColumn(
    id: string,
    x: number,
    zA: number,
    zB: number,
    opts: { archetype?: NPCConfig['archetype']; cartLoad?: number; speed?: number } = {},
  ): boolean {
    if (pathCrossesRacks(x, zA, zB, opts.cartLoad ?? 1.9)) return false;
    if (!isColumnPathWalkable(x, zA, zB, opts.cartLoad ?? 1.9)) return false;
    if (columnSegmentOverlaps(x, zA, zB, columnSegments)) return false;
    const wps = columnPatrol(x, zA, zB);
    if (!wps || routeNearEntry(wps)) return false;
    const key = columnRouteKey(x, zA, zB);
    if (usedColumnRoutes.has(key)) return false;
    usedColumnRoutes.add(key);
    registerColumnSegment(columnSegments, x, zA, zB);
    registerColumnEndpoints(columnEndpoints, x, zA, zB);
    add({
      id,
      archetype: opts.archetype ?? 'BLOCKER',
      baseSpeed: (opts.speed ?? 0.85) * NPC_SPEED_MUL,
      obsessiveness: 22 + rnd(id.length * 3) * 40,
      cartLoad: opts.cartLoad ?? 1.9,
      color: tint(),
      chaos: 0.1,
      waypoints: wps,
    });
    return true;
  }

  function tryRow(
    id: string,
    crossZ: number,
    xA: number,
    xB: number,
    opts: { archetype?: NPCConfig['archetype']; cartLoad?: number; speed?: number } = {},
  ): boolean {
    if (pathCrossesRacksRow(xA, xB, crossZ, opts.cartLoad ?? 1.8)) return false;
    if (rowSegmentOverlaps(crossZ, xA, xB, rowSegments)) return false;
    const wps = rowPatrol(crossZ, xA, xB);
    if (!wps || routeNearEntry(wps)) return false;
    const key = rowRouteKey(crossZ, xA, xB);
    if (usedRowRoutes.has(key)) return false;
    usedRowRoutes.add(key);
    registerRowSegment(rowSegments, crossZ, xA, xB);
    add({
      id,
      archetype: opts.archetype ?? 'BLOCKER',
      baseSpeed: (opts.speed ?? 0.75) * NPC_SPEED_MUL,
      obsessiveness: 18 + rnd(id.length * 5) * 35,
      cartLoad: opts.cartLoad ?? 1.75,
      color: tint(),
      chaos: 0.12,
      waypoints: wps,
    });
    return true;
  }

  const backSouth = lane(0, -11.25);
  const backNorth = lane(1, -5.75);
  const midSouth = lane(2, -0.25);
  const midNorth = lane(3, 5.25);

  // ── Deterministic zone coverage (west / east / back / mid) ──
  tryColumn('wh-west-back', WEST_LOOP_X, backSouth, backNorth);
  tryColumn('wh-west-mid', WEST_LOOP_X, midSouth, midNorth);
  tryColumn('wh-east-back', EAST_LOOP_X, backSouth, backNorth);
  tryColumn('wh-east-mid', EAST_LOOP_X, midSouth, midNorth);

  tryRow('wh-back-cross', backSouth, WEST_LOOP_X, EAST_LOOP_X);
  tryRow('wh-mid-cross-west', midSouth, WEST_LOOP_X, 0);
  tryRow('wh-mid-cross-east', midSouth, 0, EAST_LOOP_X);
  tryRow('wh-front-cross', midNorth, WEST_LOOP_X, EAST_LOOP_X, { archetype: 'AGGRESSOR', cartLoad: 1.6 });

  // Quest friction — column on item aisle + one cross blocker (deduped routes)
  for (let q = 0; q < QUEST_SHELF_POSITIONS.length; q++) {
    const shelf = QUEST_SHELF_POSITIONS[q];
    const patrolX = questPatrolX(shelf.aisle);
    const maxSpan = Math.abs(shelf.aisle) < 0.1 ? 8 : 11;
    const zAlt = pickQuestAltZ(q * 17 + 3, shelf.z, maxSpan);
    const shortSpan = Math.abs(shelf.aisle) < 0.1;
    const zEnd = shortSpan ? midNorth : zAlt;

    tryColumn(`wh-quest-${q}`, patrolX, shelf.z, zEnd, {
      archetype: q % 2 === 0 ? 'BLOCKER' : 'SAMPLE_HUNTER',
      cartLoad: q % 2 === 0 ? 1.85 : 1.1,
      speed: 0.6,
    });

    const crossWps = questCrossWaypoints(shelf, q * 23);
    if (crossWps && !routeNearEntry(crossWps)) {
      const cz = crossWps[0][2];
      const cx0 = crossWps[0][0];
      const cx1 = crossWps[1][0];
      const rk = rowRouteKey(cz, cx0, cx1);
      if (
        !usedRowRoutes.has(rk) &&
        !rowSegmentOverlaps(cz, cx0, cx1, rowSegments)
      ) {
        usedRowRoutes.add(rk);
        registerRowSegment(rowSegments, cz, cx0, cx1);
        add({
          id: `wh-quest-x-${q}`,
          archetype: 'BLOCKER',
          baseSpeed: 0.55 * NPC_SPEED_MUL,
          obsessiveness: 45,
          cartLoad: 1.95,
          color: tint(),
          chaos: 0.14,
          waypoints: crossWps,
        });
      }
    }
  }

  // Sample hunters patrol racetrack perimeter — side aisles are owned by zone loops.
  for (const kiosk of SAMPLE_KIOSKS) {
    const loiterWps = sampleRacetrackPatrol(kiosk, usedColumnRoutes, columnSegments, columnEndpoints);
    if (!loiterWps) continue;
    add({
      id: `wh-sample-${kiosk.id}`,
      archetype: 'SAMPLE_HUNTER',
      baseSpeed: 0.55 * NPC_SPEED_MUL,
      obsessiveness: 35,
      cartLoad: 1.25,
      color: tint(),
      chaos: 0.08,
      waypoints: loiterWps,
    });
  }

  return npcs;
}

export function generateParkingNPCs(): NPCConfig[] {
  return [];
}
