// Simmer & Serve — a scripted pair of hands that plays the real game. The
// screenshot scenes run the world's own step() with these inputs, so every
// staged frame is a moment a real player could reach, with the same seed
// giving the same frame every time.
//
// Two kinds of play: fixed scripts (a list of goals, used for the staged
// screenshots) and the shift policy (a little cook that reads the order
// board, builds what the oldest ticket asks for, and serves it — used to
// play a whole day through for the closing shot).

import { CHEF, INGREDIENTS, RECIPES } from './config.js';
import { planRoute } from './routes.js';

// A clear spot to stand at to work each station, just outside its reach.
const APPROACH = {
  'crate-tomato': { x: 195, y: 218 },
  'crate-lettuce': { x: 195, y: 318 },
  'crate-cheese': { x: 195, y: 418 },
  'crate-patty': { x: 195, y: 518 },
  'crate-bun': { x: 195, y: 618 },
  board: { x: 385, y: 480 },
  plate: { x: 690, y: 520 },
  stove: { x: 530, y: 200 },
  serve: { x: 1137, y: 200 },
  trash: { x: 1192, y: 620 },
};

export function approachPoint(stationId) {
  return APPROACH[stationId] || { x: 640, y: 620 };
}

// One salad, as a flat list of goals: plate on the counter, chopped lettuce
// and chopped tomato added to it. The caller can append a serve afterwards.
export function saladRoutine() {
  return [
    { type: 'goto', at: 'plate' },
    { type: 'tap' },
    { type: 'tap' },
    { type: 'goto', at: 'crate-lettuce' },
    { type: 'tap' },
    { type: 'goto', at: 'board' },
    { type: 'tap' },
    { type: 'hold', seconds: 1.8 },
    { type: 'tap' },
    { type: 'goto', at: 'plate' },
    { type: 'tap' },
    { type: 'goto', at: 'crate-tomato' },
    { type: 'tap' },
    { type: 'goto', at: 'board' },
    { type: 'tap' },
    { type: 'hold', seconds: 1.8 },
    { type: 'tap' },
    { type: 'goto', at: 'plate' },
    { type: 'tap' },
  ];
}

// A burger, as goals: patty on the stove, then bun + cooked patty + cheese
// onto the plate that already waits on the counter.
export function burgerRoutine() {
  return [
    { type: 'goto', at: 'crate-patty' },
    { type: 'tap' },
    { type: 'goto', at: 'stove' },
    { type: 'tap' },
    { type: 'wait', seconds: 6.5 },
    { type: 'tap' },
    { type: 'goto', at: 'crate-bun' },
    { type: 'tap' },
    { type: 'goto', at: 'plate' },
    { type: 'tap' },
    { type: 'goto', at: 'crate-cheese' },
    { type: 'tap' },
    { type: 'goto', at: 'plate' },
    { type: 'tap' },
  ];
}

// ---------------------------------------------------------------------------
// The shift policy: cook the oldest ticket, one micro-task at a time.
// ---------------------------------------------------------------------------

function plateIsFor(items, dish) {
  const recipe = RECIPES[dish];
  if (items.length > recipe.items.length) return false;
  const remaining = [...recipe.items];
  for (const item of items) {
    const index = remaining.indexOf(item);
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return true;
}

function plateMatchesDish(items, dish) {
  const recipe = RECIPES[dish];
  if (items.length !== recipe.items.length) return false;
  const have = [...items].sort();
  const want = [...recipe.items].sort();
  return have.every((item, index) => item === want[index]);
}

function missingFor(items, dish) {
  const remaining = [...RECIPES[dish].items];
  for (const item of items) {
    const index = remaining.indexOf(item);
    if (index !== -1) remaining.splice(index, 1);
  }
  return remaining[0] || null;
}

function crateFor(ingredientId) {
  const raw = ingredientId.replace('chopped-', '').replace('cooked-', '').replace('burnt-', '');
  return `crate-${raw}`;
}

// The next micro-task for the cook, as a short goal list. Runs from the
// current world state, so a ticket that timed out mid-build just re-plans.
function decideMicroTask(state) {
  const chef = state.chef;
  const carrying = chef.carrying;

  // A finished plate in hand goes straight to the window; an empty one
  // goes back on the counter.
  if (carrying && carrying.type === 'plate') {
    if (carrying.items.length === 0 && !state.counterPlate) {
      return [{ type: 'goto', at: 'plate' }, { type: 'tap' }];
    }
    const dish = Object.keys(RECIPES).find((id) => plateMatchesDish(carrying.items, id));
    if (dish && state.orders.some((order) => order.dish === dish)) {
      return [{ type: 'goto', at: 'serve' }, { type: 'tap' }];
    }
    return [{ type: 'goto', at: 'trash' }, { type: 'tap' }];
  }

  // A finished plate waiting on the counter gets picked up.
  if (!carrying && state.counterPlate) {
    const dish = Object.keys(RECIPES).find((id) => plateMatchesDish(state.counterPlate.items, id));
    if (dish && state.orders.some((order) => order.dish === dish)) {
      return [{ type: 'goto', at: 'plate' }, { type: 'tap' }];
    }
  }

  // A plate on the counter that no open ticket can still use gets binned —
  // but with no tickets up at all, the plate just waits for the next one.
  if (!carrying && state.counterPlate) {
    if (state.orders.length === 0) return [{ type: 'wait', seconds: 1 }];
    const usable = state.orders.some((order) => plateIsFor(state.counterPlate.items, order.dish));
    if (!usable) {
      return [
        { type: 'goto', at: 'plate' },
        { type: 'tap' },
        { type: 'goto', at: 'trash' },
        { type: 'tap' },
      ];
    }
  }

  // Something in hand: finish what it needs, or bin it.
  if (carrying && carrying.type === 'ingredient') {
    const id = carrying.id;
    if (id === 'burnt-patty') return [{ type: 'goto', at: 'trash' }, { type: 'tap' }];
    if (state.counterPlate) {
      const dish = state.orders.find((order) => plateIsFor([...state.counterPlate.items, id], order.dish));
      if (dish) return [{ type: 'goto', at: 'plate' }, { type: 'tap' }];
    }
    if (INGREDIENTS[id] && INGREDIENTS[id].chop) {
      return [
        { type: 'goto', at: 'board' },
        { type: 'tap' },
        { type: 'hold', seconds: 1.8 },
        { type: 'tap' },
      ];
    }
    if (id === 'patty') {
      return [{ type: 'goto', at: 'stove' }, { type: 'tap' }];
    }
    return [{ type: 'goto', at: 'trash' }, { type: 'tap' }];
  }

  // Empty hands, no plate on the counter: start a fresh one.
  if (!state.counterPlate) {
    return [{ type: 'goto', at: 'plate' }, { type: 'tap' }, { type: 'tap' }];
  }

  // Empty hands, a plate waiting: fetch what it still needs for the oldest
  // ticket it can still become.
  const order = state.orders.find((o) => plateIsFor(state.counterPlate.items, o.dish));
  if (!order) return [{ type: 'wait', seconds: 1 }];
  const missing = missingFor(state.counterPlate.items, order.dish);
  if (!missing) return [{ type: 'wait', seconds: 1 }];

  if (missing.startsWith('chopped-')) {
    const raw = missing.replace('chopped-', '');
    return [
      { type: 'goto', at: crateFor(raw) },
      { type: 'tap' },
      { type: 'goto', at: 'board' },
      { type: 'tap' },
      { type: 'hold', seconds: 1.8 },
      { type: 'tap' },
      { type: 'goto', at: 'plate' },
      { type: 'tap' },
    ];
  }
  if (missing === 'cooked-patty') {
    const cooked = state.burners.find((burner) => burner.state === 'cooked');
    if (cooked) {
      return [
        { type: 'goto', at: 'stove' },
        { type: 'tap' },
        { type: 'goto', at: 'plate' },
        { type: 'tap' },
      ];
    }
    return [
      { type: 'goto', at: 'crate-patty' },
      { type: 'tap' },
      { type: 'goto', at: 'stove' },
      { type: 'tap' },
      { type: 'wait', seconds: 6.5 },
      { type: 'tap' },
      { type: 'goto', at: 'plate' },
      { type: 'tap' },
    ];
  }
  return [
    { type: 'goto', at: crateFor(missing) },
    { type: 'tap' },
    { type: 'goto', at: 'plate' },
    { type: 'tap' },
  ];
}

// ---------------------------------------------------------------------------
// The executor: runs a goal list, one goal at a time, steering along routes.
// ---------------------------------------------------------------------------

export function createAutopilot(world) {
  let goals = [];
  let index = 0;
  let goalTime = 0;
  let holdLeft = 0;
  let route = null;
  let routeLeg = 0;
  let shiftMode = false;

  function currentGoal() {
    return goals[index] || null;
  }

  function startGoto(goal) {
    const target = goal.at ? approachPoint(goal.at) : goal;
    route = planRoute(world.state.chef, target, CHEF.radius);
    routeLeg = 0;
    goalTime = 0;
  }

  function stepGoto(dt) {
    const actions = { dir: null, hold: false, tap: false, click: null };
    if (!route || routeLeg >= route.length) return { actions, finished: true };
    const chef = world.state.chef;
    const target = route[routeLeg];
    const dx = target.x - chef.x;
    const dy = target.y - chef.y;
    const distance = Math.hypot(dx, dy);
    // Stop close enough that a tap still reaches the station: the approach
    // points sit just inside the 67px reach, so 10px of slack is the most
    // this leg may leave.
    if (distance < 10) {
      routeLeg += 1;
      return { actions, finished: routeLeg >= route.length };
    }
    if (goalTime > 10) return { actions, finished: true };
    actions.dir = { x: dx / distance, y: dy / distance };
    return { actions, finished: false };
  }

  return {
    setScript(list) {
      goals = list;
      index = 0;
      goalTime = 0;
      holdLeft = 0;
      route = null;
      routeLeg = 0;
      shiftMode = false;
    },
    // Play a whole shift: keep deciding micro-tasks until the day ends.
    setShift() {
      goals = [{ type: 'shift' }];
      index = 0;
      goalTime = 0;
      holdLeft = 0;
      route = null;
      routeLeg = 0;
      shiftMode = true;
    },
    get done() {
      return index >= goals.length;
    },
    // One tick of play. Returns the actions the world should run this tick.
    update(dt) {
      const goal = currentGoal();
      const actions = { dir: null, hold: false, tap: false, click: null };
      if (!goal) return actions;
      goalTime += dt;

      if (goal.type === 'shift') {
        if (world.state.over) {
          index += 1;
          return actions;
        }
        // When the current micro-task runs out, decide the next one.
        if (index + 1 >= goals.length || goals[index + 1] === undefined) {
          const next = decideMicroTask(world.state);
          goals = [...goals.slice(0, index + 1), ...next];
        }
        // Fall through to execute the micro-task that follows this marker.
        const nextGoal = goals[index + 1];
        if (!nextGoal) return actions;
        // Execute it inline by treating it as the current goal.
        goals.splice(index + 1, 1);
        goals.splice(index, 0, nextGoal);
        return this.update(0);
      }

      if (goal.type === 'goto') {
        if (route === null) startGoto(goal);
        const result = stepGoto(dt);
        if (result.finished) {
          index += 1;
          goalTime = 0;
          route = null;
        }
        return result.actions;
      }

      if (goal.type === 'tap') {
        actions.tap = true;
        index += 1;
        goalTime = 0;
        return actions;
      }

      if (goal.type === 'hold') {
        if (holdLeft <= 0) holdLeft = goal.seconds;
        actions.hold = true;
        holdLeft -= dt;
        if (holdLeft <= 0) {
          index += 1;
          goalTime = 0;
          holdLeft = 0;
        }
        return actions;
      }

      if (goal.type === 'wait') {
        if (goalTime >= goal.seconds) {
          index += 1;
          goalTime = 0;
        }
        return actions;
      }

      index += 1;
      goalTime = 0;
      return actions;
    },
  };
}
