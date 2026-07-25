"use client";

import { useEffect, useMemo, useState } from "react";
import { SUITS, suitSymbol, type Suit } from "@/games/cards/deck";
import {
  crazyEights,
  type CrazyEightsAction,
  type CrazyEightsState,
} from "@/games/crazy-eights";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function CrazyEightsView({
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

  const [state, setState] = useState<CrazyEightsState>(() =>
    crazyEights.createInitialState({
      players: seats,
      mode: mode === "solo" ? "solo" : "same_device",
      seed: `${Date.now()}`,
    }),
  );
  const [pendingEight, setPendingEight] = useState<string | null>(null);

  useEffect(() => {
    const current = seats.find((p) => p.id === state.currentPlayerId);
    if (!current?.isAi || state.winnerId) return;
    const t = setTimeout(() => {
      const move = crazyEights.aiMove?.(state, current.id);
      if (!move) return;
      setState(crazyEights.applyAction(state, move, current.id));
    }, 450);
    return () => clearTimeout(t);
  }, [state, seats]);

  useEffect(() => {
    const win = crazyEights.checkWinner(state);
    if (win) onEnd?.(win.winners.includes(seats[0].id));
  }, [state, seats, onEnd]);

  function act(action: CrazyEightsAction) {
    const pid = state.currentPlayerId;
    if (seats.find((p) => p.id === pid)?.isAi && action.type !== "reset") return;
    const v = crazyEights.validateAction(state, action, pid);
    if (!v.ok) return alert(v.error);
    setState(crazyEights.applyAction(state, action, pid));
    setPendingEight(null);
  }

  const view = crazyEights.getClientView(state, state.currentPlayerId) as {
    yourHand: Array<{ id: string; rank: string; suit: Suit }>;
    topDiscard: { rank: string; suit: Suit };
    currentSuit: Suit;
    handCounts: Record<string, number>;
    stockCount: number;
  };
  const current =
    seats.find((p) => p.id === state.currentPlayerId)?.displayName ?? "Player";
  const humanTurn = !seats.find((p) => p.id === state.currentPlayerId)?.isAi;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl">Crazy Eights</p>
          <p className="text-sm text-[var(--muted)]">
            Suit {suitSymbol(view.currentSuit)}
            {state.winnerId
              ? ` · ${seats.find((p) => p.id === state.winnerId)?.displayName} wins!`
              : ` · ${current}'s turn`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => act({ type: "reset" })}>
          Restart
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {seats.map((p) => (
          <span key={p.id} className="rounded-full bg-black/5 px-3 py-1 dark:bg-white/10">
            {p.displayName}: {view.handCounts[p.id]}
          </span>
        ))}
      </div>
      <div className="mb-4 flex justify-center">
        <div className="grid h-28 w-20 place-items-center rounded-2xl bg-white text-2xl font-black shadow dark:bg-black/30">
          {view.topDiscard.rank}
          {suitSymbol(view.topDiscard.suit)}
        </div>
      </div>
      {pendingEight && (
        <div className="mb-3 grid grid-cols-4 gap-2">
          {SUITS.map((s) => (
            <Button
              key={s}
              onClick={() =>
                act({ type: "play", cardId: pendingEight, chosenSuit: s })
              }
            >
              {suitSymbol(s)}
            </Button>
          ))}
        </div>
      )}
      <div className="mb-3 flex justify-center">
        <Button
          variant="ghost"
          disabled={!humanTurn || !!state.winnerId}
          onClick={() => act({ type: "draw" })}
        >
          Draw ({view.stockCount})
        </Button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {view.yourHand.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={!humanTurn || !!state.winnerId}
            className="grid h-24 w-16 place-items-center rounded-2xl bg-white text-lg font-black shadow disabled:opacity-40 dark:bg-black/30"
            onClick={() => {
              if (c.rank === "8") setPendingEight(c.id);
              else act({ type: "play", cardId: c.id });
            }}
          >
            {c.rank}
            {suitSymbol(c.suit)}
          </button>
        ))}
      </div>
    </Card>
  );
}
