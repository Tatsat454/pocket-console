"use client";

import { AVATARS } from "@/lib/avatars";
import { BADGE_INFO } from "@/lib/profile";
import { useApp } from "@/components/providers";
import { Button, Card, Shell, TopNav } from "@/components/ui";

export default function ProfilePage() {
  const { profile, setProfile, prefs, updatePrefs } = useApp();

  return (
    <Shell>
      <TopNav />
      <h1 className="font-display mb-4 text-3xl">Traveler profile</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold">Nickname</span>
            <input
              value={profile.nickname}
              maxLength={24}
              onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
              className="mt-1 min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-white/70 px-4 dark:bg-black/20"
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-bold">Avatar</p>
            <div className="grid grid-cols-5 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-label={a.label}
                  onClick={() => setProfile({ ...profile, avatarId: a.id })}
                  className={`grid aspect-square place-items-center rounded-2xl text-2xl ${
                    profile.avatarId === a.id
                      ? "ring-4 ring-[var(--accent)]"
                      : "bg-black/5 dark:bg-white/10"
                  }`}
                  style={{ background: `${a.color}33` }}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-black/5 p-4 dark:bg-white/10">
            <p className="text-sm text-[var(--muted)]">Friend code</p>
            <p className="font-display text-2xl tracking-wider">{profile.friendCode}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Share to challenge friends — no personal info required.
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-3xl">{profile.level}</p>
              <p className="text-xs text-[var(--muted)]">Level</p>
            </div>
            <div>
              <p className="font-display text-3xl">{profile.xp}</p>
              <p className="text-xs text-[var(--muted)]">XP</p>
            </div>
            <div>
              <p className="font-display text-3xl">
                {profile.wins}-{profile.losses}
              </p>
              <p className="text-xs text-[var(--muted)]">W-L</p>
            </div>
          </div>

          <div>
            <p className="mb-2 font-bold">Badges</p>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((b) => {
                const info = BADGE_INFO[b] ?? {
                  name: b,
                  description: "",
                  icon: "⭐",
                };
                return (
                  <span
                    key={b}
                    title={info.description}
                    className="rounded-2xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10"
                  >
                    {info.icon} {info.name}
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 font-bold">Cosmetics unlocked</p>
            <p className="text-sm text-[var(--muted)]">
              {profile.unlockedCosmetics.join(", ")}
            </p>
          </div>

          <div className="space-y-3 border-t border-[var(--card-border)] pt-4">
            <p className="font-bold">Settings</p>
            {(
              [
                ["soundEnabled", "Sound effects"],
                ["vibrateEnabled", "Vibration"],
                ["reducedMotion", "Reduce motion"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(e) => updatePrefs({ [key]: e.target.checked })}
                  className="h-5 w-5"
                />
              </label>
            ))}
            <label className="flex items-center justify-between gap-3">
              <span>Theme</span>
              <select
                value={prefs.theme}
                onChange={(e) =>
                  updatePrefs({ theme: e.target.value as "light" | "dark" | "system" })
                }
                className="min-h-11 rounded-xl border border-[var(--card-border)] bg-transparent px-3"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("Reset local guest profile?")) {
                localStorage.clear();
                location.href = "/";
              }
            }}
          >
            Reset local data
          </Button>
        </Card>
      </div>
    </Shell>
  );
}
