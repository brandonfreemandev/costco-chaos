import { Environment, Lightformer } from '@react-three/drei';
import { TROFFER_DEPTH, TROFFER_WIDTH, WAREHOUSE_CEILING_LIGHTS } from './warehouseLightGrid';
import { WH_CEILING } from './warehouseLayout';

/**
 * Image-based lighting with rect lightformers over each aisle.
 * Replaces real point lights — one cubemap sample, no per-light shading cost.
 */
export function WarehouseEnvironment() {
  return (
    <Environment resolution={128} environmentIntensity={0.85} preset="warehouse">
      {WAREHOUSE_CEILING_LIGHTS.map((light, i) => (
        <Lightformer
          key={`lf-${i}`}
          form="rect"
          color="#fff8e8"
          intensity={1.4}
          rotation={[Math.PI / 2, 0, 0]}
          position={[light.x, WH_CEILING - 0.05, light.z]}
          scale={[TROFFER_WIDTH, TROFFER_DEPTH, 1]}
        />
      ))}
      {/* Soft fill so rack undersides aren't pure black */}
      <Lightformer
        form="rect"
        color="#c8d4e0"
        intensity={0.35}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, WH_CEILING + 1, 0]}
        scale={[40, 56, 1]}
      />
    </Environment>
  );
}
