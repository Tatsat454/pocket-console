/**
 * Color Clash — original shedding-style card game.
 * Original names, colors, and rules flavor — not affiliated with any trademarked game.
 *
 * Rules summary:
 * - Play a card matching the top discard's color OR value.
 * - Wild Spectrum can be played anytime; chooser picks the color.
 * - Skip, Reverse, +2 Clash work as expected.
 * - First to empty hand wins.
 */

import { seededRandom, shuffleInPlace } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export type ClashColor = "ruby" | "azure" | "citrus" | "moss";
export type ClashValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "plus2"
  | "wild"
  | "wild_plus4";

export interface ClashCard {
  id: string;
  color: ClashColor | "spectrum";
  value: ClashValue;
}

export interface ColorClashState {
  players: string[];
  hands: Record<string, ClashCard[]>;
  discard: ClashCard[];
  drawPile: ClashCard[];
  currentColor: ClashColor;
  currentPlayerId: string;
  direction: 1 | -1;
  pendingDraw: number;
  winnerId: string | null;
  mustChooseColor: boolean;
  calledLast: Record<string, boolean>;
}

export type ColorClashAction =
  | { type: "play"; cardId: string; chosenColor?: ClashColor }
  | { type: "draw" }
  | { type: "choose_color"; color: ClashColor }
  | { type: "call_last" };

const COLORS: ClashColor[] = ["ruby", "azure", "citrus", "moss"];
const NUMBERS: ClashValue[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function createClashDeck(): ClashCard[] {
  const cards: ClashCard[] = [];
  let n = 0;
  for (const color of COLORS) {
    cards.push({ id: `c${n++}`, color, value: "0" });
    for (const value of NUMBERS.slice(1)) {
      cards.push({ id: `c${n++}`, color, value });
      cards.push({ id: `c${n++}`, color, value });
    }
    for (const value of ["skip", "reverse", "plus2"] as ClashValue[]) {
      cards.push({ id: `c${n++}`, color, value });
      cards.push({ id: `c${n++}`, color, value });
    }
  }
  for (let i = 0; i < 4; i++) {
    cards.push({ id: `c${n++}`, color: "spectrum", value: "wild" });
    cards.push({ id: `c${n++}`, color: "spectrum", value: "wild_plus4" });
  }
  return cards;
}

function canPlay(card: ClashCard, top: ClashCard, color: ClashColor, pending: number): boolean {
  if (pending > 0) {
    // Must respond with plus2 / wild_plus4 or you should draw instead
    return card.value === "plus2" || card.value === "wild_plus4";
  }
  if (card.color === "spectrum") return true;
  return card.color === color || card.value === top.value;
}

function nextPlayer(
  players: string[],
  current: string,
  dir: 1 | -1,
  skip = false,
): string {
  const idx = players.indexOf(current);
  const step = skip ? 2 : 1;
  const next = (idx + dir * step + players.length * 3) % players.length;
  return players[next];
}

function drawCards(
  state: ColorClashState,
  playerId: string,
  count: number,
): ColorClashState {
  const drawPile = [...state.drawPile];
  const discard = [...state.discard];
  const hand = [...(state.hands[playerId] ?? [])];

  for (let i = 0; i < count; i++) {
    if (!drawPile.length) {
      // Reshuffle discard (keep top)
      const top = discard.pop();
      if (!top || !discard.length) break;
      const reshuffled = shuffleInPlace(discard.splice(0, discard.length));
      drawPile.push(...reshuffled);
      discard.push(top);
    }
    const card = drawPile.pop();
    if (card) hand.push(card);
  }

  return {
    ...state,
    drawPile,
    discard,
    hands: { ...state.hands, [playerId]: hand },
  };
}

export const colorClash: GameModule<ColorClashState, ColorClashAction> = {
  meta: {
    id: "color-clash",
    title: "Color Clash",
    shortDescription: "Match colors, dodge +2s, and empty your hand first.",
    longDescription:
      "An original shedding card game. Match color or value, unleash Spectrum wilds, and call “Last Card!” when you’re down to one. Play same-device or in a private room.",
    minPlayers: 2,
    maxPlayers: 6,
    tags: ["card", "party", "two-player", "road-trip", "offline"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: false,
    estimatedMinutes: [10, 25],
    accent: "#DC2626",
    icon: "🃏",
    available: true,
    supportsAi: true,
  },

  createInitialState(ctx: InitContext): ColorClashState {
    const rand = seededRandom(ctx.seed ?? `${Date.now()}`);
    const deck = shuffleInPlace(createClashDeck(), rand);
    const players = ctx.players.map((p) => p.id);
    const hands: Record<string, ClashCard[]> = {};
    for (const id of players) hands[id] = [];

    // Deal 7
    for (let i = 0; i < 7; i++) {
      for (const id of players) {
        const c = deck.pop();
        if (c) hands[id].push(c);
      }
    }

    // Flip first non-wild for discard
    let first = deck.pop()!;
    while (first.color === "spectrum" && deck.length) {
      deck.unshift(first);
      first = deck.pop()!;
    }
    if (first.color === "spectrum") {
      first = { ...first, color: "ruby", value: "wild" };
    }

    return {
      players,
      hands,
      discard: [first],
      drawPile: deck,
      currentColor: first.color === "spectrum" ? "ruby" : first.color,
      currentPlayerId: players[0],
      direction: 1,
      pendingDraw: 0,
      winnerId: null,
      mustChooseColor: false,
      calledLast: Object.fromEntries(players.map((id) => [id, false])),
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (state.winnerId) return { ok: false, error: "Game over." };

    if (action.type === "choose_color") {
      if (!state.mustChooseColor || state.currentPlayerId !== playerId) {
        return { ok: false, error: "You cannot choose a color now." };
      }
      if (!COLORS.includes(action.color)) {
        return { ok: false, error: "Invalid color." };
      }
      return { ok: true };
    }

    if (action.type === "call_last") {
      const hand = state.hands[playerId] ?? [];
      if (hand.length !== 1) {
        return { ok: false, error: "Call Last Card only with one card." };
      }
      return { ok: true };
    }

    if (state.mustChooseColor) {
      return { ok: false, error: "Choose a color first." };
    }

    if (state.currentPlayerId !== playerId) {
      return { ok: false, error: "Not your turn." };
    }

    if (action.type === "draw") return { ok: true };

    if (action.type === "play") {
      const hand = state.hands[playerId] ?? [];
      const card = hand.find((c) => c.id === action.cardId);
      if (!card) return { ok: false, error: "Card not in hand." };
      const top = state.discard[state.discard.length - 1];
      if (!canPlay(card, top, state.currentColor, state.pendingDraw)) {
        return { ok: false, error: "That card cannot be played." };
      }
      if (
        (card.value === "wild" || card.value === "wild_plus4") &&
        !action.chosenColor &&
        state.players.length > 0
      ) {
        // Allow play; color can be chosen as part of action or follow-up
      }
      if (
        (card.value === "wild" || card.value === "wild_plus4") &&
        action.chosenColor &&
        !COLORS.includes(action.chosenColor)
      ) {
        return { ok: false, error: "Invalid chosen color." };
      }
      return { ok: true };
    }

    return { ok: false, error: "Unknown action." };
  },

  applyAction(state, action, playerId): ColorClashState {
    if (action.type === "call_last") {
      return {
        ...state,
        calledLast: { ...state.calledLast, [playerId]: true },
      };
    }

    if (action.type === "choose_color") {
      return {
        ...state,
        currentColor: action.color,
        mustChooseColor: false,
        currentPlayerId: nextPlayer(state.players, playerId, state.direction),
      };
    }

    if (action.type === "draw") {
      const count = state.pendingDraw > 0 ? state.pendingDraw : 1;
      let next = drawCards(state, playerId, count);
      next = {
        ...next,
        pendingDraw: 0,
        currentPlayerId: nextPlayer(next.players, playerId, next.direction),
      };
      return next;
    }

    // play
    const hand = [...(state.hands[playerId] ?? [])];
    const idx = hand.findIndex((c) => c.id === action.cardId);
    const card = hand[idx];
    hand.splice(idx, 1);

    let direction = state.direction;
    let pendingDraw = state.pendingDraw;
    const currentColor: ClashColor =
      card.color === "spectrum"
        ? action.chosenColor ?? state.currentColor
        : card.color;
    let mustChooseColor = false;
    const currentPlayerId = playerId;
    let skip = false;

    if (card.value === "plus2") pendingDraw += 2;
    if (card.value === "wild_plus4") pendingDraw += 4;
    if (card.value === "reverse") {
      direction = (direction * -1) as 1 | -1;
      if (state.players.length === 2) skip = true; // reverse acts as skip in 2p
    }
    if (card.value === "skip") skip = true;
    if (
      (card.value === "wild" || card.value === "wild_plus4") &&
      !action.chosenColor
    ) {
      mustChooseColor = true;
    }

    const calledLast = { ...state.calledLast, [playerId]: hand.length === 1 ? state.calledLast[playerId] : false };

    // Penalty: emptied to 1 without calling last on previous turn — soft rule:
    // if they play their second-to-last without having called, force draw 2 after play
    let nextState: ColorClashState = {
      ...state,
      hands: { ...state.hands, [playerId]: hand },
      discard: [...state.discard, card],
      direction,
      pendingDraw,
      currentColor,
      mustChooseColor,
      calledLast,
      currentPlayerId,
    };

    if (hand.length === 0) {
      return { ...nextState, winnerId: playerId, mustChooseColor: false };
    }

    // Forgot to call last when going to 1 card
    if (hand.length === 1 && !state.calledLast[playerId]) {
      // They may still call on this turn via call_last; no auto-penalty yet
    }

    if (!mustChooseColor) {
      // If pending attack was stacked, turn passes to next who must respond
      nextState = {
        ...nextState,
        currentPlayerId: nextPlayer(
          nextState.players,
          playerId,
          direction,
          skip,
        ),
      };
    }

    return nextState;
  },

  checkWinner(state): WinResult | null {
    if (!state.winnerId) return null;
    return { winners: [state.winnerId], reason: "Emptied their hand!" };
  },

  calculateScores(state): ScoreMap {
    const scores: ScoreMap = {};
    for (const id of state.players) {
      const hand = state.hands[id] ?? [];
      scores[id] = -hand.reduce((sum, c) => {
        if (c.value === "wild" || c.value === "wild_plus4") return sum + 50;
        if (["skip", "reverse", "plus2"].includes(c.value)) return sum + 20;
        return sum + (parseInt(c.value, 10) || 0);
      }, 0);
      if (id === state.winnerId) scores[id] += 100;
    }
    return scores;
  },

  getClientView(state, playerId) {
    return {
      players: state.players,
      yourHand: state.hands[playerId] ?? [],
      handCounts: Object.fromEntries(
        state.players.map((id) => [id, state.hands[id]?.length ?? 0]),
      ),
      topDiscard: state.discard[state.discard.length - 1] ?? null,
      currentColor: state.currentColor,
      currentPlayerId: state.currentPlayerId,
      direction: state.direction,
      pendingDraw: state.pendingDraw,
      winnerId: state.winnerId,
      mustChooseColor: state.mustChooseColor && state.currentPlayerId === playerId,
      drawCount: state.drawPile.length,
      calledLast: state.calledLast,
    };
  },

  getLegalActions(state, playerId) {
    if (state.winnerId || state.currentPlayerId !== playerId) return [];
    if (state.mustChooseColor) {
      return COLORS.map((color) => ({ type: "choose_color" as const, color }));
    }
    const top = state.discard[state.discard.length - 1];
    const hand = state.hands[playerId] ?? [];
    const plays: ColorClashAction[] = hand
      .filter((c) => canPlay(c, top, state.currentColor, state.pendingDraw))
      .map((c) =>
        c.color === "spectrum"
          ? { type: "play" as const, cardId: c.id, chosenColor: "ruby" }
          : { type: "play" as const, cardId: c.id },
      );
    plays.push({ type: "draw" });
    if (hand.length === 1) plays.push({ type: "call_last" });
    return plays;
  },

  aiMove(state, playerId) {
    const legal = this.getLegalActions?.(state, playerId) ?? [];
    const play = legal.find((a) => a.type === "play");
    if (play) return play;
    const choose = legal.find((a) => a.type === "choose_color");
    if (choose) return choose;
    return legal.find((a) => a.type === "draw") ?? null;
  },
};

export const CLASH_COLOR_HEX: Record<ClashColor | "spectrum", string> = {
  ruby: "#E11D48",
  azure: "#2563EB",
  citrus: "#F59E0B",
  moss: "#16A34A",
  spectrum: "#7C3AED",
};
