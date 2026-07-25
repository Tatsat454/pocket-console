import { createRoomCode, createToken, createGuestId } from "../src/lib/ids";
import { getGame } from "../src/games/registry";
import type { PlayMode } from "../src/games/types";
import type {
  PublicPlayer,
  RoomPhase,
  RoomStatePayload,
} from "../src/games/events";
import type { GameModule } from "../src/games/types";

export interface RoomPlayer {
  id: string;
  socketId: string | null;
  guestId: string;
  displayName: string;
  avatarId: string;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  seat: number;
  token: string;
}

export interface Room {
  id: string;
  code: string;
  gameId: string;
  mode: PlayMode;
  phase: RoomPhase;
  hostId: string;
  players: RoomPlayer[];
  /** Authoritative game state — never send raw to clients without fogging */
  gameState: unknown | null;
  module: GameModule;
  createdAt: number;
  reactions: Array<{ playerId: string; emoji: string; at: number }>;
  hostAddress?: string;
}

const roomsByCode = new Map<string, Room>();
const roomsById = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

/** Nearby presence on this host (local-network discovery). */
const nearby = new Map<
  string,
  { guestId: string; displayName: string; avatarId: string; at: number }
>();

export function touchPresence(
  guestId: string,
  displayName: string,
  avatarId: string,
): void {
  nearby.set(guestId, { guestId, displayName, avatarId, at: Date.now() });
}

export function listNearby(maxAgeMs = 30_000) {
  const now = Date.now();
  for (const [id, p] of nearby) {
    if (now - p.at > maxAgeMs) nearby.delete(id);
  }
  return [...nearby.values()];
}

function publicPlayers(room: Room): PublicPlayer[] {
  return room.players.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    avatarId: p.avatarId,
    ready: p.ready,
    connected: p.connected,
    isHost: p.isHost,
    seat: p.seat,
  }));
}

export function toRoomState(room: Room, forPlayerId: string): RoomStatePayload {
  const view =
    room.gameState && room.phase !== "lobby"
      ? room.module.getClientView(room.gameState, forPlayerId)
      : null;
  return {
    roomId: room.id,
    code: room.code,
    gameId: room.gameId,
    mode: room.mode,
    phase: room.phase,
    hostId: room.hostId,
    players: publicPlayers(room),
    gameView: view,
    hostAddress: room.hostAddress,
    reactions: room.reactions.slice(-12),
  };
}

export function createRoom(opts: {
  gameId: string;
  displayName: string;
  avatarId: string;
  guestId?: string;
  mode?: PlayMode;
  socketId: string;
  hostAddress?: string;
}): { room: Room; player: RoomPlayer } | { error: string } {
  const module = getGame(opts.gameId);
  if (!module || !module.meta.available) {
    return { error: "That game is not available yet." };
  }

  let code = createRoomCode();
  while (roomsByCode.has(code)) code = createRoomCode();

  const playerId = createGuestId();
  const player: RoomPlayer = {
    id: playerId,
    socketId: opts.socketId,
    guestId: opts.guestId ?? createGuestId(),
    displayName: opts.displayName,
    avatarId: opts.avatarId,
    ready: true,
    connected: true,
    isHost: true,
    seat: 0,
    token: createToken(),
  };

  const room: Room = {
    id: createGuestId(),
    code,
    gameId: opts.gameId,
    mode: opts.mode ?? "private_room",
    phase: "lobby",
    hostId: playerId,
    players: [player],
    gameState: null,
    module,
    createdAt: Date.now(),
    reactions: [],
    hostAddress: opts.hostAddress,
  };

  roomsByCode.set(code, room);
  roomsById.set(room.id, room);
  socketToRoom.set(opts.socketId, room.id);
  return { room, player };
}

export function joinRoom(opts: {
  code: string;
  displayName: string;
  avatarId: string;
  guestId?: string;
  socketId: string;
}): { room: Room; player: RoomPlayer } | { error: string } {
  const room = roomsByCode.get(opts.code.toUpperCase());
  if (!room) return { error: "Room not found." };
  if (room.phase !== "lobby") return { error: "Game already started." };
  if (room.players.length >= room.module.meta.maxPlayers) {
    return { error: "Room is full." };
  }

  // Reconnect same guest in lobby
  const existing = room.players.find(
    (p) => opts.guestId && p.guestId === opts.guestId,
  );
  if (existing) {
    if (existing.socketId) socketToRoom.delete(existing.socketId);
    existing.socketId = opts.socketId;
    existing.connected = true;
    existing.displayName = opts.displayName;
    existing.avatarId = opts.avatarId;
    socketToRoom.set(opts.socketId, room.id);
    return { room, player: existing };
  }

  const player: RoomPlayer = {
    id: createGuestId(),
    socketId: opts.socketId,
    guestId: opts.guestId ?? createGuestId(),
    displayName: opts.displayName,
    avatarId: opts.avatarId,
    ready: false,
    connected: true,
    isHost: false,
    seat: room.players.length,
    token: createToken(),
  };
  room.players.push(player);
  socketToRoom.set(opts.socketId, room.id);
  return { room, player };
}

export function getRoomBySocket(socketId: string): Room | undefined {
  const id = socketToRoom.get(socketId);
  return id ? roomsById.get(id) : undefined;
}

export function getRoomById(roomId: string): Room | undefined {
  return roomsById.get(roomId);
}

export function leaveSocket(socketId: string): Room | undefined {
  const room = getRoomBySocket(socketId);
  if (!room) return undefined;
  const player = room.players.find((p) => p.socketId === socketId);
  socketToRoom.delete(socketId);
  if (!player) return room;

  if (room.phase === "lobby") {
    room.players = room.players.filter((p) => p.id !== player.id);
    if (!room.players.length) {
      destroyRoom(room);
      return undefined;
    }
    if (player.isHost) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
    }
    room.players.forEach((p, i) => {
      p.seat = i;
    });
  } else {
    // Keep seat for reconnection during play
    player.connected = false;
    player.socketId = null;
  }
  return room;
}

export function destroyRoom(room: Room): void {
  roomsByCode.delete(room.code);
  roomsById.delete(room.id);
  for (const p of room.players) {
    if (p.socketId) socketToRoom.delete(p.socketId);
  }
}

export function rejoinRoom(opts: {
  roomId: string;
  token: string;
  socketId: string;
}): { room: Room; player: RoomPlayer } | { error: string } {
  const room = roomsById.get(opts.roomId);
  if (!room) return { error: "Room not found." };
  const player = room.players.find((p) => p.token === opts.token);
  if (!player) return { error: "Invalid session." };
  if (player.socketId) socketToRoom.delete(player.socketId);
  player.socketId = opts.socketId;
  player.connected = true;
  socketToRoom.set(opts.socketId, room.id);
  return { room, player };
}

export function startRoom(room: Room): { error?: string } {
  if (room.phase !== "lobby") return { error: "Already started." };
  if (room.players.length < room.module.meta.minPlayers) {
    return {
      error: `Need at least ${room.module.meta.minPlayers} players.`,
    };
  }
  if (!room.players.every((p) => p.ready)) {
    return { error: "Everyone must be ready." };
  }

  room.gameState = room.module.createInitialState({
    players: room.players.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      avatarId: p.avatarId,
      isHost: p.isHost,
    })),
    mode: room.mode,
    seed: `${room.id}-${Date.now()}`,
  });
  room.phase = "playing";
  return {};
}

/**
 * Apply a player action with server-side validation.
 * Deterministic modules keep all clients in sync from the same state stream.
 */
export function applyGameAction(
  room: Room,
  playerId: string,
  action: unknown,
): { error?: string; ended?: boolean } {
  if (room.phase !== "playing" || !room.gameState) {
    return { error: "Game not in progress." };
  }
  const validation = room.module.validateAction(
    room.gameState,
    action,
    playerId,
  );
  if (!validation.ok) return { error: validation.error ?? "Invalid action." };

  room.gameState = room.module.applyAction(room.gameState, action, playerId);
  const win = room.module.checkWinner(room.gameState);
  if (win) {
    room.phase = "ended";
    return { ended: true };
  }
  return {};
}

/** Periodic cleanup of empty/stale rooms. */
export function sweepRooms(maxAgeMs = 1000 * 60 * 60 * 4): void {
  const now = Date.now();
  for (const room of [...roomsById.values()]) {
    const allGone = room.players.every((p) => !p.connected);
    if (allGone && now - room.createdAt > 1000 * 60 * 30) {
      destroyRoom(room);
      continue;
    }
    if (now - room.createdAt > maxAgeMs) destroyRoom(room);
  }
}
