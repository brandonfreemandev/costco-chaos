import { useUIStore } from './stores/uiStore';
import { GameScene } from './components/scene/GameScene';
import { EnterGate } from './components/hud/EnterGate';
import { GameHud } from './components/hud/GameHud';
import './App.css';

export default function App() {
  const visionBlur = useUIStore((s) => s.visionBlur);

  return (
    <div className="app-shell">
      <div
        className="viewport-wrap"
        style={{ filter: visionBlur > 0 ? `blur(${visionBlur}px)` : undefined }}
      >
        <GameScene />
      </div>
      <EnterGate />
      <GameHud />
    </div>
  );
}
