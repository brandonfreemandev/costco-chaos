import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

export type CarBodyStyle = 'prius' | 'rivian' | 'tesla';

/** Public assets live under Vite's base path (e.g. /costco-chaos/). */
function carModelUrl(file: string): string {
  return `${import.meta.env.BASE_URL}models/cars/${file}`;
}

type CarModelConfig = {
  path: string;
  targetSize: [number, number, number];
  tintStrength: number;
};

const MODEL_CONFIG: Record<CarBodyStyle, CarModelConfig> = {
  prius: { path: carModelUrl('prius.glb'), targetSize: [1.9, 1.45, 4.15], tintStrength: 0.42 },
  rivian: { path: carModelUrl('rivian.glb'), targetSize: [2.0, 1.55, 4.25], tintStrength: 0.38 },
  tesla: { path: carModelUrl('tesla.glb'), targetSize: [1.9, 1.4, 4.1], tintStrength: 0.36 },
};

function tintMaterial(material: THREE.Material, tint: THREE.Color, strength: number): THREE.Material {
  const copy = material.clone();
  if ('color' in copy && copy.color instanceof THREE.Color) {
    copy.color = copy.color.clone().lerp(tint, strength);
  }
  if ('roughness' in copy && typeof copy.roughness === 'number') {
    copy.roughness = Math.min(0.95, copy.roughness + 0.06);
  }
  if ('metalness' in copy && typeof copy.metalness === 'number') {
    copy.metalness = Math.max(0, copy.metalness - 0.04);
  }
  return copy;
}

function buildStyledModel(
  source: THREE.Object3D,
  color: string,
  targetSize: [number, number, number],
  tintStrength: number,
): THREE.Object3D {
  const clone = source.clone(true);
  const tint = new THREE.Color(color);

  clone.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((mat) => tintMaterial(mat, tint, tintStrength));
    } else if (mesh.material) {
      mesh.material = tintMaterial(mesh.material, tint, tintStrength);
    }
  });

  clone.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());

  const sx = targetSize[0] / Math.max(size.x, 1e-5);
  const sy = targetSize[1] / Math.max(size.y, 1e-5);
  const sz = targetSize[2] / Math.max(size.z, 1e-5);
  const scale = Math.min(sx, sy, sz);
  clone.scale.setScalar(scale);

  clone.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(clone);
  const center = scaledBox.getCenter(new THREE.Vector3());
  clone.position.x = -center.x;
  clone.position.z = -center.z;
  clone.position.y = -scaledBox.min.y;

  clone.updateMatrixWorld(true);
  return clone;
}

function CarModel({ style, color }: { style: CarBodyStyle; color: string }) {
  const config = MODEL_CONFIG[style];
  const gltf = useGLTF(config.path);
  const model = useMemo(
    () => buildStyledModel(gltf.scene, color, config.targetSize, config.tintStrength),
    [gltf.scene, color, config.targetSize, config.tintStrength],
  );
  return <primitive object={model} />;
}

export function carStyleFromId(id: string): CarBodyStyle {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  if (h % 3 === 0) return 'prius';
  if (h % 2 === 0) return 'rivian';
  return 'tesla';
}

export function ParkedCarVisual({ id, color, style }: { id: string; color: string; style: CarBodyStyle }) {
  void id;
  return <CarModel style={style} color={color} />;
}

export function carColliderForStyle(style: CarBodyStyle): [number, number, number] {
  if (style === 'prius') return [1.0, 0.78, 2.05];
  if (style === 'rivian') return [0.98, 0.76, 1.95];
  return [0.95, 0.72, 1.9];
}

/** Collider center Y so the box bottom rests on y=0 (visuals are nudged down separately). */
export function carColliderCenterY(style: CarBodyStyle): number {
  return carColliderForStyle(style)[1] / 2;
}

useGLTF.preload(carModelUrl('prius.glb'));
useGLTF.preload(carModelUrl('rivian.glb'));
useGLTF.preload(carModelUrl('tesla.glb'));
