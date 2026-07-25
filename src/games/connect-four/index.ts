import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export const CF_ROWS = 6;
export const CF_COLS = 7;

export type CfCell = "R" | "Y" | null;

export interface ConnectFourState {
  board: CfCell[][]; // [row][col], row 0 = top
  players: [string, string];
  colors: Record<string, "R" | "Y">;
  currentPlayerId: string;
  winnerId: string | null;
  isDraw: boolean;
}

export type ConnectFourAction =
  | { type: "drop"; column: number }
  | { type: "reset" };

function emptyBoard(): CfCell[][] {
  return Array.from({ length: CF_ROWS }, () => Array(CF_COLS).fill(null));
}

function findWin(board: CfCell[][]): CfCell {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < CF_ROWS; r++) {
    for (let c = 0; c < CF_COLS; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (
            nr < 0 ||
            nr >= CF_ROWS ||
            nc < 0 ||
            nc >= CF_COLS ||
            board[nr][nc] !== cell
          ) {
            ok = false;
            break;
          }
        }
        if (ok) return cell;
      }
    }
  }
  return null;
}

function dropRow(board: CfCell[][], col: number): number {
  for (let r = CF_ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

export const connectFour: GameModule<ConnectFourState, ConnectFourAction> = {
  meta: {
    id: "connect-four",
    title: "Connect Four",
    shortDescription: "Drop discs. Connect four. Outsmart your rival.",
    longDescription:
      "Take turns dropping colored discs into columns. First to get four in a row — horizontal, vertical, or diagonal — wins.",
    minPlayers: 1,
    maxPlayers: 2,
    tags: ["two-player", "strategy", "offline", "road-trip"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [5, 15],
    accent: "#1D4ED8",
    icon: "🔴",
    available: true,
    supportsAi: true,
  },

  createInitialState(ctx: InitContext): ConnectFourState {
    const p1 = ctx.players[0]?.id ?? "p1";
    const p2 = ctx.players[1]?.id ?? "ai";
    return {
      board: emptyBoard(),
      players: [p1, p2],
      colors: { [p1]: "R", [p2]: "Y" },
      currentPlayerId: p1,
      winnerId: null,
      isDraw: false,
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (action.type === "reset") return { ok: true };
    if (state.winnerId || state.isDraw) {
      return { ok: false, error: "Game finished." };
    }
    if (action.type !== "drop") return { ok: false, error: "Unknown action." };
    if (state.currentPlayerId !== playerId) {
      return { ok: false, error: "Not your turn." };
    }
    if (action.column < 0 || action.column >= CF_COLS) {
      return { ok: false, error: "Invalid column." };
    }
    if (dropRow(state.board, action.column) < 0) {
      return { ok: false, error: "Column is full." };
    }
    return { ok: true };
  },

  applyAction(state, action, playerId): ConnectFourState {
    if (action.type === "reset") {
      return {
        ...state,
        board: emptyBoard(),
        currentPlayerId: state.players[0],
        winnerId: null,
        isDraw: false,
      };
    }

    const board = state.board.map((row) => [...row]);
    const row = dropRow(board, action.column);
    board[row][action.column] = state.colors[playerId];
    const mark = findWin(board);
    let winnerId: string | null = null;
    let isDraw = false;
    if (mark) {
      winnerId =
        Object.entries(state.colors).find(([, c]) => c === mark)?.[0] ?? null;
    } else if (board.every((r) => r.every((c) => c !== null))) {
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
    };
  },

  checkWinner(state): WinResult | null {
    if (state.isDraw) {
      return { winners: [], reason: "Board full — draw.", isDraw: true };
    }
    if (state.winnerId) {
      return { winners: [state.winnerId], reason: "Four in a row!" };
    }
    return null;
  },

  calculateScores(state): ScoreMap {
    const scores: ScoreMap = {
      [state.players[0]]: 0,
      [state.players[1]]: 0,
    };
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
    const actions: ConnectFourAction[] = [];
    for (let c = 0; c < CF_COLS; c++) {
      if (dropRow(state.board, c) >= 0) actions.push({ type: "drop", column: c });
    }
    return actions;
  },

  aiMove(state, playerId) {
    const legal = this.getLegalActions?.(state, playerId) ?? [];
    if (!legal.length) return null;
    // Prefer center columns
    const preference = [3, 2, 4, 1, 5, 0, 6];
    for (const col of preference) {
      const hit = legal.find((a) => a.type === "drop" && a.column === col);
      if (hit) return hit;
    }
    return legal[0];
  },
};
