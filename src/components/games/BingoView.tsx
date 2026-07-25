"use client";

import { useState } from "react";
import {
  roadTripBingo,
  type BingoAction,
  type BingoState,
} from "@/games/bingo";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function BingoView({
  players,
  onEnd,
}: {
  players: SeatPlayer[];
  onEnd?: (won: boolean) => void;
}) {
  const [active, setActive] = useState(0);
  const [state, setState] = useState<BingoState>(() =>
    roadTripBingo.createInitialState({
      players,
      mode: "same_device",
      seed: `${Date.now()}`,
    }),
  );

  const player = players[active % players.length];
  const board = state.boards.find((b) => b.playerId === player.id);

  function act(action: BingoAction) {
    const v = roadTripBingo.validateAction(state, action, player.id);
    if (!v.ok) {
      alert(v.error);
      return;
    }
    const next = roadTripBingo.applyAction(state, action, player.id);
    setState(next);
    const win = roadTripBingo.checkWinner(next);
    if (win) onEnd?.(win.winners.includes(players[0].id));
  }

  if (state.finished) {
    const winner = players.find((p) => state.winners.includes(p.id));
    return (
      <Card className="text-center">
        <p className="font-display text-3xl">Bingo!</p>
        <p className="mt-2 text-[var(--muted)]">
          {winner?.displayName ?? "Someone"} spotted the line.
        </p>
        <Button
          className="mt-4"
          onClick={() =>
            setState(
              roadTripBingo.createInitialState({
                players,
                mode: "same_device",
                seed: `${Date.now()}`,
              }),
            )
          }
        >
          New boards
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-2xl">Road-Trip Bingo</p>
          <p className="text-sm text-[var(--muted)]">
            Viewing {player.displayName}&apos;s card
          </p>
        </div>
        <div className="flex gap-2">
          {players.length > 1 && (
            <Button variant="ghost" onClick={() => setActive((i) => (i + 1) % players.length)}>
              Pass device
            </Button>
          )}
          <Button onClick={() => act({ type: "claim_bingo" })}>Bingo!</Button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {board?.cells.map((cell) => (
          <button
            key={cell.id}
            type="button"
            onClick={() => !cell.free && act({ type: "toggle", cellId: cell.id })}
            className={`aspect-square rounded-xl p-1 text-[10px] font-bold leading-tight sm:rounded-2xl sm:text-xs ${
              cell.marked
                ? "bg-[var(--secondary)] text-[var(--secondary-ink)]"
                : "bg-black/5 dark:bg-white/10"
            }`}
          >
            {cell.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
