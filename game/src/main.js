// Simmer & Serve — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps (several in a slow frame, none in a
// fast one), and the renderer paints what is there. The game moves between
// five screens: title, play, paused, day clear and shift over.
//
// ?seed=N fixes the order pattern. ?shot=start|assembly|serve|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.

import { BEST_KEY, STATIONS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSoundBank } from './audio.js';
import { CHEF } from './config.js';
import { planRoute } from './routes.js';
import { approachPoint } from './autopilot.js';
import { createWorld, EVENT_DAY_CLEAR, EVENT_SHIFT_OVER } from './kitchen.js';
import { ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import {
  SCREEN_DAY_CLEAR,
  SCREEN_FAILED,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sounds = createSoundBank();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts one visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let now = 0;
  let walkRoute = null;
  let walkLeg = 0;
  let walkTap = false;
  let pendingTap = false;

  function startShift() {
    world.startDay(1);
    screen = SCREEN_PLAY;
  }

  function frame(time) {
    const elapsed = Math.min(MAX_FRAME, (time - last) / 1000);
    last = time;
    now += elapsed;

    if (input.actionPressed(ACTION_MUTE)) sounds.setMuted(!sounds.isMuted());
    if (input.actionPressed(ACTION_PAUSE) && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
    }

    if (screen === SCREEN_TITLE) {
      if (input.confirmPressed()) {
        sounds.unlock();
        startShift();
      }
    } else if (screen === SCREEN_PLAY) {
      sounds.unlock();
      const click = input.takeClick();
      if (click) {
        // A click on a station walks to its approach point, then works it;
        // a click on open floor just walks there.
        const station = STATIONS.find(
          (s) => click.x >= s.x - 20 && click.x <= s.x + s.w + 20 && click.y >= s.y - 20 && click.y <= s.y + s.h + 20,
        );
        const destination = station ? approachPoint(station.id) : click;
        walkRoute = planRoute(world.state.chef, destination, CHEF.radius);
        walkLeg = 0;
        walkTap = Boolean(station);
      }
      let dir = input.moveDirection();
      if (!dir && walkRoute) {
        const chef = world.state.chef;
        const target = walkRoute[walkLeg];
        if (!target) {
          walkRoute = null;
        } else {
          const dx = target.x - chef.x;
          const dy = target.y - chef.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 14) {
            walkLeg += 1;
            if (walkLeg >= walkRoute.length) {
              walkRoute = null;
              if (walkTap) {
                pendingTap = true;
                walkTap = false;
              }
            }
          } else {
            dir = { x: dx / distance, y: dy / distance };
          }
        }
      }
      if (dir) {
        walkRoute = null;
        walkTap = false;
      }
      const actions = {
        dir,
        hold: input.interactHeld(),
        tap: input.interactPressed() || pendingTap,
        click: null,
      };
      pendingTap = false;
      let steps = 0;
      accumulator += elapsed;
      while (accumulator >= STEP && steps < 5) {
        const events = world.step(STEP, actions, sounds);
        actions.tap = false;
        actions.click = null;
        accumulator -= STEP;
        steps += 1;
        if (events & EVENT_DAY_CLEAR) {
          screen = SCREEN_DAY_CLEAR;
          best = Math.max(best, world.state.score);
          saveBest(best);
        } else if (events & EVENT_SHIFT_OVER) {
          screen = SCREEN_FAILED;
          best = Math.max(best, world.state.score);
          saveBest(best);
        }
        if (screen !== SCREEN_PLAY) break;
      }
      if (input.actionPressed(ACTION_RESTART)) startShift();
    } else if (screen === SCREEN_DAY_CLEAR) {
      if (input.confirmPressed()) {
        if (world.state.day >= 3) {
          startShift();
        } else {
          world.startDay(world.state.day + 1);
          screen = SCREEN_PLAY;
        }
      }
    } else if (screen === SCREEN_FAILED) {
      if (input.actionPressed(ACTION_RESTART) || input.confirmPressed()) startShift();
    }

    renderer.draw(world.state, screen, best, now);
    input.endFrame();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
