"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ticTacToe,
  type TicTacToeAction,
  type TicTacToeState,
} from "@/games/tic-tac-toe";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function TicTacToeView({
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

  const [state, setState] = useState<TicTacToeState>(() =>
    ticTacToe.createInitialState({ players: seats, mode: mode === "solo" ? "solo" : "same_device" }),
  );

  useEffect(() => {
    const current = seats.find((p) => p.id === state.currentPlayerId);
    if (!current?.isAi || state.winnerId || state.isDraw) return;
    const t = setTimeout(() => {
      const move = ticTacToe.aiMove?.(state, current.id);
      if (!move) return;
      const v = ticTacToe.validateAction(state, move, current.id);
      if (!v.ok) return;
      setState(ticTacToe.applyAction(state, move, current.id));
    }, 450);
    return () => clearTimeout(t);
  }, [state, seats]);

  useEffect(() => {
    const win = ticTacToe.checkWinner(state);
    if (!win) return;
    const human = seats[0].id;
    if (win.isDraw) onEnd?.(null);
    else onEnd?.(win.winners.includes(human));
  }, [state, seats, onEnd]);

  function act(action: TicTacToeAction) {
    const pid = state.currentPlayerId;
    if (seats.find((p) => p.id === pid)?.isAi && action.type === "place") return;
    const v = ticTacToe.validateAction(state, action, pid);
    if (!v.ok) return;
    setState(ticTacToe.applyAction(state, action, pid));
  }

  const win = ticTacToe.checkWinner(state);
  const currentName =
    seats.find((p) => p.id === state.currentPlayerId)?.displayName ?? "Player";

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="font-display text-2xl">Tic-Tac-Toe</p>
          <p className="text-sm text-[var(--muted)]">
            {win
              ? win.isDraw
                ? "Draw!"
                : `${seats.find((p) => p.id === win.winners[0])?.displayName ?? "Someone"} wins!`
              : `${currentName}'s turn (${state.marks[state.currentPlayerId]})`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => act({ type: "reset" })}>
          Rematch
        </Button>
      </div>
      <div
        className="mx-auto grid max-w-sm grid-cols-3 gap-2"
        role="grid"
        aria-label="Tic tac toe board"
      >
        {state.board.map((cell, i) => (
          <button
            key={i}
            type="button"
            role="gridcell"
            aria-label={cell ? cell : `Empty cell ${i + 1}`}
            className="aspect-square rounded-2xl bg-black/5 text-4xl font-bold transition hover:bg-black/10 dark:bg-white/10"
            disabled={!!cell || !!win}
            onClick={() => act({ type: "place", index: i })}
          >
            {cell}
          </button>
        ))}
      </div>
    </Card>
  );
}
