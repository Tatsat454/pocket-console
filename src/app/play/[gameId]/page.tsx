"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCatalogGame } from "@/games/registry";
import type { SeatPlayer } from "@/games/types";
import { BingoView } from "@/components/games/BingoView";
import { ColorClashView } from "@/components/games/ColorClashView";
import { SolitaireView } from "@/components/games/SolitaireView";
import { TicTacToeView } from "@/components/games/TicTacToeView";
import { WouldYouRatherView } from "@/components/games/WouldYouRatherView";
import { useApp } from "@/components/providers";
import { Button, Card, EmptyState, Shell, TopNav } from "@/components/ui";
import { useRoom } from "@/hooks/useRoom";
import { AVATARS } from "@/lib/avatars";

export default function PlayPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const game = getCatalogGame(gameId);
  const { profile, markRecent, grantXp } = useApp();
  const { createRoom } = useRoom();
  const router = useRouter();
  const [mode, setMode] = useState<"solo" | "same_device">("solo");
  const [started, setStarted] = useState(false);
  const [seatCount, setSeatCount] = useState(2);
  const [names, setNames] = useState(["Player 1", "Player 2"]);

  useEffect(() => {
    if (game?.available) markRecent(game.id);
  }, [game, markRecent]);

  const seats: SeatPlayer[] = useMemo(() => {
    if (mode === "solo") {
      return [
        {
          id: profile.guestId,
          displayName: profile.nickname,
          avatarId: profile.avatarId,
        },
      ];
    }
    return Array.from({ length: seatCount }, (_, i) => ({
      id: `local_${i}`,
      displayName: names[i] || `Player ${i + 1}`,
      avatarId: AVATARS[i % AVATARS.length].id,
      isHost: i === 0,
    }));
  }, [mode, seatCount, names, profile]);

  if (!game) {
    return (
      <Shell>
        <TopNav />
        <EmptyState
          title="Game not found"
          body="That cartridge isn't in the library."
          action={
            <Link href="/">
              <Button>Back home</Button>
            </Link>
          }
        />
      </Shell>
    );
  }

  if (!game.available) {
    return (
      <Shell>
        <TopNav />
        <EmptyState
          title={`${game.title} is coming soon`}
          body="It's listed in the catalog so you can plan your trip playlist."
          action={
            <Link href="/">
              <Button>Browse games</Button>
            </Link>
          }
        />
      </Shell>
    );
  }

  async function hostOnline() {
    const res = await createRoom(game!.id, "private_room");
    if (res.ok) router.push(`/room?code=${res.code}`);
    else alert(res.error);
  }

  return (
    <Shell>
      <TopNav />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-3xl">
            {game.icon} {game.title}
          </p>
          <p className="text-[var(--muted)]">{game.longDescription}</p>
        </div>
        <Link href="/">
          <Button variant="ghost">Library</Button>
        </Link>
      </div>

      {!started ? (
        <Card className="space-y-4">
          <p className="font-display text-xl">How are you playing?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              variant={mode === "solo" ? "primary" : "ghost"}
              onClick={() => {
                setMode("solo");
              }}
              disabled={game.minPlayers > 1}
            >
              Solo
            </Button>
            <Button
              variant={mode === "same_device" ? "primary" : "ghost"}
              onClick={() => setMode("same_device")}
              disabled={game.maxPlayers < 2}
            >
              Same device
            </Button>
            {game.maxPlayers > 1 && (
              <Button variant="secondary" onClick={hostOnline}>
                Private room
              </Button>
            )}
          </div>

          {mode === "same_device" && (
            <div className="space-y-3 rounded-2xl bg-black/5 p-4 dark:bg-white/10">
              <label className="block text-sm font-bold">
                Players: {seatCount}
                <input
                  type="range"
                  min={Math.max(2, game.minPlayers)}
                  max={Math.min(6, game.maxPlayers)}
                  value={seatCount}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setSeatCount(n);
                    setNames((prev) =>
                      Array.from({ length: n }, (_, i) => prev[i] || `Player ${i + 1}`),
                    );
                  }}
                  className="mt-2 w-full"
                />
              </label>
              {names.slice(0, seatCount).map((n, i) => (
                <input
                  key={i}
                  value={n}
                  onChange={(e) => {
                    const next = [...names];
                    next[i] = e.target.value;
                    setNames(next);
                  }}
                  className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-white/70 px-4 dark:bg-black/20"
                  aria-label={`Player ${i + 1} name`}
                />
              ))}
            </div>
          )}

          <Button
            onClick={() => setStarted(true)}
            disabled={mode === "solo" && game.minPlayers > 1}
          >
            Start
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStarted(false)}>
            Change mode
          </Button>
          {gameId === "tic-tac-toe" && (
            <TicTacToeView
              players={seats}
              mode={mode}
              onEnd={(won) => {
                if (won === true) grantXp(30, true);
                else if (won === false) grantXp(10, false);
                else grantXp(15);
              }}
            />
          )}
          {gameId === "solitaire" && (
            <SolitaireView
              player={seats[0]}
              onEnd={(won) => grantXp(won ? 50 : 10, won)}
            />
          )}
          {gameId === "color-clash" && (
            <ColorClashView
              players={mode === "solo" ? seats : seats}
              mode={mode === "solo" ? "solo" : "same_device"}
              onEnd={(won) => {
                if (won === true) grantXp(40, true);
                else if (won === false) grantXp(15, false);
              }}
            />
          )}
          {gameId === "road-trip-bingo" && (
            <BingoView
              players={mode === "solo" ? seats : seats}
              onEnd={(won) => grantXp(won ? 35 : 15, won)}
            />
          )}
          {gameId === "would-you-rather" && (
            <WouldYouRatherView
              players={mode === "solo" ? seats : seats}
              onEnd={() => grantXp(20)}
            />
          )}
        </div>
      )}
    </Shell>
  );
}
