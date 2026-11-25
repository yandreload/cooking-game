// Simmer & Serve — keyboard and pointer input, read once per frame.
// Movement keys (WASD or arrows) give a direction; E or Space is the one
// action key; the pointer sets a walk target and clicks stations.

export const ACTION_INTERACT = 'interact';
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let walkTarget = null;
  let clickedStation = null;

  function keyName(event) {
    return event.code;
  }

  function onKeyDown(event) {
    const code = keyName(event);
    if (MOVE_KEYS[code] || code === 'Space') event.preventDefault();
    if (!event.repeat) {
      held.add(code);
      pressed.add(code);
    }
  }

  function onKeyUp(event) {
    held.delete(keyName(event));
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    walkTarget = { x, y };
    clickedStation = { x, y };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);

  function moveDirection() {
    let x = 0;
    let y = 0;
    for (const code of held) {
      const dir = MOVE_KEYS[code];
      if (dir) {
        x += dir[0];
        y += dir[1];
      }
    }
    if (x === 0 && y === 0) return null;
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  function wasPressed(code) {
    return pressed.has(code);
  }

  return {
    // A fresh direction each frame, or null when no movement key is held.
    moveDirection,
    // True while the action key is held down (chopping needs a hold).
    interactHeld() {
      return held.has('KeyE') || held.has('Space');
    },
    // True only on the frame the key went down (picking up, serving).
    interactPressed() {
      return pressed.has('KeyE') || pressed.has('Space');
    },
    confirmPressed() {
      return pressed.has('Enter') || pressed.has('Space') || pressed.has('KeyE');
    },
    actionPressed(action) {
      if (action === ACTION_PAUSE) return wasPressed('KeyP') || wasPressed('Escape');
      if (action === ACTION_MUTE) return wasPressed('KeyM');
      if (action === ACTION_RESTART) return wasPressed('KeyR');
      return false;
    },
    // The pointer's walk target, cleared once the chef arrives.
    walkTarget() {
      return walkTarget;
    },
    clearWalkTarget() {
      walkTarget = null;
    },
    // The last clicked point (a station tap), consumed once read.
    takeClick() {
      const click = clickedStation;
      clickedStation = null;
      return click;
    },
    // Called at the end of each frame: edge presses live for one frame only.
    endFrame() {
      pressed.clear();
    },
  };
}
