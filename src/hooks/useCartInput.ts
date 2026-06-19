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

let interactLatch = false;

const MOVE_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
]);

/** One-shot per press — sample stations, etc. */
export function consumeInteract(): boolean {
  if (!interactLatch) return false;
  interactLatch = false;
  return true;
}

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
      if (event.code === 'KeyE') {
        interactLatch = true;
        return;
      }

      if (!MOVE_KEYS.has(event.code)) return;
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
      if (!MOVE_KEYS.has(event.code)) return;
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
      interactLatch = false;
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
