import {
  createStandardDeck,
  suitSymbol,
  type PlayingCard,
  type Suit,
} from "../cards/deck";
import { seededRandom, shuffleInPlace } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface CrazyEightsState {
  playerIds: string[];
  hands: Record<string, PlayingCard[]>;
  stock: PlayingCard[];
  discard: PlayingCard[];
  currentSuit: Suit;
  currentPlayerId: string;
  mustChooseSuit: boolean;
  winnerId: string | null;
}

export type CrazyEightsAction =
  | { type: "play"; cardId: string; chosenSuit?: Suit }
  | { type: "draw" }
  | { type: "choose_suit"; suit: Suit }
  | { type: "reset" };

function canPlay(card: PlayingCard, top: PlayingCard, suit: Suit): boolean {
  return card.rank === "8" || card.rank === top.rank || card.suit === suit;
}

export const crazyEights: GameModule<CrazyEightsState, CrazyEightsAction> = {
  meta: {
    id: "crazy-eights",
    title: "Crazy Eights",
    shortDescription: "Match suit or rank — eights are wild.",
    longDescription:
      "Play a card matching the top discard's suit or rank. Eights are wild and let you name the next suit. First to empty their hand wins.",
    minPlayers: 1,
    maxPlayers: 5,
    tags: ["card", "party", "offline", "solo"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: false,
    estimatedMinutes: [10, 20],
    accent: "#DB2777",
    icon: "🎱",
    available: true,
    supportsAi: true,
  },

  createInitialState(ctx: InitContext): CrazyEightsState {
    const playerIds = ctx.players.map((p) => p.id);
    while (playerIds.length < 2) playerIds.push("ai");
    const rand = seededRandom(ctx.seed ?? `${Date.now()}`);
    const deck = shuffleInPlace(createStandardDeck(true), rand);
    const hands: Record<string, PlayingCard[]> = {};
    for (const id of playerIds) hands[id] = [];
    const deal = playerIds.length <= 2 ? 7 : 5;
    for (let i = 0; i < deal; i++) {
      for (const id of playerIds) {
        const c = deck.shift();
        if (c) hands[id].push(c);
      }
    }
    let starter = deck.shift()!;
    while (starter.rank === "8" && deck.length) {
      deck.push(starter);
      starter = deck.shift()!;
    }
    return {
      playerIds,
      hands,
      stock: deck,
      discard: [starter],
      currentSuit: starter.suit,
      currentPlayerId: playerIds[0],
      mustChooseSuit: false,
      winnerId: null,
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (action.type === "reset") return { ok: true };
    if (state.winnerId) return { ok: false, error: "Game finished." };
    if (state.mustChooseSuit) {
      if (action.type === "choose_suit") return { ok: true };
      return { ok: false, error: "Choose a suit for the eight." };
    }
    if (state.currentPlayerId !== playerId) {
      return { ok: false, error: "Not your turn." };
    }
    if (action.type === "draw") return { ok: true };
    if (action.type === "play") {
      const card = state.hands[playerId].find((c) => c.id === action.cardId);
      if (!card) return { ok: false, error: "Card not in hand." };
      const top = state.discard[state.discard.length - 1];
      if (!canPlay(card, top, state.currentSuit)) {
        return { ok: false, error: "Must match suit, rank, or play an eight." };
      }
      if (card.rank === "8" && !action.chosenSuit) {
        return { ok: false, error: "Pick a suit for the eight." };
      }
      return { ok: true };
    }
    return { ok: false, error: "Unknown action." };
  },

  applyAction(state, action, playerId): CrazyEightsState {
    if (action.type === "reset") {
      return crazyEights.createInitialState({
        players: state.playerIds.map((id) => ({
          id,
          displayName: id,
          avatarId: "spark",
        })),
        mode: "same_device",
        seed: `${Date.now()}`,
      });
    }

    if (action.type === "choose_suit") {
      const idx = state.playerIds.indexOf(state.currentPlayerId);
      return {
        ...state,
        currentSuit: action.suit,
        mustChooseSuit: false,
        currentPlayerId: state.playerIds[(idx + 1) % state.playerIds.length],
      };
    }

    const hands: Record<string, PlayingCard[]> = Object.fromEntries(
      Object.entries(state.hands).map(([id, h]) => [id, [...h]]),
    );
    let stock = [...state.stock];
    const discard = [...state.discard];
    let currentSuit = state.currentSuit;
    const mustChooseSuit = false;
    let winnerId: string | null = null;

    if (action.type === "draw") {
      if (!stock.length && discard.length > 1) {
        const top = discard.pop()!;
        stock = shuffleInPlace(
          discard.splice(0).map((c) => ({ ...c, faceUp: true })),
          Math.random,
        );
        discard.push(top);
      }
      const drawn = stock.shift();
      if (drawn) hands[playerId].push(drawn);
      const idx = state.playerIds.indexOf(playerId);
      return {
        ...state,
        hands,
        stock,
        discard,
        currentPlayerId: state.playerIds[(idx + 1) % state.playerIds.length],
      };
    }

    // play
    const card = hands[playerId].find((c) => c.id === action.cardId)!;
    hands[playerId] = hands[playerId].filter((c) => c.id !== action.cardId);
    discard.push(card);
    if (card.rank === "8") {
      currentSuit = action.chosenSuit!;
    } else {
      currentSuit = card.suit;
    }
    if (!hands[playerId].length) winnerId = playerId;
    const idx = state.playerIds.indexOf(playerId);
    return {
      ...state,
      hands,
      stock,
      discard,
      currentSuit,
      mustChooseSuit,
      winnerId,
      currentPlayerId: winnerId
        ? playerId
        : state.playerIds[(idx + 1) % state.playerIds.length],
    };
  },

  checkWinner(state): WinResult | null {
    if (!state.winnerId) return null;
    return { winners: [state.winnerId], reason: "Empty hand!" };
  },

  calculateScores(state): ScoreMap {
    const scores: ScoreMap = {};
    for (const id of state.playerIds) {
      scores[id] = state.hands[id].reduce((sum, c) => {
        if (c.rank === "8") return sum + 50;
        if (["J", "Q", "K"].includes(c.rank)) return sum + 10;
        if (c.rank === "A") return sum + 1;
        return sum + Number(c.rank);
      }, 0);
    }
    return scores;
  },

  getClientView(state, playerId) {
    const top = state.discard[state.discard.length - 1];
    return {
      playerIds: state.playerIds,
      currentPlayerId: state.currentPlayerId,
      currentSuit: state.currentSuit,
      suitSymbol: suitSymbol(state.currentSuit),
      topDiscard: top,
      mustChooseSuit: state.mustChooseSuit,
      winnerId: state.winnerId,
      stockCount: state.stock.length,
      yourHand: state.hands[playerId] ?? [],
      handCounts: Object.fromEntries(
        state.playerIds.map((id) => [id, state.hands[id].length]),
      ),
    };
  },

  aiMove(state, playerId) {
    if (state.winnerId || state.currentPlayerId !== playerId) return null;
    if (state.mustChooseSuit) {
      return { type: "choose_suit", suit: "spades" };
    }
    const top = state.discard[state.discard.length - 1];
    const playable = state.hands[playerId].filter((c) =>
      canPlay(c, top, state.currentSuit),
    );
    if (!playable.length) return { type: "draw" };
    const card = playable[0];
    if (card.rank === "8") {
      return { type: "play", cardId: card.id, chosenSuit: card.suit };
    }
    return { type: "play", cardId: card.id };
  },
};

export type { Suit };
