"use client";

import { useEffect, useState } from "react";
import {
  solitaire,
  type SolitaireAction,
  type SolitaireState,
} from "@/games/solitaire";
import { suitSymbol, type PlayingCard } from "@/games/cards/deck";
import {
  clearGameProgress,
  loadGameProgress,
  saveGameProgress,
} from "@/lib/profile";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

function MiniCard({
  card,
  onClick,
  selected,
}: {
  card?: PlayingCard;
  onClick?: () => void;
  selected?: boolean;
}) {
  if (!card) {
    return (
      <div className="flex h-16 w-11 items-center justify-center rounded-lg border border-dashed border-black/20 sm:h-20 sm:w-14 dark:border-white/20" />
    );
  }
  if (!card.faceUp) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="h-16 w-11 rounded-lg bg-[var(--secondary)] shadow sm:h-20 sm:w-14"
        aria-label="Face-down card"
      />
    );
  }
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-16 w-11 flex-col items-center justify-center rounded-lg bg-white text-sm font-bold shadow sm:h-20 sm:w-14 ${
        red ? "text-red-600" : "text-slate-900"
      } ${selected ? "ring-4 ring-[var(--accent)]" : ""}`}
    >
      <span>{card.rank}</span>
      <span>{suitSymbol(card.suit)}</span>
    </button>
  );
}

export function SolitaireView({
  player,
  onEnd,
}: {
  player: SeatPlayer;
  onEnd?: (won: boolean) => void;
}) {
  const [state, setState] = useState<SolitaireState | null>(null);
  const [selected, setSelected] = useState<{
    from: "waste" | "tableau";
    index?: number;
    count?: number;
  } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const saved = loadGameProgress<SolitaireState>("solitaire");
    if (saved && !saved.won) {
      setState(saved);
    } else {
      setState(
        solitaire.createInitialState({
          players: [player],
          mode: "solo",
          seed: `${Date.now()}`,
        }),
      );
    }
  }, [player]);

  useEffect(() => {
    if (!state) return;
    saveGameProgress("solitaire", state);
    if (state.won) {
      onEnd?.(true);
      clearGameProgress("solitaire");
    }
  }, [state, onEnd]);

  if (!state) {
    return <Card>Shuffling…</Card>;
  }

  function apply(action: SolitaireAction) {
    const v = solitaire.validateAction(state!, action, player.id);
    if (!v.ok) {
      setMsg(v.error ?? "Invalid");
      return;
    }
    setMsg("");
    setState(solitaire.applyAction(state!, action, player.id));
    setSelected(null);
  }

  function onWasteClick() {
    if (!state!.waste.length) return;
    if (selected?.from === "waste") {
      apply({ type: "waste_to_foundation" });
      return;
    }
    setSelected({ from: "waste" });
  }

  function onTableauClick(i: number) {
    const t = state!.tableaus[i];
    if (selected?.from === "waste") {
      apply({ type: "waste_to_tableau", tableau: i });
      return;
    }
    if (selected?.from === "tableau" && selected.index !== undefined) {
      if (selected.index === i) {
        apply({ type: "tableau_to_foundation", tableau: i });
        return;
      }
      apply({
        type: "tableau_to_tableau",
        from: selected.index,
        to: i,
        count: selected.count ?? 1,
      });
      return;
    }
    const faceUps = t.filter((c) => c.faceUp).length;
    if (!faceUps) return;
    setSelected({ from: "tableau", index: i, count: faceUps });
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-2xl">Solitaire</p>
          <p className="text-sm text-[var(--muted)]">
            Score {state.score} · Moves {state.moves}
            {msg ? ` · ${msg}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => apply({ type: "auto_finish" })}>
            Auto
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              clearGameProgress("solitaire");
              setState(
                solitaire.createInitialState({
                  players: [player],
                  mode: "solo",
                  seed: `${Date.now()}`,
                }),
              );
            }}
          >
            New deal
          </Button>
        </div>
      </div>

      {state.won && (
        <p className="mb-3 rounded-2xl bg-emerald-100 px-3 py-2 text-center font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          You cleared the board!
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-start gap-3">
        <button type="button" onClick={() => apply({ type: "draw" })} aria-label="Draw">
          <MiniCard
            card={
              state.stock.length
                ? { id: "stock", suit: "spades", rank: "A", faceUp: false }
                : undefined
            }
          />
        </button>
        <button type="button" onClick={onWasteClick} aria-label="Waste pile">
          <MiniCard
            card={state.waste[state.waste.length - 1]}
            selected={selected?.from === "waste"}
          />
        </button>
        <div className="ml-auto flex gap-2">
          {state.foundations.map((f, i) => (
            <MiniCard key={i} card={f[f.length - 1]} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {state.tableaus.map((col, i) => (
          <div key={i} className="relative min-h-40">
            {!col.length && (
              <button type="button" className="block" onClick={() => onTableauClick(i)}>
                <MiniCard />
              </button>
            )}
            {col.map((card, j) => (
              <div
                key={card.id}
                className="absolute left-0"
                style={{ top: j * 18 }}
              >
                <MiniCard
                  card={card}
                  selected={
                    selected?.from === "tableau" &&
                    selected.index === i &&
                    j >= col.length - (selected.count ?? 1)
                  }
                  onClick={() => onTableauClick(i)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">
        Tip: tap waste or a tableau stack, then tap a target. Tap same tableau again to send to foundation.
      </p>
    </Card>
  );
}
