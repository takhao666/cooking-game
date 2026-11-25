// config.js — every tunable number, ingredient, recipe and station of Sizzle & Serve.
// One file, one job: the game's data. Nothing here draws or updates anything.

export const VIEW = { width: 1280, height: 720 };
export const HUD_HEIGHT = 56;

// ---------------------------------------------------------------- ingredients
// A raw ingredient id maps to its prepared form once chopped or cooked.
// prepared: null (used as-is) | 'chopped' | 'cooked' | 'hot'
export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e5484d', prepared: 'chopped', chopSeconds: 1.2 },
  lettuce: { name: 'Lettuce', color: '#46a758', prepared: 'chopped', chopSeconds: 1.0 },
  onion: { name: 'Onion', color: '#e8dff5', prepared: 'chopped', chopSeconds: 1.2 },
  patty: { name: 'Patty', color: '#a06a42', prepared: 'cooked', cookSeconds: 6, burnSeconds: 6 },
  pasta: { name: 'Pasta', color: '#f5d76e', prepared: 'cooked', cookSeconds: 7, burnSeconds: 7 },
  broth: { name: 'Broth', color: '#e8933c', prepared: 'hot', cookSeconds: 4, burnSeconds: 999 },
  bun: { name: 'Bun', color: '#e8a94e', prepared: null },
  cheese: { name: 'Cheese', color: '#f7c948', prepared: null },
};

// The id of an ingredient in its prepared form, e.g. tomato -> tomato_chopped.
export function preparedId(id) {
  const kind = INGREDIENTS[id].prepared;
  return kind ? `${id}_${kind}` : id;
}

export function displayName(id) {
  const [base, form] = id.split('_');
  const ingredient = INGREDIENTS[base];
  if (!ingredient) return id;
  if (form === 'chopped') return `Chopped ${ingredient.name}`;
  if (form === 'cooked') return `Cooked ${ingredient.name}`;
  if (form === 'hot') return `Hot ${ingredient.name}`;
  return ingredient.name;
}

// -------------------------------------------------------------------- recipes
// components are prepared ids; a plate must hold exactly this set to serve.
export const RECIPES = [
  {
    id: 'salad', name: 'Garden Salad', price: 8, unlockDay: 1,
    components: ['tomato_chopped', 'lettuce_chopped'],
    blurb: 'Crisp and fresh',
  },
  {
    id: 'burger', name: 'Classic Burger', price: 12, unlockDay: 1,
    components: ['bun', 'patty_cooked', 'lettuce_chopped'],
    blurb: 'The house favourite',
  },
  {
    id: 'cheeseburger', name: 'Cheeseburger', price: 15, unlockDay: 2,
    components: ['bun', 'patty_cooked', 'cheese', 'tomato_chopped'],
    blurb: 'Extra melty',
  },
  {
    id: 'pasta', name: 'Tomato Pasta', price: 14, unlockDay: 2,
    components: ['pasta_cooked', 'tomato_chopped'],
    blurb: 'Twirls of joy',
  },
  {
    id: 'soup', name: 'Hearty Soup', price: 16, unlockDay: 3,
    components: ['broth_hot', 'onion_chopped', 'tomato_chopped'],
    blurb: 'Warms the soul',
  },
];

export function recipesForDay(day) {
  return RECIPES.filter((recipe) => recipe.unlockDay <= day);
}

// ---------------------------------------------------------------------- days
export const DAY_LENGTH_SECONDS = 150;

export function dayTuning(day) {
  return {
    // seconds between new orders (shrinks as days pass)
    spawnInterval: Math.max(9, 20 - day * 2),
    // how many tickets may sit on the board at once
    maxOrders: Math.min(3 + Math.floor(day / 2), 5),
    // seconds of patience on a fresh ticket
    patience: Math.max(38, 62 - day * 4),
    // coins bonus for serving with patience to spare, as a share of the price
    patienceBonus: 0.5,
  };
}

// ------------------------------------------------------------------ stations
// The kitchen floor lives right of the order board (x >= 232) and below the HUD.
export const BOARD = { x: 0, y: HUD_HEIGHT, width: 232, height: VIEW.height - HUD_HEIGHT };

export const STATIONS = {
  pantry: {
    label: 'Pantry', x: 256, y: 84, width: 400, height: 84,
    // eight bins, left to right
    bins: ['tomato', 'lettuce', 'onion', 'patty', 'pasta', 'broth', 'bun', 'cheese'],
  },
  board: { label: 'Chopping Board', x: 680, y: 84, width: 120, height: 84 },
  stove: {
    label: 'Stove', x: 824, y: 84, width: 176, height: 84,
    burners: [
      { x: 868, y: 126 },
      { x: 956, y: 126 },
    ],
  },
  window: { label: 'Serving Window', x: 1024, y: 84, width: 232, height: 84 },
  island: { label: 'Plating Counter', x: 560, y: 380, width: 360, height: 84 },
  trash: { label: 'Trash', x: 256, y: 620, width: 84, height: 80 },
};

// Where the chef stands to use a station (front edge centre).
export function stationAnchor(station) {
  return { x: station.x + station.width / 2, y: station.y + station.height + 26 };
}

export const CHEF = { radius: 20, speed: 270 };
export const INTERACT_RANGE = 78;
export const MAX_HEARTS = 3;
