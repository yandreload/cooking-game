// Simmer & Serve — the screenshot scenes behind ?shot=start|assembly|serve|end.
// Each one plays the real rules forward from a fresh world for a fixed
// script, steered by the autopilot, so the frame is what a short game really
// looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { SCREEN_DAY_CLEAR, SCREEN_FAILED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAutopilot, saladRoutine } from './autopilot.js';

const SAMPLE = STEP;

/** Run the world forward with the autopilot's script and stop a second after
 * it finishes (long enough for the last tap's particles to settle, short
 * enough that no ticket times out after the scene is set). `seconds` is a
 * cap, not a target. */
function playScript(world, pilot, script, seconds) {
  pilot.setScript(script);
  const steps = Math.floor(seconds / SAMPLE);
  let settle = 0;
  for (let i = 0; i < steps; i += 1) {
    if (world.state.over) break;
    const actions = pilot.update(SAMPLE);
    world.step(SAMPLE, actions, null);
    if (pilot.done) {
      settle += SAMPLE;
      if (settle >= 1) break;
    }
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: the title over a kitchen with orders already on the board.
 * assembly: a salad half-built on the plating counter, a patty sizzling.
 * serve: a finished plate carried to the serving window.
 * end: a whole day played through to its closing screen.
 */
export function stageShot(name, world) {
  const pilot = createAutopilot(world);
  world.reset();

  if (name === 'assembly') {
    // A salad half-built on the plating counter, a patty just put on the
    // stove, the chef holding a chopped tomato at the counter. The tomato
    // is chopped first and left on the board while the patty goes on, so
    // the frame catches it still sizzling instead of burnt.
    const script = [
      ...saladRoutine().slice(0, 11),
      { type: 'goto', at: 'crate-tomato' },
      { type: 'tap' },
      { type: 'goto', at: 'board' },
      { type: 'tap' },
      { type: 'hold', seconds: 1.8 },
      { type: 'goto', at: 'crate-patty' },
      { type: 'tap' },
      { type: 'goto', at: 'stove' },
      { type: 'tap' },
      { type: 'goto', at: 'board' },
      { type: 'tap' },
      { type: 'goto', at: 'plate' },
    ];
    playScript(world, pilot, script, 90);
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'serve') {
    const script = [
      ...saladRoutine(),
      { type: 'tap' },
      { type: 'goto', at: 'serve' },
    ];
    playScript(world, pilot, script, 90);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }

  if (name === 'end') {
    // A whole day played through by the shift policy: it cooks whatever the
    // oldest ticket asks for until the shift clock runs out.
    const pilot = createAutopilot(world);
    pilot.setShift();
    const steps = Math.floor(170 / SAMPLE);
    for (let i = 0; i < steps; i += 1) {
      if (world.state.over) break;
      const actions = pilot.update(SAMPLE);
      world.step(SAMPLE, actions, null);
    }
    const over = world.state.over === 'failed';
    return { screen: over ? SCREEN_FAILED : SCREEN_DAY_CLEAR, best: world.state.score };
  }

  // start (and anything unknown): let two orders arrive, then hold the title.
  playScript(world, pilot, [{ type: 'wait', seconds: 20 }], 20);
  return { screen: SCREEN_TITLE, best: 0 };
}
