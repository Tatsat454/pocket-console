import { describe, expect, it } from "vitest";
import { colorClash, createClashDeck } from "../src/games/color-clash";

describe("color-clash", () => {
  it("builds a full deck", () => {
    expect(createClashDeck().length).toBe(108);
  });

  it("deals seven cards to each player", () => {
    const state = colorClash.createInitialState({
      players: [
        { id: "a", displayName: "A", avatarId: "traveler" },
        { id: "b", displayName: "B", avatarId: "scout" },
      ],
      mode: "same_device",
      seed: "test-seed",
    });
    expect(state.hands.a).toHaveLength(7);
    expect(state.hands.b).toHaveLength(7);
    expect(state.discard).toHaveLength(1);
  });

  it("hides opponent hands in client view", () => {
    const state = colorClash.createInitialState({
      players: [
        { id: "a", displayName: "A", avatarId: "traveler" },
        { id: "b", displayName: "B", avatarId: "scout" },
      ],
      mode: "private_room",
      seed: "fog",
    });
    const view = colorClash.getClientView(state, "a") as {
      yourHand: unknown[];
      handCounts: Record<string, number>;
    };
    expect(view.yourHand).toHaveLength(7);
    expect(view.handCounts.b).toBe(7);
    expect("hands" in view).toBe(false);
  });
});
