"use client";

import { useState } from "react";
import { trivia, type TriviaAction, type TriviaState } from "@/games/trivia";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function TriviaView({
  players,
  onEnd,
}: {
  players: SeatPlayer[];
  onEnd?: (won: boolean | null) => void;
}) {
  const [seatIndex, setSeatIndex] = useState(0);
  const [state, setState] = useState<TriviaState>(() =>
    trivia.createInitialState({
      players,
      mode: "same_device",
      seed: `${Date.now()}`,
    }),
  );

  const player = players[seatIndex % players.length];
  const q = state.questions[state.index];

  function act(action: TriviaAction, playerId = player.id) {
    const v = trivia.validateAction(state, action, playerId);
    if (!v.ok) return alert(v.error);
    const next = trivia.applyAction(state, action, playerId);
    setState(next);
    if (action.type === "answer" && players.length > 1) {
      setSeatIndex((i) => (i + 1) % players.length);
    }
    const win = trivia.checkWinner(next);
    if (win) {
      if (win.isDraw) onEnd?.(null);
      else onEnd?.(win.winners.includes(players[0].id));
    }
  }

  if (state.finished) {
    return (
      <Card className="text-center">
        <p className="font-display text-3xl">Trivia complete</p>
        <div className="mt-3 space-y-1">
          {players.map((p) => (
            <p key={p.id}>
              {p.displayName}: {state.scores[p.id]} pts
            </p>
          ))}
        </div>
        <Button className="mt-4" onClick={() => act({ type: "reset" })}>
          Play again
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-2 flex justify-between">
        <p className="font-display text-2xl">Trivia</p>
        <span className="text-sm text-[var(--muted)]">
          {state.index + 1}/{state.questions.length}
        </span>
      </div>
      <p className="mb-1 text-sm font-bold text-[var(--muted)]">{q.category}</p>
      <p className="mb-2 text-sm text-[var(--muted)]">
        Pass-and-play · {player.displayName}
      </p>
      <p className="font-display mb-4 text-2xl">{q.prompt}</p>
      <div className="grid gap-2">
        {q.choices.map((choice, i) => (
          <Button
            key={i}
            variant={state.answers[player.id] === i ? "primary" : "ghost"}
            className="!h-auto min-h-14 whitespace-normal !justify-start !text-left"
            disabled={state.answers[player.id] !== undefined}
            onClick={() => act({ type: "answer", choice: i })}
          >
            {choice}
          </Button>
        ))}
      </div>
      {Object.keys(state.answers).length > 0 && (
        <Button className="mt-4" variant="secondary" onClick={() => act({ type: "next" }, players[0].id)}>
          Next question
        </Button>
      )}
    </Card>
  );
}
