import { useEffect } from 'react';
import type { CartInput } from '../systems/physicsController';

const keyState = {
  forward: false,
  backward: false,
  steer: 0,
};

export function useCartInput(): CartInput {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keyState.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keyState.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keyState.steer = -1;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keyState.steer = 1;
          break;
        default:
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keyState.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keyState.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          if (keyState.steer < 0) keyState.steer = 0;
          break;
        case 'KeyD':
        case 'ArrowRight':
          if (keyState.steer > 0) keyState.steer = 0;
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return keyState;
}
