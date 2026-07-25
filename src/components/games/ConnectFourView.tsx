"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CF_COLS,
  CF_ROWS,
  connectFour,
  type ConnectFourAction,
  type ConnectFourState,
} from "@/games/connect-four";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function ConnectFourView({
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

  const [state, setState] = useState<ConnectFourState>(() =>
    connectFour.createInitialState({
      players: seats,
      mode: mode === "solo" ? "solo" : "same_device",
    }),
  );

  useEffect(() => {
    const current = seats.find((p) => p.id === state.currentPlayerId);
    if (!current?.isAi || state.winnerId || state.isDraw) return;
    const t = setTimeout(() => {
      const move = connectFour.aiMove?.(state, current.id);
      if (!move) return;
      const v = connectFour.validateAction(state, move, current.id);
      if (!v.ok) return;
      setState(connectFour.applyAction(state, move, current.id));
    }, 400);
    return () => clearTimeout(t);
  }, [state, seats]);

  useEffect(() => {
    const win = connectFour.checkWinner(state);
    if (!win) return;
    if (win.isDraw) onEnd?.(null);
    else onEnd?.(win.winners.includes(seats[0].id));
  }, [state, seats, onEnd]);

  function act(action: ConnectFourAction) {
    const pid = state.currentPlayerId;
    if (seats.find((p) => p.id === pid)?.isAi && action.type === "drop") return;
    const v = connectFour.validateAction(state, action, pid);
    if (!v.ok) return;
    setState(connectFour.applyAction(state, action, pid));
  }

  const win = connectFour.checkWinner(state);
  const currentName =
    seats.find((p) => p.id === state.currentPlayerId)?.displayName ?? "Player";

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl">Connect Four</p>
          <p className="text-sm text-[var(--muted)]">
            {win
              ? win.isDraw
                ? "Draw!"
                : `${seats.find((p) => p.id === win.winners[0])?.displayName} wins!`
              : `${currentName}'s turn`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => act({ type: "reset" })}>
          Rematch
        </Button>
      </div>
      <div className="mx-auto grid max-w-md grid-cols-7 gap-1.5 rounded-3xl bg-blue-700 p-3">
        {Array.from({ length: CF_ROWS * CF_COLS }, (_, i) => {
          const r = Math.floor(i / CF_COLS);
          const c = i % CF_COLS;
          const cell = state.board[r][c];
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              className="aspect-square rounded-full bg-blue-950/40"
              disabled={!!win}
              onClick={() => act({ type: "drop", column: c })}
              aria-label={`Column ${c + 1}`}
            >
              <span
                className={`block h-full w-full rounded-full ${
                  cell === "R"
                    ? "bg-rose-500"
                    : cell === "Y"
                      ? "bg-amber-300"
                      : "bg-sky-100/90"
                }`}
              />
            </button>
          );
        })}
      </div>
    </Card>
  );
}
