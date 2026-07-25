"use client";

import { useEffect, useMemo, useState } from "react";
import { RANKS, suitSymbol, type Rank } from "@/games/cards/deck";
import { goFish, type GoFishAction, type GoFishState } from "@/games/go-fish";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function GoFishView({
  players,
  mode,
  onEnd,
}: {
  players: SeatPlayer[];
  mode: "solo" | "same_device";
  onEnd?: (won: boolean | null) => void;
}) {
  const seats = useMemo(() => {
    if (mode === "solo") {
      return [
        players[0],
        { id: "ai", displayName: "Console CPU", avatarId: "spark", isAi: true },
      ];
    }
    return players.slice(0, Math.min(5, Math.max(2, players.length)));
  }, [players, mode]);

  const [state, setState] = useState<GoFishState>(() =>
    goFish.createInitialState({
      players: seats,
      mode: mode === "solo" ? "solo" : "same_device",
      seed: `${Date.now()}`,
    }),
  );
  const [askRank, setAskRank] = useState<Rank>("A");
  const [targetId, setTargetId] = useState(seats[1]?.id ?? "ai");

  useEffect(() => {
    const current = seats.find((p) => p.id === state.currentPlayerId);
    if (!current?.isAi || state.winnerId) return;
    const t = setTimeout(() => {
      const move = goFish.aiMove?.(state, current.id);
      if (!move) return;
      setState(goFish.applyAction(state, move, current.id));
    }, 500);
    return () => clearTimeout(t);
  }, [state, seats]);

  useEffect(() => {
    const win = goFish.checkWinner(state);
    if (win) onEnd?.(win.winners.includes(seats[0].id));
  }, [state, seats, onEnd]);

  function act(action: GoFishAction) {
    const pid = state.currentPlayerId;
    if (seats.find((p) => p.id === pid)?.isAi) return;
    const v = goFish.validateAction(state, action, pid);
    if (!v.ok) return alert(v.error);
    setState(goFish.applyAction(state, action, pid));
  }

  const view = goFish.getClientView(state, state.currentPlayerId) as {
    yourHand: Array<{ id: string; rank: Rank; suit: string }>;
    handCounts: Record<string, number>;
    books: Record<string, Rank[]>;
    stockCount: number;
  };
  const current =
    seats.find((p) => p.id === state.currentPlayerId)?.displayName ?? "Player";

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl">Go Fish</p>
          <p className="text-sm text-[var(--muted)]">
            {state.winnerId
              ? `${seats.find((p) => p.id === state.winnerId)?.displayName} wins!`
              : `${current}'s turn · stock ${view.stockCount}`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => act({ type: "reset" })}>
          Restart
        </Button>
      </div>
      <p className="mb-3 text-sm">{state.lastMessage}</p>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {seats.map((p) => (
          <span key={p.id} className="rounded-full bg-black/5 px-3 py-1 dark:bg-white/10">
            {p.displayName}: {view.handCounts[p.id]} cards · {view.books[p.id]?.length ?? 0} books
          </span>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {view.yourHand.map((c) => (
          <button
            key={c.id}
            type="button"
            className="rounded-xl bg-white px-3 py-2 text-sm font-bold shadow dark:bg-black/30"
            onClick={() => setAskRank(c.rank)}
          >
            {c.rank}
            {suitSymbol(c.suit as "hearts")}
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Ask{" "}
          <select
            className="rounded-xl border border-[var(--card-border)] bg-transparent px-2 py-1"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {seats
              .filter((p) => p.id !== state.currentPlayerId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          for{" "}
          <select
            className="rounded-xl border border-[var(--card-border)] bg-transparent px-2 py-1"
            value={askRank}
            onChange={(e) => setAskRank(e.target.value as Rank)}
          >
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <Button
          disabled={!!state.winnerId || !!seats.find((p) => p.id === state.currentPlayerId)?.isAi}
          onClick={() => act({ type: "ask", targetId, rank: askRank })}
        >
          Ask
        </Button>
      </div>
    </Card>
  );
}
