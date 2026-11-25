// Simmer & Serve — tuning, layout, recipes and colours.
// One file, one job: every number the game balances on lives here so the
// kitchen, the renderer and the autopilot all read the same truth.

export const VIEW = { width: 1280, height: 800 };
export const HUD_HEIGHT = 76;
export const STEP = 1 / 60;
export const BEST_KEY = 'simmer-and-serve-best';

// The chef's movement.
export const CHEF = { radius: 21, speed: 265 };

// How long each job takes (seconds).
export const TIMING = {
  chopSeconds: 1.4,
  cookSeconds: 6.0,
  burnAfterSeconds: 5.0, // cooked patty stays good this long, then burns
  daySeconds: 150,
  comboWindowSeconds: 12,
};

// Orders.
export const ORDERS = {
  firstOrderAtSeconds: 2,
  spawnEverySeconds: [15, 12, 10], // per day (1-indexed)
  maxConcurrent: [3, 4, 4],
  patienceSeconds: [60, 50, 45],
  strikeLimit: 3,
};

// Coins a dish pays, before the combo bonus.
export const DISH_COINS = { salad: 40, burger: 60, deluxe: 90, double: 110 };
// Coins the day needs for its stars (1 star at half, 2 at full, 3 at 140%).
export const DAY_TARGETS = [300, 450, 600];

// Ingredients. chop: needs the board. cook: needs the stove.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', chop: true, cook: false, colour: '#e5484d', dark: '#a92c30' },
  lettuce: { name: 'Lettuce', chop: true, cook: false, colour: '#58b368', dark: '#2f7d3d' },
  cheese: { name: 'Cheese', chop: false, cook: false, colour: '#f6c453', dark: '#c78f1f' },
  patty: { name: 'Patty', chop: false, cook: true, colour: '#8a5a3b', dark: '#5d3a24' },
  bun: { name: 'Bun', chop: false, cook: false, colour: '#e8b06a', dark: '#b57e35' },
};

// Recipes: the exact multiset a plate must hold to serve the dish.
// An entry is an ingredient id; 'cooked-patty' means a patty that was cooked.
export const RECIPES = {
  salad: {
    name: 'Garden Salad',
    items: ['chopped-lettuce', 'chopped-tomato'],
    coins: DISH_COINS.salad,
    days: [1, 2, 3],
  },
  burger: {
    name: 'Cheesy Burger',
    items: ['bun', 'cooked-patty', 'cheese'],
    coins: DISH_COINS.burger,
    days: [1, 2, 3],
  },
  deluxe: {
    name: 'Deluxe Burger',
    items: ['bun', 'cooked-patty', 'cheese', 'chopped-lettuce', 'chopped-tomato'],
    coins: DISH_COINS.deluxe,
    days: [2, 3],
  },
  double: {
    name: 'Double Melt',
    items: ['bun', 'cooked-patty', 'cooked-patty', 'cheese'],
    coins: DISH_COINS.double,
    days: [3],
  },
};

// The kitchen floor plan. Every station is a solid rectangle the chef walks
// around; the chef interacts with the nearest one he faces.
export const STATIONS = [
  { id: 'serve', kind: 'serve', label: 'SERVE', x: 1010, y: 84, w: 254, h: 66 },
  { id: 'stove', kind: 'stove', label: 'STOVE', x: 420, y: 84, w: 220, h: 66 },
  { id: 'crate-tomato', kind: 'crate', gives: 'tomato', label: 'TOMATO', x: 16, y: 176, w: 132, h: 84 },
  { id: 'crate-lettuce', kind: 'crate', gives: 'lettuce', label: 'LETTUCE', x: 16, y: 276, w: 132, h: 84 },
  { id: 'crate-cheese', kind: 'crate', gives: 'cheese', label: 'CHEESE', x: 16, y: 376, w: 132, h: 84 },
  { id: 'crate-patty', kind: 'crate', gives: 'patty', label: 'PATTY', x: 16, y: 476, w: 132, h: 84 },
  { id: 'crate-bun', kind: 'crate', gives: 'bun', label: 'BUNS', x: 16, y: 576, w: 132, h: 84 },
  { id: 'board', kind: 'board', label: 'CHOP', x: 300, y: 330, w: 170, h: 100 },
  { id: 'plate', kind: 'plate', label: 'PLATES', x: 560, y: 330, w: 260, h: 140 },
  { id: 'trash', kind: 'trash', label: 'TRASH', x: 1120, y: 660, w: 144, h: 110 },
];

// Where the chef starts each day.
export const CHEF_START = { x: 640, y: 620 };

// Palette: a warm little kitchen, drawn flat so it reads at a glance.
export const COLOURS = {
  floorA: '#f3e2c7',
  floorB: '#ecd9b8',
  wall: '#c96f4a',
  wallTop: '#b25a38',
  counterTop: '#a9713f',
  counterSide: '#7d4f27',
  counterEdge: '#e8c08a',
  hud: '#2b2118',
  hudPanel: '#3a2d20',
  ticket: '#fff6dd',
  ticketInk: '#3a2d20',
  chefShirt: '#4a90d9',
  chefApron: '#f5f0e6',
  chefSkin: '#f2c89b',
  toque: '#ffffff',
  good: '#58b368',
  warn: '#f6c453',
  bad: '#e5484d',
  gold: '#f6c453',
};
