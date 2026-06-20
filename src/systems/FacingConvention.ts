import type { NPCConfig } from '../types/npcConfig';

/** Unified travel yaw — avatar faces normalized XZ direction; cart handle toward avatar. */
export function travelYawFromDirection(dx: number, dz: number): number {
  if (Math.abs(dx) < 1e-8 && Math.abs(dz) < 1e-8) return 0;
  return Math.atan2(dx, dz);
}

function isColumnPatrol(config: NPCConfig): boolean {
  const col = config.waypoints[0][0];
  return config.waypoints.every((wp) => Math.abs(wp[0] - col) < 0.35);
}

function isRowPatrol(config: NPCConfig): boolean {
  const row = config.waypoints[0][2];
  return config.waypoints.every((wp) => Math.abs(wp[2] - row) < 0.35);
}

/** Grid patrol heading — column locks N/S, row locks E/W. */
export function gridPatrolYaw(config: NPCConfig, wpIdx: number, dir: number): number | null {
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
