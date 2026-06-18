import { useUIStore } from './stores/uiStore';
import { GameScene } from './components/scene/GameScene';
import { EnterGate } from './components/hud/EnterGate';
import { GameSidebar } from './components/hud/GameSidebar';
import { GameHud } from './components/hud/GameHud';
import './App.css';

export default function App() {
  const visionBlur = useUIStore((s) => s.visionBlur);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="game-layout">
        <GameSidebar />
        <div className="viewport-column">
          <div
            className="viewport-wrap"
            style={{ filter: visionBlur > 0 ? `blur(${visionBlur}px)` : undefined }}
          >
            <GameScene />
            <GameHud />
          </div>
          <EnterGate />
        </div>
      </div>
    </div>
  );
}
