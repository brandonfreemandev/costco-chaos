import { create } from 'zustand';
import * as THREE from 'three';
import { PLAYER_SPAWN } from '../components/scene/parkingLotLayout';

interface CartTransformStore {
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  pendingTeleport: { x: number; z: number; yaw: number } | null;
  setTransform: (position: THREE.Vector3, yaw: number, speed: number) => void;
  requestTeleport: (x: number, z: number, yaw: number) => void;
  takeTeleport: () => { x: number; z: number; yaw: number } | null;
}

export const useCartTransformStore = create<CartTransformStore>((set, get) => ({
  position: new THREE.Vector3(PLAYER_SPAWN.x, 0.9, PLAYER_SPAWN.z),
  yaw: PLAYER_SPAWN.yaw,
  speed: 0,
  pendingTeleport: null,
  setTransform: (position, yaw, speed) => set({ position: position.clone(), yaw, speed }),
  requestTeleport: (x, z, yaw) => set({ pendingTeleport: { x, z, yaw } }),
  takeTeleport: () => {
    const tp = get().pendingTeleport;
    if (tp) set({ pendingTeleport: null });
    return tp;
  },
}));
