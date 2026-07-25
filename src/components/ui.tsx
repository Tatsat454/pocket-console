"use client";

import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { playClick, vibrate } from "@/lib/feedback";
import { useApp } from "./providers";

export function Button({
  variant = "primary",
  className = "",
  onClick,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const { prefs } = useApp();
  const variantClass =
    variant === "primary"
      ? "touch-btn-primary"
      : variant === "secondary"
        ? "touch-btn-secondary"
        : "touch-btn-ghost";

  return (
    <button
      className={`touch-btn ${variantClass} ${className}`}
      onClick={(e) => {
        playClick(prefs.soundEnabled);
        vibrate(prefs.vibrateEnabled);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card animate-pop rounded-3xl p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="console-bg min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-4 sm:px-6">
        {children}
      </div>
    </div>
  );
}

export function TopNav() {
  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <Link href="/" className="group flex items-center gap-3">
        <span
          className="grid h-12 w-12 place-items-center rounded-2xl text-2xl shadow-md animate-floaty"
          style={{ background: "var(--secondary)", color: "var(--secondary-ink)" }}
          aria-hidden
        >
          ▣
        </span>
        <span>
          <span className="font-display block text-2xl leading-none tracking-tight sm:text-3xl">
            Pocket Console
          </span>
          <span className="text-sm text-[var(--muted)]">Games for the road</span>
        </span>
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/nearby"
          className="touch-btn touch-btn-ghost !min-h-11 !px-3 !py-2 text-sm"
        >
          Nearby
        </Link>
        <Link
          href="/profile"
          className="touch-btn touch-btn-ghost !min-h-11 !px-3 !py-2 text-sm"
        >
          Profile
        </Link>
      </nav>
    </header>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="mt-2 text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Card className="text-center">
      <div
        className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-[var(--secondary)] border-t-transparent"
        aria-hidden
      />
      <p className="text-[var(--muted)]">{label}</p>
    </Card>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
    >
      {message}
    </div>
  );
}
