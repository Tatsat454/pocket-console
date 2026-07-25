"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  awardXp,
  loadFavorites,
  loadPrefs,
  loadProfile,
  loadRecents,
  pushRecent,
  savePrefs,
  saveProfile,
  toggleFavorite,
  type AppPrefs,
  type LocalProfile,
} from "@/lib/profile";

interface AppContextValue {
  profile: LocalProfile;
  prefs: AppPrefs;
  favorites: string[];
  recents: string[];
  ready: boolean;
  setProfile: (p: LocalProfile) => void;
  updatePrefs: (patch: Partial<AppPrefs>) => void;
  toggleFav: (gameId: string) => void;
  markRecent: (gameId: string) => void;
  grantXp: (amount: number, won?: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<LocalProfile | null>(null);
  const [prefs, setPrefs] = useState<AppPrefs>(loadPrefs());
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfileState(loadProfile());
    setPrefs(loadPrefs());
    setFavorites(loadFavorites());
    setRecents(loadRecents());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark =
      prefs.theme === "dark" || (prefs.theme === "system" && prefersDark);
    root.classList.toggle("dark", dark);
    root.classList.toggle("reduce-motion", prefs.reducedMotion);
  }, [prefs.theme, prefs.reducedMotion, ready]);

  const setProfile = useCallback((p: LocalProfile) => {
    saveProfile(p);
    setProfileState(p);
  }, []);

  const updatePrefs = useCallback((patch: Partial<AppPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const toggleFav = useCallback((gameId: string) => {
    setFavorites(toggleFavorite(gameId));
  }, []);

  const markRecent = useCallback((gameId: string) => {
    setRecents(pushRecent(gameId));
  }, []);

  const grantXp = useCallback((amount: number, won?: boolean) => {
    setProfileState(awardXp(amount, won));
  }, []);

  const value = useMemo<AppContextValue | null>(() => {
    if (!profile) return null;
    return {
      profile,
      prefs,
      favorites,
      recents,
      ready,
      setProfile,
      updatePrefs,
      toggleFav,
      markRecent,
      grantXp,
    };
  }, [
    profile,
    prefs,
    favorites,
    recents,
    ready,
    setProfile,
    updatePrefs,
    toggleFav,
    markRecent,
    grantXp,
  ]);

  if (!value) {
    return (
      <div className="console-bg flex min-h-screen items-center justify-center">
        <div className="animate-pop glass-card rounded-3xl px-8 py-6 text-center">
          <p className="font-display text-2xl">Pocket Console</p>
          <p className="mt-2 text-[var(--muted)]">Booting…</p>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within Providers");
  return ctx;
}
