import { seededRandom } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface WyrPrompt {
  id: string;
  a: string;
  b: string;
}

export interface WouldYouRatherState {
  prompts: WyrPrompt[];
  index: number;
  votes: Record<string, "a" | "b">; // playerId -> choice for current prompt
  tallies: Array<{ a: number; b: number }>;
  playerIds: string[];
  finished: boolean;
  mode: "pass_and_play" | "simultaneous";
}

export type WouldYouRatherAction =
  | { type: "vote"; choice: "a" | "b" }
  | { type: "next" }
  | { type: "reveal" };

const PROMPT_BANK: WyrPrompt[] = [
  { id: "1", a: "Never-ending road trip snacks", b: "Perfect playlist forever" },
  { id: "2", a: "Always have a window seat", b: "Always skip airport security" },
  { id: "3", a: "Talk to animals", b: "Speak every human language" },
  { id: "4", a: "Be 10 minutes early always", b: "Be fashionably late always" },
  { id: "5", a: "Camp under stars", b: "Stay in a cozy cabin" },
  { id: "6", a: "Only sweet snacks", b: "Only salty snacks" },
  { id: "7", a: "Explore the ocean", b: "Explore outer space" },
  { id: "8", a: "Have a rewind button for today", b: "Have a skip button for tomorrow" },
  { id: "9", a: "Rainy road-trip day", b: "Sunny beach day" },
  { id: "10", a: "Win every board game", b: "Win every trivia night" },
  { id: "11", a: "Invisible for a day", b: "Fly for a day" },
  { id: "12", a: "Live near mountains", b: "Live near the sea" },
  { id: "13", a: "Cook amazing meals", b: "Bake legendary desserts" },
  { id: "14", a: "Always know the shortcut", b: "Always find the best scenic route" },
  { id: "15", a: "Unlimited coffee", b: "Unlimited iced tea" },
  { id: "16", a: "Photograph everything", b: "Remember everything perfectly" },
  { id: "17", a: "Be great at karaoke", b: "Be great at charades" },
  { id: "18", a: "Have a pet dragon", b: "Have a talking dog" },
  { id: "19", a: "Sunrise hikes", b: "Midnight drives" },
  { id: "20", a: "Solve a mystery", b: "Star in a comedy" },
];

function pickPrompts(seed: string, count: number): WyrPrompt[] {
  const rand = seededRandom(seed);
  const pool = [...PROMPT_BANK];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export const wouldYouRather: GameModule<WouldYouRatherState, WouldYouRatherAction> = {
  meta: {
    id: "would-you-rather",
    title: "Would You Rather",
    shortDescription: "Tough choices, silly debates, zero screens required after the prompt.",
    longDescription:
      "Read a prompt, pick a side, and argue your case. Built for pass-and-play or simultaneous voting in a room. Ideal for road trips.",
    minPlayers: 1,
    maxPlayers: 8,
    tags: ["party", "road-trip", "solo", "offline"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [5, 20],
    accent: "#F59E0B",
    icon: "🤔",
    available: true,
    supportsAi: false,
  },

  createInitialState(ctx: InitContext): WouldYouRatherState {
    const seed = ctx.seed ?? `${Date.now()}`;
    const prompts = pickPrompts(seed, 10);
    return {
      prompts,
      index: 0,
      votes: {},
      tallies: [],
      playerIds: ctx.players.map((p) => p.id),
      finished: false,
      mode: ctx.mode === "same_device" ? "pass_and_play" : "simultaneous",
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (state.finished && action.type !== "next") {
      return { ok: false, error: "Round finished." };
    }
    if (action.type === "vote") {
      if (!state.playerIds.includes(playerId)) {
        return { ok: false, error: "Not in this game." };
      }
      if (state.votes[playerId]) {
        return { ok: false, error: "Already voted." };
      }
      if (action.choice !== "a" && action.choice !== "b") {
        return { ok: false, error: "Pick A or B." };
      }
      return { ok: true };
    }
    if (action.type === "next" || action.type === "reveal") {
      return { ok: true };
    }
    return { ok: false, error: "Unknown action." };
  },

  applyAction(state, action, playerId): WouldYouRatherState {
    if (action.type === "vote") {
      const votes = { ...state.votes, [playerId]: action.choice };
      // In pass-and-play, each vote advances after a soft reveal via next.
      return { ...state, votes };
    }

    if (action.type === "reveal" || action.type === "next") {
      const a = Object.values(state.votes).filter((v) => v === "a").length;
      const b = Object.values(state.votes).filter((v) => v === "b").length;
      const tallies = [...state.tallies, { a, b }];
      const nextIndex = state.index + 1;
      if (nextIndex >= state.prompts.length) {
        return {
          ...state,
          tallies,
          votes: {},
          finished: true,
          index: state.index,
        };
      }
      return {
        ...state,
        tallies,
        votes: {},
        index: nextIndex,
      };
    }

    return state;
  },

  checkWinner(state): WinResult | null {
    if (!state.finished) return null;
    return {
      winners: state.playerIds,
      reason: "Conversation complete — everyone wins.",
      isDraw: true,
    };
  },

  calculateScores(state): ScoreMap {
    const scores: ScoreMap = {};
    for (const id of state.playerIds) scores[id] = state.tallies.length;
    return scores;
  },

  getClientView(state, playerId) {
    // Hide others' votes until reveal/next in simultaneous mode
    const hideVotes =
      state.mode === "simultaneous" &&
      !state.playerIds.every((id) => state.votes[id]);
    return {
      ...state,
      votes: hideVotes
        ? Object.fromEntries(
            Object.entries(state.votes).map(([id, v]) =>
              id === playerId ? [id, v] : [id, "hidden"],
            ),
          )
        : state.votes,
      current: state.prompts[state.index] ?? null,
    };
  },
};
