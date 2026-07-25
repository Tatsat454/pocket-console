"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EVENTS, type RoomStatePayload, type GameEndedPayload } from "@/games/events";
import { getSocket } from "@/lib/socket";
import { useApp } from "@/components/providers";

const SESSION_KEY = "pocket_console_room_session";

interface RoomSession {
  roomId: string;
  token: string;
  playerId: string;
  code: string;
}

export function useRoom() {
  const { profile, grantXp } = useApp();
  const [room, setRoom] = useState<RoomStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [ended, setEnded] = useState<GameEndedPayload | null>(null);
  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    setConnecting(!socket.connected);

    const onConnect = () => {
      setConnecting(false);
      // Graceful rejoin after blips
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const s = JSON.parse(raw) as RoomSession;
          socket.emit(EVENTS.ROOM_REJOIN, { roomId: s.roomId, token: s.token });
        }
      } catch {
        /* ignore */
      }
    };
    const onDisconnect = () => setConnecting(true);
    const onState = (state: RoomStatePayload) => {
      setRoom(state);
      setError(null);
    };
    const onErr = (e: { message: string }) => setError(e.message);
    const onEnded = (payload: GameEndedPayload) => {
      setEnded(payload);
      const pid = playerIdRef.current;
      if (pid && payload.xpAwarded[pid] != null) {
        const won = payload.winners.includes(pid);
        grantXp(payload.xpAwarded[pid], payload.winners.length ? won : undefined);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(EVENTS.ROOM_STATE, onState);
    socket.on(EVENTS.ROOM_ERROR, onErr);
    socket.on(EVENTS.GAME_ENDED, onEnded);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(EVENTS.ROOM_STATE, onState);
      socket.off(EVENTS.ROOM_ERROR, onErr);
      socket.off(EVENTS.GAME_ENDED, onEnded);
    };
  }, [grantXp]);

  const persistSession = (s: RoomSession) => {
    playerIdRef.current = s.playerId;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  };

  const createRoom = useCallback(
    (gameId: string, mode: "private_room" | "local_network" = "private_room") =>
      new Promise<{ ok: boolean; code?: string; error?: string }>((resolve) => {
        const socket = getSocket();
        socket.emit(
          EVENTS.ROOM_CREATE,
          {
            gameId,
            displayName: profile.nickname,
            avatarId: profile.avatarId,
            guestId: profile.guestId,
            mode,
          },
          (res: {
            ok: boolean;
            code?: string;
            roomId?: string;
            token?: string;
            playerId?: string;
            error?: string;
          }) => {
            if (res?.ok && res.roomId && res.token && res.playerId && res.code) {
              persistSession({
                roomId: res.roomId,
                token: res.token,
                playerId: res.playerId,
                code: res.code,
              });
              resolve({ ok: true, code: res.code });
            } else {
              resolve({ ok: false, error: res?.error ?? "Could not create room" });
            }
          },
        );
      }),
    [profile],
  );

  const joinRoom = useCallback(
    (code: string) =>
      new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const socket = getSocket();
        socket.emit(
          EVENTS.ROOM_JOIN,
          {
            code: code.trim().toUpperCase(),
            displayName: profile.nickname,
            avatarId: profile.avatarId,
            guestId: profile.guestId,
          },
          (res: {
            ok: boolean;
            roomId?: string;
            token?: string;
            playerId?: string;
            code?: string;
            error?: string;
          }) => {
            if (res?.ok && res.roomId && res.token && res.playerId) {
              persistSession({
                roomId: res.roomId,
                token: res.token,
                playerId: res.playerId,
                code: res.code ?? code.toUpperCase(),
              });
              resolve({ ok: true });
            } else {
              resolve({ ok: false, error: res?.error ?? "Could not join" });
            }
          },
        );
      }),
    [profile],
  );

  const setReady = useCallback((ready: boolean) => {
    getSocket().emit(EVENTS.ROOM_READY, { ready });
  }, []);

  const startGame = useCallback(() => {
    getSocket().emit(EVENTS.ROOM_START);
  }, []);

  const sendAction = useCallback((action: unknown) => {
    getSocket().emit(EVENTS.GAME_ACTION, { action });
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    getSocket().emit(EVENTS.PLAYER_REACTION, { emoji });
  }, []);

  const leaveRoom = useCallback(() => {
    getSocket().emit(EVENTS.ROOM_LEAVE);
    sessionStorage.removeItem(SESSION_KEY);
    setRoom(null);
    setEnded(null);
  }, []);

  return {
    room,
    error,
    connecting,
    ended,
    playerId: playerIdRef.current,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    sendAction,
    sendReaction,
    leaveRoom,
  };
}
