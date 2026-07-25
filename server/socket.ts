import type { Server, Socket } from "socket.io";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { EVENTS } from "../src/games/events";
import {
  applyGameAction,
  createRoom,
  getRoomBySocket,
  joinRoom,
  leaveSocket,
  listNearby,
  rejoinRoom,
  startRoom,
  toRoomState,
  touchPresence,
  sweepRooms,
} from "./rooms";
import {
  gameActionSchema,
  presenceSchema,
  reactionSchema,
  roomCreateSchema,
  roomJoinSchema,
  roomReadySchema,
  roomRejoinSchema,
} from "./validate";
import { getLanAddresses } from "./network";

const actionLimiter = new RateLimiterMemory({
  points: 30,
  duration: 10,
});

const roomLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

function emitError(
  socket: Socket,
  message: string,
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
    | "INTERNAL",
) {
  socket.emit(EVENTS.ROOM_ERROR, { message, code });
}

async function consume(
  limiter: RateLimiterMemory,
  key: string,
): Promise<boolean> {
  try {
    await limiter.consume(key);
    return true;
  } catch {
    return false;
  }
}

function broadcastRoom(io: Server, roomId: string): void {
  const room = [...io.sockets.adapter.rooms.get(roomId) ?? []];
  // Emit per-socket fogged views
  for (const sid of room) {
    const s = io.sockets.sockets.get(sid);
    if (!s) continue;
    const r = getRoomBySocket(sid);
    if (!r || r.id !== roomId) continue;
    const player = r.players.find((p) => p.socketId === sid);
    if (!player) continue;
    s.emit(EVENTS.ROOM_STATE, toRoomState(r, player.id));
  }
}

export function registerSocketHandlers(io: Server, port: number): void {
  setInterval(() => sweepRooms(), 60_000);

  io.on("connection", (socket: Socket) => {
    socket.emit(EVENTS.CONNECTION_ACK, {
      guestId: "",
      token: "",
      playerId: "",
    });

    socket.on(EVENTS.ROOM_CREATE, async (raw, ack?: (r: unknown) => void) => {
      if (!(await consume(roomLimiter, socket.handshake.address))) {
        emitError(socket, "Too many rooms — slow down.", "RATE_LIMIT");
        return;
      }
      const parsed = roomCreateSchema.safeParse(raw);
      if (!parsed.success) {
        emitError(socket, "Invalid create payload.", "INVALID_PAYLOAD");
        return;
      }
      const lan = getLanAddresses()[0];
      const hostAddress = lan ? `http://${lan}:${port}` : undefined;
      const result = createRoom({
        ...parsed.data,
        socketId: socket.id,
        hostAddress,
      });
      if ("error" in result) {
        emitError(socket, result.error, "INTERNAL");
        ack?.({ ok: false, error: result.error });
        return;
      }
      socket.join(result.room.id);
      const state = toRoomState(result.room, result.player.id);
      socket.emit(EVENTS.ROOM_STATE, state);
      ack?.({
        ok: true,
        roomId: result.room.id,
        code: result.room.code,
        token: result.player.token,
        playerId: result.player.id,
        guestId: result.player.guestId,
      });
    });

    socket.on(EVENTS.ROOM_JOIN, async (raw, ack?: (r: unknown) => void) => {
      if (!(await consume(roomLimiter, socket.handshake.address))) {
        emitError(socket, "Too many join attempts.", "RATE_LIMIT");
        return;
      }
      const parsed = roomJoinSchema.safeParse(raw);
      if (!parsed.success) {
        emitError(socket, "Invalid join payload.", "INVALID_PAYLOAD");
        return;
      }
      const result = joinRoom({ ...parsed.data, socketId: socket.id });
      if ("error" in result) {
        const code =
          result.error.includes("full")
            ? "ROOM_FULL"
            : result.error.includes("started")
              ? "GAME_STARTED"
              : "ROOM_NOT_FOUND";
        emitError(socket, result.error, code);
        ack?.({ ok: false, error: result.error });
        return;
      }
      socket.join(result.room.id);
      broadcastRoom(io, result.room.id);
      ack?.({
        ok: true,
        roomId: result.room.id,
        code: result.room.code,
        token: result.player.token,
        playerId: result.player.id,
        guestId: result.player.guestId,
      });
    });

    socket.on(EVENTS.ROOM_READY, (raw) => {
      const parsed = roomReadySchema.safeParse(raw);
      if (!parsed.success) {
        emitError(socket, "Invalid ready payload.", "INVALID_PAYLOAD");
        return;
      }
      const room = getRoomBySocket(socket.id);
      if (!room) return emitError(socket, "Not in a room.", "NOT_MEMBER");
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;
      player.ready = parsed.data.ready;
      broadcastRoom(io, room.id);
    });

    socket.on(EVENTS.ROOM_START, () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return emitError(socket, "Not in a room.", "NOT_MEMBER");
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player?.isHost) {
        return emitError(socket, "Only the host can start.", "NOT_HOST");
      }
      const result = startRoom(room);
      if (result.error) {
        return emitError(
          socket,
          result.error,
          result.error.includes("ready") ? "NOT_READY" : "INTERNAL",
        );
      }
      broadcastRoom(io, room.id);
    });

    socket.on(EVENTS.ROOM_REJOIN, (raw, ack?: (r: unknown) => void) => {
      const parsed = roomRejoinSchema.safeParse(raw);
      if (!parsed.success) {
        emitError(socket, "Invalid rejoin payload.", "INVALID_PAYLOAD");
        return;
      }
      const result = rejoinRoom({ ...parsed.data, socketId: socket.id });
      if ("error" in result) {
        emitError(socket, result.error, "ROOM_NOT_FOUND");
        ack?.({ ok: false });
        return;
      }
      socket.join(result.room.id);
      socket.emit(EVENTS.ROOM_STATE, toRoomState(result.room, result.player.id));
      broadcastRoom(io, result.room.id);
      ack?.({ ok: true, playerId: result.player.id });
    });

    socket.on(EVENTS.GAME_ACTION, async (raw) => {
      if (!(await consume(actionLimiter, socket.id))) {
        emitError(socket, "Too many actions.", "RATE_LIMIT");
        return;
      }
      const parsed = gameActionSchema.safeParse(raw);
      if (!parsed.success) {
        emitError(socket, "Invalid action.", "INVALID_PAYLOAD");
        return;
      }
      const room = getRoomBySocket(socket.id);
      if (!room) return emitError(socket, "Not in a room.", "NOT_MEMBER");
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const result = applyGameAction(room, player.id, parsed.data.action);
      if (result.error) {
        return emitError(socket, result.error, "INVALID_ACTION");
      }

      broadcastRoom(io, room.id);

      if (result.ended && room.gameState) {
        const scores = room.module.calculateScores(room.gameState);
        const win = room.module.checkWinner(room.gameState);
        const xpAwarded: Record<string, number> = {};
        for (const p of room.players) {
          const won = win?.winners.includes(p.id);
          xpAwarded[p.id] = won ? 40 : win?.isDraw ? 25 : 15;
        }
        io.to(room.id).emit(EVENTS.GAME_ENDED, {
          winners: win?.winners ?? [],
          scores,
          reason: win?.reason ?? "Game over",
          xpAwarded,
        });
      }
    });

    socket.on(EVENTS.PLAYER_REACTION, (raw) => {
      const parsed = reactionSchema.safeParse(raw);
      if (!parsed.success) return;
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;
      room.reactions.push({
        playerId: player.id,
        emoji: parsed.data.emoji,
        at: Date.now(),
      });
      if (room.reactions.length > 40) room.reactions.shift();
      broadcastRoom(io, room.id);
    });

    socket.on(EVENTS.PRESENCE_PING, (raw) => {
      const parsed = presenceSchema.safeParse(raw);
      if (!parsed.success) return;
      touchPresence(
        parsed.data.guestId,
        parsed.data.displayName,
        parsed.data.avatarId,
      );
      socket.emit(EVENTS.PRESENCE_NEARBY, { players: listNearby() });
    });

    socket.on(EVENTS.ROOM_LEAVE, () => {
      const room = leaveSocket(socket.id);
      for (const roomName of socket.rooms) {
        if (roomName !== socket.id) socket.leave(roomName);
      }
      if (room) broadcastRoom(io, room.id);
    });

    socket.on("disconnect", () => {
      const room = leaveSocket(socket.id);
      if (room) broadcastRoom(io, room.id);
    });
  });
}
