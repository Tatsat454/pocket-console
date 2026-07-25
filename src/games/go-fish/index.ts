import {
  createStandardDeck,
  type PlayingCard,
  type Rank,
  RANKS,
} from "../cards/deck";
import { seededRandom, shuffleInPlace } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface GoFishState {
  playerIds: string[];
  hands: Record<string, PlayingCard[]>;
  books: Record<string, Rank[]>;
  stock: PlayingCard[];
  currentPlayerId: string;
  lastMessage: string;
  winnerId: string | null;
}

export type GoFishAction =
  | { type: "ask"; targetId: string; rank: Rank }
  | { type: "reset" };

function takeBooks(hand: PlayingCard[]): { hand: PlayingCard[]; books: Rank[] } {
  const byRank: Partial<Record<Rank, PlayingCard[]>> = {};
  for (const c of hand) {
    (byRank[c.rank] ??= []).push(c);
  }
  const books: Rank[] = [];
  let next = [...hand];
  for (const rank of RANKS) {
    const group = byRank[rank];
    if (group && group.length >= 4) {
      books.push(rank);
      next = next.filter((c) => c.rank !== rank);
    }
  }
  return { hand: next, books };
}

function dealCount(n: number): number {
  return n <= 3 ? 7 : 5;
}

export const goFish: GameModule<GoFishState, GoFishAction> = {
  meta: {
    id: "go-fish",
    title: "Go Fish",
    shortDescription: "Ask for ranks, collect books of four.",
    longDescription:
      "Ask another player for a rank you hold. If they have it, take those cards; otherwise go fish from the stock. Collect books of four.",
    minPlayers: 1,
    maxPlayers: 5,
    tags: ["card", "party", "offline", "solo"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: false,
    glanceFriendly: false,
    estimatedMinutes: [10, 20],
    accent: "#0284C7",
    icon: "🐟",
    available: true,
    supportsAi: true,
  },

  createInitialState(ctx: InitContext): GoFishState {
    const playerIds = ctx.players.map((p) => p.id);
    while (playerIds.length < 2) playerIds.push("ai");
    const rand = seededRandom(ctx.seed ?? `${Date.now()}`);
    const deck = shuffleInPlace(createStandardDeck(true), rand);
    const hands: Record<string, PlayingCard[]> = {};
    const books: Record<string, Rank[]> = {};
    const n = dealCount(playerIds.length);
    for (const id of playerIds) {
      hands[id] = [];
      books[id] = [];
    }
    for (let i = 0; i < n; i++) {
      for (const id of playerIds) {
        const card = deck.shift();
        if (card) hands[id].push(card);
      }
    }
    for (const id of playerIds) {
      const result = takeBooks(hands[id]);
      hands[id] = result.hand;
      books[id].push(...result.books);
    }
    return {
      playerIds,
      hands,
      books,
      stock: deck,
      currentPlayerId: playerIds[0],
      lastMessage: "Ask someone for a rank you hold.",
      winnerId: null,
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (action.type === "reset") return { ok: true };
    if (state.winnerId) return { ok: false, error: "Game finished." };
    if (action.type !== "ask") return { ok: false, error: "Unknown action." };
    if (state.currentPlayerId !== playerId) {
      return { ok: false, error: "Not your turn." };
    }
    if (!state.playerIds.includes(action.targetId) || action.targetId === playerId) {
      return { ok: false, error: "Pick another player." };
    }
    if (!state.hands[playerId].some((c) => c.rank === action.rank)) {
      return { ok: false, error: "You must hold that rank to ask." };
    }
    return { ok: true };
  },

  applyAction(state, action, playerId): GoFishState {
    if (action.type === "reset") {
      return goFish.createInitialState({
        players: state.playerIds.map((id) => ({
          id,
          displayName: id,
          avatarId: "spark",
        })),
        mode: "same_device",
        seed: `${Date.now()}`,
      });
    }

    const hands: Record<string, PlayingCard[]> = Object.fromEntries(
      Object.entries(state.hands).map(([id, h]) => [id, [...h]]),
    );
    const books: Record<string, Rank[]> = Object.fromEntries(
      Object.entries(state.books).map(([id, b]) => [id, [...b]]),
    );
    const stock = [...state.stock];
    const target = action.targetId;
    const stolen = hands[target].filter((c) => c.rank === action.rank);
    let lastMessage: string;
    let keepTurn = false;

    if (stolen.length) {
      hands[target] = hands[target].filter((c) => c.rank !== action.rank);
      hands[playerId].push(...stolen);
      lastMessage = `Got ${stolen.length}× ${action.rank}! Ask again.`;
      keepTurn = true;
    } else {
      const drawn = stock.shift();
      if (drawn) {
        hands[playerId].push(drawn);
        if (drawn.rank === action.rank) {
          lastMessage = `Go fish… drew ${drawn.rank} — lucky! Ask again.`;
          keepTurn = true;
        } else {
          lastMessage = `Go fish. Drew a card.`;
        }
      } else {
        lastMessage = "Go fish — stock is empty.";
      }
    }

    const cleaned = takeBooks(hands[playerId]);
    hands[playerId] = cleaned.hand;
    books[playerId].push(...cleaned.books);

    const idx = state.playerIds.indexOf(playerId);
    let currentPlayerId = keepTurn
      ? playerId
      : state.playerIds[(idx + 1) % state.playerIds.length];

    // Skip players with empty hands if stock empty
    for (let i = 0; i < state.playerIds.length; i++) {
      if (hands[currentPlayerId].length || stock.length) break;
      const j = state.playerIds.indexOf(currentPlayerId);
      currentPlayerId = state.playerIds[(j + 1) % state.playerIds.length];
    }

    const allEmpty =
      Object.values(hands).every((h) => !h.length) && !stock.length;
    let winnerId: string | null = null;
    if (allEmpty) {
      const max = Math.max(...Object.values(books).map((b) => b.length));
      winnerId =
        Object.entries(books).find(([, b]) => b.length === max)?.[0] ?? null;
    }

    return {
      ...state,
      hands,
      books,
      stock,
      currentPlayerId,
      lastMessage,
      winnerId,
    };
  },

  checkWinner(state): WinResult | null {
    if (!state.winnerId) return null;
    return { winners: [state.winnerId], reason: "Most books of four!" };
  },

  calculateScores(state): ScoreMap {
    const scores: ScoreMap = {};
    for (const id of state.playerIds) scores[id] = state.books[id].length;
    return scores;
  },

  getClientView(state, playerId) {
    return {
      playerIds: state.playerIds,
      currentPlayerId: state.currentPlayerId,
      lastMessage: state.lastMessage,
      winnerId: state.winnerId,
      books: state.books,
      stockCount: state.stock.length,
      yourHand: state.hands[playerId] ?? [],
      handCounts: Object.fromEntries(
        state.playerIds.map((id) => [id, state.hands[id].length]),
      ),
    };
  },

  aiMove(state, playerId) {
    if (state.winnerId || state.currentPlayerId !== playerId) return null;
    const hand = state.hands[playerId];
    if (!hand.length) return null;
    const rank = hand[Math.floor(Math.random() * hand.length)].rank;
    const targets = state.playerIds.filter(
      (id) => id !== playerId && state.hands[id].length,
    );
    if (!targets.length) return null;
    return {
      type: "ask",
      targetId: targets[Math.floor(Math.random() * targets.length)],
      rank,
    };
  },
};
