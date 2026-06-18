import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { getActiveNpcRuntimes } from '../../systems/npcRegistry';
import { tryNpcProximityBump } from '../../systems/handleCollision';

const BUMP_RADIUS = 1.25;

export function PlayerNpcProximityCollision() {
  const phase = useGameStore((s) => s.phase);

  useFrame(() => {
    if (phase !== 'PARKING' && phase !== 'SHOPPING') return;

    const { position, speed: playerSpeed } = useCartTransformStore.getState();
    const px = position.x;
    const pz = position.z;

    for (const npc of getActiveNpcRuntimes()) {
      const dx = px - npc.x;
      const dz = pz - npc.z;
      if (dx * dx + dz * dz > BUMP_RADIUS * BUMP_RADIUS) continue;

      tryNpcProximityBump(npc.meta.npcId, playerSpeed, npc.speed, npc.meta.cartLoad);
    }
  });

  return null;
}
