import { seededRandom, shuffleInPlace } from "@/lib/ids";
import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface BingoCell {
  id: string;
  label: string;
  marked: boolean;
  free?: boolean;
}

export interface BingoBoard {
  playerId: string;
  cells: BingoCell[]; // 25 cells, row-major 5x5
}

export interface BingoState {
  boards: BingoBoard[];
  sharedPool: string[];
  winners: string[];
  finished: boolean;
}

export type BingoAction =
  | { type: "toggle"; cellId: string }
  | { type: "claim_bingo" };

/** Road-trip themed prompts — glance-friendly, no typing. */
const PROMPTS = [
  "Red car",
  "License plate out of state",
  "Cow",
  "Motorcycle",
  "Billboard",
  "Rest stop",
  "Construction zone",
  "Yellow truck",
  "School bus",
  "Bridge",
  "Police car",
  "Convertible",
  "RV / camper",
  "Dog in a car",
  "Someone waving",
  "Gas station",
  "Fast food sign",
  "Train",
  "Bike on a rack",
  "Sunset / sunrise",
  "Cloud shaped like something",
  "Barn",
  "Windmill / turbine",
  "Bumper sticker",
  "Taxi / rideshare",
  "Trailer",
  "Boat",
  "Airplane",
  "Rainbow",
  "Toll booth",
  "Speed limit 65+",
  "Coffee cup",
  "Pickup truck",
  "Van with writing",
  "Motorcycle helmet",
  "Kid waving",
  "Map / GPS arguing",
  "Snack share",
  "Sing-along",
  "Scenic overlook",
];

function buildBoard(playerId: string, rand: () => number): BingoBoard {
  const labels = shuffleInPlace([...PROMPTS], rand).slice(0, 24);
  const cells: BingoCell[] = [];
  let li = 0;
  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      cells.push({ id: `${playerId}-free`, label: "FREE", marked: true, free: true });
    } else {
      const label = labels[li++];
      cells.push({ id: `${playerId}-${i}`, label, marked: false });
    }
  }
  return { playerId, cells };
}

function hasBingo(cells: BingoCell[]): boolean {
  const marked = cells.map((c) => c.marked);
  const lines = [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20],
  ];
  return lines.some((line) => line.every((i) => marked[i]));
}

export const roadTripBingo: GameModule<BingoState, BingoAction> = {
  meta: {
    id: "road-trip-bingo",
    title: "Road-Trip Bingo",
    shortDescription: "Spot things out the window. Mark your card. Shout bingo!",
    longDescription:
      "Each player gets a 5×5 board of roadside sights. Tap tiles when you spot them. First valid bingo wins — glance-friendly and phone-perfect.",
    minPlayers: 1,
    maxPlayers: 8,
    tags: ["party", "road-trip", "solo", "offline"],
    roadTripFriendly: true,
    offlineCapable: true,
    lowTyping: true,
    glanceFriendly: true,
    estimatedMinutes: [10, 60],
    accent: "#EA580C",
    icon: "🚌",
    available: true,
    supportsAi: false,
  },

  createInitialState(ctx: InitContext): BingoState {
    const seed = ctx.seed ?? `${Date.now()}`;
    const boards = ctx.players.map((p, i) =>
      buildBoard(p.id, seededRandom(`${seed}-${i}`)),
    );
    return {
      boards,
      sharedPool: PROMPTS,
      winners: [],
      finished: false,
    };
  },

  validateAction(state, action, playerId): ValidationResult {
    if (state.finished) return { ok: false, error: "Game already finished." };
    const board = state.boards.find((b) => b.playerId === playerId);
    if (!board) return { ok: false, error: "No board for player." };

    if (action.type === "toggle") {
      const cell = board.cells.find((c) => c.id === action.cellId);
      if (!cell) return { ok: false, error: "Unknown cell." };
      if (cell.free) return { ok: false, error: "Free space stays marked." };
      return { ok: true };
    }
    if (action.type === "claim_bingo") {
      if (!hasBingo(board.cells)) {
        return { ok: false, error: "Not a bingo yet — keep spotting!" };
      }
      return { ok: true };
    }
    return { ok: false, error: "Unknown action." };
  },

  applyAction(state, action, playerId): BingoState {
    const boards = state.boards.map((b) => {
      if (b.playerId !== playerId) return b;
      if (action.type === "toggle") {
        return {
          ...b,
          cells: b.cells.map((c) =>
            c.id === action.cellId && !c.free ? { ...c, marked: !c.marked } : c,
          ),
        };
      }
      return b;
    });

    if (action.type === "claim_bingo") {
      const board = boards.find((b) => b.playerId === playerId)!;
      if (hasBingo(board.cells)) {
        return {
          ...state,
          boards,
          winners: [...new Set([...state.winners, playerId])],
          finished: true,
        };
      }
    }

    return { ...state, boards };
  },

  checkWinner(state): WinResult | null {
    if (!state.finished || !state.winners.length) return null;
    return { winners: state.winners, reason: "Bingo!" };
  },

  calculateScores(state): ScoreMap {
    const scores: ScoreMap = {};
    for (const b of state.boards) {
      scores[b.playerId] = b.cells.filter((c) => c.marked).length;
      if (state.winners.includes(b.playerId)) scores[b.playerId] += 10;
    }
    return scores;
  },

  getClientView(state, playerId) {
    // Everyone can see their own board; others show mark counts only
    return {
      finished: state.finished,
      winners: state.winners,
      yourBoard: state.boards.find((b) => b.playerId === playerId) ?? null,
      rivals: state.boards
        .filter((b) => b.playerId !== playerId)
        .map((b) => ({
          playerId: b.playerId,
          marked: b.cells.filter((c) => c.marked).length,
        })),
    };
  },
};
