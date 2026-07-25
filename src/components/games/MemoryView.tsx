"use client";

import { useEffect, useState } from "react";
import {
  memoryMatch,
  type MemoryAction,
  type MemoryState,
} from "@/games/memory";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function MemoryView({
  players,
  onEnd,
}: {
  players: SeatPlayer[];
  onEnd?: (won: boolean | null) => void;
}) {
  const [state, setState] = useState<MemoryState>(() =>
    memoryMatch.createInitialState({
      players,
      mode: "same_device",
      seed: `${Date.now()}`,
    }),
  );

  useEffect(() => {
    if (state.flipped.length !== 2) return;
    const t = setTimeout(() => {
      const next = memoryMatch.applyAction(
        state,
        { type: "resolve" },
        state.currentPlayerId,
      );
      setState(next);
      const win = memoryMatch.checkWinner(next);
      if (win) {
        if (win.isDraw) onEnd?.(null);
        else onEnd?.(win.winners.includes(players[0].id));
      }
    }, 700);
    return () => clearTimeout(t);
  }, [state, players, onEnd]);

  function act(action: MemoryAction) {
    const pid = state.currentPlayerId;
    const v = memoryMatch.validateAction(state, action, pid);
    if (!v.ok) return;
    setState(memoryMatch.applyAction(state, action, pid));
  }

  const current =
    players.find((p) => p.id === state.currentPlayerId)?.displayName ?? "Player";

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl">Memory Match</p>
          <p className="text-sm text-[var(--muted)]">
            {state.finished
              ? "Game over!"
              : `${current}'s turn · find a pair`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => act({ type: "reset" })}>
          Restart
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {players.map((p) => (
          <span key={p.id} className="rounded-full bg-black/5 px-3 py-1 dark:bg-white/10">
            {p.displayName}: {state.scores[p.id] ?? 0}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {state.tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            disabled={tile.matched || tile.faceUp || state.finished}
            className={`aspect-square rounded-2xl text-3xl transition ${
              tile.faceUp || tile.matched
                ? "bg-[var(--secondary)] text-[var(--secondary-ink)]"
                : "bg-black/10 dark:bg-white/15"
            }`}
            onClick={() => act({ type: "flip", tileId: tile.id })}
          >
            {tile.faceUp || tile.matched ? tile.emoji : ""}
          </button>
        ))}
      </div>
    </Card>
  );
}
