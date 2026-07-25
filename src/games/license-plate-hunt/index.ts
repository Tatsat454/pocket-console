import type {
  GameModule,
  InitContext,
  ValidationResult,
  WinResult,
  ScoreMap,
} from "../types";

export interface PlateItem {
  id: string;
  label: string;
  markedBy: string[];
}

export interface LicensePlateState {
  playerIds: string[];
  items: PlateItem[];
  target: number;
  winnerIds: string[];
  finished: boolean;
}

export type LicensePlateAction =
  | { type: "toggle"; itemId: string }
  | { type: "reset" };

const PLATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "Washington DC",
  "Canada",
  "Mexico",
];

export const licensePlateHunt: GameModule<LicensePlateState, LicensePlateAction> =
  {
    meta: {
      id: "license-plate-hunt",
      title: "License Plate Hunt",
      shortDescription: "Collect states and provinces from the road.",
      longDescription:
        "Tap plates when you spot them out the window. First player to hit the target count wins — or keep hunting together.",
      minPlayers: 1,
      maxPlayers: 8,
      tags: ["party", "road-trip", "solo", "offline"],
      roadTripFriendly: true,
      offlineCapable: true,
      lowTyping: true,
      glanceFriendly: true,
      estimatedMinutes: [15, 120],
      accent: "#0369A1",
      icon: "🚘",
      available: true,
      supportsAi: false,
    },

    createInitialState(ctx: InitContext): LicensePlateState {
      const playerIds = ctx.players.map((p) => p.id);
      return {
        playerIds,
        items: PLATES.map((label, i) => ({
          id: `plate-${i}`,
          label,
          markedBy: [],
        })),
        target: 10,
        winnerIds: [],
        finished: false,
      };
    },

    validateAction(state, action, playerId): ValidationResult {
      if (action.type === "reset") return { ok: true };
      if (state.finished) return { ok: false, error: "Hunt finished." };
      if (action.type !== "toggle") return { ok: false, error: "Unknown action." };
      if (!state.playerIds.includes(playerId)) {
        return { ok: false, error: "Not in this hunt." };
      }
      if (!state.items.some((i) => i.id === action.itemId)) {
        return { ok: false, error: "Unknown plate." };
      }
      return { ok: true };
    },

    applyAction(state, action, playerId): LicensePlateState {
      if (action.type === "reset") {
        return licensePlateHunt.createInitialState({
          players: state.playerIds.map((id) => ({
            id,
            displayName: id,
            avatarId: "spark",
          })),
          mode: "same_device",
        });
      }

      const items = state.items.map((item) => {
        if (item.id !== action.itemId) return item;
        const has = item.markedBy.includes(playerId);
        return {
          ...item,
          markedBy: has
            ? item.markedBy.filter((id) => id !== playerId)
            : [...item.markedBy, playerId],
        };
      });

      const counts = Object.fromEntries(
        state.playerIds.map((id) => [
          id,
          items.filter((i) => i.markedBy.includes(id)).length,
        ]),
      );
      const winnerIds = state.playerIds.filter((id) => counts[id] >= state.target);
      return {
        ...state,
        items,
        winnerIds,
        finished: winnerIds.length > 0,
      };
    },

    checkWinner(state): WinResult | null {
      if (!state.finished) return null;
      return {
        winners: state.winnerIds,
        reason: `First to ${state.target} plates!`,
      };
    },

    calculateScores(state): ScoreMap {
      const scores: ScoreMap = {};
      for (const id of state.playerIds) {
        scores[id] = state.items.filter((i) => i.markedBy.includes(id)).length;
      }
      return scores;
    },

    getClientView(state, playerId) {
      return {
        target: state.target,
        finished: state.finished,
        winnerIds: state.winnerIds,
        yourCount: state.items.filter((i) => i.markedBy.includes(playerId)).length,
        items: state.items.map((i) => ({
          id: i.id,
          label: i.label,
          marked: i.markedBy.includes(playerId),
          totalMarks: i.markedBy.length,
        })),
        scores: this.calculateScores(state),
      };
    },
  };
