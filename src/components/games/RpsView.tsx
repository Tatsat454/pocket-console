"use client";

import { useEffect, useMemo, useState } from "react";
import {
  rockPaperScissors,
  type RpsAction,
  type RpsChoice,
  type RpsState,
} from "@/games/rock-paper-scissors";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

const CHOICES: { id: RpsChoice; label: string; icon: string }[] = [
  { id: "rock", label: "Rock", icon: "✊" },
  { id: "paper", label: "Paper", icon: "✋" },
  { id: "scissors", label: "Scissors", icon: "✌️" },
];

export function RpsView({
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

  const [active, setActive] = useState(0);
  const [state, setState] = useState<RpsState>(() =>
    rockPaperScissors.createInitialState({
      players: seats,
      mode: mode === "solo" ? "solo" : "same_device",
    }),
  );

  useEffect(() => {
    const ai = seats.find((p) => p.isAi);
    if (!ai || state.winnerId || state.choices[ai.id]) return;
    if (mode !== "solo") return;
    // Wait until human has chosen
    if (!state.choices[seats[0].id]) return;
    const t = setTimeout(() => {
      const move = rockPaperScissors.aiMove?.(state, ai.id);
      if (!move) return;
      setState(rockPaperScissors.applyAction(state, move, ai.id));
    }, 350);
    return () => clearTimeout(t);
  }, [state, seats, mode]);

  useEffect(() => {
    const win = rockPaperScissors.checkWinner(state);
    if (!win) return;
    onEnd?.(win.winners.includes(seats[0].id));
  }, [state, seats, onEnd]);

  function act(action: RpsAction, playerId?: string) {
    const pid =
      playerId ??
      (mode === "same_device" ? seats[active % 2].id : seats[0].id);
    const v = rockPaperScissors.validateAction(state, action, pid);
    if (!v.ok) return;
    const next = rockPaperScissors.applyAction(state, action, pid);
    setState(next);
    if (action.type === "choose" && mode === "same_device") {
      setActive((i) => (i + 1) % 2);
    }
  }

  const last = state.history[state.history.length - 1];

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl">Rock Paper Scissors</p>
          <p className="text-sm text-[var(--muted)]">
            First to {state.targetWins}
            {state.winnerId
              ? ` · ${seats.find((p) => p.id === state.winnerId)?.displayName} wins!`
              : mode === "same_device"
                ? ` · ${seats[active % 2].displayName}'s pick`
                : ""}
          </p>
        </div>
        <Button variant="ghost" onClick={() => act({ type: "reset" })}>
          Rematch
        </Button>
      </div>
      <div className="mb-4 flex justify-around font-display text-3xl">
        {seats.map((p) => (
          <div key={p.id} className="text-center">
            <div className="text-sm text-[var(--muted)]">{p.displayName}</div>
            {state.scores[p.id]}
          </div>
        ))}
      </div>
      {last && (
        <p className="mb-3 text-center text-sm text-[var(--muted)]">
          Last: {last.choices[seats[0].id]} vs {last.choices[seats[1].id]}
          {last.winnerId
            ? ` → ${seats.find((p) => p.id === last.winnerId)?.displayName}`
            : " → tie"}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {CHOICES.map((c) => (
          <Button
            key={c.id}
            disabled={!!state.winnerId}
            className="!h-auto min-h-24 flex-col !text-base"
            onClick={() => act({ type: "choose", choice: c.id })}
          >
            <span className="text-3xl">{c.icon}</span>
            {c.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
