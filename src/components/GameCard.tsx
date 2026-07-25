"use client";

import Link from "next/link";
import type { CatalogGame } from "@/games/types";
import { useApp } from "./providers";
import { Button } from "./ui";

export function GameCard({ game }: { game: CatalogGame }) {
  const { favorites, toggleFav } = useApp();
  const fav = favorites.includes(game.id);

  return (
    <article
      className="glass-card flex h-full flex-col rounded-3xl p-4 transition hover:-translate-y-0.5"
      style={{ borderColor: `${game.accent}33` }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl text-2xl"
          style={{ background: `${game.accent}22`, color: game.accent }}
          aria-hidden
        >
          {game.icon}
        </div>
        <button
          type="button"
          aria-label={fav ? "Remove favorite" : "Add favorite"}
          className="rounded-xl px-2 py-1 text-xl"
          onClick={() => toggleFav(game.id)}
        >
          {fav ? "★" : "☆"}
        </button>
      </div>
      <h3 className="font-display text-xl leading-tight">{game.title}</h3>
      <p className="mt-1 flex-1 text-sm text-[var(--muted)]">{game.shortDescription}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {game.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded-full bg-black/5 px-2 py-0.5 text-xs capitalize dark:bg-white/10"
          >
            {t}
          </span>
        ))}
        {!game.available && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Soon
          </span>
        )}
      </div>
      <div className="mt-4">
        {game.available ? (
          <Link href={`/play/${game.id}`} className="block">
            <Button className="w-full" style={{ background: game.accent } as React.CSSProperties}>
              Play
            </Button>
          </Link>
        ) : (
          <Button className="w-full" variant="ghost" disabled>
            Coming soon
          </Button>
        )}
      </div>
    </article>
  );
}
