import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export type Cell = "X" | "O" | null;

export interface TicTacToeState {
  board: Cell[];
  currentPlayerId: string;
  players: [string, string]; // X, O
  marks: Record<string, "X" | "O">;
  winnerId: string | null;
  isDraw: boolean;
  moveCount: number;
}

export type TicTacToeAction =
  | { type: "place"; index: number }
  | { type: "reset" };

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winnerOnBoard(board: Cell[]): Cell {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export const ticTacToe: GameModule<TicTacToeState, TicTacToeAction> = {
  meta: {
    id: "tic-tac-toe",
    title: "Tic-Tac-Toe",
    shortDescription: "Classic three-in-a-row. Quick rematches forever.",
    longDescription:
      "Take turns placing X and O. First to complete a line of three wins. Perfect for two people on one phone or across a room.",
    minPlayers: 1,
    maxPlayers: 2,
    tags: ["solo", "two-player", "strategy", "road-trip", "offline"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [1, 5],
    accent: "#0D9488",
    icon: "○○",
    available: true,
    supportsAi: true,
  },

  createInitialState(ctx: InitContext): TicTacToeState {
    const p1 = ctx.players[0]?.id ?? "p1";
    const p2 = ctx.players[1]?.id ?? "ai";
    return {
      board: Array(9).fill(null),
      currentPlayerId: p1,
      players: [p1, p2],
      marks: { [p1]: "X", [p2]: "O" },
      winnerId: null,
      isDraw: false,
      moveCount: 0,
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (state.winnerId || state.isDraw) {
      if (action.type === "reset") return { ok: true };
      return { ok: false, error: "Game already finished." };
    }
    if (action.type === "reset") return { ok: true };
    if (action.type !== "place") return { ok: false, error: "Unknown action." };
    if (state.currentPlayerId !== playerId) {
      return { ok: false, error: "Not your turn." };
    }
    if (action.index < 0 || action.index > 8) {
      return { ok: false, error: "Invalid cell." };
    }
    if (state.board[action.index] !== null) {
      return { ok: false, error: "Cell already taken." };
    }
    return { ok: true };
  },

  applyAction(state, action, playerId): TicTacToeState {
    if (action.type === "reset") {
      return {
        ...state,
        board: Array(9).fill(null),
        currentPlayerId: state.players[0],
        winnerId: null,
        isDraw: false,
        moveCount: 0,
      };
    }

    const board = [...state.board];
    board[action.index] = state.marks[playerId];
    const mark = winnerOnBoard(board);
    let winnerId: string | null = null;
    let isDraw = false;
    if (mark) {
      winnerId = Object.entries(state.marks).find(([, m]) => m === mark)?.[0] ?? null;
    } else if (board.every((c) => c !== null)) {
      isDraw = true;
    }

    const next =
      state.currentPlayerId === state.players[0]
        ? state.players[1]
        : state.players[0];

    return {
      ...state,
      board,
      currentPlayerId: winnerId || isDraw ? state.currentPlayerId : next,
      winnerId,
      isDraw,
      moveCount: state.moveCount + 1,
    };
  },

  checkWinner(state): WinResult | null {
    if (state.isDraw) {
      return { winners: [], reason: "Draw — board is full.", isDraw: true };
    }
    if (state.winnerId) {
      return { winners: [state.winnerId], reason: "Three in a row!" };
    }
    return null;
  },

  calculateScores(state): ScoreMap {
    const scores: ScoreMap = {};
    for (const id of state.players) scores[id] = 0;
    if (state.winnerId) scores[state.winnerId] = 1;
    return scores;
  },

  getClientView(state) {
    return state;
  },

  getLegalActions(state, playerId) {
    if (state.winnerId || state.isDraw || state.currentPlayerId !== playerId) {
      return [];
    }
    return state.board
      .map((c, i) => (c === null ? ({ type: "place" as const, index: i }) : null))
      .filter(Boolean) as TicTacToeAction[];
  },

  aiMove(state, playerId) {
    const legal = this.getLegalActions?.(state, playerId) ?? [];
    if (!legal.length) return null;
    // Prefer center, then corners, then sides
    const preference = [4, 0, 2, 6, 8, 1, 3, 5, 7];
    for (const idx of preference) {
      const hit = legal.find((a) => a.type === "place" && a.index === idx);
      if (hit) return hit;
    }
    return legal[0];
  },

  serialize(state) {
    return JSON.stringify(state);
  },

  deserialize(raw) {
    return JSON.parse(raw) as TicTacToeState;
  },
};
