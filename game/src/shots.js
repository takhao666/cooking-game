// shots.js — deterministic screenshot scenes for ?shot=.
// One file, one job: play the real game with a scripted autopilot and freeze
// the frame, so every screenshot is a genuine render of the game's own code.

import { INGREDIENTS, RECIPES, STATIONS, preparedId, stationAnchor } from './config.js';
import { createWorld, findPath, spawnOrder, tryInteract, updateWorld } from './world.js';

const STEP = 1 / 60;

function binAnchor(binId) {
  const pantry = STATIONS.pantry;
  const binWidth = pantry.width / pantry.bins.length;
  const index = pantry.bins.indexOf(binId);
  return { x: pantry.x + binWidth * (index + 0.5), y: pantry.y + pantry.height + 26 };
}

function stationTarget(key) {
  if (key === 'board') return stationAnchor(STATIONS.board);
  if (key === 'stove') return stationAnchor(STATIONS.stove);
  if (key === 'window') return stationAnchor(STATIONS.window);
  if (key === 'island') return stationAnchor(STATIONS.island);
  if (key === 'trash') return stationAnchor(STATIONS.trash);
  return { x: 760, y: 560 };
}

// Walk the chef toward a point along a found path; true once the chef is
// close enough to use it. nav holds the path across frames of one step.
function driveTo(world, input, point, nav, range = 58) {
  const chef = world.chef;
  const distance = Math.hypot(point.x - chef.x, point.y - chef.y);
  if (distance <= range) {
    input.moveX = 0;
    input.moveY = 0;
    nav.path = null;
    return true;
  }
  if (!nav.path || nav.path.length === 0) nav.path = findPath(chef, point);
  const waypoint = nav.path[0];
  const dx = waypoint.x - chef.x;
  const dy = waypoint.y - chef.y;
  const leg = Math.hypot(dx, dy);
  if (leg < 14) {
    nav.path.shift();
    input.moveX = 0;
    input.moveY = 0;
  } else {
    input.moveX = dx / leg;
    input.moveY = dy / leg;
  }
  return false;
}

// One scripted step. Returns true when the step is done.
function runStep(world, input, step, nav) {
  const chef = world.chef;
  const holding = chef.holding;

  switch (step.do) {
    case 'take': {
      const point = binAnchor(step.bin);
      if (!driveTo(world, input, point, nav)) return false;
      if (!holding) {
        tryInteract(world, { station: 'pantry', bin: step.bin });
        return !!chef.holding;
      }
      return true;
    }
    case 'placeBoard': {
      if (!driveTo(world, input, stationTarget('board'), nav)) return false;
      if (holding && holding.kind === 'ingredient') {
        input.interactPressed = true;
        return !chef.holding;
      }
      return !holding;
    }
    case 'chop': {
      if (!driveTo(world, input, stationTarget('board'), nav)) return false;
      if (world.board.id && world.board.progress < 1) {
        input.interactHeld = true;
        return false;
      }
      if (world.board.id && world.board.progress >= 1) {
        input.interactPressed = true;
        return !!holding;
      }
      return true;
    }
    case 'cook': {
      if (!driveTo(world, input, stationTarget('stove'), nav)) return false;
      if (holding && holding.kind === 'ingredient') {
        input.interactPressed = true;
        return !chef.holding;
      }
      return true;
    }
    case 'takeCooked': {
      if (!driveTo(world, input, stationTarget('stove'), nav)) return false;
      const ready = world.burners.some((burner) => burner.item && burner.item.state === 'done');
      if (ready && !holding) {
        input.interactPressed = true;
        return !!chef.holding;
      }
      return !!holding;
    }
    case 'takePlate': {
      if (!driveTo(world, input, stationTarget('island'), nav)) return false;
      if (!holding) {
        input.interactPressed = true;
        return !!chef.holding;
      }
      return true;
    }
    case 'placePlate': {
      if (!driveTo(world, input, stationTarget('island'), nav)) return false;
      if (holding && holding.kind === 'plate') {
        input.interactPressed = true;
        return !!world.islandPlate;
      }
      return !!world.islandPlate;
    }
    case 'addToPlate': {
      if (!driveTo(world, input, stationTarget('island'), nav)) return false;
      if (holding && holding.kind === 'ingredient' && world.islandPlate) {
        input.interactPressed = true;
        return !chef.holding;
      }
      return !holding;
    }
    case 'takePlateFromIsland': {
      if (!driveTo(world, input, stationTarget('island'), nav)) return false;
      if (!holding && world.islandPlate) {
        input.interactPressed = true;
        return !!chef.holding;
      }
      return !!holding;
    }
    case 'serve': {
      if (!driveTo(world, input, stationTarget('window'), nav)) return false;
      if (holding && holding.kind === 'plate') {
        input.interactPressed = true;
        return !chef.holding;
      }
      return true;
    }
    case 'wait': {
      step.elapsed = (step.elapsed ?? 0) + STEP;
      return step.elapsed >= (step.seconds ?? 1);
    }
    default:
      return true;
  }
}

// Run a whole plan step by step. Stops early when `until` says to freeze.
function runPlan(world, plan, until) {
  const input = {
    moveX: 0, moveY: 0, interactHeld: false, interactPressed: false,
    moveTarget: null, pending: null,
  };
  let stepIndex = 0;
  let guard = 0;
  let nav = { path: null };
  while (stepIndex < plan.length && guard < 60 * 240) {
    guard += 1;
    input.interactHeld = false;
    input.interactPressed = false;
    const done = runStep(world, input, plan[stepIndex], nav);
    updateWorld(world, STEP, input);
    if (until && until(world, stepIndex)) return;
    if (done) {
      stepIndex += 1;
      nav = { path: null };
    }
  }
}

function freshShotWorld(seed, day, orders, dayTime) {
  const world = createWorld(seed, day);
  world.tuning.spawnInterval = 999; // shots control their own orders
  world.tuning.maxOrders = 5;
  world.dayTime = dayTime;
  for (let i = 0; i < orders; i += 1) spawnOrder(world);
  return world;
}

// The salad build, in the order a real player does it: plate first (one
// pair of hands), then chop each veggie and add it as it is ready.
const SALAD_PLAN = [
  { do: 'takePlate' },
  { do: 'placePlate' },
  { do: 'take', bin: 'tomato' },
  { do: 'placeBoard' },
  { do: 'chop' },
  { do: 'addToPlate' },
  { do: 'take', bin: 'lettuce' },
  { do: 'placeBoard' },
  { do: 'chop' },
  { do: 'addToPlate' },
];

// The cover: a salad mid-assembly on the plating counter, a patty on the
// stove, three tickets on the board. Freeze after the first item lands.
export function shotCover() {
  const world = freshShotWorld(7, 1, 3, 62);
  const plan = [
    { do: 'take', bin: 'patty' },
    { do: 'cook' },
    ...SALAD_PLAN,
  ];
  runPlan(world, plan, (w) => w.islandPlate && w.islandPlate.items.length >= 1);
  return world;
}

// The rush: day 2, four tickets with little patience left, both burners
// cooking, the chef carrying a plated salad toward the window. Cooking
// starts last so nothing burns before the freeze.
export function shotRush() {
  const world = freshShotWorld(21, 2, 4, 118);
  // Low, but not so low that the ~24 seconds of scripted play kills them:
  // at the freeze they sit at a few seconds, red and urgent.
  world.orders.forEach((order, index) => {
    order.patience = 30 + index * 4;
    order.maxPatience = order.patience;
  });
  const plan = [
    ...SALAD_PLAN,
    { do: 'take', bin: 'patty' },
    { do: 'cook' },
    { do: 'take', bin: 'pasta' },
    { do: 'cook' },
    { do: 'takePlateFromIsland' },
  ];
  runPlan(world, plan, (w) => w.chef.holding && w.chef.holding.kind === 'plate'
    && w.chef.holding.items.length >= 2);
  return world;
}

// The serve: a salad handed over at the window, coins flying.
export function shotServe() {
  const world = freshShotWorld(4, 1, 2, 45);
  // Make sure a salad is actually wanted.
  world.orders[0].recipe = RECIPES.find((recipe) => recipe.id === 'salad');
  const plan = [
    ...SALAD_PLAN,
    { do: 'take', bin: 'patty' },
    { do: 'cook' },
    { do: 'takePlateFromIsland' },
    { do: 'serve' },
  ];
  let servedAt = -1;
  runPlan(world, plan, (w) => {
    if (servedAt < 0 && w.served >= 1) servedAt = w.dayTime;
    return servedAt >= 0 && w.dayTime >= servedAt + 0.5;
  });
  return world;
}

// A fresh world behind the title screen.
export function shotTitle() {
  const world = freshShotWorld(11, 1, 2, 30);
  return world;
}

export const SHOTS = {
  cover: shotCover,
  rush: shotRush,
  serve: shotServe,
  title: shotTitle,
};

// True when this page load is a screenshot render, and which scene it is.
export function shotFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('shot');
  if (!name || !SHOTS[name]) return null;
  const seed = Number(params.get('seed') ?? 1);
  return { name, seed, build: SHOTS[name] };
}

export { INGREDIENTS, preparedId };
