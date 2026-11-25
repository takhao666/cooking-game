// world.js — the simulation: chef, stations, orders, cooking, chopping, serving.
// One file, one job: the rules of the kitchen. Nothing here draws anything.

import {
  BOARD, CHEF, DAY_LENGTH_SECONDS, INGREDIENTS, INTERACT_RANGE,
  MAX_HEARTS, RECIPES, STATIONS, dayTuning, preparedId, recipesForDay,
  stationAnchor,
} from './config.js';

// A small deterministic RNG so a screenshot seed always plays the same game.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stationRects() {
  return [STATIONS.pantry, STATIONS.board, STATIONS.stove, STATIONS.window, STATIONS.island, STATIONS.trash];
}

function circleHitsRect(x, y, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function createWorld(seed, day = 1) {
  const rng = mulberry32(seed);
  const tuning = dayTuning(day);
  const world = {
    seed,
    day,
    rng,
    tuning,
    dayTime: 0,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    hearts: MAX_HEARTS,
    served: 0,
    missed: 0,
    earnedToday: 0,
    orders: [],
    nextOrderIn: 2.5,
    nextOrderId: 1,
    chef: {
      x: 760, y: 560, dir: 'up', holding: null,
      walkPhase: 0, moving: false,
    },
    burners: [
      { item: null },
      { item: null },
    ],
    board: { id: null, progress: 0 },
    islandPlate: null,
    particles: [],
    floaters: [],
    events: [],
    toast: null,
    dayOver: false,
    gameOver: false,
  };
  return world;
}

export function spawnOrder(world) {
  const pool = recipesForDay(world.day);
  const recipe = pool[Math.floor(world.rng() * pool.length)];
  const patience = world.tuning.patience * (0.9 + world.rng() * 0.2);
  world.orders.push({
    id: world.nextOrderId,
    recipe,
    patience,
    maxPatience: patience,
    lastTickSecond: -1,
  });
  world.nextOrderId += 1;
}

function addParticle(world, x, y, options) {
  world.particles.push({
    x, y,
    vx: (world.rng() - 0.5) * (options.spread ?? 60),
    vy: options.vy ?? -40,
    life: 0,
    maxLife: options.life ?? 0.6,
    color: options.color ?? '#ffffff',
    size: options.size ?? 4,
    kind: options.kind ?? 'dot',
  });
}

function burst(world, x, y, color, count = 8) {
  for (let i = 0; i < count; i += 1) addParticle(world, x, y, { color, life: 0.5 + world.rng() * 0.3 });
}

function addFloater(world, x, y, text, color = '#ffd166') {
  world.floaters.push({ x, y, text, life: 0, maxLife: 1.4, color });
}

function setToast(world, text) {
  world.toast = { text, t: 2.2 };
}

function emit(world, type) {
  world.events.push({ type });
}

// ------------------------------------------------------------- interactions
// What the chef can use right now: the nearest station within reach.
export function nearestInteractable(world) {
  const chef = world.chef;
  let best = null;
  let bestDistance = INTERACT_RANGE;

  function consider(key, anchorX, anchorY, extra = {}) {
    const distance = Math.hypot(chef.x - anchorX, chef.y - anchorY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { station: key, x: anchorX, y: anchorY, ...extra };
    }
  }

  const pantry = STATIONS.pantry;
  const binWidth = pantry.width / pantry.bins.length;
  pantry.bins.forEach((id, index) => {
    consider('pantry', pantry.x + binWidth * (index + 0.5), pantry.y + pantry.height + 26, { bin: id });
  });
  consider('board', ...Object.values(stationAnchor(STATIONS.board)));
  consider('stove', ...Object.values(stationAnchor(STATIONS.stove)));
  consider('window', ...Object.values(stationAnchor(STATIONS.window)));
  consider('island', ...Object.values(stationAnchor(STATIONS.island)));
  consider('trash', ...Object.values(stationAnchor(STATIONS.trash)));
  return best;
}

function holdingIngredient(world) {
  const holding = world.chef.holding;
  return holding && holding.kind === 'ingredient' ? holding.id : null;
}

function holdingPlate(world) {
  const holding = world.chef.holding;
  return holding && holding.kind === 'plate' ? holding : null;
}

function setsEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, i) => value === sortedB[i]);
}

export function tryInteract(world, target) {
  if (!target) return;
  const chef = world.chef;

  if (target.station === 'pantry') {
    if (chef.holding) {
      setToast(world, 'Hands full!');
      emit(world, 'error');
      return;
    }
    chef.holding = { kind: 'ingredient', id: target.bin };
    burst(world, chef.x, chef.y - 30, INGREDIENTS[target.bin].color, 6);
    emit(world, 'pickup');
    return;
  }

  if (target.station === 'board') {
    const held = holdingIngredient(world);
    if (held && INGREDIENTS[held] && INGREDIENTS[held].prepared === 'chopped' && !world.board.id) {
      world.board.id = held;
      world.board.progress = 0;
      chef.holding = null;
      emit(world, 'pickup');
      return;
    }
    if (!chef.holding && world.board.id && world.board.progress >= 1) {
      chef.holding = { kind: 'ingredient', id: preparedId(world.board.id) };
      world.board.id = null;
      world.board.progress = 0;
      burst(world, chef.x, chef.y - 30, '#9be15d', 8);
      emit(world, 'chopped');
      return;
    }
    if (!chef.holding && world.board.id) {
      setToast(world, 'Hold E to keep chopping!');
    }
    return;
  }

  if (target.station === 'stove') {
    const held = holdingIngredient(world);
    if (held && INGREDIENTS[held] && INGREDIENTS[held].prepared !== null
      && ['cooked', 'hot'].includes(INGREDIENTS[held].prepared)) {
      const free = world.burners.find((burner) => burner.item === null);
      if (free) {
        free.item = { id: held, state: 'cooking', t: 0 };
        chef.holding = null;
        emit(world, 'sizzleStart');
        return;
      }
      setToast(world, 'Both burners are busy!');
      emit(world, 'error');
      return;
    }
    if (!chef.holding) {
      const ready = world.burners.find((burner) => burner.item && burner.item.state !== 'cooking');
      if (ready) {
        const finished = ready.item.state === 'done' ? preparedId(ready.item.id) : `${ready.item.id}_burnt`;
        chef.holding = { kind: 'ingredient', id: finished };
        ready.item = null;
        emit(world, 'pickup');
        return;
      }
      setToast(world, 'Nothing ready on the stove yet.');
      return;
    }
    return;
  }

  if (target.station === 'island') {
    const plate = holdingPlate(world);
    if (plate && !world.islandPlate) {
      world.islandPlate = plate;
      chef.holding = null;
      emit(world, 'pickup');
      return;
    }
    const held = holdingIngredient(world);
    if (held && world.islandPlate) {
      if (held.endsWith('_burnt')) {
        setToast(world, 'Burnt! That goes in the trash.');
        emit(world, 'error');
        return;
      }
      if (world.islandPlate.items.includes(held)) {
        setToast(world, 'Already on the plate.');
        emit(world, 'error');
        return;
      }
      world.islandPlate.items.push(held);
      chef.holding = null;
      burst(world, STATIONS.island.x + STATIONS.island.width / 2, STATIONS.island.y + 20, '#ffd166', 6);
      emit(world, 'pickup');
      return;
    }
    if (!chef.holding && world.islandPlate) {
      chef.holding = world.islandPlate;
      world.islandPlate = null;
      emit(world, 'pickup');
      return;
    }
    if (!chef.holding && !world.islandPlate) {
      // A clean plate is always waiting on the counter.
      chef.holding = { kind: 'plate', items: [] };
      emit(world, 'pickup');
    }
    return;
  }

  if (target.station === 'window') {
    const plate = holdingPlate(world);
    if (!plate) {
      setToast(world, 'Bring a finished plate to serve.');
      return;
    }
    const match = world.orders.find((order) => setsEqual(order.recipe.components, plate.items));
    if (!match) {
      setToast(world, 'No order wants this dish!');
      emit(world, 'error');
      return;
    }
    const patienceShare = match.patience / match.maxPatience;
    const patienceBonus = Math.round(match.recipe.price * world.tuning.patienceBonus * patienceShare);
    const comboBonus = Math.min(world.combo, 10);
    const earned = match.recipe.price + patienceBonus + comboBonus;
    world.coins += earned;
    world.score += earned * 10 + 25;
    world.combo += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    world.served += 1;
    world.earnedToday += earned;
    world.orders = world.orders.filter((order) => order !== match);
    chef.holding = null;
    const anchor = stationAnchor(STATIONS.window);
    addFloater(world, anchor.x, anchor.y - 10, `+${earned} coins`, '#ffd166');
    burst(world, anchor.x, anchor.y - 20, '#ffd166', 14);
    emit(world, 'serve');
    return;
  }

  if (target.station === 'trash') {
    if (chef.holding) {
      chef.holding = null;
      emit(world, 'pickup');
      setToast(world, 'Tossed it.');
      return;
    }
    setToast(world, 'Nothing to throw away.');
  }
}

// Chopping happens while E is held near the board with a veggie on it.
function updateChopping(world, dt, interactHeld) {
  if (!interactHeld || !world.board.id || world.chef.holding) return;
  const target = nearestInteractable(world);
  if (!target || target.station !== 'board') return;
  const ingredient = INGREDIENTS[world.board.id];
  world.board.progress += dt / ingredient.chopSeconds;
  if (world.rng() < dt * 14) {
    addParticle(world, STATIONS.board.x + 60 + (world.rng() - 0.5) * 40, STATIONS.board.y + 40,
      { color: ingredient.color, vy: -70, life: 0.45, size: 3 });
  }
  if (world.rng() < dt * 6) emit(world, 'chop');
  if (world.board.progress >= 1) {
    world.board.progress = 1;
    emit(world, 'chopped');
  }
}

function updateBurners(world, dt) {
  world.burners.forEach((burner, index) => {
    const item = burner.item;
    if (!item || item.state === 'burnt') return;
    const ingredient = INGREDIENTS[item.id];
    item.t += dt;
    if (item.state === 'cooking' && item.t >= ingredient.cookSeconds) {
      item.state = 'done';
      item.t = 0;
      emit(world, 'ding');
    } else if (item.state === 'done' && item.t >= ingredient.burnSeconds) {
      item.state = 'burnt';
      emit(world, 'error');
    }
    if (item.state === 'cooking' && world.rng() < dt * 8) {
      const burnerPos = STATIONS.stove.burners[index];
      addParticle(world, burnerPos.x + (world.rng() - 0.5) * 30, burnerPos.y - 8,
        { color: '#cfd8dc', vy: -55, life: 0.7, size: 5, kind: 'steam' });
    }
    if (item.state === 'burnt' && world.rng() < dt * 6) {
      const burnerPos = STATIONS.stove.burners[index];
      addParticle(world, burnerPos.x + (world.rng() - 0.5) * 24, burnerPos.y - 10,
        { color: '#616161', vy: -45, life: 0.9, size: 6, kind: 'steam' });
    }
  });
}

function updateOrders(world, dt) {
  if (world.dayTime < DAY_LENGTH_SECONDS - 10) {
    world.nextOrderIn -= dt;
    if (world.nextOrderIn <= 0 && world.orders.length < world.tuning.maxOrders) {
      spawnOrder(world);
      world.nextOrderIn = world.tuning.spawnInterval * (0.8 + world.rng() * 0.4);
    }
  }
  const missed = [];
  world.orders.forEach((order) => {
    order.patience -= dt;
    const secondsLeft = Math.ceil(order.patience);
    if (order.patience < 10 && secondsLeft !== order.lastTickSecond && secondsLeft > 0) {
      order.lastTickSecond = secondsLeft;
      emit(world, 'tick');
    }
    if (order.patience <= 0) missed.push(order);
  });
  missed.forEach((order) => {
    world.orders = world.orders.filter((candidate) => candidate !== order);
    world.hearts = Math.max(0, world.hearts - 1);
    world.combo = 0;
    world.missed += 1;
    setToast(world, `${order.recipe.name} walked out!`);
    emit(world, 'miss');
    if (world.hearts <= 0) world.gameOver = true;
  });
}

function updateParticles(world, dt) {
  world.particles = world.particles.filter((particle) => {
    particle.life += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy -= 12 * dt;
    return particle.life < particle.maxLife;
  });
  world.floaters = world.floaters.filter((floater) => {
    floater.life += dt;
    floater.y -= 34 * dt;
    return floater.life < floater.maxLife;
  });
  if (world.toast) {
    world.toast.t -= dt;
    if (world.toast.t <= 0) world.toast = null;
  }
}

export function canStandAt(x, y) {
  if (x < 244 || x > 1268 || y < 180 || y > 708) return false;
  return !stationRects().some((rect) => circleHitsRect(x, y, CHEF.radius - 2, rect));
}

// A short path across the kitchen floor, found by breadth-first search on a
// coarse grid. Straight-line steering deadlocks when a station sits between
// the chef and the target (the chef slides along its edge forever), so both
// the screenshot autopilot and click-to-move walk this path instead.
export function findPath(from, to) {
  // 20 px cells: the gap between the island and its anchor is only 26 px,
  // so a coarser grid calls the goal cell blocked and gives up.
  const CELL = 20;
  const minX = 244;
  const minY = 180;
  const maxX = 1268;
  const maxY = 708;
  const cols = Math.ceil((maxX - minX) / CELL);
  const rows = Math.ceil((maxY - minY) / CELL);
  const cellCenter = (cx, cy) => ({ x: minX + cx * CELL + CELL / 2, y: minY + cy * CELL + CELL / 2 });
  const toCell = (point) => ({
    cx: Math.max(0, Math.min(cols - 1, Math.floor((point.x - minX) / CELL))),
    cy: Math.max(0, Math.min(rows - 1, Math.floor((point.y - minY) / CELL))),
  });
  const key = (cx, cy) => cy * cols + cx;
  const open = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
    const center = cellCenter(cx, cy);
    return canStandAt(center.x, center.y);
  };
  // The nearest open cell to a point (the point's own cell when it is open).
  const nearestOpen = (cell) => {
    if (open(cell.cx, cell.cy)) return cell;
    for (let radius = 1; radius <= 6; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          if (open(cell.cx + dx, cell.cy + dy)) return { cx: cell.cx + dx, cy: cell.cy + dy };
        }
      }
    }
    return cell;
  };
  const start = nearestOpen(toCell(from));
  const goal = nearestOpen(toCell(to));
  const cameFrom = new Map();
  const seen = new Set([key(start.cx, start.cy)]);
  const queue = [start];
  const neighbours = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.cx === goal.cx && current.cy === goal.cy) {
      const path = [];
      let node = current;
      while (node) {
        path.unshift(cellCenter(node.cx, node.cy));
        node = cameFrom.get(key(node.cx, node.cy));
      }
      path.push(to);
      return path;
    }
    for (const [dx, dy] of neighbours) {
      const nx = current.cx + dx;
      const ny = current.cy + dy;
      if (!open(nx, ny) || seen.has(key(nx, ny))) continue;
      // No cutting corners through a station's edge.
      if (dx !== 0 && dy !== 0 && (!open(current.cx + dx, current.cy) || !open(current.cx, current.cy + dy))) continue;
      seen.add(key(nx, ny));
      cameFrom.set(key(nx, ny), current);
      queue.push({ cx: nx, cy: ny });
    }
  }
  return [to];
}

function moveChef(world, dt, moveX, moveY) {
  const chef = world.chef;
  const length = Math.hypot(moveX, moveY);
  if (length < 0.01) {
    chef.moving = false;
    return;
  }
  const nx = moveX / length;
  const ny = moveY / length;
  const step = CHEF.speed * dt;
  chef.moving = true;
  chef.walkPhase += dt * 11;
  if (Math.abs(nx) > Math.abs(ny)) chef.dir = nx > 0 ? 'right' : 'left';
  else chef.dir = ny > 0 ? 'down' : 'up';
  const tryX = chef.x + nx * step;
  if (canStandAt(tryX, chef.y)) chef.x = tryX;
  const tryY = chef.y + ny * step;
  if (canStandAt(chef.x, tryY)) chef.y = tryY;
}

// One simulation step. input: {moveX, moveY, interactHeld, interactPressed,
// moveTarget, pending, path} — path is a click-to-move route from findPath.
export function updateWorld(world, dt, input) {
  world.dayTime += dt;

  // Movement: keyboard first, otherwise follow the click path, then the
  // click target itself. Arriving at the target fires a queued interaction.
  let moveX = input.moveX;
  let moveY = input.moveY;
  if (moveX === 0 && moveY === 0) {
    const chef = world.chef;
    if (input.path && input.path.length > 0) {
      const waypoint = input.path[0];
      const dx = waypoint.x - chef.x;
      const dy = waypoint.y - chef.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 14) {
        input.path.shift();
      } else {
        moveX = dx / distance;
        moveY = dy / distance;
      }
    } else if (input.moveTarget) {
      const dx = input.moveTarget.x - chef.x;
      const dy = input.moveTarget.y - chef.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 8) {
        input.moveTarget = null;
        if (input.pending) {
          tryInteract(world, input.pending);
          input.pending = null;
        }
      } else {
        moveX = dx / distance;
        moveY = dy / distance;
      }
    }
  }
  moveChef(world, dt, moveX, moveY);

  if (input.interactPressed) {
    const target = nearestInteractable(world);
    tryInteract(world, target);
  }
  updateChopping(world, dt, input.interactHeld);
  updateBurners(world, dt);
  if (!world.gameOver) updateOrders(world, dt);
  updateParticles(world, dt);

  if (world.dayTime >= DAY_LENGTH_SECONDS && !world.gameOver) world.dayOver = true;
}

// Start the next day, keeping the score and most of the hearts.
export function nextDay(world) {
  world.day += 1;
  world.tuning = dayTuning(world.day);
  world.dayTime = 0;
  world.orders = [];
  world.nextOrderIn = 3;
  world.burners = [{ item: null }, { item: null }];
  world.board = { id: null, progress: 0 };
  world.islandPlate = null;
  world.chef.holding = null;
  world.chef.x = 760;
  world.chef.y = 560;
  world.hearts = Math.min(MAX_HEARTS, world.hearts + 1);
  world.earnedToday = 0;
  world.dayOver = false;
}

export function restartWorld(world) {
  const fresh = createWorld(world.seed, 1);
  Object.assign(world, fresh);
}
