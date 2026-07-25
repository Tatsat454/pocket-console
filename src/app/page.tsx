"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FILTER_TAGS, filterGames, GAME_CATALOG } from "@/games/registry";
import type { GameTag } from "@/games/types";
import { GameCard } from "@/components/GameCard";
import { useApp } from "@/components/providers";
import { Button, Card, EmptyState, Shell, TopNav } from "@/components/ui";
import { useRoom } from "@/hooks/useRoom";

export default function HomePage() {
  const router = useRouter();
  const { profile, prefs, updatePrefs, favorites, recents, markRecent } = useApp();
  const { createRoom, joinRoom, error } = useRoom();
  const [tag, setTag] = useState<GameTag | "all">("all");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const roadTrip = prefs.roadTripMode;

  const games = useMemo(
    () =>
      filterGames({
        tag,
        roadTrip: roadTrip || undefined,
        query: undefined,
      }).sort((a, b) => Number(b.available) - Number(a.available)),
    [tag, roadTrip],
  );

  const recentGames = recents
    .map((id) => GAME_CATALOG.find((g) => g.id === id))
    .filter(Boolean);
  const favoriteGames = favorites
    .map((id) => GAME_CATALOG.find((g) => g.id === id))
    .filter(Boolean);

  async function quickPlay() {
    const pool = filterGames({
      availableOnly: true,
      roadTrip: roadTrip || undefined,
    });
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) return;
    markRecent(pick.id);
    router.push(`/play/${pick.id}`);
  }

  async function onCreateRoom() {
    setBusy(true);
    setBanner(null);
    const gameId =
      filterGames({ availableOnly: true, tag: "party" })[0]?.id ?? "color-clash";
    const res = await createRoom(
      gameId,
      prefs.roadTripMode ? "local_network" : "private_room",
    );
    setBusy(false);
    if (!res.ok) {
      setBanner(res.error ?? "Could not create room");
      return;
    }
    router.push(`/room?code=${res.code}`);
  }

  async function onJoinRoom() {
    if (!joinCode.trim()) return;
    setBusy(true);
    setBanner(null);
    const res = await joinRoom(joinCode);
    setBusy(false);
    if (!res.ok) {
      setBanner(res.error ?? error ?? "Could not join");
      return;
    }
    router.push(`/room?code=${joinCode.trim().toUpperCase()}`);
  }

  return (
    <Shell>
      <TopNav />

      <section className="relative mb-8 overflow-hidden rounded-[2rem] glass-card p-6 sm:p-10">
        <div className="relative z-10 max-w-xl">
          <p className="font-display text-5xl leading-none tracking-tight sm:text-6xl">
            Pocket Console
          </p>
          <p className="mt-3 text-lg text-[var(--muted)]">
            Hey {profile.nickname} — pick a game for the car, the couch, or a private room with friends.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={quickPlay}>Quick Play</Button>
            <Button variant="secondary" onClick={onCreateRoom} disabled={busy}>
              Create Room
            </Button>
            <Link href="/host">
              <Button variant="ghost">Local Wi‑Fi Host</Button>
            </Link>
          </div>
        </div>
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full opacity-70 animate-floaty sm:h-56 sm:w-56"
          style={{ background: "var(--accent)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 right-16 h-28 w-28 rounded-full opacity-60 animate-floaty sm:h-40 sm:w-40"
          style={{ background: "var(--secondary)", animationDelay: "1s" }}
          aria-hidden
        />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <p className="font-display text-xl">Join a room</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={8}
              className="min-h-12 flex-1 rounded-2xl border border-[var(--card-border)] bg-white/70 px-4 text-lg uppercase tracking-widest dark:bg-black/20"
              aria-label="Room code"
            />
            <Button onClick={onJoinRoom} disabled={busy || !joinCode.trim()}>
              Join
            </Button>
          </div>
          {banner && <p className="mt-2 text-sm text-red-600">{banner}</p>}
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl">Road-trip mode</p>
              <p className="text-sm text-[var(--muted)]">
                Phone-friendly, low typing, offline-ready party picks.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={roadTrip}
              onClick={() => updatePrefs({ roadTripMode: !roadTrip })}
              className={`relative h-10 w-16 rounded-full transition ${
                roadTrip ? "bg-[var(--secondary)]" : "bg-black/15 dark:bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 h-8 w-8 rounded-full bg-white transition ${
                  roadTrip ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </Card>
      </section>

      {(favoriteGames.length > 0 || recentGames.length > 0) && (
        <section className="mb-6 space-y-4">
          {favoriteGames.length > 0 && (
            <div>
              <h2 className="font-display mb-2 text-2xl">Favorites</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {favoriteGames.map((g) => g && <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}
          {recentGames.length > 0 && (
            <div>
              <h2 className="font-display mb-2 text-2xl">Recently played</h2>
              <div className="flex flex-wrap gap-2">
                {recentGames.map(
                  (g) =>
                    g && (
                      <Link
                        key={g.id}
                        href={`/play/${g.id}`}
                        className="rounded-full bg-black/5 px-4 py-2 text-sm font-bold dark:bg-white/10"
                      >
                        {g.icon} {g.title}
                      </Link>
                    ),
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl">Game library</h2>
          <p className="text-sm text-[var(--muted)]">
            {games.filter((g) => g.available).length} playable · {games.length} total
          </p>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTER_TAGS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTag(f.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
                tag === f.id
                  ? "bg-[var(--ink)] text-[var(--bg1)]"
                  : "bg-black/5 dark:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {games.length === 0 ? (
          <EmptyState
            title="No games match"
            body="Try another filter or turn off road-trip mode."
            action={
              <Button variant="ghost" onClick={() => setTag("all")}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
