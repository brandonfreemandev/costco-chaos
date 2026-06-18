import { create } from 'zustand';
import * as THREE from 'three';

interface CartTransformStore {
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  setTransform: (position: THREE.Vector3, yaw: number, speed: number) => void;
}

export const useCartTransformStore = create<CartTransformStore>((set) => ({
  position: new THREE.Vector3(0, 0.9, 32),
  yaw: 0,
  speed: 0,
  setTransform: (position, yaw, speed) => set({ position: position.clone(), yaw, speed }),
}));
