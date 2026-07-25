"use client";

import { useMemo, useState } from "react";
import {
  wouldYouRather,
  type WouldYouRatherAction,
  type WouldYouRatherState,
} from "@/games/would-you-rather";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function WouldYouRatherView({
  players,
  onEnd,
}: {
  players: SeatPlayer[];
  onEnd?: () => void;
}) {
  const [seatIndex, setSeatIndex] = useState(0);
  const [state, setState] = useState<WouldYouRatherState>(() =>
    wouldYouRather.createInitialState({
      players,
      mode: "same_device",
      seed: `${Date.now()}`,
    }),
  );

  const currentPlayer = players[seatIndex % players.length];
  const prompt = state.prompts[state.index];

  const view = useMemo(
    () => wouldYouRather.getClientView(state, currentPlayer.id),
    [state, currentPlayer.id],
  );

  function act(action: WouldYouRatherAction, playerId = currentPlayer.id) {
    const v = wouldYouRather.validateAction(state, action, playerId);
    if (!v.ok) return alert(v.error);
    const next = wouldYouRather.applyAction(state, action, playerId);
    setState(next);
    if (action.type === "vote" && players.length > 1) {
      setSeatIndex((i) => (i + 1) % players.length);
    }
    if (wouldYouRather.checkWinner(next)) onEnd?.();
  }

  if (state.finished) {
    return (
      <Card className="text-center">
        <p className="font-display text-2xl">Round complete</p>
        <p className="mt-2 text-[var(--muted)]">
          You answered {state.tallies.length} prompts. Great debates!
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            setState(
              wouldYouRather.createInitialState({
                players,
                mode: "same_device",
                seed: `${Date.now()}`,
              }),
            );
            setSeatIndex(0);
          }}
        >
          Play again
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-2xl">Would You Rather</p>
        <span className="text-sm text-[var(--muted)]">
          {state.index + 1}/{state.prompts.length}
        </span>
      </div>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Pass-and-play · {currentPlayer.displayName}&apos;s pick
      </p>
      <p className="font-display mb-4 text-center text-3xl">Would you rather…</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="!h-auto min-h-28 whitespace-normal !text-lg"
          onClick={() => act({ type: "vote", choice: "a" })}
          disabled={!!state.votes[currentPlayer.id]}
        >
          {prompt.a}
        </Button>
        <Button
          variant="secondary"
          className="!h-auto min-h-28 whitespace-normal !text-lg"
          onClick={() => act({ type: "vote", choice: "b" })}
          disabled={!!state.votes[currentPlayer.id]}
        >
          {prompt.b}
        </Button>
      </div>
      {Object.keys(state.votes).length > 0 && (
        <div className="mt-4 text-center">
          <p className="mb-2 text-sm text-[var(--muted)]">
            Votes in: {Object.keys(state.votes).length}
            {players.length > 1 ? ` / ${players.length}` : ""}
          </p>
          <Button variant="ghost" onClick={() => act({ type: "next" }, players[0].id)}>
            Next prompt
          </Button>
        </div>
      )}
      {/* keep view referenced for future online fog-of-war parity */}
      <span className="sr-only">{JSON.stringify(view).slice(0, 20)}</span>
    </Card>
  );
}
