import type { CatalogGame, GameModule, GameTag } from "./types";
import { solitaire } from "./solitaire";
import { colorClash } from "./color-clash";
import { ticTacToe } from "./tic-tac-toe";
import { roadTripBingo } from "./bingo";
import { wouldYouRather } from "./would-you-rather";
import { war } from "./war";
import { goFish } from "./go-fish";
import { memoryMatch } from "./memory";
import { crazyEights } from "./crazy-eights";
import { connectFour } from "./connect-four";
import { rockPaperScissors } from "./rock-paper-scissors";
import { trivia } from "./trivia";
import { charades } from "./charades";
import { twentyQuestions } from "./twenty-questions";
import { licensePlateHunt } from "./license-plate-hunt";

const ALL_MODULES: GameModule[] = [
  solitaire,
  colorClash,
  ticTacToe,
  roadTripBingo,
  wouldYouRather,
  war,
  goFish,
  memoryMatch,
  crazyEights,
  connectFour,
  rockPaperScissors,
  trivia,
  charades,
  twentyQuestions,
  licensePlateHunt,
];

export const GAME_MODULES: Record<string, GameModule> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.meta.id, m]),
);

export const GAME_CATALOG: CatalogGame[] = ALL_MODULES.map((m) => ({
  ...m.meta,
  module: m,
}));

export function getGame(id: string): GameModule | undefined {
  return GAME_MODULES[id];
}

export function getCatalogGame(id: string): CatalogGame | undefined {
  return GAME_CATALOG.find((g) => g.id === id);
}

export function filterGames(opts: {
  tag?: GameTag | "all";
  roadTrip?: boolean;
  availableOnly?: boolean;
  query?: string;
}): CatalogGame[] {
  return GAME_CATALOG.filter((g) => {
    if (opts.availableOnly && !g.available) return false;
    if (opts.roadTrip && !g.roadTripFriendly) return false;
    if (opts.tag && opts.tag !== "all" && !g.tags.includes(opts.tag)) return false;
    if (opts.query) {
      const q = opts.query.toLowerCase();
      if (
        !g.title.toLowerCase().includes(q) &&
        !g.shortDescription.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}

export const FILTER_TAGS: Array<{ id: GameTag | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "solo", label: "Solo" },
  { id: "two-player", label: "Two-player" },
  { id: "party", label: "Party" },
  { id: "card", label: "Card" },
  { id: "strategy", label: "Strategy" },
  { id: "road-trip", label: "Road trip" },
];
