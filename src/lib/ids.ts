import { customAlphabet } from "nanoid";

const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const friendAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const roomNano = customAlphabet(roomAlphabet, 6);
const friendNano = customAlphabet(friendAlphabet, 12);

/** Short room codes for joining (e.g. K7M2QP). */
export function createRoomCode(): string {
  return roomNano();
}

/** Friend-code style identifier: ABCD-EFGH-IJKL */
export function createFriendCode(): string {
  const raw = friendNano();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function createGuestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/** Deterministic PRNG from a seed string (mulberry32). */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const t = (h ^= h >>> 16) >>> 0;
    return (t & 0xfffffff) / 0x10000000;
  };
}

export function shuffleInPlace<T>(arr: T[], rand: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
