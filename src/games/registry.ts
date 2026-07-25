import type { CatalogGame, GameModule, GameTag } from "./types";
import { solitaire } from "./solitaire";
import { colorClash } from "./color-clash";
import { ticTacToe } from "./tic-tac-toe";
import { roadTripBingo } from "./bingo";
import { wouldYouRather } from "./would-you-rather";

/** Upcoming catalog entries — visible but not yet playable in MVP. */
const COMING_SOON: CatalogGame[] = [
  {
    id: "war",
    title: "War",
    shortDescription: "High card wins. Simple, chaotic, endlessly replayable.",
    longDescription: "Flip cards, winner takes the pile. Coming soon.",
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["card", "two-player", "offline", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [5, 15],
    accent: "#B45309",
    icon: "⚔️",
    available: false,
    supportsAi: true,
  },
  {
    id: "go-fish",
    title: "Go Fish",
    shortDescription: "Ask for ranks, collect books of four.",
    longDescription: "Classic asking game for mixed ages. Coming soon.",
    minPlayers: 2,
    maxPlayers: 5,
    tags: ["card", "party", "offline"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: false,
    glanceFriendly: false,
    estimatedMinutes: [10, 20],
    accent: "#0284C7",
    icon: "🐟",
    available: false,
    supportsAi: true,
  },
  {
    id: "memory",
    title: "Memory Match",
    shortDescription: "Flip pairs. Train your brain between exits.",
    longDescription: "Find matching pairs on a grid. Coming soon.",
    minPlayers: 1,
    maxPlayers: 4,
    tags: ["solo", "party", "offline", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: false,
    estimatedMinutes: [5, 15],
    accent: "#7C3AED",
    icon: "🧠",
    available: false,
    supportsAi: false,
  },
  {
    id: "crazy-eights",
    title: "Crazy Eights",
    shortDescription: "Match suit or rank — eights are wild.",
    longDescription: "A classic shedding game. Coming soon.",
    minPlayers: 2,
    maxPlayers: 5,
    tags: ["card", "party", "offline"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: false,
    estimatedMinutes: [10, 20],
    accent: "#DB2777",
    icon: "🎱",
    available: false,
    supportsAi: true,
  },
  {
    id: "connect-four",
    title: "Connect Four",
    shortDescription: "Drop discs. Connect four. Outsmart your rival.",
    longDescription: "Vertical strategy classic. Coming soon.",
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["two-player", "strategy", "offline", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [5, 15],
    accent: "#1D4ED8",
    icon: "🔴",
    available: false,
    supportsAi: true,
  },
  {
    id: "rock-paper-scissors",
    title: "Rock Paper Scissors",
    shortDescription: "Best of three — or best of forever.",
    longDescription: "Instant decisions, instant laughs. Coming soon.",
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["two-player", "party", "offline", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [1, 5],
    accent: "#64748B",
    icon: "✊",
    available: false,
    supportsAi: true,
  },
  {
    id: "trivia",
    title: "Trivia",
    shortDescription: "Quick-fire questions for the whole car.",
    longDescription: "Categories and score streaks. Coming soon.",
    minPlayers: 1,
    maxPlayers: 8,
    tags: ["party", "road-trip", "solo"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [10, 30],
    accent: "#CA8A04",
    icon: "❓",
    available: false,
    supportsAi: false,
  },
  {
    id: "charades",
    title: "Charades",
    shortDescription: "Act it out — phones face-down optional.",
    longDescription: "Prompts for silent acting fun. Coming soon.",
    minPlayers: 3,
    maxPlayers: 10,
    tags: ["party", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [10, 40],
    accent: "#C026D3",
    icon: "🎭",
    available: false,
    supportsAi: false,
  },
  {
    id: "twenty-questions",
    title: "Twenty Questions",
    shortDescription: "Yes/no only. Guess the secret.",
    longDescription: "Host thinks of something; others ask. Coming soon.",
    minPlayers: 2,
    maxPlayers: 8,
    tags: ["party", "road-trip", "offline"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [5, 20],
    accent: "#0F766E",
    icon: "🔎",
    available: false,
    supportsAi: false,
  },
  {
    id: "license-plate-hunt",
    title: "License Plate Hunt",
    shortDescription: "Collect states and provinces from the road.",
    longDescription: "Checklist hunt for plate origins. Coming soon.",
    minPlayers: 1,
    maxPlayers: 8,
    tags: ["party", "road-trip", "solo", "offline"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [15, 120],
    accent: "#0369A1",
    icon: "🚘",
    available: false,
    supportsAi: false,
  },
];

const MVP_MODULES: GameModule[] = [
  solitaire,
  colorClash,
  ticTacToe,
  roadTripBingo,
  wouldYouRather,
];

export const GAME_MODULES: Record<string, GameModule> = Object.fromEntries(
  MVP_MODULES.map((m) => [m.meta.id, m]),
);

export const GAME_CATALOG: CatalogGame[] = [
  ...MVP_MODULES.map((m) => ({ ...m.meta, module: m })),
  ...COMING_SOON,
];

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
