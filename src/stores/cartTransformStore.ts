import { create } from 'zustand';
import * as THREE from 'three';
import { PLAYER_SPAWN } from '../components/scene/parkingLotLayout';

interface CartTransformStore {
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  setTransform: (position: THREE.Vector3, yaw: number, speed: number) => void;
}

export const useCartTransformStore = create<CartTransformStore>((set) => ({
  position: new THREE.Vector3(PLAYER_SPAWN.x, 0.9, PLAYER_SPAWN.z),
  yaw: PLAYER_SPAWN.yaw,
  speed: 0,
  setTransform: (position, yaw, speed) => set({ position: position.clone(), yaw, speed }),
}));
