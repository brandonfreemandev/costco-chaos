import { useEffect } from 'react';
import { spatialAudio } from '../audio/spatialAudioManager';
import { useGameStore } from '../stores/gameStore';

/** Keeps background music in sync with game phase. */
export function useGameAudio(): void {
  const phase = useGameStore((s) => s.phase);
  const checkoutWon = useGameStore((s) => s.checkoutWon);
  const audioUnlocked = useGameStore((s) => s.audioUnlocked);

  useEffect(() => {
    if (!audioUnlocked) return;
    spatialAudio.setGamePhase(phase, checkoutWon);
  }, [phase, checkoutWon, audioUnlocked]);
}
