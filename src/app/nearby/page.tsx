"use client";

import { useEffect, useState } from "react";
import { EVENTS } from "@/games/events";
import { getAvatar } from "@/lib/avatars";
import { getSocket } from "@/lib/socket";
import { useApp } from "@/components/providers";
import { Button, Card, EmptyState, Shell, TopNav } from "@/components/ui";

interface NearbyPlayer {
  guestId: string;
  displayName: string;
  avatarId: string;
}

export default function NearbyPage() {
  const { profile } = useApp();
  const [players, setPlayers] = useState<NearbyPlayer[]>([]);
  const [status, setStatus] = useState("Looking for travelers on this host…");

  useEffect(() => {
    const socket = getSocket();
    const ping = () => {
      socket.emit(EVENTS.PRESENCE_PING, {
        guestId: profile.guestId,
        displayName: profile.nickname,
        avatarId: profile.avatarId,
      });
    };
    const onNearby = (payload: { players: NearbyPlayer[] }) => {
      setPlayers(payload.players.filter((p) => p.guestId !== profile.guestId));
      setStatus("Nearby on this console host");
    };
    socket.on(EVENTS.PRESENCE_NEARBY, onNearby);
    ping();
    const id = setInterval(ping, 5000);
    return () => {
      socket.off(EVENTS.PRESENCE_NEARBY, onNearby);
      clearInterval(id);
    };
  }, [profile]);

  return (
    <Shell>
      <TopNav />
      <h1 className="font-display mb-2 text-3xl">Nearby players</h1>
      <p className="mb-6 text-[var(--muted)]">
        Inspired by linking handhelds on the same trip — shows guests pinging this host on your Wi‑Fi.
        No personal accounts required.
      </p>

      <Card className="mb-4">
        <p className="text-sm text-[var(--muted)]">{status}</p>
        <Button className="mt-3" variant="secondary" onClick={() => location.reload()}>
          Refresh
        </Button>
      </Card>

      {players.length === 0 ? (
        <EmptyState
          title="No one nearby yet"
          body="Ask friends to open Pocket Console on this same host URL, then check back."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {players.map((p) => {
            const av = getAvatar(p.avatarId);
            return (
              <li key={p.guestId}>
                <Card className="flex items-center gap-3">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl text-2xl"
                    style={{ background: `${av.color}33` }}
                  >
                    {av.emoji}
                  </span>
                  <div>
                    <p className="font-display text-xl">{p.displayName}</p>
                    <p className="text-sm text-[var(--muted)]">Ready to challenge</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
