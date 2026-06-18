import { create } from 'zustand';
import type { GamePhase } from '../types/state';
import { usePlayerStore } from './playerStore';

interface GameStore {
  phase: GamePhase;
  audioUnlocked: boolean;
  nervousBreakdown: boolean;
  parkingSpotSecured: boolean;
  setPhase: (phase: GamePhase) => void;
  unlockAudio: () => void;
  triggerNervousBreakdown: () => void;
  secureParkingSpot: () => void;
  reset: () => void;
}

function logTransition(message: string) {
  console.log(`[GameManager] ${message}`);
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'MENU',
  audioUnlocked: false,
  nervousBreakdown: false,
  parkingSpotSecured: false,

  setPhase: (phase) => {
    const prev = get().phase;
    if (prev === phase) return;
    logTransition(`${prev} -> ${phase}`);
    set({ phase });
  },

  unlockAudio: () => {
    logTransition('Audio context unlocked');
    set({ audioUnlocked: true, phase: 'PARKING' });
  },

  triggerNervousBreakdown: () => {
    logTransition('Nervous breakdown — GAME OVER');
    set({ nervousBreakdown: true, phase: 'END' });
  },

  secureParkingSpot: () => {
    if (get().parkingSpotSecured) return;
    logTransition('Entered Costco warehouse -> SHOPPING');
    set({ parkingSpotSecured: true, phase: 'SHOPPING' });
    usePlayerStore.getState().setZone('AISLES');
  },

  reset: () => {
    logTransition('Session reset');
    set({
      phase: 'MENU',
      audioUnlocked: false,
      nervousBreakdown: false,
      parkingSpotSecured: false,
    });
  },
}));
