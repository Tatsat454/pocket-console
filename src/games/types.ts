/**
 * Reusable game-module contract.
 * Multiplayer authority lives on the server; solo/same-device may run locally.
 * Prefer pure, deterministic applyAction for sync across clients.
 */

export type GameTag =
  | "solo"
  | "two-player"
  | "party"
  | "card"
  | "strategy"
  | "road-trip"
  | "offline";

export type PlayMode = "solo" | "same_device" | "private_room" | "local_network";

export interface GameMeta {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  minPlayers: number;
  maxPlayers: number;
  tags: GameTag[];
  /** Prioritized in Road Trip Mode */
  roadTripFriendly: boolean;
  /** Playable without a network connection */
  offlineCapable: boolean;
  /** Little/no typing — good for passengers */
  lowTyping: boolean;
  /** Players need not stare at the screen continuously */
  glanceFriendly: boolean;
  estimatedMinutes: [number, number];
  accent: string;
  icon: string;
  /** MVP-ready vs catalog-only placeholder listing */
  available: boolean;
  supportsAi: boolean;
}

export interface SeatPlayer {
  id: string;
  displayName: string;
  avatarId: string;
  isAi?: boolean;
  isHost?: boolean;
}

export interface InitContext {
  players: SeatPlayer[];
  mode: PlayMode;
  seed?: string;
  options?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export interface WinResult {
  winners: string[]; // player ids; empty = draw
  reason: string;
  isDraw?: boolean;
}

export type ScoreMap = Record<string, number>;

/**
 * Every game module implements this interface.
 * Generics keep state/actions typed per game while the registry stays uniform.
 */
export interface GameModule<TState = unknown, TAction = unknown> {
  meta: GameMeta;

  createInitialState(ctx: InitContext): TState;

  validateAction(
    state: TState,
    action: TAction,
    playerId: string,
  ): ValidationResult;

  /** Must be pure / deterministic given the same inputs. */
  applyAction(state: TState, action: TAction, playerId: string): TState;

  checkWinner(state: TState): WinResult | null;

  calculateScores(state: TState): ScoreMap;

  /**
   * Fog-of-war: strip private info (other players' hands, draw pile order, etc.)
   * before sending state to a given client.
   */
  getClientView(state: TState, playerId: string): unknown;

  getLegalActions?(state: TState, playerId: string): TAction[];

  aiMove?(state: TState, playerId: string): TAction | null;

  serialize?(state: TState): string;

  deserialize?(raw: string): TState;
}

export interface CatalogGame extends GameMeta {
  module?: GameModule;
}
