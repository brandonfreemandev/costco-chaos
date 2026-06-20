import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, BrightnessContrast } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { ParkingLot } from './ParkingLot';
import { WarehouseAisles } from './WarehouseAisles';
import { WarehouseEnvironment } from './WarehouseEnvironment';
import { OutdoorSky, OUTDOOR_SKY_COLOR, OUTDOOR_SUN_POSITION } from './OutdoorSky';
import { ShoppingCart } from './ShoppingCart';
import { EntranceSensor } from './EntranceSensor';
import { FirstPersonCartCamera } from './FirstPersonCartCamera';
import { useGameStore } from '../../stores/gameStore';
import { useBootStore } from '../../stores/bootStore';
import { ChaosTestRunner } from './ChaosTestRunner';

function SceneContent() {
  const phase = useGameStore((s) => s.phase);

  if (phase === 'END' || phase === 'MENU') {
    return null;
  }

  const inWarehouse = phase === 'SHOPPING' || phase === 'CHECKOUT';

  return (
    <>
      <color attach="background" args={[inWarehouse ? '#8a939c' : OUTDOOR_SKY_COLOR]} />
      {/* No outdoor fog — it was washing the sky to off-white */}
      {inWarehouse && <fog attach="fog" args={['#949ca4', 28, 95]} />}

      {inWarehouse ? (
        <WarehouseEnvironment />
      ) : (
        <OutdoorSky />
      )}

      <ambientLight intensity={inWarehouse ? 0.28 : 0.38} color={inWarehouse ? '#eef2f7' : '#c8e6ff'} />
      <directionalLight
        castShadow
        intensity={inWarehouse ? 0.55 : 1.35}
        color={inWarehouse ? '#fff8ee' : '#fff4d6'}
        position={inWarehouse ? [6, 18, 10] : OUTDOOR_SUN_POSITION}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-bias={-0.0002}
      />
      {!inWarehouse && <hemisphereLight args={['#42a5f5', '#6d9e4a', 0.55]} />}

      <PerspectiveCamera makeDefault fov={76} near={0.04} far={160} position={[0, 1.62, -8]} />
      <FirstPersonCartCamera />

      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
        {phase === 'PARKING' && <ParkingLot />}
        {inWarehouse && <WarehouseAisles />}
        <EntranceSensor />
        <ShoppingCart />
        {import.meta.env.DEV && <ChaosTestRunner />}
      </Physics>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={inWarehouse ? 0.35 : 0.4}
        scale={inWarehouse ? 50 : 70}
        blur={2.2}
        far={12}
        resolution={512}
        color="#1a2030"
      />

      {inWarehouse ? (
        <EffectComposer multisampling={4}>
          <Bloom
            luminanceThreshold={0.55}
            luminanceSmoothing={0.85}
            intensity={0.45}
            blendFunction={BlendFunction.SCREEN}
          />
          <BrightnessContrast brightness={0.02} contrast={0.08} />
          <Vignette eskil={false} offset={0.12} darkness={0.42} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={4}>
          <Vignette eskil={false} offset={0.08} darkness={0.12} />
        </EffectComposer>
      )}
    </>
  );
}

export function GameScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      onCreated={({ gl }) => {
        gl.setClearColor(OUTDOOR_SKY_COLOR);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            useBootStore.getState().setSceneReady();
          });
        });
      }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  );
}
