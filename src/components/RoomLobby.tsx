"use client";

import { ALLOWED_REACTIONS } from "@/games/events";
import { getCatalogGame } from "@/games/registry";
import { getAvatar } from "@/lib/avatars";
import type { RoomStatePayload } from "@/games/events";
import { Button, Card, ErrorBanner, LoadingState } from "./ui";

export function RoomLobby({
  room,
  connecting,
  error,
  isHost,
  onReady,
  onStart,
  onLeave,
  onReaction,
  myReady,
}: {
  room: RoomStatePayload | null;
  connecting: boolean;
  error: string | null;
  isHost: boolean;
  myReady: boolean;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
  onReaction: (emoji: string) => void;
}) {
  if (connecting && !room) {
    return <LoadingState label="Connecting to console host…" />;
  }

  if (!room) {
    return (
      <Card>
        {error && <ErrorBanner message={error} />}
        <p className="text-[var(--muted)]">Not in a room yet.</p>
      </Card>
    );
  }

  const game = getCatalogGame(room.gameId);

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-[var(--muted)]">Room code</p>
            <p className="font-display text-4xl tracking-[0.2em]">{room.code}</p>
            <p className="mt-1 text-[var(--muted)]">
              {game?.title ?? room.gameId} · {room.phase}
            </p>
          </div>
          <Button variant="ghost" onClick={onLeave}>
            Leave
          </Button>
        </div>
        {room.hostAddress && (
          <div className="mt-4 rounded-2xl bg-black/5 p-3 text-sm dark:bg-white/10">
            <p className="font-bold">Local network join</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[var(--muted)]">
              <li>Connect to the same Wi‑Fi or hotspot.</li>
              <li>Open {room.hostAddress} on your phone.</li>
              <li>Join with code {room.code}.</li>
            </ol>
          </div>
        )}
      </Card>

      <Card>
        <p className="font-display mb-3 text-xl">Players</p>
        <ul className="space-y-2">
          {room.players.map((p) => {
            const av = getAvatar(p.avatarId);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-2xl bg-black/5 px-3 py-2 dark:bg-white/10"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden>{av.emoji}</span>
                  <span>
                    {p.displayName}
                    {p.isHost ? " (host)" : ""}
                    {!p.connected ? " · reconnecting…" : ""}
                  </span>
                </span>
                <span className={p.ready ? "text-emerald-600" : "text-[var(--muted)]"}>
                  {p.ready ? "Ready" : "Waiting"}
                </span>
              </li>
            );
          })}
        </ul>
        {room.phase === "lobby" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onReady(!myReady)}>
              {myReady ? "Unready" : "Ready up"}
            </Button>
            {isHost && (
              <Button onClick={onStart} disabled={!room.players.every((p) => p.ready)}>
                Start game
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm text-[var(--muted)]">Quick reactions (no chat)</p>
        <div className="flex flex-wrap gap-2">
          {ALLOWED_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded-xl bg-black/5 px-3 py-2 text-xl dark:bg-white/10"
              onClick={() => onReaction(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-2xl">
          {room.reactions.slice(-8).map((r, i) => (
            <span key={`${r.at}-${i}`}>{r.emoji}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}
