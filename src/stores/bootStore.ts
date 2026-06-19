import { create } from 'zustand';

interface BootStore {
  /** WebGL scene has rendered at least one frame. */
  sceneReady: boolean;
  /** Minimum splash time elapsed — keeps the ad readable. */
  minTimeElapsed: boolean;
  setSceneReady: () => void;
  setMinTimeElapsed: () => void;
}

export const useBootStore = create<BootStore>((set) => ({
  sceneReady: false,
  minTimeElapsed: false,
  setSceneReady: () => set({ sceneReady: true }),
  setMinTimeElapsed: () => set({ minTimeElapsed: true }),
}));

export function isBootComplete(): boolean {
  const { sceneReady, minTimeElapsed } = useBootStore.getState();
  return sceneReady && minTimeElapsed;
}
