"use client";

import { useState } from "react";
import {
  twentyQuestions,
  type TwentyQAction,
  type TwentyQState,
} from "@/games/twenty-questions";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function TwentyQuestionsView({
  players,
  onEnd,
}: {
  players: SeatPlayer[];
  onEnd?: (won: boolean | null) => void;
}) {
  const seats =
    players.length >= 2
      ? players
      : [
          players[0],
          { id: "p2", displayName: "Player 2", avatarId: "spark" },
        ];

  const [state, setState] = useState<TwentyQState>(() =>
    twentyQuestions.createInitialState({
      players: seats,
      mode: "same_device",
      seed: `${Date.now()}`,
    }),
  );
  const [text, setText] = useState("");
  const [role, setRole] = useState<"host" | "asker">("host");

  function act(action: TwentyQAction) {
    const pid = role === "host" ? state.hostId : seats.find((p) => p.id !== state.hostId)!.id;
    const v = twentyQuestions.validateAction(state, action, pid);
    if (!v.ok) return alert(v.error);
    const next = twentyQuestions.applyAction(state, action, pid);
    setState(next);
    setText("");
    const win = twentyQuestions.checkWinner(next);
    if (win) onEnd?.(win.winners.includes(seats[0].id));
  }

  const view = twentyQuestions.getClientView(
    state,
    role === "host" ? state.hostId : seats.find((p) => p.id !== state.hostId)!.id,
  ) as {
    category: string;
    secret: string | null;
    questionsLeft: number;
    log: Array<{ text: string; answer: string }>;
    pendingQuestion: { text: string } | null;
    finished: boolean;
    isHost: boolean;
    guessed: boolean;
  };

  if (state.finished) {
    return (
      <Card className="text-center">
        <p className="font-display text-3xl">Round over</p>
        <p className="mt-2 text-[var(--muted)]">
          Secret was <strong>{state.secret}</strong>
        </p>
        <Button className="mt-4" onClick={() => act({ type: "reset" })}>
          Play again
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-display text-2xl">Twenty Questions</p>
          <p className="text-sm text-[var(--muted)]">
            Category: {view.category} · {view.questionsLeft} left
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant={role === "host" ? "primary" : "ghost"}
            onClick={() => setRole("host")}
          >
            Host
          </Button>
          <Button
            variant={role === "asker" ? "primary" : "ghost"}
            onClick={() => setRole("asker")}
          >
            Asker
          </Button>
        </div>
      </div>

      {view.isHost && (
        <p className="mb-3 rounded-2xl bg-black/5 p-3 text-center font-display text-2xl dark:bg-white/10">
          Secret: {view.secret}
        </p>
      )}

      <div className="mb-3 max-h-40 space-y-1 overflow-y-auto text-sm">
        {view.log.map((entry, i) => (
          <p key={i}>
            <span className="text-[var(--muted)]">{entry.text}</span> →{" "}
            <strong>{entry.answer}</strong>
          </p>
        ))}
      </div>

      {view.pendingQuestion && view.isHost && (
        <div className="mb-3 space-y-2">
          <p className="font-bold">{view.pendingQuestion.text}</p>
          {view.guessed ? (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => act({ type: "judge_guess", correct: true })}>
                Correct!
              </Button>
              <Button
                variant="ghost"
                onClick={() => act({ type: "judge_guess", correct: false })}
              >
                Wrong
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => act({ type: "answer", answer: "yes" })}>Yes</Button>
              <Button
                variant="secondary"
                onClick={() => act({ type: "answer", answer: "no" })}
              >
                No
              </Button>
              <Button
                variant="ghost"
                onClick={() => act({ type: "answer", answer: "maybe" })}
              >
                Maybe
              </Button>
            </div>
          )}
        </div>
      )}

      {!view.isHost && !view.pendingQuestion && (
        <div className="space-y-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Yes/no question or guess…"
            className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-white/70 px-4 dark:bg-black/20"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => act({ type: "ask", text })}>Ask</Button>
            <Button variant="secondary" onClick={() => act({ type: "guess", text })}>
              Guess
            </Button>
          </div>
        </div>
      )}

      {!view.isHost && view.pendingQuestion && (
        <p className="text-sm text-[var(--muted)]">Waiting for host…</p>
      )}
    </Card>
  );
}
