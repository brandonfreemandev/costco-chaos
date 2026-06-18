import { useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { ParkingLot } from './ParkingLot';
import { ShoppingCart } from './ShoppingCart';
import { ParkingSpotSensor } from './ParkingSpotSensor';
import { useGameStore } from '../../stores/gameStore';

function FollowCamera({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    const camera = cameraRef.current;
    const position = target.current;
    if (!camera || !position) return;

    const desired = new THREE.Vector3(position.x, position.y + 10, position.z + 14);
    camera.position.lerp(desired, 0.08);
    camera.lookAt(position.x, position.y, position.z);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={50} near={0.1} far={200} />;
}

function SceneContent() {
  const cartPosition = useRef<THREE.Vector3 | null>(new THREE.Vector3(0, 0, 18));
  const phase = useGameStore((s) => s.phase);

  if (phase === 'END' || phase === 'MENU') {
    return null;
  }

  return (
    <>
      <color attach="background" args={['#9eb4c8']} />
      <fog attach="fog" args={['#9eb4c8', 35, 90]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        intensity={1.4}
        position={[12, 24, 8]}
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={['#dfe8f2', '#4a4f55', 0.35]} />

      <FollowCamera target={cartPosition} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate={false}
        maxPolarAngle={Math.PI / 2.2}
      />

      <Physics gravity={[0, -9.81, 0]} timeStep="vary">
        <ParkingLot />
        <ParkingSpotSensor cartPosition={cartPosition} />
        <ShoppingCart
          onPositionChange={(position) => {
            cartPosition.current = position;
          }}
        />
      </Physics>
    </>
  );
}

export function GameScene() {
  return (
    <Canvas shadows style={{ width: '100%', height: '100%' }}>
      <SceneContent />
    </Canvas>
  );
}
