// Simmer & Serve — the kitchen itself: the chef, the stations, the orders,
// the plates and the score. No drawing here, only rules: step() advances the
// world one fixed tick and returns the events that happened in it.

import {
  CHEF,
  CHEF_START,
  DAY_TARGETS,
  HUD_HEIGHT,
  INGREDIENTS,
  ORDERS,
  RECIPES,
  STATIONS,
  STEP,
  TIMING,
  VIEW,
} from './config.js';

export const EVENT_SERVED = 1;
export const EVENT_FAILED = 2;
export const EVENT_DAY_CLEAR = 4;
export const EVENT_SHIFT_OVER = 8;
export const EVENT_PICKUP = 16;
export const EVENT_CHOP_DONE = 32;
export const EVENT_COOKED = 64;
export const EVENT_BURNT = 128;

const REACH = 46;
const PLATE_CAPACITY = 5;

function plateMatches(items, recipeItems) {
  if (items.length !== recipeItems.length) return false;
  const have = [...items].sort();
  const want = [...recipeItems].sort();
  for (let i = 0; i < have.length; i += 1) {
    if (have[i] !== want[i]) return false;
  }
  return true;
}

function dishForPlate(items) {
  for (const [id, recipe] of Object.entries(RECIPES)) {
    if (plateMatches(items, recipe.items)) return id;
  }
  return null;
}

function dishesForDay(day) {
  return Object.entries(RECIPES)
    .filter(([, recipe]) => recipe.days.includes(day))
    .map(([id]) => id);
}

function overlapsStation(x, y, radius) {
  for (const station of STATIONS) {
    if (
      x + radius > station.x &&
      x - radius < station.x + station.w &&
      y + radius > station.y &&
      y - radius < station.y + station.h
    ) {
      return true;
    }
  }
  return false;
}

export function createWorld(rng) {
  const state = {
    day: 1,
    timeLeft: TIMING.daySeconds,
    coins: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    failed: 0,
    strikes: 0,
    chef: {
      x: CHEF_START.x,
      y: CHEF_START.y,
      facing: { x: 0, y: -1 },
      carrying: null,
      moving: false,
    },
    board: { item: null, progress: 0 },
    burners: [
      { item: null, progress: 0, state: 'empty' },
      { item: null, progress: 0, state: 'empty' },
    ],
    counterPlate: null,
    orders: [],
    orderId: 0,
    spawnTimer: ORDERS.firstOrderAtSeconds,
    particles: [],
    popups: [],
    over: null,
  };

  function reset() {
    const fresh = createWorld(rng);
    Object.assign(state, fresh.state);
    state.day = 1;
  }

  function startDay(day) {
    state.day = day;
    state.timeLeft = TIMING.daySeconds;
    state.orders = [];
    state.spawnTimer = ORDERS.firstOrderAtSeconds;
    state.strikes = 0;
    state.combo = 0;
    state.chef.x = CHEF_START.x;
    state.chef.y = CHEF_START.y;
    state.chef.carrying = null;
    state.board = { item: null, progress: 0 };
    state.burners = [
      { item: null, progress: 0, state: 'empty' },
      { item: null, progress: 0, state: 'empty' },
    ];
    state.counterPlate = null;
    state.over = null;
  }

  function nearestStation() {
    const chef = state.chef;
    let best = null;
    let bestDistance = Infinity;
    for (const station of STATIONS) {
      const cx = Math.max(station.x, Math.min(chef.x, station.x + station.w));
      const cy = Math.max(station.y, Math.min(chef.y, station.y + station.h));
      const distance = Math.hypot(chef.x - cx, chef.y - cy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = station;
      }
    }
    return bestDistance <= REACH + CHEF.radius ? best : null;
  }

  function stationAtPoint(x, y) {
    for (const station of STATIONS) {
      if (x >= station.x - 20 && x <= station.x + station.w + 20 && y >= station.y - 20 && y <= station.y + station.h + 20) {
        return station;
      }
    }
    return null;
  }

  function addPopup(x, y, text, colour) {
    state.popups.push({ x, y, text, colour, life: 1.2 });
  }

  function addParticles(x, y, kind, count) {
    for (let i = 0; i < count; i += 1) {
      state.particles.push({
        x: x + (rng.next() - 0.5) * 24,
        y: y + (rng.next() - 0.5) * 12,
        vx: (rng.next() - 0.5) * 30,
        vy: -20 - rng.next() * 40,
        life: 0.6 + rng.next() * 0.5,
        maxLife: 1.1,
        kind,
      });
    }
  }

  function spawnOrder() {
    const dishes = dishesForDay(state.day);
    const dish = rng.pick(dishes);
    const patience = ORDERS.patienceSeconds[state.day - 1];
    state.orderId += 1;
    state.orders.push({
      id: state.orderId,
      dish,
      patience,
      maxPatience: patience,
      warned: false,
      lastTickSecond: -1,
    });
  }

  function servePlate(station, sounds) {
    const carrying = state.chef.carrying;
    if (!carrying || carrying.type !== 'plate') {
      if (sounds) sounds.failBuzz();
      return 0;
    }
    const dish = dishForPlate(carrying.items);
    if (!dish) {
      if (sounds) sounds.failBuzz();
      addPopup(state.chef.x, state.chef.y - 40, 'Not a recipe yet!', '#e5484d');
      return 0;
    }
    const orderIndex = state.orders.findIndex((order) => order.dish === dish);
    if (orderIndex === -1) {
      if (sounds) sounds.failBuzz();
      addPopup(state.chef.x, state.chef.y - 40, 'Nobody ordered that!', '#e5484d');
      return 0;
    }
    const recipe = RECIPES[dish];
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const multiplier = 1 + 0.1 * (state.combo - 1);
    const earned = Math.round(recipe.coins * multiplier);
    state.coins += earned;
    state.score += earned;
    state.served += 1;
    state.orders.splice(orderIndex, 1);
    state.chef.carrying = null;
    addParticles(station.x + station.w / 2, station.y + 20, 'sparkle', 14);
    addPopup(station.x + station.w / 2, station.y + 30, `+${earned} coins`, '#f6c453');
    if (state.combo >= 2) {
      addPopup(state.chef.x, state.chef.y - 64, `Combo x${state.combo}!`, '#f6c453');
    }
    if (sounds) sounds.serveDing(state.combo);
    return EVENT_SERVED;
  }

  function interact(station, sounds) {
    if (!station) return 0;
    const chef = state.chef;
    const carrying = chef.carrying;

    if (station.kind === 'crate') {
      if (carrying) return 0;
      chef.carrying = { type: 'ingredient', id: station.gives };
      if (sounds) sounds.pickup();
      return EVENT_PICKUP;
    }

    if (station.kind === 'trash') {
      if (!carrying) return 0;
      chef.carrying = null;
      addParticles(chef.x, chef.y - 10, 'poof', 6);
      if (sounds) sounds.place();
      return 0;
    }

    if (station.kind === 'board') {
      if (state.board.item) {
        if (!carrying) {
          chef.carrying = { type: 'ingredient', id: state.board.item };
          state.board.item = null;
          state.board.progress = 0;
          if (sounds) sounds.pickup();
          return EVENT_PICKUP;
        }
        return 0;
      }
      if (carrying && carrying.type === 'ingredient') {
        const info = INGREDIENTS[carrying.id];
        if (info && info.chop) {
          state.board.item = `chopped-${carrying.id}`;
          state.board.progress = 0;
          chef.carrying = null;
          if (sounds) sounds.place();
          return 0;
        }
      }
      return 0;
    }

    if (station.kind === 'stove') {
      const burner = state.burners.find((b) => b.state === 'cooked' || b.state === 'burnt')
        || state.burners.find((b) => b.state === 'empty');
      if (!burner) return 0;
      if (burner.state === 'cooked' || burner.state === 'burnt') {
        if (carrying) return 0;
        chef.carrying = { type: 'ingredient', id: burner.state === 'cooked' ? 'cooked-patty' : 'burnt-patty' };
        burner.item = null;
        burner.progress = 0;
        burner.state = 'empty';
        if (sounds) sounds.pickup();
        return EVENT_PICKUP;
      }
      if (carrying && carrying.type === 'ingredient' && carrying.id === 'patty') {
        burner.item = 'patty';
        burner.progress = 0;
        burner.state = 'cooking';
        chef.carrying = null;
        if (sounds) sounds.place();
        if (sounds) sounds.startSizzle();
        return 0;
      }
      return 0;
    }

    if (station.kind === 'plate') {
      if (state.counterPlate) {
        if (!carrying) {
          chef.carrying = { type: 'plate', items: state.counterPlate.items };
          state.counterPlate = null;
          if (sounds) sounds.pickup();
          return EVENT_PICKUP;
        }
        if (carrying.type === 'ingredient' && state.counterPlate.items.length < PLATE_CAPACITY) {
          state.counterPlate.items.push(carrying.id);
          chef.carrying = null;
          if (sounds) sounds.place();
          return 0;
        }
        return 0;
      }
      if (carrying && carrying.type === 'plate') {
        state.counterPlate = { items: carrying.items };
        chef.carrying = null;
        if (sounds) sounds.place();
        return 0;
      }
      if (!carrying) {
        chef.carrying = { type: 'plate', items: [] };
        if (sounds) sounds.pickup();
        return EVENT_PICKUP;
      }
      return 0;
    }

    if (station.kind === 'serve') {
      return servePlate(station, sounds);
    }
    return 0;
  }

  function moveChef(dir, dt) {
    const chef = state.chef;
    if (!dir) {
      chef.moving = false;
      return;
    }
    chef.moving = true;
    chef.facing = { x: dir.x, y: dir.y };
    const stepX = dir.x * CHEF.speed * dt;
    const stepY = dir.y * CHEF.speed * dt;
    const nextX = chef.x + stepX;
    if (
      nextX - CHEF.radius >= 8 &&
      nextX + CHEF.radius <= VIEW.width - 8 &&
      !overlapsStation(nextX, chef.y, CHEF.radius)
    ) {
      chef.x = nextX;
    }
    const nextY = chef.y + stepY;
    if (
      nextY - CHEF.radius >= HUD_HEIGHT + 8 &&
      nextY + CHEF.radius <= VIEW.height - 8 &&
      !overlapsStation(chef.x, nextY, CHEF.radius)
    ) {
      chef.y = nextY;
    }
  }

  function step(dt, actions, sounds) {
    if (state.over) return 0;
    let events = 0;

    moveChef(actions.dir, dt);

    // A click on a station the chef can reach acts like pressing E there.
    if (actions.click) {
      const station = stationAtPoint(actions.click.x, actions.click.y);
      if (station) {
        const cx = Math.max(station.x, Math.min(state.chef.x, station.x + station.w));
        const cy = Math.max(station.y, Math.min(state.chef.y, station.y + station.h));
        if (Math.hypot(state.chef.x - cx, state.chef.y - cy) <= REACH + CHEF.radius) {
          events |= interact(station, sounds);
        }
      }
    } else if (actions.tap) {
      events |= interact(nearestStation(), sounds);
    }

    // Chopping only advances while the action key is held at the board.
    if (state.board.item && actions.hold) {
      const station = nearestStation();
      if (station && station.kind === 'board') {
        state.board.progress += dt / TIMING.chopSeconds;
        if (Math.floor(state.board.progress * 4) !== Math.floor((state.board.progress - dt / TIMING.chopSeconds) * 4)) {
          if (sounds) sounds.chopTick();
          addParticles(station.x + station.w / 2, station.y + station.h / 2, 'chop', 3);
        }
        if (state.board.progress >= 1) {
          state.board.progress = 1;
          if (sounds) sounds.chopDone();
          events |= EVENT_CHOP_DONE;
        }
      }
    }

    // Patties cook on their own; a cooked one burns if it waits too long.
    let anyCooking = false;
    for (const burner of state.burners) {
      if (burner.state === 'cooking') {
        anyCooking = true;
        burner.progress += dt / TIMING.cookSeconds;
        if (burner.progress >= 1) {
          burner.progress = 0;
          burner.state = 'cooked';
          events |= EVENT_COOKED;
        }
      } else if (burner.state === 'cooked') {
        burner.progress += dt / TIMING.burnAfterSeconds;
        if (burner.progress >= 1) {
          burner.state = 'burnt';
          burner.progress = 0;
          addParticles(420 + 110, 110, 'smoke', 8);
          events |= EVENT_BURNT;
        }
      }
    }
    if (!anyCooking && sounds) sounds.stopSizzle();

    // Orders arrive, wait, and leave unhappy if nobody serves them.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.orders.length < ORDERS.maxConcurrent[state.day - 1]) {
      spawnOrder();
      state.spawnTimer = ORDERS.spawnEverySeconds[state.day - 1] + (rng.next() * 4 - 2);
    }
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      const whole = Math.ceil(order.patience);
      if (order.patience <= 10 && !order.warned) {
        order.warned = true;
        if (sounds) sounds.tick();
      }
      if (order.patience <= 5 && whole !== order.lastTickSecond && whole > 0) {
        order.lastTickSecond = whole;
        if (sounds) sounds.tick();
      }
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        state.failed += 1;
        state.strikes += 1;
        state.combo = 0;
        if (sounds) sounds.failBuzz();
        events |= EVENT_FAILED;
        if (state.strikes >= ORDERS.strikeLimit) {
          state.over = 'failed';
          events |= EVENT_SHIFT_OVER;
        }
      }
    }

    // The shift clock.
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.over = 'clear';
      events |= EVENT_DAY_CLEAR;
      if (sounds) sounds.dayClear();
    }

    // Particles and popups drift and fade.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const p = state.popups[i];
      p.y -= 34 * dt;
      p.life -= dt;
      if (p.life <= 0) state.popups.splice(i, 1);
    }

    return events;
  }

  function starsEarned() {
    const target = DAY_TARGETS[state.day - 1];
    if (state.coins >= target * 1.4) return 3;
    if (state.coins >= target) return 2;
    if (state.coins >= target * 0.5) return 1;
    return 0;
  }

  return { state, step, reset, startDay, nearestStation, starsEarned, dishForPlate };
}
