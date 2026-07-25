export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface PlayingCard {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

export function rankValue(rank: Rank): number {
  const map: Record<Rank, number> = {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
  };
  return map[rank];
}

export function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export function createStandardDeck(faceUp = false): PlayingCard[] {
  const cards: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${rank}_${suit}`, suit, rank, faceUp });
    }
  }
  return cards;
}

export function suitSymbol(suit: Suit): string {
  return { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" }[suit];
}
