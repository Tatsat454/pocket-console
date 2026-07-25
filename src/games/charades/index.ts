import { seededRandom, shuffleInPlace } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface CharadesState {
  prompts: string[];
  index: number;
  playerIds: string[];
  actorId: string;
  scores: Record<string, number>;
  revealed: boolean;
  finished: boolean;
  winnerIds: string[];
}

export type CharadesAction =
  | { type: "reveal" }
  | { type: "got_it" }
  | { type: "skip" }
  | { type: "reset" };

const PROMPTS = [
  "Airplane turbulence",
  "Singing in the car",
  "Ordering drive-thru",
  "Putting up a tent",
  "Lost tourist",
  "Making a snow angel",
  "Surfing",
  "Walking a stubborn dog",
  "Opening a pickle jar",
  "Selfie fail",
  "Catching a fish",
  "Riding a roller coaster",
  "Making popcorn",
  "Hailing a taxi",
  "Playing air guitar",
  "Building a sandcastle",
  "Spilling coffee",
  "Winning a race",
  "Sneezing loudly",
  "Tying shoelaces",
];

export const charades: GameModule<CharadesState, CharadesAction> = {
  meta: {
    id: "charades",
    title: "Charades",
    shortDescription: "Act it out — phones face-down optional.",
    longDescription:
      "One player secretly sees a prompt and acts it out. Others guess aloud; tap Got it when someone nails it. Pass the phone each round.",
    minPlayers: 2,
    maxPlayers: 10,
    tags: ["party", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [10, 40],
    accent: "#C026D3",
    icon: "🎭",
    available: true,
    supportsAi: false,
  },

  createInitialState(ctx: InitContext): CharadesState {
    const rand = seededRandom(ctx.seed ?? `${Date.now()}`);
    const playerIds = ctx.players.map((p) => p.id);
    while (playerIds.length < 2) playerIds.push("p2");
    const scores: Record<string, number> = {};
    for (const id of playerIds) scores[id] = 0;
    return {
      prompts: shuffleInPlace([...PROMPTS], rand).slice(0, 12),
      index: 0,
      playerIds,
      actorId: playerIds[0],
      scores,
      revealed: false,
      finished: false,
      winnerIds: [],
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (action.type === "reset") return { ok: true };
    if (state.finished) return { ok: false, error: "Game finished." };
    if (action.type === "reveal") {
      if (playerId !== state.actorId) {
        return { ok: false, error: "Only the actor can reveal." };
      }
      return { ok: true };
    }
    if (action.type === "got_it" || action.type === "skip") {
      return { ok: true };
    }
    return { ok: false, error: "Unknown action." };
  },

  applyAction(state, action, playerId): CharadesState {
    if (action.type === "reset") {
      return charades.createInitialState({
        players: state.playerIds.map((id) => ({
          id,
          displayName: id,
          avatarId: "spark",
        })),
        mode: "same_device",
        seed: `${Date.now()}`,
      });
    }

    if (action.type === "reveal") {
      return { ...state, revealed: true };
    }

    const scores = { ...state.scores };
    if (action.type === "got_it") {
      scores[state.actorId] = (scores[state.actorId] ?? 0) + 1;
      // Award the guesser if they're not the actor
      if (playerId !== state.actorId) {
        scores[playerId] = (scores[playerId] ?? 0) + 1;
      }
    }

    const nextIndex = state.index + 1;
    if (nextIndex >= state.prompts.length) {
      const max = Math.max(...Object.values(scores));
      const winnerIds = Object.entries(scores)
        .filter(([, s]) => s === max)
        .map(([id]) => id);
      return {
        ...state,
        scores,
        finished: true,
        winnerIds,
        revealed: false,
      };
    }

    const actorIdx = state.playerIds.indexOf(state.actorId);
    return {
      ...state,
      scores,
      index: nextIndex,
      actorId: state.playerIds[(actorIdx + 1) % state.playerIds.length],
      revealed: false,
    };
  },

  checkWinner(state): WinResult | null {
    if (!state.finished) return null;
    if (state.winnerIds.length > 1) {
      return { winners: state.winnerIds, reason: "Tied performers!", isDraw: true };
    }
    return { winners: state.winnerIds, reason: "Best actor / guesser!" };
  },

  calculateScores(state): ScoreMap {
    return { ...state.scores };
  },

  getClientView(state, playerId) {
    const isActor = playerId === state.actorId;
    return {
      index: state.index,
      total: state.prompts.length,
      actorId: state.actorId,
      scores: state.scores,
      finished: state.finished,
      winnerIds: state.winnerIds,
      revealed: state.revealed,
      prompt: isActor || state.revealed ? state.prompts[state.index] : null,
      isActor,
    };
  },
};
