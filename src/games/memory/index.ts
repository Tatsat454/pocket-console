import { seededRandom, shuffleInPlace } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface MemoryTile {
  id: string;
  emoji: string;
  faceUp: boolean;
  matched: boolean;
}

export interface MemoryState {
  tiles: MemoryTile[];
  playerIds: string[];
  currentPlayerId: string;
  scores: Record<string, number>;
  flipped: string[];
  finished: boolean;
  winnerIds: string[];
}

export type MemoryAction =
  | { type: "flip"; tileId: string }
  | { type: "resolve" }
  | { type: "reset" };

const EMOJIS = ["🚗", "🚌", "✈️", "⛺️", "🍔", "🎵", "⭐️", "🗺️"];

export const memoryMatch: GameModule<MemoryState, MemoryAction> = {
  meta: {
    id: "memory",
    title: "Memory Match",
    shortDescription: "Flip pairs. Train your brain between exits.",
    longDescription:
      "Find matching emoji pairs on a grid. Take turns in same-device or solo. Most pairs wins.",
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
    available: true,
    supportsAi: false,
  },

  createInitialState(ctx: InitContext): MemoryState {
    const rand = seededRandom(ctx.seed ?? `${Date.now()}`);
    const pairs = EMOJIS.flatMap((emoji, i) => [
      { id: `${i}a`, emoji, faceUp: false, matched: false },
      { id: `${i}b`, emoji, faceUp: false, matched: false },
    ]);
    shuffleInPlace(pairs, rand);
    const playerIds = ctx.players.map((p) => p.id);
    const scores: Record<string, number> = {};
    for (const id of playerIds) scores[id] = 0;
    return {
      tiles: pairs,
      playerIds,
      currentPlayerId: playerIds[0],
      scores,
      flipped: [],
      finished: false,
      winnerIds: [],
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (action.type === "reset") return { ok: true };
    if (state.finished) return { ok: false, error: "Game finished." };
    if (action.type === "resolve") {
      if (state.flipped.length !== 2) {
        return { ok: false, error: "Need two flips to resolve." };
      }
      return { ok: true };
    }
    if (action.type !== "flip") return { ok: false, error: "Unknown action." };
    if (state.currentPlayerId !== playerId) {
      return { ok: false, error: "Not your turn." };
    }
    if (state.flipped.length >= 2) {
      return { ok: false, error: "Resolve the current pair first." };
    }
    const tile = state.tiles.find((t) => t.id === action.tileId);
    if (!tile) return { ok: false, error: "Unknown tile." };
    if (tile.matched || tile.faceUp) {
      return { ok: false, error: "Tile already open." };
    }
    return { ok: true };
  },

  applyAction(state, action, playerId): MemoryState {
    if (action.type === "reset") {
      return memoryMatch.createInitialState({
        players: state.playerIds.map((id) => ({
          id,
          displayName: id,
          avatarId: "spark",
        })),
        mode: "same_device",
        seed: `${Date.now()}`,
      });
    }

    if (action.type === "flip") {
      const tiles = state.tiles.map((t) =>
        t.id === action.tileId ? { ...t, faceUp: true } : t,
      );
      return { ...state, tiles, flipped: [...state.flipped, action.tileId] };
    }

    const [aId, bId] = state.flipped;
    const a = state.tiles.find((t) => t.id === aId)!;
    const b = state.tiles.find((t) => t.id === bId)!;
    const match = a.emoji === b.emoji;
    const scores = { ...state.scores };
    let currentPlayerId = state.currentPlayerId;
    let tiles: MemoryTile[];
    if (match) {
      scores[playerId] = (scores[playerId] ?? 0) + 1;
      tiles = state.tiles.map((t) =>
        t.id === aId || t.id === bId
          ? { ...t, matched: true, faceUp: true }
          : t,
      );
    } else {
      tiles = state.tiles.map((t) =>
        t.id === aId || t.id === bId ? { ...t, faceUp: false } : t,
      );
      const idx = state.playerIds.indexOf(state.currentPlayerId);
      currentPlayerId = state.playerIds[(idx + 1) % state.playerIds.length];
    }
    const finished = tiles.every((t) => t.matched);
    let winnerIds: string[] = [];
    if (finished) {
      const max = Math.max(...Object.values(scores));
      winnerIds = Object.entries(scores)
        .filter(([, s]) => s === max)
        .map(([id]) => id);
    }
    return {
      ...state,
      tiles,
      scores,
      flipped: [],
      currentPlayerId: match ? state.currentPlayerId : currentPlayerId,
      finished,
      winnerIds,
    };
  },

  checkWinner(state): WinResult | null {
    if (!state.finished) return null;
    if (state.winnerIds.length > 1) {
      return { winners: state.winnerIds, reason: "Tie on pairs!", isDraw: true };
    }
    return { winners: state.winnerIds, reason: "Most pairs found!" };
  },

  calculateScores(state): ScoreMap {
    return { ...state.scores };
  },

  getClientView(state) {
    return state;
  },
};
