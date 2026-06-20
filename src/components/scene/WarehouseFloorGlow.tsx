import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getFloorGlowTexture } from './floorGlowTexture';
import { WAREHOUSE_CEILING_LIGHTS } from './warehouseLightGrid';
import { AISLE_SPECS } from './warehouseLayout';

const ROW_GLOW_DEPTH = 4.2;
const aisleWidthAt = (x: number) => AISLE_SPECS.find((a) => a.x === x)?.width ?? 3.1;

const glowMaterial = new THREE.MeshBasicMaterial({
  map: getFloorGlowTexture(),
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});

/** Soft floor pools under each troffer — cheap additive quads, no lights. */
export function WarehouseFloorGlow() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = WAREHOUSE_CEILING_LIGHTS.length;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    WAREHOUSE_CEILING_LIGHTS.forEach((light, i) => {
      dummy.position.set(light.x, 0.035, light.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(aisleWidthAt(light.x) * 0.95, ROW_GLOW_DEPTH, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  return (
    <instancedMesh ref={ref} args={[undefined, glowMaterial, count]} frustumCulled renderOrder={1}>
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
}
