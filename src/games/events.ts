/**
 * Socket.IO event names and payload shapes.
 * Shared by client and server so contracts stay in sync.
 */

import type { PlayMode } from "./types";

export const EVENTS = {
  ROOM_CREATE: "room:create",
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_READY: "room:ready",
  ROOM_START: "room:start",
  ROOM_REJOIN: "room:rejoin",
  ROOM_STATE: "room:state",
  ROOM_ERROR: "room:error",
  GAME_ACTION: "game:action",
  GAME_STATE: "game:state",
  GAME_ENDED: "game:ended",
  PLAYER_JOINED: "player:joined",
  PLAYER_LEFT: "player:left",
  PLAYER_REACTION: "player:reaction",
  PRESENCE_PING: "presence:ping",
  PRESENCE_NEARBY: "presence:nearby",
  CONNECTION_ACK: "connection:ack",
} as const;

export type RoomPhase = "lobby" | "playing" | "ended";

export interface PublicPlayer {
  id: string;
  displayName: string;
  avatarId: string;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  seat: number;
}

export interface RoomCreatePayload {
  gameId: string;
  displayName: string;
  avatarId: string;
  guestId?: string;
  mode?: PlayMode;
}

export interface RoomJoinPayload {
  code: string;
  displayName: string;
  avatarId: string;
  guestId?: string;
}

export interface RoomReadyPayload {
  ready: boolean;
}

export interface RoomRejoinPayload {
  roomId: string;
  token: string;
}

export interface GameActionPayload {
  action: unknown;
}

export interface PlayerReactionPayload {
  emoji: string;
}

export interface PresencePingPayload {
  guestId: string;
  displayName: string;
  avatarId: string;
}

export interface RoomErrorPayload {
  message: string;
  code:
    | "INVALID_PAYLOAD"
    | "ROOM_NOT_FOUND"
    | "ROOM_FULL"
    | "GAME_STARTED"
    | "NOT_HOST"
    | "NOT_READY"
    | "NOT_MEMBER"
    | "INVALID_ACTION"
    | "RATE_LIMIT"
    | "INTERNAL";
}

export interface ConnectionAckPayload {
  guestId: string;
  token: string;
  playerId: string;
}

export interface GameEndedPayload {
  winners: string[];
  scores: Record<string, number>;
  reason: string;
  xpAwarded: Record<string, number>;
}

export interface RoomStatePayload {
  roomId: string;
  code: string;
  gameId: string;
  mode: PlayMode;
  phase: RoomPhase;
  hostId: string;
  players: PublicPlayer[];
  /** Public game view for this socket's player (already fogged). */
  gameView: unknown | null;
  hostAddress?: string;
  reactions: Array<{ playerId: string; emoji: string; at: number }>;
}

export const ALLOWED_REACTIONS = [
  "👍",
  "😂",
  "😮",
  "🔥",
  "👏",
  "😅",
  "🎯",
  "❤️",
] as const;
