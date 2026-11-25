// input.js — keyboard and mouse, turned into one small input state.
// One file, one job: read the player's hands, remember what they mean.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    // movement vector, recomputed each frame from keys or a click target
    moveX: 0,
    moveY: 0,
    interactHeld: false,
    interactPressed: false,
    // click-to-move: null or {x, y} in canvas coordinates
    moveTarget: null,
    // the found route to the click target, from world.findPath
    path: null,
    // a click that wants an interaction when the chef arrives
    pending: null,
    mouse: { x: 0, y: 0, down: false },
  };

  const KEY_ACTIONS = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyE: 'interact', Space: 'interact',
  };

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (!event.repeat) {
      keys.add(action);
      if (action === 'interact') state.interactPressed = true;
    }
    state.interactHeld = keys.has('interact');
  });

  window.addEventListener('keyup', (event) => {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    keys.delete(action);
    state.interactHeld = keys.has('interact');
  });

  window.addEventListener('blur', () => {
    keys.clear();
    state.interactHeld = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const point = canvasPoint(event);
    state.mouse.x = point.x;
    state.mouse.y = point.y;
  });

  // A held mouse button counts as holding E (so holding it on the chopping
  // board chops); taps are handled by main.js's click listener instead, so
  // a click never also fires a stray interact.
  canvas.addEventListener('mousedown', (event) => {
    const point = canvasPoint(event);
    state.mouse.x = point.x;
    state.mouse.y = point.y;
    state.mouse.down = true;
    state.interactHeld = true;
  });

  window.addEventListener('mouseup', () => {
    state.mouse.down = false;
    if (!keys.has('interact')) state.interactHeld = false;
  });

  // Recompute the movement vector. Keyboard wins over a click target.
  function poll() {
    let x = 0;
    let y = 0;
    if (keys.has('left')) x -= 1;
    if (keys.has('right')) x += 1;
    if (keys.has('up')) y -= 1;
    if (keys.has('down')) y += 1;
    if (x !== 0 || y !== 0) {
      state.moveTarget = null;
      state.pending = null;
      state.path = null;
      const length = Math.hypot(x, y);
      state.moveX = x / length;
      state.moveY = y / length;
    } else {
      state.moveX = 0;
      state.moveY = 0;
    }
  }

  return {
    state,
    poll,
    // The world consumes the edge-triggered press once per frame.
    consumeInteractPressed() {
      const pressed = state.interactPressed;
      state.interactPressed = false;
      return pressed;
    },
    clickMoveTo(x, y) {
      state.moveTarget = { x, y };
    },
    clearMoveTarget() {
      state.moveTarget = null;
    },
  };
}
