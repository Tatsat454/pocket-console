export interface AvatarOption {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

/** Original traveler avatars — not based on any franchise characters. */
export const AVATARS: AvatarOption[] = [
  { id: "traveler", label: "Traveler", emoji: "🧭", color: "#0D9488" },
  { id: "scout", label: "Scout", emoji: "🏕️", color: "#15803D" },
  { id: "pilot", label: "Pilot", emoji: "✈️", color: "#2563EB" },
  { id: "chef", label: "Snack Captain", emoji: "🍪", color: "#D97706" },
  { id: "dj", label: "Playlist Pro", emoji: "🎧", color: "#DB2777" },
  { id: "navigator", label: "Navigator", emoji: "🗺️", color: "#0891B2" },
  { id: "meteor", label: "Night Driver", emoji: "🌙", color: "#4F46E5" },
  { id: "sunny", label: "Daytripper", emoji: "☀️", color: "#EA580C" },
  { id: "cozy", label: "Cozy Cadet", emoji: "🧣", color: "#B45309" },
  { id: "spark", label: "Spark", emoji: "✨", color: "#CA8A04" },
];

export function getAvatar(id: string): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
