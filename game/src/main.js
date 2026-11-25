// main.js — boots the game, runs the loop, owns the screens (title, play,
// pause, day end, game over) and turns clicks into walk-to-and-use.
// One file, one job: the frame around the simulation.

import { INTERACT_RANGE, STATIONS, VIEW } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { shotFromQuery } from './shots.js';
import {
  createWorld, findPath, nearestInteractable, nextDay, restartWorld, tryInteract, updateWorld,
} from './world.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');

const input = createInput(canvas);
const audio = createAudio();

const shot = shotFromQuery();

// ------------------------------------------------------------ screenshot mode
// ?shot=cover|rush|serve|title renders one frozen frame of real gameplay and
// stops: headless Chrome screenshots exactly this frame.
if (shot) {
  const world = shot.build();
  const ui = {
    phase: shot.name === 'title' ? 'title' : 'play',
    showHelp: false,
    muted: true,
    nearest: null,
  };
  render(ctx, world, ui);
} else {
  startGame();
}

function startGame() {
  let world = createWorld((Math.random() * 1000000000) | 0, 1);
  let phase = 'title';
  let showHelp = false;
  let muted = false;
  let started = false;

  function playEventSounds() {
    world.events.forEach((event) => {
      if (event.type === 'pickup') audio.pickup();
      else if (event.type === 'chop') audio.chop();
      else if (event.type === 'chopped') audio.chopped();
      else if (event.type === 'sizzleStart') audio.sizzleStart();
      else if (event.type === 'ding') audio.ding();
      else if (event.type === 'serve') audio.serve();
      else if (event.type === 'error') audio.error();
      else if (event.type === 'miss') audio.miss();
      else if (event.type === 'tick') audio.tick();
    });
    world.events.length = 0;
  }

  function startCooking() {
    audio.unlock();
    audio.startMusic();
    started = true;
    phase = 'play';
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Enter') {
      if (phase === 'title') startCooking();
      else if (phase === 'dayend') {
        nextDay(world);
        phase = 'play';
      } else if (phase === 'gameover') {
        restartWorld(world);
        phase = 'play';
      }
    } else if (event.code === 'KeyP') {
      if (phase === 'play') phase = 'paused';
      else if (phase === 'paused') phase = 'play';
    } else if (event.code === 'KeyM') {
      muted = !muted;
      audio.setMuted(muted);
    } else if (event.code === 'KeyH' || event.code === 'Escape') {
      if (phase === 'play') showHelp = !showHelp;
    }
  });

  // Click a station to walk over and use it; click the floor to walk there.
  canvas.addEventListener('click', (event) => {
    if (phase !== 'play' || showHelp) return;
    audio.unlock();
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const clicked = stationAt(x, y);
    if (!clicked) {
      input.state.path = findPath(world.chef, { x, y });
      input.clickMoveTo(x, y);
      input.state.pending = null;
      return;
    }
    const distance = Math.hypot(world.chef.x - clicked.anchor.x, world.chef.y - clicked.anchor.y);
    if (distance < INTERACT_RANGE + 12) {
      tryInteract(world, clicked.context);
      playEventSounds();
    } else {
      input.state.path = findPath(world.chef, clicked.anchor);
      input.clickMoveTo(clicked.anchor.x, clicked.anchor.y);
      input.state.pending = clicked.context;
    }
  });

  // Which station (if any) sits under a canvas point, and how to use it.
  function stationAt(x, y) {
    const pantry = STATIONS.pantry;
    if (x >= pantry.x && x < pantry.x + pantry.width && y >= pantry.y && y < pantry.y + pantry.height) {
      const binWidth = pantry.width / pantry.bins.length;
      const index = Math.min(Math.floor((x - pantry.x) / binWidth), pantry.bins.length - 1);
      const bin = pantry.bins[index];
      return {
        anchor: { x: pantry.x + binWidth * (index + 0.5), y: pantry.y + pantry.height + 26 },
        context: { station: 'pantry', bin },
      };
    }
    const keys = ['board', 'stove', 'window', 'island', 'trash'];
    for (const key of keys) {
      const station = STATIONS[key];
      if (x >= station.x && x < station.x + station.width && y >= station.y && y < station.y + station.height) {
        return {
          anchor: { x: station.x + station.width / 2, y: station.y + station.height + 26 },
          context: { station: key },
        };
      }
    }
    return null;
  }

  let lastTime = performance.now();
  let accumulator = 0;
  const STEP = 1 / 60;

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - lastTime) / 1000, 0.25);
    lastTime = now;
    if (phase !== 'play' || showHelp) {
      render(ctx, world, { phase, showHelp, muted, nearest: null });
      return;
    }
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      accumulator -= STEP;
      steps += 1;
      input.poll();
      const frameInput = {
        moveX: input.state.moveX,
        moveY: input.state.moveY,
        interactHeld: input.state.interactHeld,
        interactPressed: input.consumeInteractPressed(),
        moveTarget: input.state.moveTarget,
        pending: input.state.pending,
        path: input.state.path,
      };
      updateWorld(world, STEP, frameInput);
      // The world mutates the shared input object (path, move target, pending).
      input.state.path = frameInput.path;
      input.state.moveTarget = frameInput.moveTarget;
      input.state.pending = frameInput.pending;
      playEventSounds();
      const cooking = world.burners.filter((burner) => burner.item && burner.item.state === 'cooking').length;
      audio.setSizzle(cooking);
      if (world.gameOver) {
        phase = 'gameover';
        audio.gameOver();
        audio.setSizzle(0);
      } else if (world.dayOver) {
        phase = 'dayend';
        audio.dayComplete();
        audio.setSizzle(0);
      }
    }
    const nearest = phase === 'play' ? nearestInteractable(world) : null;
    render(ctx, world, { phase, showHelp, muted, nearest });
  }

  requestAnimationFrame(frame);
}
