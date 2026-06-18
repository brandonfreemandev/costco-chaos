import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { PerspectiveCamera } from '@react-three/drei';
import { ParkingLot } from './ParkingLot';
import { WarehouseAisles } from './WarehouseAisles';
import { ShoppingCart } from './ShoppingCart';
import { ParkingSpotSensor } from './ParkingSpotSensor';
import { FirstPersonCartCamera } from './FirstPersonCartCamera';
import { useGameStore } from '../../stores/gameStore';

function SceneContent() {
  const phase = useGameStore((s) => s.phase);

  if (phase === 'END' || phase === 'MENU') {
    return null;
  }

  const inWarehouse = phase === 'SHOPPING' || phase === 'CHECKOUT';

  return (
    <>
      <color attach="background" args={[inWarehouse ? '#1a1c20' : '#9eb4c8']} />
      <fog attach="fog" args={[inWarehouse ? '#1a1c20' : '#8aa4bc', inWarehouse ? 8 : 18, inWarehouse ? 42 : 95]} />
      <ambientLight intensity={inWarehouse ? 0.18 : 0.4} />
      <directionalLight
        castShadow
        intensity={inWarehouse ? 0.35 : 1.2}
        position={[inWarehouse ? 0 : 12, inWarehouse ? 8 : 24, inWarehouse ? 10 : 8]}
        shadow-mapSize={[1024, 1024]}
      />
      {!inWarehouse && <hemisphereLight args={['#dfe8f2', '#4a4f55', 0.35]} />}

      <PerspectiveCamera makeDefault fov={78} near={0.08} far={160} position={[0, 1.62, 32]} />
      <FirstPersonCartCamera />

      <Physics gravity={[0, -9.81, 0]} timeStep="vary">
        {phase === 'PARKING' && <ParkingLot />}
        {inWarehouse && <WarehouseAisles />}
        <ParkingSpotSensor />
        <ShoppingCart />
      </Physics>
    </>
  );
}

export function GameScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  );
}
