import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { buildWalkabilityGraph } from '../../systems/WalkabilityGraph';

const NODE_Y = 0.12;
const EDGE_Y = 0.08;

/**
 * DEV-only overlay — patrol graph nodes (spheres) and cleared edges (lines).
 */
export function WalkabilityGraphOverlay() {
  const graph = useMemo(() => buildWalkabilityGraph(), []);

  const edgeLines = useMemo(() => {
    return graph.edges.map((edge) => {
      const a = graph.nodeById.get(edge.from);
      const b = graph.nodeById.get(edge.to);
      if (!a || !b) return null;
      const color = edge.axis === 'column' ? '#38bdf8' : '#4ade80';
      return (
        <Line
          key={edge.id}
          points={[
            [a.x, EDGE_Y, a.z],
            [b.x, EDGE_Y, b.z],
          ]}
          color={color}
          lineWidth={1.5}
          transparent
          opacity={0.85}
        />
      );
    });
  }, [graph]);

  return (
    <group name="walkability-graph-overlay">
      {graph.nodes.map((node) => (
        <mesh key={node.id} position={[node.x, NODE_Y, node.z]}>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshBasicMaterial color="#f472b6" toneMapped={false} />
        </mesh>
      ))}
      {edgeLines}
    </group>
  );
}
