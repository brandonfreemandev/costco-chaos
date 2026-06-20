export type NpcPatrolAxis = 'column' | 'row' | 'free';

export interface NpcCollisionMeta {
  isNpc: true;
  cartLoad: number;
  npcId: string;
  patrolAxis?: NpcPatrolAxis;
}

export interface NpcRuntimeState {
  meta: NpcCollisionMeta;
  x: number;
  z: number;
  speed: number;
  /** Intentional grid-patrol pause — watchdog ignores brief stops. */
  paused?: boolean;
  /** Sliding against obstacles without net progress. */
  jittering?: boolean;
}

const registry = new Map<number, NpcCollisionMeta>();
const runtimes = new Map<number, NpcRuntimeState>();

export function registerNpc(handle: number, meta: NpcCollisionMeta): void {
  registry.set(handle, meta);
}

export function unregisterNpc(handle: number): void {
  registry.delete(handle);
  runtimes.delete(handle);
}

export function getNpcMeta(handle: number | undefined): NpcCollisionMeta | undefined {
  if (handle === undefined) return undefined;
  return registry.get(handle);
}

export function updateNpcRuntime(
  handle: number,
  meta: NpcCollisionMeta,
  x: number,
  z: number,
  speed: number,
  paused = false,
  jittering = false,
): void {
  runtimes.set(handle, { meta, x, z, speed, paused, jittering });
}

export function getActiveNpcRuntimes(): NpcRuntimeState[] {
  return Array.from(runtimes.values());
}
