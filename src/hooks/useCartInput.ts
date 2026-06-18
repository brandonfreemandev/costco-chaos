import { useEffect } from 'react';

export interface CartInput {
  forward: boolean;
  backward: boolean;
  steer: number;
}

const inputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

const GAME_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
]);

export function getCartInput(): CartInput {
  let steer = 0;
  if (inputState.left) steer -= 1;
  if (inputState.right) steer += 1;

  return {
    forward: inputState.forward,
    backward: inputState.backward,
    steer,
  };
}

export function useCartInput(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!GAME_KEYS.has(event.code)) return;
      event.preventDefault();

      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputState.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputState.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputState.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputState.right = true;
          break;
        default:
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!GAME_KEYS.has(event.code)) return;
      event.preventDefault();

      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputState.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputState.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputState.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputState.right = false;
          break;
        default:
          break;
      }
    };

    const onBlur = () => {
      inputState.forward = false;
      inputState.backward = false;
      inputState.left = false;
      inputState.right = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
