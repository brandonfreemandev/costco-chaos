import { useEffect, useRef } from 'react';
import { useGameShortcuts } from './hooks/useGameShortcuts';
import { useGameAudio } from './hooks/useGameAudio';
import { useCheckoutInput } from './hooks/useCheckoutInput';
import { useUIStore } from './stores/uiStore';
import { useGameStore } from './stores/gameStore';
import { GameScene } from './components/scene/GameScene';
import { EnterGate } from './components/hud/EnterGate';
import { GameSidebar } from './components/hud/GameSidebar';
import { GameHud } from './components/hud/GameHud';
import { EndScreen } from './components/hud/EndScreen';
import { PhoneInterlude } from './components/hud/PhoneInterlude';
import { EncounterOverlay } from './components/hud/EncounterOverlay';
import { BumpFlash } from './components/hud/BumpFlash';
import { LoadingScreen } from './components/hud/LoadingScreen';
import { ChaosTestPanel } from './components/hud/ChaosTestPanel';
import './App.css';

const PHONE_TRIGGER_MS = 45_000; // 45 s into shopping phase

export default function App() {
  useGameShortcuts();
  useGameAudio();
  useCheckoutInput();
  const phase = useGameStore((s) => s.phase);
  const triggerPhoneInterlude = useGameStore((s) => s.triggerPhoneInterlude);
  const phoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase === 'SHOPPING') {
      phoneTimerRef.current = setTimeout(triggerPhoneInterlude, PHONE_TRIGGER_MS);
    }
    return () => {
      if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
    };
  }, [phase, triggerPhoneInterlude]);
  const visionBlur = useUIStore((s) => s.visionBlur);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <LoadingScreen />
      <EndScreen />
      <PhoneInterlude />
      <EncounterOverlay />
      <div className="game-layout">
        <GameSidebar />
        <div className="viewport-column">
          <div
            className="viewport-wrap"
            style={{ filter: visionBlur > 0 ? `blur(${visionBlur}px)` : undefined }}
          >
            <GameScene />
            <GameHud />
            {import.meta.env.DEV && <ChaosTestPanel />}
            <BumpFlash />
          </div>
          <EnterGate />
        </div>
      </div>
    </div>
  );
}
