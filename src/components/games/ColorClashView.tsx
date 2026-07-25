"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CLASH_COLOR_HEX,
  colorClash,
  type ClashCard,
  type ClashColor,
  type ColorClashAction,
  type ColorClashState,
} from "@/games/color-clash";
import type { SeatPlayer } from "@/games/types";
import { Button, Card } from "../ui";

function ClashCardUi({
  card,
  onClick,
  disabled,
}: {
  card: ClashCard;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const bg =
    card.color === "spectrum"
      ? "linear-gradient(135deg,#E11D48,#2563EB,#F59E0B,#16A34A)"
      : CLASH_COLOR_HEX[card.color];
  const label =
    card.value === "plus2"
      ? "+2"
      : card.value === "wild_plus4"
        ? "+4"
        : card.value === "wild"
          ? "★"
          : card.value === "skip"
            ? "⊘"
            : card.value === "reverse"
              ? "⇄"
              : card.value;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-24 w-16 flex-col items-center justify-center rounded-2xl text-lg font-black text-white shadow-md disabled:opacity-40 sm:h-28 sm:w-20"
      style={{ background: bg }}
    >
      {label}
    </button>
  );
}

export function ColorClashView({
  players,
  mode,
  onEnd,
}: {
  players: SeatPlayer[];
  mode: "solo" | "same_device";
  onEnd?: (won: boolean | null) => void;
}) {
  const seats = useMemo(() => {
    if (players.length >= 2) return players;
    return [
      players[0],
      { id: "ai", displayName: "Rival Bot", avatarId: "spark", isAi: true },
    ];
  }, [players]);

  const [state, setState] = useState<ColorClashState>(() =>
    colorClash.createInitialState({
      players: seats,
      mode: mode === "solo" ? "solo" : "same_device",
      seed: `${Date.now()}`,
    }),
  );
  const [choosing, setChoosing] = useState(false);
  const [pendingWild, setPendingWild] = useState<string | null>(null);

  const humanId = seats[0].id;
  const current = seats.find((p) => p.id === state.currentPlayerId);

  useEffect(() => {
    if (!current?.isAi || state.winnerId || state.mustChooseColor) return;
    const t = setTimeout(() => {
      const move = colorClash.aiMove?.(state, current.id);
      if (!move) return;
      const v = colorClash.validateAction(state, move, current.id);
      if (!v.ok) return;
      setState(colorClash.applyAction(state, move, current.id));
    }, 600);
    return () => clearTimeout(t);
  }, [state, current]);

  useEffect(() => {
    const win = colorClash.checkWinner(state);
    if (!win) return;
    onEnd?.(win.winners.includes(humanId));
  }, [state, humanId, onEnd]);

  function act(action: ColorClashAction, playerId = state.currentPlayerId) {
    const v = colorClash.validateAction(state, action, playerId);
    if (!v.ok) {
      alert(v.error);
      return;
    }
    setState(colorClash.applyAction(state, action, playerId));
    setChoosing(false);
    setPendingWild(null);
  }

  function playCard(card: ClashCard) {
    if (state.currentPlayerId !== humanId && mode === "solo") return;
    if (card.color === "spectrum") {
      setPendingWild(card.id);
      setChoosing(true);
      return;
    }
    act({ type: "play", cardId: card.id }, state.currentPlayerId);
  }

  function chooseColor(color: ClashColor) {
    if (state.mustChooseColor) {
      act({ type: "choose_color", color });
      return;
    }
    if (pendingWild) {
      act({ type: "play", cardId: pendingWild, chosenColor: color });
    }
  }

  const view = colorClash.getClientView(state, state.currentPlayerId) as {
    yourHand: ClashCard[];
    handCounts: Record<string, number>;
    topDiscard: ClashCard;
    currentColor: ClashColor;
    pendingDraw: number;
  };

  if (state.winnerId) {
    const winner = seats.find((p) => p.id === state.winnerId);
    return (
      <Card className="text-center">
        <p className="font-display text-3xl">Color Clash</p>
        <p className="mt-2">{winner?.displayName ?? "Player"} emptied their hand!</p>
        <Button
          className="mt-4"
          onClick={() =>
            setState(
              colorClash.createInitialState({
                players: seats,
                mode: mode === "solo" ? "solo" : "same_device",
                seed: `${Date.now()}`,
              }),
            )
          }
        >
          Rematch
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-2xl">Color Clash</p>
          <p className="text-sm text-[var(--muted)]">
            {current?.displayName}&apos;s turn · color{" "}
            <span style={{ color: CLASH_COLOR_HEX[state.currentColor] }}>
              {state.currentColor}
            </span>
            {state.pendingDraw ? ` · draw stack ${state.pendingDraw}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {(view.yourHand?.length === 1 ||
            (state.hands[state.currentPlayerId]?.length === 1)) && (
            <Button variant="secondary" onClick={() => act({ type: "call_last" })}>
              Last card!
            </Button>
          )}
          <Button variant="ghost" onClick={() => act({ type: "draw" })}>
            Draw
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {seats.map((p) => (
          <span
            key={p.id}
            className={`rounded-full px-3 py-1 ${
              p.id === state.currentPlayerId
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "bg-black/5 dark:bg-white/10"
            }`}
          >
            {p.displayName}: {state.hands[p.id]?.length ?? 0}
          </span>
        ))}
      </div>

      <div className="mb-6 flex justify-center">
        <ClashCardUi card={state.discard[state.discard.length - 1]} />
      </div>

      {(choosing || state.mustChooseColor) && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["ruby", "azure", "citrus", "moss"] as ClashColor[]).map((c) => (
            <Button key={c} style={{ background: CLASH_COLOR_HEX[c] }} onClick={() => chooseColor(c)}>
              {c}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {(state.hands[state.currentPlayerId] ?? []).map((card) => (
          <ClashCardUi
            key={card.id}
            card={card}
            onClick={() => playCard(card)}
            disabled={
              mode === "solo" &&
              (state.currentPlayerId !== humanId || !!current?.isAi)
            }
          />
        ))}
      </div>

      {mode === "same_device" && (
        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          Pass-and-play: only look at the hand when it&apos;s your turn.
        </p>
      )}
    </Card>
  );
}
