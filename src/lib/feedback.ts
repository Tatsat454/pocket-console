"use client";

/** Soft UI click using Web Audio — no external assets required. */
export function playClick(enabled: boolean): void {
  if (!enabled || typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 520;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    osc.stop(ctx.currentTime + 0.09);
    setTimeout(() => ctx.close(), 150);
  } catch {
    /* ignore */
  }
}

export function vibrate(enabled: boolean, pattern: number | number[] = 12): void {
  if (!enabled || typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
