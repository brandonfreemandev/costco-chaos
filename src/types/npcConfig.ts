import type { NPCArchetype } from './state';

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
  chaos?: number;
  outdoor?: boolean;
}
