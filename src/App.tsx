import { useGameShortcuts } from './hooks/useGameShortcuts';
import { useGameAudio } from './hooks/useGameAudio';
import { useCheckoutInput } from './hooks/useCheckoutInput';
import { useUIStore } from './stores/uiStore';
import { GameScene } from './components/scene/GameScene';
import { EnterGate } from './components/hud/EnterGate';
import { GameSidebar } from './components/hud/GameSidebar';
import { GameHud } from './components/hud/GameHud';
import { BumpFlash } from './components/hud/BumpFlash';
import { LoadingScreen } from './components/hud/LoadingScreen';
import './App.css';

export default function App() {
  useGameShortcuts();
  useGameAudio();
  useCheckoutInput();
  const visionBlur = useUIStore((s) => s.visionBlur);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <LoadingScreen />
      <div className="game-layout">
        <GameSidebar />
        <div className="viewport-column">
          <div
            className="viewport-wrap"
            style={{ filter: visionBlur > 0 ? `blur(${visionBlur}px)` : undefined }}
          >
            <GameScene />
            <GameHud />
            <BumpFlash />
          </div>
          <EnterGate />
        </div>
      </div>
    </div>
  );
}
