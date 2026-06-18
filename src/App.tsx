import { GameScene } from './components/scene/GameScene';
import { EnterGate } from './components/hud/EnterGate';
import { GameHud } from './components/hud/GameHud';
import './App.css';

export default function App() {
  return (
    <div className="app-shell">
      <GameScene />
      <EnterGate />
      <GameHud />
    </div>
  );
}
