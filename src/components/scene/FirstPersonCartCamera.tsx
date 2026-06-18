import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartTransformStore } from '../../stores/cartTransformStore';

const EYE_HEIGHT = 1.62;
const CAMERA_BEHIND = 0.28;
const BOB_AMPLITUDE = 0.018;

export function FirstPersonCartCamera() {
  const { camera } = useThree();
  const handleRef = useRef<THREE.Group>(null);
  const bobPhase = useRef(0);
  const localOffset = useRef(new THREE.Vector3(0, -0.32, -0.72));
  const worldOffset = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const { position, yaw, speed } = useCartTransformStore.getState();

    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);

    bobPhase.current += delta * (2.5 + speed * 1.8);
    const bob = Math.sin(bobPhase.current) * BOB_AMPLITUDE * Math.min(1, speed / 2.5);

    camera.position.set(
      position.x - forwardX * CAMERA_BEHIND,
      EYE_HEIGHT + bob,
      position.z - forwardZ * CAMERA_BEHIND,
    );
    camera.rotation.set(0, yaw, 0, 'YXZ');

    if (handleRef.current) {
      worldOffset.current.copy(localOffset.current).applyQuaternion(camera.quaternion);
      handleRef.current.position.copy(camera.position).add(worldOffset.current);
      handleRef.current.rotation.copy(camera.rotation);
      handleRef.current.rotateX(0.08);
    }
  });

  return (
    <group ref={handleRef}>
      <mesh>
        <boxGeometry args={[0.78, 0.055, 0.06]} />
        <meshStandardMaterial color="#2e3136" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[-0.36, -0.08, 0.02]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.05, 0.22, 0.05]} />
        <meshStandardMaterial color="#3a3f45" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0.36, -0.08, 0.02]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.05, 0.22, 0.05]} />
        <meshStandardMaterial color="#3a3f45" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.18, 0.12]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[0.82, 0.04, 0.35]} />
        <meshStandardMaterial color="#5c6068" metalness={0.3} roughness={0.6} />
      </mesh>
    </group>
  );
}
