"use client";

import { createFriendCode, createGuestId } from "./ids";
import { AVATARS } from "./avatars";

const PROFILE_KEY = "pocket_console_profile";
const FAVORITES_KEY = "pocket_console_favorites";
const RECENTS_KEY = "pocket_console_recents";
const SAVED_GAMES_KEY = "pocket_console_saved_games";
const PREFS_KEY = "pocket_console_prefs";

export interface LocalProfile {
  guestId: string;
  nickname: string;
  avatarId: string;
  friendCode: string;
  xp: number;
  level: number;
  wins: number;
  losses: number;
  themeId: string;
  cardBackId: string;
  badges: string[];
  unlockedCosmetics: string[];
  createdAt: string;
}

export interface AppPrefs {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  reducedMotion: boolean;
  theme: "light" | "dark" | "system";
  roadTripMode: boolean;
}

export const DEFAULT_PREFS: AppPrefs = {
  soundEnabled: true,
  vibrateEnabled: true,
  reducedMotion: false,
  theme: "system",
  roadTripMode: false,
};

function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
}

export function createDefaultProfile(nickname?: string): LocalProfile {
  const guestId = createGuestId();
  return {
    guestId,
    nickname: nickname?.trim() || `Traveler${Math.floor(Math.random() * 900 + 100)}`,
    avatarId: AVATARS[Math.floor(Math.random() * AVATARS.length)].id,
    friendCode: createFriendCode(),
    xp: 0,
    level: 1,
    wins: 0,
    losses: 0,
    themeId: "console-mint",
    cardBackId: "classic",
    badges: ["first_boot"],
    unlockedCosmetics: ["classic", "console-mint"],
    createdAt: new Date().toISOString(),
  };
}

export function loadProfile(): LocalProfile {
  if (typeof window === "undefined") return createDefaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      const p = createDefaultProfile();
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      return p;
    }
    return JSON.parse(raw) as LocalProfile;
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: LocalProfile): void {
  if (typeof window === "undefined") return;
  profile.level = levelFromXp(profile.xp);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function updateProfile(patch: Partial<LocalProfile>): LocalProfile {
  const next = { ...loadProfile(), ...patch };
  saveProfile(next);
  return next;
}

export function awardXp(amount: number, won?: boolean): LocalProfile {
  const p = loadProfile();
  p.xp += amount;
  if (won === true) p.wins += 1;
  if (won === false) p.losses += 1;
  if (p.wins >= 1 && !p.badges.includes("first_win")) p.badges.push("first_win");
  if (p.xp >= 100 && !p.badges.includes("roadie")) p.badges.push("roadie");
  if (p.level >= 5 && !p.unlockedCosmetics.includes("sunset-drive")) {
    p.unlockedCosmetics.push("sunset-drive");
  }
  saveProfile(p);
  return p;
}

export function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function toggleFavorite(gameId: string): string[] {
  const favs = loadFavorites();
  const next = favs.includes(gameId)
    ? favs.filter((id) => id !== gameId)
    : [...favs, gameId];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function pushRecent(gameId: string): string[] {
  const recents = [gameId, ...loadRecents().filter((id) => id !== gameId)].slice(0, 8);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  return recents;
}

export function loadPrefs(): AppPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: AppPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function saveGameProgress(gameId: string, data: unknown): void {
  if (typeof window === "undefined") return;
  const all = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY) || "{}") as Record<
    string,
    unknown
  >;
  all[gameId] = { data, savedAt: Date.now() };
  localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(all));
}

export function loadGameProgress<T>(gameId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY) || "{}") as Record<
      string,
      { data: T }
    >;
    return all[gameId]?.data ?? null;
  } catch {
    return null;
  }
}

export function clearGameProgress(gameId: string): void {
  if (typeof window === "undefined") return;
  const all = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY) || "{}") as Record<
    string,
    unknown
  >;
  delete all[gameId];
  localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(all));
}

export const BADGE_INFO: Record<string, { name: string; description: string; icon: string }> = {
  first_boot: {
    name: "Power On",
    description: "Created your Pocket Console profile",
    icon: "🔋",
  },
  first_win: {
    name: "First Victory",
    description: "Won a game",
    icon: "🏆",
  },
  roadie: {
    name: "Roadie",
    description: "Earned 100 XP on the road",
    icon: "🎒",
  },
};
