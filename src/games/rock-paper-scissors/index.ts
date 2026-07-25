import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export type RpsChoice = "rock" | "paper" | "scissors";

export interface RpsState {
  players: [string, string];
  scores: Record<string, number>;
  choices: Record<string, RpsChoice | null>;
  history: Array<{
    choices: Record<string, RpsChoice>;
    winnerId: string | null;
  }>;
  targetWins: number;
  winnerId: string | null;
}

export type RpsAction =
  | { type: "choose"; choice: RpsChoice }
  | { type: "reset" };

const BEATS: Record<RpsChoice, RpsChoice> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

export const rockPaperScissors: GameModule<RpsState, RpsAction> = {
  meta: {
    id: "rock-paper-scissors",
    title: "Rock Paper Scissors",
    shortDescription: "Best of three — or best of forever.",
    longDescription:
      "Pick rock, paper, or scissors at the same time. First to three round wins takes the match. Instant laughs, zero setup.",
    minPlayers: 1,
    maxPlayers: 2,
    tags: ["two-player", "party", "offline", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [1, 5],
    accent: "#64748B",
    icon: "✊",
    available: true,
    supportsAi: true,
  },

  createInitialState(ctx: InitContext): RpsState {
    const p1 = ctx.players[0]?.id ?? "p1";
    const p2 = ctx.players[1]?.id ?? "ai";
    return {
      players: [p1, p2],
      scores: { [p1]: 0, [p2]: 0 },
      choices: { [p1]: null, [p2]: null },
      history: [],
      targetWins: 3,
      winnerId: null,
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (action.type === "reset") return { ok: true };
    if (state.winnerId) return { ok: false, error: "Match finished." };
    if (action.type !== "choose") return { ok: false, error: "Unknown action." };
    if (!state.players.includes(playerId)) {
      return { ok: false, error: "Not in this game." };
    }
    if (state.choices[playerId]) {
      return { ok: false, error: "Already chose this round." };
    }
    if (!["rock", "paper", "scissors"].includes(action.choice)) {
      return { ok: false, error: "Pick rock, paper, or scissors." };
    }
    return { ok: true };
  },

  applyAction(state, action, playerId): RpsState {
    if (action.type === "reset") {
      return rockPaperScissors.createInitialState({
        players: state.players.map((id) => ({
          id,
          displayName: id,
          avatarId: "spark",
        })),
        mode: "solo",
      });
    }

    const choices = { ...state.choices, [playerId]: action.choice };
    const [p1, p2] = state.players;
    if (!choices[p1] || !choices[p2]) {
      return { ...state, choices };
    }

    const c1 = choices[p1]!;
    const c2 = choices[p2]!;
    let roundWinner: string | null = null;
    if (c1 !== c2) {
      roundWinner = BEATS[c1] === c2 ? p1 : p2;
    }
    const scores = { ...state.scores };
    if (roundWinner) scores[roundWinner] += 1;
    const winnerId =
      scores[p1] >= state.targetWins
        ? p1
        : scores[p2] >= state.targetWins
          ? p2
          : null;

    return {
      ...state,
      choices: { [p1]: null, [p2]: null },
      scores,
      history: [
        ...state.history,
        { choices: { [p1]: c1, [p2]: c2 }, winnerId: roundWinner },
      ],
      winnerId,
    };
  },

  checkWinner(state): WinResult | null {
    if (!state.winnerId) return null;
    return { winners: [state.winnerId], reason: "Best of series!" };
  },

  calculateScores(state): ScoreMap {
    return { ...state.scores };
  },

  getClientView(state, playerId) {
    const [p1, p2] = state.players;
    const bothIn = !!(state.choices[p1] && state.choices[p2]);
    return {
      ...state,
      choices: {
        [p1]:
          bothIn || p1 === playerId ? state.choices[p1] : state.choices[p1] ? "hidden" : null,
        [p2]:
          bothIn || p2 === playerId ? state.choices[p2] : state.choices[p2] ? "hidden" : null,
      },
    };
  },

  aiMove(state, playerId) {
    if (state.winnerId || state.choices[playerId]) return null;
    const options: RpsChoice[] = ["rock", "paper", "scissors"];
    return {
      type: "choose",
      choice: options[Math.floor(Math.random() * options.length)],
    };
  },
};
