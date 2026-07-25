import { createStandardDeck, rankValue, type PlayingCard } from "../cards/deck";
import { seededRandom, shuffleInPlace } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface WarState {
  players: [string, string];
  piles: Record<string, PlayingCard[]>;
  table: Record<string, PlayingCard[]>;
  lastRound: { winnerId: string | null; war: boolean } | null;
  winnerId: string | null;
  rounds: number;
}

export type WarAction = { type: "flip" } | { type: "reset" };

function compare(a: PlayingCard, b: PlayingCard): number {
  return rankValue(a.rank) - rankValue(b.rank);
}

export const war: GameModule<WarState, WarAction> = {
  meta: {
    id: "war",
    title: "War",
    shortDescription: "High card wins. Simple, chaotic, endlessly replayable.",
    longDescription:
      "Each player flips a card — highest rank takes the pile. Ties trigger war: three face-down, one face-up. First to empty the other player's pile wins.",
    minPlayers: 1,
    maxPlayers: 2,
    tags: ["card", "two-player", "offline", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [5, 15],
    accent: "#B45309",
    icon: "⚔️",
    available: true,
    supportsAi: true,
  },

  createInitialState(ctx: InitContext): WarState {
    const p1 = ctx.players[0]?.id ?? "p1";
    const p2 = ctx.players[1]?.id ?? "ai";
    const rand = seededRandom(ctx.seed ?? `${Date.now()}`);
    const deck = shuffleInPlace(createStandardDeck(false), rand);
    const mid = Math.floor(deck.length / 2);
    return {
      players: [p1, p2],
      piles: { [p1]: deck.slice(0, mid), [p2]: deck.slice(mid) },
      table: { [p1]: [], [p2]: [] },
      lastRound: null,
      winnerId: null,
      rounds: 0,
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (action.type === "reset") return { ok: true };
    if (state.winnerId) return { ok: false, error: "Game finished." };
    if (action.type !== "flip") return { ok: false, error: "Unknown action." };
    if (playerId !== state.players[0] && playerId !== state.players[1]) {
      return { ok: false, error: "Not in this game." };
    }
    if (!state.piles[state.players[0]].length || !state.piles[state.players[1]].length) {
      return { ok: false, error: "A player is out of cards." };
    }
    return { ok: true };
  },

  applyAction(state, action): WarState {
    if (action.type === "reset") {
      return war.createInitialState({
        players: state.players.map((id) => ({
          id,
          displayName: id,
          avatarId: "spark",
        })),
        mode: "solo",
        seed: `${Date.now()}`,
      });
    }

    const piles: Record<string, PlayingCard[]> = {
      [state.players[0]]: [...state.piles[state.players[0]]],
      [state.players[1]]: [...state.piles[state.players[1]]],
    };
    const table: Record<string, PlayingCard[]> = {
      [state.players[0]]: [],
      [state.players[1]]: [],
    };

    const draw = (pid: string, faceUp: boolean) => {
      const card = piles[pid].shift();
      if (!card) return null;
      table[pid].push({ ...card, faceUp });
      return card;
    };

    let warRound = false;
    for (;;) {
      const a = draw(state.players[0], true);
      const b = draw(state.players[1], true);
      if (!a || !b) break;
      const cmp = compare(a, b);
      if (cmp !== 0) {
        const winnerId = cmp > 0 ? state.players[0] : state.players[1];
        const loot = [...table[state.players[0]], ...table[state.players[1]]];
        piles[winnerId].push(...loot.map((c) => ({ ...c, faceUp: false })));
        const out =
          !piles[state.players[0]].length
            ? state.players[1]
            : !piles[state.players[1]].length
              ? state.players[0]
              : null;
        return {
          ...state,
          piles,
          table,
          lastRound: { winnerId, war: warRound },
          winnerId: out,
          rounds: state.rounds + 1,
        };
      }
      warRound = true;
      // Three face-down, then loop for face-up comparison
      for (let i = 0; i < 3; i++) {
        if (!draw(state.players[0], false) || !draw(state.players[1], false)) break;
      }
      if (!piles[state.players[0]].length || !piles[state.players[1]].length) break;
    }

    const winnerId =
      piles[state.players[0]].length >= piles[state.players[1]].length
        ? state.players[0]
        : state.players[1];
    return {
      ...state,
      piles,
      table,
      lastRound: { winnerId, war: warRound },
      winnerId,
      rounds: state.rounds + 1,
    };
  },

  checkWinner(state): WinResult | null {
    if (!state.winnerId) return null;
    return { winners: [state.winnerId], reason: "Collected the whole deck!" };
  },

  calculateScores(state): ScoreMap {
    return {
      [state.players[0]]: state.piles[state.players[0]].length,
      [state.players[1]]: state.piles[state.players[1]].length,
    };
  },

  getClientView(state) {
    return {
      ...state,
      piles: {
        [state.players[0]]: state.piles[state.players[0]].length,
        [state.players[1]]: state.piles[state.players[1]].length,
      },
      table: state.table,
    };
  },

  aiMove(state, playerId) {
    if (state.winnerId) return null;
    if (playerId !== state.players[0] && playerId !== state.players[1]) return null;
    return { type: "flip" };
  },
};
