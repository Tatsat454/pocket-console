import { seededRandom } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface TwentyQState {
  playerIds: string[];
  hostId: string;
  secret: string;
  category: string;
  questionsLeft: number;
  log: Array<{ askerId: string; text: string; answer: "yes" | "no" | "maybe" }>;
  pendingQuestion: { askerId: string; text: string } | null;
  guessed: boolean;
  winnerId: string | null;
  finished: boolean;
}

export type TwentyQAction =
  | { type: "ask"; text: string }
  | { type: "answer"; answer: "yes" | "no" | "maybe" }
  | { type: "guess"; text: string }
  | { type: "judge_guess"; correct: boolean }
  | { type: "reset" };

const SECRETS = [
  { category: "Animal", secret: "Dolphin" },
  { category: "Food", secret: "Pizza" },
  { category: "Place", secret: "Library" },
  { category: "Object", secret: "Umbrella" },
  { category: "Movie", secret: "Toy Story" },
  { category: "Vehicle", secret: "Submarine" },
  { category: "Sport", secret: "Bowling" },
  { category: "Job", secret: "Chef" },
];

export const twentyQuestions: GameModule<TwentyQState, TwentyQAction> = {
  meta: {
    id: "twenty-questions",
    title: "Twenty Questions",
    shortDescription: "Yes/no only. Guess the secret.",
    longDescription:
      "One host knows the secret. Others ask yes/no questions and try to guess before twenty questions run out.",
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
    available: true,
    supportsAi: false,
  },

  createInitialState(ctx: InitContext): TwentyQState {
    const playerIds = ctx.players.map((p) => p.id);
    while (playerIds.length < 2) playerIds.push("p2");
    const rand = seededRandom(ctx.seed ?? `${Date.now()}`);
    const pick = SECRETS[Math.floor(rand() * SECRETS.length)];
    return {
      playerIds,
      hostId: playerIds[0],
      secret: pick.secret,
      category: pick.category,
      questionsLeft: 20,
      log: [],
      pendingQuestion: null,
      guessed: false,
      winnerId: null,
      finished: false,
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (action.type === "reset") return { ok: true };
    if (state.finished) return { ok: false, error: "Round finished." };
    if (action.type === "ask") {
      if (playerId === state.hostId) {
        return { ok: false, error: "Host answers, doesn't ask." };
      }
      if (state.pendingQuestion) {
        return { ok: false, error: "Wait for the host to answer." };
      }
      if (!action.text.trim()) return { ok: false, error: "Type a question." };
      if (state.questionsLeft <= 0) {
        return { ok: false, error: "No questions left — guess!" };
      }
      return { ok: true };
    }
    if (action.type === "answer") {
      if (playerId !== state.hostId) {
        return { ok: false, error: "Only the host answers." };
      }
      if (!state.pendingQuestion) {
        return { ok: false, error: "No pending question." };
      }
      return { ok: true };
    }
    if (action.type === "guess") {
      if (playerId === state.hostId) {
        return { ok: false, error: "Host doesn't guess." };
      }
      if (!action.text.trim()) return { ok: false, error: "Type a guess." };
      return { ok: true };
    }
    if (action.type === "judge_guess") {
      if (playerId !== state.hostId) {
        return { ok: false, error: "Only the host judges." };
      }
      if (!state.guessed) return { ok: false, error: "No guess to judge." };
      return { ok: true };
    }
    return { ok: false, error: "Unknown action." };
  },

  applyAction(state, action, playerId): TwentyQState {
    if (action.type === "reset") {
      return twentyQuestions.createInitialState({
        players: state.playerIds.map((id) => ({
          id,
          displayName: id,
          avatarId: "spark",
        })),
        mode: "same_device",
        seed: `${Date.now()}`,
      });
    }

    if (action.type === "ask") {
      return {
        ...state,
        pendingQuestion: { askerId: playerId, text: action.text.trim() },
      };
    }

    if (action.type === "answer") {
      const pending = state.pendingQuestion!;
      return {
        ...state,
        pendingQuestion: null,
        questionsLeft: state.questionsLeft - 1,
        log: [
          ...state.log,
          { askerId: pending.askerId, text: pending.text, answer: action.answer },
        ],
        finished: state.questionsLeft - 1 <= 0 ? true : state.finished,
      };
    }

    if (action.type === "guess") {
      return {
        ...state,
        guessed: true,
        pendingQuestion: {
          askerId: playerId,
          text: `GUESS: ${action.text.trim()}`,
        },
      };
    }

    // judge_guess
    if (action.correct) {
      return {
        ...state,
        finished: true,
        winnerId: state.pendingQuestion?.askerId ?? null,
        guessed: false,
        pendingQuestion: null,
      };
    }
    return {
      ...state,
      guessed: false,
      pendingQuestion: null,
      finished: state.questionsLeft <= 0,
      winnerId: state.questionsLeft <= 0 ? state.hostId : null,
    };
  },

  checkWinner(state): WinResult | null {
    if (!state.finished) return null;
    if (state.winnerId) {
      return {
        winners: [state.winnerId],
        reason:
          state.winnerId === state.hostId
            ? "Secret survived twenty questions!"
            : "Guessed the secret!",
      };
    }
    return { winners: [state.hostId], reason: "Out of questions — host wins." };
  },

  calculateScores(state): ScoreMap {
    const scores: ScoreMap = {};
    for (const id of state.playerIds) scores[id] = 0;
    if (state.winnerId) scores[state.winnerId] = 1;
    return scores;
  },

  getClientView(state, playerId) {
    const isHost = playerId === state.hostId;
    return {
      playerIds: state.playerIds,
      hostId: state.hostId,
      category: state.category,
      secret: isHost ? state.secret : null,
      questionsLeft: state.questionsLeft,
      log: state.log,
      pendingQuestion: state.pendingQuestion,
      finished: state.finished,
      winnerId: state.winnerId,
      isHost,
      guessed: state.guessed,
    };
  },
};
