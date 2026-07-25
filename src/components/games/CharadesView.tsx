"use client";

import { useState } from "react";
import { charades, type CharadesAction, type CharadesState } from "@/games/charades";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function CharadesView({
  players,
  onEnd,
}: {
  players: SeatPlayer[];
  onEnd?: () => void;
}) {
  const seats =
    players.length >= 2
      ? players
      : [
          players[0],
          { id: "p2", displayName: "Player 2", avatarId: "spark" },
        ];

  const [state, setState] = useState<CharadesState>(() =>
    charades.createInitialState({
      players: seats,
      mode: "same_device",
      seed: `${Date.now()}`,
    }),
  );

  function act(action: CharadesAction, playerId?: string) {
    const pid = playerId ?? state.actorId;
    const v = charades.validateAction(state, action, pid);
    if (!v.ok) return alert(v.error);
    const next = charades.applyAction(state, action, pid);
    setState(next);
    if (charades.checkWinner(next)) onEnd?.();
  }

  const actor = seats.find((p) => p.id === state.actorId);
  const view = charades.getClientView(state, state.actorId) as {
    prompt: string | null;
  };

  if (state.finished) {
    return (
      <Card className="text-center">
        <p className="font-display text-3xl">Curtain call</p>
        <div className="mt-3 space-y-1">
          {seats.map((p) => (
            <p key={p.id}>
              {p.displayName}: {state.scores[p.id]}
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
      <div className="mb-3 flex justify-between">
        <p className="font-display text-2xl">Charades</p>
        <span className="text-sm text-[var(--muted)]">
          {state.index + 1}/{state.prompts.length}
        </span>
      </div>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Actor: <strong>{actor?.displayName}</strong> — others look away, then guess aloud.
      </p>
      {!state.revealed ? (
        <Button className="w-full" onClick={() => act({ type: "reveal" })}>
          Actor: reveal prompt
        </Button>
      ) : (
        <>
          <p className="font-display mb-6 text-center text-3xl">{view.prompt}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => act({ type: "got_it" })}>Got it!</Button>
            <Button variant="ghost" onClick={() => act({ type: "skip" })}>
              Skip
            </Button>
          </div>
        </>
      )}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {seats.map((p) => (
          <span key={p.id} className="rounded-full bg-black/5 px-3 py-1 dark:bg-white/10">
            {p.displayName}: {state.scores[p.id]}
          </span>
        ))}
      </div>
    </Card>
  );
}
