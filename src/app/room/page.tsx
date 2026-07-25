"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnlineGameView } from "@/components/games/OnlineGameView";
import { RoomLobby } from "@/components/RoomLobby";
import { useApp } from "@/components/providers";
import { Button, Card, Shell, TopNav } from "@/components/ui";
import { useRoom } from "@/hooks/useRoom";

function RoomInner() {
  const params = useSearchParams();
  const code = params.get("code");
  const router = useRouter();
  const { profile } = useApp();
  const {
    room,
    error,
    connecting,
    ended,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    sendAction,
    sendReaction,
    leaveRoom,
  } = useRoom();

  useEffect(() => {
    if (!code || room) return;
    joinRoom(code);
  }, [code, room, joinRoom]);

  const me = useMemo(() => {
    if (!room) return null;
    return (
      room.players.find((p) => p.displayName === profile.nickname && p.avatarId === profile.avatarId) ??
      room.players.find((p) => p.isHost && room.players.length === 1) ??
      null
    );
  }, [room, profile]);

  // Prefer session player id when available
  const playerId = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("pocket_console_room_session");
      if (!raw) return me?.id ?? null;
      return (JSON.parse(raw) as { playerId: string }).playerId;
    } catch {
      return me?.id ?? null;
    }
  }, [me]);

  const isHost = room?.players.some((p) => p.id === playerId && p.isHost) ?? false;
  const myReady = room?.players.find((p) => p.id === playerId)?.ready ?? false;

  return (
    <Shell>
      <TopNav />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl">Multiplayer room</h1>
        <Button
          variant="ghost"
          onClick={() => {
            leaveRoom();
            router.push("/");
          }}
        >
          Exit
        </Button>
      </div>

      {ended && (
        <Card className="mb-4 text-center">
          <p className="font-display text-2xl">Match over</p>
          <p className="mt-1 text-[var(--muted)]">{ended.reason}</p>
        </Card>
      )}

      {room?.phase === "playing" || room?.phase === "ended" ? (
        <div className="space-y-4">
          <OnlineGameView room={room} playerId={playerId} onAction={sendAction} />
          <RoomLobby
            room={room}
            connecting={connecting}
            error={error}
            isHost={isHost}
            myReady={myReady}
            onReady={setReady}
            onStart={startGame}
            onLeave={() => {
              leaveRoom();
              router.push("/");
            }}
            onReaction={sendReaction}
          />
        </div>
      ) : (
        <>
          {!room && !code && (
            <Card className="mb-4">
              <p className="mb-3">No room yet — create one from a game, or join with a code on the home screen.</p>
              <Button
                onClick={async () => {
                  const res = await createRoom("color-clash");
                  if (res.code) router.replace(`/room?code=${res.code}`);
                }}
              >
                Create Color Clash room
              </Button>
            </Card>
          )}
          <RoomLobby
            room={room}
            connecting={connecting}
            error={error}
            isHost={isHost}
            myReady={myReady}
            onReady={setReady}
            onStart={startGame}
            onLeave={() => {
              leaveRoom();
              router.push("/");
            }}
            onReaction={sendReaction}
          />
        </>
      )}
    </Shell>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<Shell><TopNav /><Card>Loading room…</Card></Shell>}>
      <RoomInner />
    </Suspense>
  );
}
