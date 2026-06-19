import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TROFFER_DEPTH, TROFFER_WIDTH, WAREHOUSE_CEILING_LIGHTS } from './warehouseLightGrid';

const housingMaterial = new THREE.MeshStandardMaterial({
  color: '#8a9098',
  roughness: 0.55,
  metalness: 0.35,
});

const panelMaterial = new THREE.MeshStandardMaterial({
  color: '#fffef6',
  emissive: '#fff8dc',
  emissiveIntensity: 1.35,
  roughness: 0.25,
  metalness: 0.05,
});

/** Instanced troffer housings + emissive panels — zero point lights. */
export function WarehouseCeilingLights() {
  const housingRef = useRef<THREE.InstancedMesh>(null);
  const panelRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = WAREHOUSE_CEILING_LIGHTS.length;

  useLayoutEffect(() => {
    const housing = housingRef.current;
    const panel = panelRef.current;
    if (!housing || !panel) return;

    WAREHOUSE_CEILING_LIGHTS.forEach((light, i) => {
      dummy.position.set(light.x, light.y, light.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      housing.setMatrixAt(i, dummy.matrix);

      dummy.position.set(light.x, light.y - 0.06, light.z);
      dummy.updateMatrix();
      panel.setMatrixAt(i, dummy.matrix);
    });

    housing.instanceMatrix.needsUpdate = true;
    panel.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  return (
    <group>
      <instancedMesh ref={housingRef} args={[undefined, housingMaterial, count]} frustumCulled>
        <boxGeometry args={[TROFFER_WIDTH, 0.12, TROFFER_DEPTH]} />
      </instancedMesh>
      <instancedMesh ref={panelRef} args={[undefined, panelMaterial, count]} frustumCulled>
        <boxGeometry args={[TROFFER_WIDTH * 0.92, 0.04, TROFFER_DEPTH * 0.88]} />
      </instancedMesh>
    </group>
  );
}
