"use client";

import { useMemo, useState } from "react";
import type { RoomStatePayload } from "@/games/events";
import { CLASH_COLOR_HEX, type ClashCard, type ClashColor } from "@/games/color-clash";
import { Button, Card } from "../ui";

/**
 * Thin client for server-authoritative multiplayer.
 * Renders fogged gameView from room state and sends actions upstream.
 */
export function OnlineGameView({
  room,
  playerId,
  onAction,
}: {
  room: RoomStatePayload;
  playerId: string | null;
  onAction: (action: unknown) => void;
}) {
  if (room.gameId === "tic-tac-toe") {
    return <OnlineTtt room={room} playerId={playerId} onAction={onAction} />;
  }
  if (room.gameId === "color-clash") {
    return <OnlineColorClash room={room} playerId={playerId} onAction={onAction} />;
  }
  if (room.gameId === "would-you-rather") {
    return <OnlineWyr room={room} playerId={playerId} onAction={onAction} />;
  }
  if (room.gameId === "road-trip-bingo") {
    return <OnlineBingo room={room} playerId={playerId} onAction={onAction} />;
  }
  return (
    <Card>
      <p>This game&apos;s online view is not wired yet. Try same-device mode.</p>
    </Card>
  );
}

function OnlineTtt({
  room,
  playerId,
  onAction,
}: {
  room: RoomStatePayload;
  playerId: string | null;
  onAction: (action: unknown) => void;
}) {
  const view = room.gameView as {
    board: Array<"X" | "O" | null>;
    currentPlayerId: string;
    marks: Record<string, string>;
    winnerId: string | null;
    isDraw: boolean;
  } | null;
  if (!view) return <Card>Waiting for board…</Card>;
  const myTurn = view.currentPlayerId === playerId;
  return (
    <Card>
      <p className="font-display mb-3 text-2xl">Tic-Tac-Toe</p>
      <p className="mb-3 text-sm text-[var(--muted)]">
        {view.winnerId || view.isDraw
          ? view.isDraw
            ? "Draw"
            : "Game over"
          : myTurn
            ? "Your turn"
            : "Waiting for opponent"}
      </p>
      <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
        {view.board.map((cell, i) => (
          <button
            key={i}
            type="button"
            className="aspect-square rounded-2xl bg-black/5 text-4xl font-bold dark:bg-white/10"
            disabled={!!cell || !myTurn || !!view.winnerId || view.isDraw}
            onClick={() => onAction({ type: "place", index: i })}
          >
            {cell}
          </button>
        ))}
      </div>
      {(view.winnerId || view.isDraw) && (
        <Button className="mt-4" onClick={() => onAction({ type: "reset" })}>
          Rematch
        </Button>
      )}
    </Card>
  );
}

function OnlineColorClash({
  room,
  playerId,
  onAction,
}: {
  room: RoomStatePayload;
  playerId: string | null;
  onAction: (action: unknown) => void;
}) {
  const view = room.gameView as {
    yourHand: ClashCard[];
    handCounts: Record<string, number>;
    topDiscard: ClashCard;
    currentColor: ClashColor;
    currentPlayerId: string;
    pendingDraw: number;
    mustChooseColor: boolean;
    winnerId: string | null;
  } | null;
  const [pickColor, setPickColor] = useState(false);
  const [wildId, setWildId] = useState<string | null>(null);

  if (!view) return <Card>Dealing…</Card>;
  const myTurn = view.currentPlayerId === playerId;

  return (
    <Card>
      <p className="font-display text-2xl">Color Clash</p>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Color {view.currentColor}
        {view.pendingDraw ? ` · +${view.pendingDraw}` : ""} ·{" "}
        {myTurn ? "Your turn" : "Waiting…"}
      </p>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {room.players.map((p) => (
          <span key={p.id} className="rounded-full bg-black/5 px-3 py-1 dark:bg-white/10">
            {p.displayName}: {view.handCounts[p.id] ?? 0}
          </span>
        ))}
      </div>
      <div className="mb-4 flex justify-center">
        <div
          className="flex h-28 w-20 items-center justify-center rounded-2xl font-black text-white"
          style={{
            background:
              view.topDiscard.color === "spectrum"
                ? CLASH_COLOR_HEX.spectrum
                : CLASH_COLOR_HEX[view.topDiscard.color],
          }}
        >
          {view.topDiscard.value}
        </div>
      </div>
      {(pickColor || view.mustChooseColor) && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["ruby", "azure", "citrus", "moss"] as ClashColor[]).map((c) => (
            <Button
              key={c}
              style={{ background: CLASH_COLOR_HEX[c] }}
              onClick={() => {
                if (view.mustChooseColor) onAction({ type: "choose_color", color: c });
                else if (wildId) onAction({ type: "play", cardId: wildId, chosenColor: c });
                setPickColor(false);
                setWildId(null);
              }}
            >
              {c}
            </Button>
          ))}
        </div>
      )}
      <div className="mb-3 flex justify-center gap-2">
        <Button variant="ghost" disabled={!myTurn} onClick={() => onAction({ type: "draw" })}>
          Draw
        </Button>
        {view.yourHand.length === 1 && (
          <Button variant="secondary" onClick={() => onAction({ type: "call_last" })}>
            Last card!
          </Button>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {view.yourHand.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={!myTurn}
            className="flex h-24 w-16 items-center justify-center rounded-2xl font-black text-white disabled:opacity-40"
            style={{
              background:
                card.color === "spectrum"
                  ? "linear-gradient(135deg,#E11D48,#2563EB,#F59E0B,#16A34A)"
                  : CLASH_COLOR_HEX[card.color],
            }}
            onClick={() => {
              if (card.color === "spectrum") {
                setWildId(card.id);
                setPickColor(true);
              } else onAction({ type: "play", cardId: card.id });
            }}
          >
            {card.value}
          </button>
        ))}
      </div>
    </Card>
  );
}

function OnlineWyr({
  room,
  playerId,
  onAction,
}: {
  room: RoomStatePayload;
  playerId: string | null;
  onAction: (action: unknown) => void;
}) {
  const view = room.gameView as {
    current: { a: string; b: string } | null;
    votes: Record<string, string>;
    finished: boolean;
    index: number;
    prompts: unknown[];
  } | null;
  if (!view?.current) return <Card>Loading prompts…</Card>;
  const voted = playerId ? !!view.votes[playerId] && view.votes[playerId] !== "hidden" : false;
  return (
    <Card>
      <p className="font-display text-2xl">Would You Rather</p>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Prompt {(view.index ?? 0) + 1}
      </p>
      {view.finished ? (
        <p>Round finished!</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button disabled={voted} onClick={() => onAction({ type: "vote", choice: "a" })}>
            {view.current.a}
          </Button>
          <Button
            variant="secondary"
            disabled={voted}
            onClick={() => onAction({ type: "vote", choice: "b" })}
          >
            {view.current.b}
          </Button>
        </div>
      )}
      <Button className="mt-4" variant="ghost" onClick={() => onAction({ type: "next" })}>
        Next prompt
      </Button>
    </Card>
  );
}

function OnlineBingo({
  room,
  onAction,
}: {
  room: RoomStatePayload;
  playerId: string | null;
  onAction: (action: unknown) => void;
}) {
  const view = room.gameView as {
    yourBoard: {
      cells: Array<{ id: string; label: string; marked: boolean; free?: boolean }>;
    } | null;
    finished: boolean;
    winners: string[];
  } | null;
  const board = view?.yourBoard;
  const cells = useMemo(() => board?.cells ?? [], [board]);
  if (!board) return <Card>Building your board…</Card>;
  return (
    <Card>
      <div className="mb-3 flex justify-between">
        <p className="font-display text-2xl">Road-Trip Bingo</p>
        <Button onClick={() => onAction({ type: "claim_bingo" })}>Bingo!</Button>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {cells.map((cell) => (
          <button
            key={cell.id}
            type="button"
            className={`aspect-square rounded-xl p-1 text-[10px] font-bold ${
              cell.marked
                ? "bg-[var(--secondary)] text-[var(--secondary-ink)]"
                : "bg-black/5 dark:bg-white/10"
            }`}
            onClick={() => !cell.free && onAction({ type: "toggle", cellId: cell.id })}
          >
            {cell.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
