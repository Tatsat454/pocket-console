/**
 * Klondike Solitaire — single-player classic.
 * Deterministic under a seed for resume/replay.
 */

import { createStandardDeck, isRed, rankValue, type PlayingCard } from "../cards/deck";
import { seededRandom, shuffleInPlace } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface SolitaireState {
  stock: PlayingCard[];
  waste: PlayingCard[];
  foundations: PlayingCard[][]; // 4 piles
  tableaus: PlayingCard[][]; // 7 piles
  score: number;
  moves: number;
  won: boolean;
  playerId: string;
  drawMode: 1 | 3;
}

export type SolitaireAction =
  | { type: "draw" }
  | { type: "waste_to_foundation" }
  | { type: "waste_to_tableau"; tableau: number }
  | { type: "tableau_to_foundation"; tableau: number }
  | { type: "tableau_to_tableau"; from: number; to: number; count: number }
  | { type: "foundation_to_tableau"; foundation: number; tableau: number }
  | { type: "auto_finish" };

function top<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

function canStackOnTableau(card: PlayingCard, target?: PlayingCard): boolean {
  if (!target) return card.rank === "K";
  return isRed(card.suit) !== isRed(target.suit) && rankValue(card.rank) === rankValue(target.rank) - 1;
}

function canStackOnFoundation(card: PlayingCard, foundation: PlayingCard[]): boolean {
  if (!foundation.length) return card.rank === "A";
  const t = top(foundation)!;
  return card.suit === t.suit && rankValue(card.rank) === rankValue(t.rank) + 1;
}

function flipTop(tableau: PlayingCard[]): PlayingCard[] {
  if (!tableau.length) return tableau;
  const copy = tableau.map((c) => ({ ...c }));
  copy[copy.length - 1] = { ...copy[copy.length - 1], faceUp: true };
  return copy;
}

export const solitaire: GameModule<SolitaireState, SolitaireAction> = {
  meta: {
    id: "solitaire",
    title: "Solitaire",
    shortDescription: "Classic Klondike. Clear the board at your own pace.",
    longDescription:
      "Draw from the stock, build alternating colors on the tableau, and ace-up foundations by suit. Fully offline and resume-friendly.",
    minPlayers: 1,
    maxPlayers: 1,
    tags: ["solo", "card", "strategy", "offline", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: false,
    estimatedMinutes: [5, 20],
    accent: "#15803D",
    icon: "🂡",
    available: true,
    supportsAi: false,
  },

  createInitialState(ctx: InitContext): SolitaireState {
    const rand = seededRandom(ctx.seed ?? `${Date.now()}`);
    const deck = shuffleInPlace(
      createStandardDeck(false).map((c, i) => ({ ...c, id: `${c.id}_${i}` })),
      rand,
    );
    const tableaus: PlayingCard[][] = [[], [], [], [], [], [], []];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck.pop()!;
        card.faceUp = row === col;
        tableaus[col].push(card);
      }
    }
    return {
      stock: deck,
      waste: [],
      foundations: [[], [], [], []],
      tableaus,
      score: 0,
      moves: 0,
      won: false,
      playerId: ctx.players[0]?.id ?? "solo",
      drawMode: 1,
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (state.playerId !== playerId) return { ok: false, error: "Wrong player." };
    if (state.won && action.type !== "auto_finish") {
      return { ok: false, error: "Already won." };
    }

    switch (action.type) {
      case "draw":
        return { ok: true };
      case "waste_to_foundation": {
        const card = top(state.waste);
        if (!card) return { ok: false, error: "Waste is empty." };
        const ok = state.foundations.some((f) => canStackOnFoundation(card, f));
        return ok ? { ok: true } : { ok: false, error: "No foundation accepts that card." };
      }
      case "waste_to_tableau": {
        const card = top(state.waste);
        if (!card) return { ok: false, error: "Waste is empty." };
        const t = state.tableaus[action.tableau];
        if (!t) return { ok: false, error: "Invalid tableau." };
        return canStackOnTableau(card, top(t))
          ? { ok: true }
          : { ok: false, error: "Cannot place there." };
      }
      case "tableau_to_foundation": {
        const t = state.tableaus[action.tableau];
        const card = top(t);
        if (!card?.faceUp) return { ok: false, error: "Nothing to move." };
        const ok = state.foundations.some((f) => canStackOnFoundation(card, f));
        return ok ? { ok: true } : { ok: false, error: "No foundation accepts that card." };
      }
      case "tableau_to_tableau": {
        const from = state.tableaus[action.from];
        const to = state.tableaus[action.to];
        if (!from || !to) return { ok: false, error: "Invalid tableau." };
        if (action.count < 1 || action.count > from.length) {
          return { ok: false, error: "Invalid stack size." };
        }
        const start = from.length - action.count;
        const moving = from.slice(start);
        if (!moving.every((c) => c.faceUp)) {
          return { ok: false, error: "Can only move face-up cards." };
        }
        return canStackOnTableau(moving[0], top(to))
          ? { ok: true }
          : { ok: false, error: "Cannot place stack there." };
      }
      case "foundation_to_tableau": {
        const card = top(state.foundations[action.foundation] ?? []);
        if (!card) return { ok: false, error: "Foundation empty." };
        const t = state.tableaus[action.tableau];
        if (!t) return { ok: false, error: "Invalid tableau." };
        return canStackOnTableau(card, top(t))
          ? { ok: true }
          : { ok: false, error: "Cannot place there." };
      }
      case "auto_finish":
        return { ok: true };
      default:
        return { ok: false, error: "Unknown action." };
    }
  },

  applyAction(state, action): SolitaireState {
    let next: SolitaireState = {
      ...state,
      stock: [...state.stock],
      waste: [...state.waste],
      foundations: state.foundations.map((f) => [...f]),
      tableaus: state.tableaus.map((t) => t.map((c) => ({ ...c }))),
      moves: state.moves + 1,
    };

    if (action.type === "draw") {
      if (!next.stock.length) {
        next.stock = next.waste.reverse().map((c) => ({ ...c, faceUp: false }));
        next.waste = [];
      } else {
        const n = Math.min(next.drawMode, next.stock.length);
        for (let i = 0; i < n; i++) {
          const card = next.stock.pop()!;
          next.waste.push({ ...card, faceUp: true });
        }
      }
    }

    if (action.type === "waste_to_foundation") {
      const card = next.waste.pop()!;
      const fi = next.foundations.findIndex((f) => canStackOnFoundation(card, f));
      next.foundations[fi].push(card);
      next.score += 10;
    }

    if (action.type === "waste_to_tableau") {
      const card = next.waste.pop()!;
      next.tableaus[action.tableau].push(card);
      next.score += 5;
    }

    if (action.type === "tableau_to_foundation") {
      const card = next.tableaus[action.tableau].pop()!;
      const fi = next.foundations.findIndex((f) => canStackOnFoundation(card, f));
      next.foundations[fi].push(card);
      next.tableaus[action.tableau] = flipTop(next.tableaus[action.tableau]);
      next.score += 10;
    }

    if (action.type === "tableau_to_tableau") {
      const from = next.tableaus[action.from];
      const moving = from.splice(from.length - action.count, action.count);
      next.tableaus[action.to].push(...moving);
      next.tableaus[action.from] = flipTop(from);
    }

    if (action.type === "foundation_to_tableau") {
      const card = next.foundations[action.foundation].pop()!;
      next.tableaus[action.tableau].push(card);
      next.score = Math.max(0, next.score - 15);
    }

    if (action.type === "auto_finish") {
      // Try greedily move any face-up tops to foundations
      let progressed = true;
      while (progressed) {
        progressed = false;
        for (let t = 0; t < 7; t++) {
          const card = top(next.tableaus[t]);
          if (!card?.faceUp) continue;
          const fi = next.foundations.findIndex((f) => canStackOnFoundation(card, f));
          if (fi >= 0) {
            next.tableaus[t].pop();
            next.foundations[fi].push(card);
            next.tableaus[t] = flipTop(next.tableaus[t]);
            next.score += 10;
            progressed = true;
          }
        }
        const w = top(next.waste);
        if (w) {
          const fi = next.foundations.findIndex((f) => canStackOnFoundation(w, f));
          if (fi >= 0) {
            next.waste.pop();
            next.foundations[fi].push(w);
            next.score += 10;
            progressed = true;
          }
        }
      }
    }

    const foundationCount = next.foundations.reduce((n, f) => n + f.length, 0);
    if (foundationCount === 52) {
      next = { ...next, won: true, score: next.score + 100 };
    }

    return next;
  },

  checkWinner(state): WinResult | null {
    if (!state.won) return null;
    return { winners: [state.playerId], reason: "All foundations complete!" };
  },

  calculateScores(state): ScoreMap {
    return { [state.playerId]: state.score };
  },

  getClientView(state) {
    return state;
  },

  serialize(state) {
    return JSON.stringify(state);
  },

  deserialize(raw) {
    return JSON.parse(raw) as SolitaireState;
  },
};
