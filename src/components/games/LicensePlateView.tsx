"use client";

import { useState } from "react";
import {
  licensePlateHunt,
  type LicensePlateAction,
  type LicensePlateState,
} from "@/games/license-plate-hunt";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

export function LicensePlateView({
  players,
  onEnd,
}: {
  players: SeatPlayer[];
  onEnd?: (won: boolean) => void;
}) {
  const [active, setActive] = useState(0);
  const [state, setState] = useState<LicensePlateState>(() =>
    licensePlateHunt.createInitialState({
      players,
      mode: "same_device",
    }),
  );
  const [query, setQuery] = useState("");

  const player = players[active % players.length];

  function act(action: LicensePlateAction) {
    const v = licensePlateHunt.validateAction(state, action, player.id);
    if (!v.ok) return;
    const next = licensePlateHunt.applyAction(state, action, player.id);
    setState(next);
    const win = licensePlateHunt.checkWinner(next);
    if (win) onEnd?.(win.winners.includes(players[0].id));
  }

  const view = licensePlateHunt.getClientView(state, player.id) as {
    yourCount: number;
    target: number;
    items: Array<{ id: string; label: string; marked: boolean }>;
    scores: Record<string, number>;
  };

  const filtered = view.items.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase()),
  );

  if (state.finished) {
    const winner = players.find((p) => state.winnerIds.includes(p.id));
    return (
      <Card className="text-center">
        <p className="font-display text-3xl">Hunt complete!</p>
        <p className="mt-2 text-[var(--muted)]">
          {winner?.displayName ?? "Someone"} hit {state.target} plates.
        </p>
        <Button className="mt-4" onClick={() => act({ type: "reset" })}>
          Hunt again
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-2xl">License Plate Hunt</p>
          <p className="text-sm text-[var(--muted)]">
            {player.displayName}: {view.yourCount}/{view.target}
          </p>
        </div>
        {players.length > 1 && (
          <Button variant="ghost" onClick={() => setActive((i) => (i + 1) % players.length)}>
            Pass phone
          </Button>
        )}
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter states…"
        className="mb-3 min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-white/70 px-4 dark:bg-black/20"
      />
      <div className="grid max-h-[28rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-2xl px-3 py-3 text-left text-sm font-bold ${
              item.marked
                ? "bg-[var(--secondary)] text-[var(--secondary-ink)]"
                : "bg-black/5 dark:bg-white/10"
            }`}
            onClick={() => act({ type: "toggle", itemId: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
