export interface NpcCollisionMeta {
  isNpc: true;
  cartLoad: number;
  npcId: string;
}

export interface NpcRuntimeState {
  meta: NpcCollisionMeta;
  x: number;
  z: number;
  speed: number;
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
): void {
  runtimes.set(handle, { meta, x, z, speed });
}

export function getActiveNpcRuntimes(): NpcRuntimeState[] {
  return Array.from(runtimes.values());
}
