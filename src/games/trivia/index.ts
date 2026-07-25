import { seededRandom, shuffleInPlace } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface TriviaQuestion {
  id: string;
  category: string;
  prompt: string;
  choices: [string, string, string, string];
  answer: number;
}

export interface TriviaState {
  questions: TriviaQuestion[];
  index: number;
  playerIds: string[];
  scores: Record<string, number>;
  answers: Record<string, number>;
  finished: boolean;
  winnerIds: string[];
}

export type TriviaAction =
  | { type: "answer"; choice: number }
  | { type: "next" }
  | { type: "reset" };

const BANK: TriviaQuestion[] = [
  {
    id: "t1",
    category: "Travel",
    prompt: "Which US state is known as the Grand Canyon State?",
    choices: ["Nevada", "Arizona", "Utah", "New Mexico"],
    answer: 1,
  },
  {
    id: "t2",
    category: "Science",
    prompt: "What planet is nicknamed the Red Planet?",
    choices: ["Venus", "Jupiter", "Mars", "Mercury"],
    answer: 2,
  },
  {
    id: "t3",
    category: "Food",
    prompt: "Which fruit is traditionally dried to make raisins?",
    choices: ["Apple", "Grape", "Plum", "Fig"],
    answer: 1,
  },
  {
    id: "t4",
    category: "Music",
    prompt: "How many strings does a standard guitar have?",
    choices: ["4", "5", "6", "8"],
    answer: 2,
  },
  {
    id: "t5",
    category: "Nature",
    prompt: "What do bees collect to make honey?",
    choices: ["Pollen", "Nectar", "Sap", "Dew"],
    answer: 1,
  },
  {
    id: "t6",
    category: "Sports",
    prompt: "How many players are on a basketball team on the court?",
    choices: ["4", "5", "6", "7"],
    answer: 1,
  },
  {
    id: "t7",
    category: "Geography",
    prompt: "Which ocean is the largest?",
    choices: ["Atlantic", "Indian", "Arctic", "Pacific"],
    answer: 3,
  },
  {
    id: "t8",
    category: "Movies",
    prompt: "In Finding Nemo, what kind of fish is Nemo?",
    choices: ["Goldfish", "Clownfish", "Angelfish", "Tuna"],
    answer: 1,
  },
  {
    id: "t9",
    category: "History",
    prompt: "Who was the first person to walk on the Moon?",
    choices: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "John Glenn"],
    answer: 2,
  },
  {
    id: "t10",
    category: "Road trip",
    prompt: "What does GPS stand for?",
    choices: [
      "Global Positioning System",
      "General Path Service",
      "Ground Pilot Signal",
      "Geo Point Sync",
    ],
    answer: 0,
  },
  {
    id: "t11",
    category: "Animals",
    prompt: "Which animal is known for its black and white stripes?",
    choices: ["Tiger", "Zebra", "Panda", "Skunk"],
    answer: 1,
  },
  {
    id: "t12",
    category: "Math",
    prompt: "What is 12 × 12?",
    choices: ["124", "132", "144", "156"],
    answer: 2,
  },
];

export const trivia: GameModule<TriviaState, TriviaAction> = {
  meta: {
    id: "trivia",
    title: "Trivia",
    shortDescription: "Quick-fire questions for the whole car.",
    longDescription:
      "Answer multiple-choice questions across travel, science, food, and more. Highest score after the round wins.",
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
    available: true,
    supportsAi: false,
  },

  createInitialState(ctx: InitContext): TriviaState {
    const rand = seededRandom(ctx.seed ?? `${Date.now()}`);
    const questions = shuffleInPlace([...BANK], rand).slice(0, 8);
    const playerIds = ctx.players.map((p) => p.id);
    const scores: Record<string, number> = {};
    for (const id of playerIds) scores[id] = 0;
    return {
      questions,
      index: 0,
      playerIds,
      scores,
      answers: {},
      finished: false,
      winnerIds: [],
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (action.type === "reset") return { ok: true };
    if (state.finished) {
      return { ok: false, error: "Round finished." };
    }
    if (action.type === "answer") {
      if (!state.playerIds.includes(playerId)) {
        return { ok: false, error: "Not in this game." };
      }
      if (state.answers[playerId] !== undefined) {
        return { ok: false, error: "Already answered." };
      }
      if (action.choice < 0 || action.choice > 3) {
        return { ok: false, error: "Pick a choice 0–3." };
      }
      return { ok: true };
    }
    if (action.type === "next") return { ok: true };
    return { ok: false, error: "Unknown action." };
  },

  applyAction(state, action, playerId): TriviaState {
    if (action.type === "reset") {
      return trivia.createInitialState({
        players: state.playerIds.map((id) => ({
          id,
          displayName: id,
          avatarId: "spark",
        })),
        mode: "same_device",
        seed: `${Date.now()}`,
      });
    }

    if (action.type === "answer") {
      return {
        ...state,
        answers: { ...state.answers, [playerId]: action.choice },
      };
    }

    const q = state.questions[state.index];
    const scores = { ...state.scores };
    for (const [id, choice] of Object.entries(state.answers)) {
      if (choice === q.answer) scores[id] += 1;
    }
    const nextIndex = state.index + 1;
    if (nextIndex >= state.questions.length) {
      const max = Math.max(...Object.values(scores));
      const winnerIds = Object.entries(scores)
        .filter(([, s]) => s === max)
        .map(([id]) => id);
      return {
        ...state,
        scores,
        answers: {},
        finished: true,
        winnerIds,
        index: state.index,
      };
    }
    return {
      ...state,
      scores,
      answers: {},
      index: nextIndex,
    };
  },

  checkWinner(state): WinResult | null {
    if (!state.finished) return null;
    if (state.winnerIds.length > 1) {
      return { winners: state.winnerIds, reason: "Tied high score!", isDraw: true };
    }
    return { winners: state.winnerIds, reason: "Trivia champ!" };
  },

  calculateScores(state): ScoreMap {
    return { ...state.scores };
  },

  getClientView(state, playerId) {
    const q = state.questions[state.index];
    const allIn = state.playerIds.every((id) => state.answers[id] !== undefined);
    return {
      index: state.index,
      total: state.questions.length,
      finished: state.finished,
      scores: state.scores,
      winnerIds: state.winnerIds,
      category: q?.category,
      prompt: q?.prompt,
      choices: q?.choices,
      yourAnswer: state.answers[playerId],
      answeredCount: Object.keys(state.answers).length,
      revealAnswer: allIn || state.finished ? q?.answer : null,
    };
  },
};
