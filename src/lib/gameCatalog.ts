import type { GameCategory } from '../styles/tokens';

/**
 * The single map from a gameId to how it is presented: display key, category,
 * and art. Home, the free-play grid, the game title screen, the session summary
 * and the trio picker all read from here.
 *
 * The handoff calls the third category "Planning". The store and the game
 * registry call it `executive` and that is not changing, so `executive` is the
 * key everywhere and "Planning" only ever appears behind a translation key.
 *
 * `marquee` marks the six games with commissioned art. `inDailySession` marks
 * the ones Home offers - the marquee games except Garden Keeper (FINAL_SPEC D15).
 * Everything else is reachable from free play only, and renders with its
 * category icon rather than bespoke art.
 */
export interface GameCatalogEntry {
  id: string;
  category: GameCategory;
  /** i18n key, `game.<id>.name`. Never a literal - see the i18n rule in the spec. */
  nameKey: string;
  /** Home row / free-play tile art, or null to fall back to the category icon. */
  tile: string | null;
  /** Full-bleed game title screen art, or null when the game has none. */
  splash: string | null;
  /** Commissioned art; also opts the board into GameShell's anchoring. */
  marquee: boolean;
  /** Offered on Home in the daily session. Not the same as marquee: see garden-keeper. */
  inDailySession: boolean;
}

const CATEGORY_ICONS: Record<GameCategory, string> = {
  memory:    '/category/ic-memory.png',
  attention: '/category/ic-attention.png',
  executive: '/category/ic-planning.png',
};

function marquee(
  id: string, category: GameCategory, art: string,
): GameCatalogEntry {
  return {
    id,
    category,
    nameKey: `game.${id}.name`,
    tile: `/games/tile-${art}.png`,
    splash: `/games/splash-${art}.webp`,
    marquee: true,
    inDailySession: true,
  };
}

function extra(id: string, category: GameCategory): GameCatalogEntry {
  return {
    id, category, nameKey: `game.${id}.name`, tile: null, splash: null,
    marquee: false, inDailySession: false,
  };
}

/**
 * Keys match src/screens/GameRouter.tsx's GAME_REGISTRY exactly. A game in the
 * registry but missing here renders with no name and no art, so the two lists
 * must be changed together.
 */
export const GAME_CATALOG: Record<string, GameCatalogEntry> = {
  // The six with commissioned art, two per category.
  'market-memory':         marquee('market-memory',        'memory',    'shopping'),
  'train-yard':            marquee('train-yard',           'memory',    'station'),
  'spot-focus':            marquee('spot-focus',           'attention', 'spot'),
  // Out of the core six (FINAL_SPEC D15): keeps its art and Free Play, leaves Home
  // until Baggage Sort takes its place.
  'garden-keeper':         { ...marquee('garden-keeper',       'attention', 'garden'), inDailySession: false },
  'serve-guests':          marquee('serve-guests',         'executive', 'tiffen'),
  'clear-the-way':         marquee('clear-the-way',        'executive', 'freeme'),

  // Free play only.
  'remember-match':        extra('remember-match',         'memory'),
  'picture-postcard':      extra('picture-postcard',       'memory'),
  'shopping-list-recall':  extra('shopping-list-recall',   'memory'),
  'sequence-repeat':       extra('sequence-repeat',        'memory'),
  'word-search':           extra('word-search',            'attention'),
  'focus-filter':          extra('focus-filter',           'attention'),
  'morning-routine-quest': extra('morning-routine-quest',  'executive'),
  'recipe-builder':        extra('recipe-builder',         'executive'),
  'garden-sequencer':      extra('garden-sequencer',       'executive'),
};

/** Declaration order, which is the order the marquee games are offered in. */
const ORDER = Object.keys(GAME_CATALOG);

export function getGame(id: string): GameCatalogEntry | undefined {
  return GAME_CATALOG[id];
}

export function marqueeGames(): GameCatalogEntry[] {
  return ORDER.map((id) => GAME_CATALOG[id]).filter((g) => g.marquee);
}

/** The games Home offers for a category in the daily session, in declaration order. */
export function sessionGamesByCategory(category: GameCategory): GameCatalogEntry[] {
  return ORDER.map((id) => GAME_CATALOG[id])
    .filter((g) => g.inDailySession && g.category === category);
}

export function allByCategory(category: GameCategory): GameCatalogEntry[] {
  return ORDER.map((id) => GAME_CATALOG[id]).filter((g) => g.category === category);
}

export function categoryIcon(category: GameCategory): string {
  return CATEGORY_ICONS[category];
}

/** Tile art if the game has any, otherwise its category icon. */
export function tileArt(game: GameCatalogEntry): string {
  return game.tile ?? CATEGORY_ICONS[game.category];
}

/**
 * Where "play this game" lands once any intro is behind it: the title screen for a
 * game with commissioned art, the board for one without - it has no title screen,
 * so sending it there would only bounce straight on.
 */
export function playRoute(game: GameCatalogEntry): string {
  return game.splash ? `/app/game/${game.id}/title` : `/app/game/${game.id}`;
}
