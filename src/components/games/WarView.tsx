"use client";

import { useEffect, useMemo, useState } from "react";
import { suitSymbol, type PlayingCard } from "@/games/cards/deck";
import { war, type WarAction, type WarState } from "@/games/war";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

function CardFace({ card }: { card: PlayingCard }) {
  if (!card.faceUp) {
    return (
      <div className="grid h-28 w-20 place-items-center rounded-2xl bg-[var(--ink)] text-white">
        ?
      </div>
    );
  }
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <div
      className={`grid h-28 w-20 place-items-center rounded-2xl bg-white text-2xl font-black shadow ${
        red ? "text-rose-600" : "text-slate-900"
      }`}
    >
      {card.rank}
      {suitSymbol(card.suit)}
    </div>
  );
}

export function WarView({
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
    return players.slice(0, 2);
  }, [players, mode]);

  const [state, setState] = useState<WarState>(() =>
    war.createInitialState({
      players: seats,
      mode: mode === "solo" ? "solo" : "same_device",
      seed: `${Date.now()}`,
    }),
  );

  useEffect(() => {
    const win = war.checkWinner(state);
    if (!win) return;
    onEnd?.(win.winners.includes(seats[0].id));
  }, [state, seats, onEnd]);

  function act(action: WarAction) {
    const pid = seats[0].id;
    const v = war.validateAction(state, action, pid);
    if (!v.ok) return;
    let next = war.applyAction(state, action, pid);
    // Auto-flip for AI after human flip in solo
    if (action.type === "flip" && mode === "solo" && !next.winnerId) {
      // war flips both in one action already
    }
    setState(next);
  }

  const view = war.getClientView(state, seats[0].id) as {
    piles: Record<string, number>;
    table: Record<string, PlayingCard[]>;
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl">War</p>
          <p className="text-sm text-[var(--muted)]">
            {state.winnerId
              ? `${seats.find((p) => p.id === state.winnerId)?.displayName} wins!`
              : state.lastRound?.war
                ? "War!"
                : "Flip to battle"}
          </p>
        </div>
        <Button variant="ghost" onClick={() => act({ type: "reset" })}>
          Rematch
        </Button>
      </div>
      <div className="mb-4 flex justify-around text-center text-sm font-bold">
        {seats.map((p) => (
          <div key={p.id}>
            {p.displayName}
            <div className="text-2xl">{view.piles[p.id]}</div>
          </div>
        ))}
      </div>
      <div className="mb-4 flex justify-center gap-6">
        {seats.map((p) => {
          const cards = state.table[p.id] ?? [];
          const top = cards[cards.length - 1];
          return (
            <div key={p.id} className="flex flex-col items-center gap-2">
              {top ? <CardFace card={top} /> : <div className="h-28 w-20" />}
            </div>
          );
        })}
      </div>
      <Button className="w-full" disabled={!!state.winnerId} onClick={() => act({ type: "flip" })}>
        Flip cards
      </Button>
    </Card>
  );
}
