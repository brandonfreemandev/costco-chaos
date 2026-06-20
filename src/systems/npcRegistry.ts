import type { NavAgentState } from './NavAgent';

export type NpcPatrolAxis = 'column' | 'row' | 'free';

export interface NpcCollisionMeta {
  isNpc: true;
  cartLoad: number;
  npcId: string;
  patrolAxis?: NpcPatrolAxis;
}

export interface NpcAgentTelemetry {
  state: NavAgentState;
  targetNodeId: string | null;
  netDisplacement5s: number;
  jitterScore: number;
  blockedReason?: string;
}

export interface NpcRuntimeState {
  meta: NpcCollisionMeta;
  x: number;
  z: number;
  speed: number;
  paused?: boolean;
  jittering?: boolean;
  telemetry?: NpcAgentTelemetry;
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
  telemetry?: NpcAgentTelemetry,
): void {
  runtimes.set(handle, { meta, x, z, speed, paused, jittering, telemetry });
}

export function getActiveNpcRuntimes(): NpcRuntimeState[] {
  return Array.from(runtimes.values());
}
