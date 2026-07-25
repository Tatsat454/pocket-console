import { describe, expect, it } from "vitest";
import { memoryMatch } from "../src/games/memory";

describe("memory match", () => {
  it("scores a matching pair and keeps the turn", () => {
    const state = memoryMatch.createInitialState({
      players: [
        { id: "p1", displayName: "P1", avatarId: "spark" },
        { id: "p2", displayName: "P2", avatarId: "spark" },
      ],
      mode: "same_device",
      seed: "fixed",
    });
    const first = state.tiles[0];
    const match = state.tiles.find(
      (t) => t.id !== first.id && t.emoji === first.emoji,
    )!;
    let next = memoryMatch.applyAction(state, { type: "flip", tileId: first.id }, "p1");
    next = memoryMatch.applyAction(next, { type: "flip", tileId: match.id }, "p1");
    next = memoryMatch.applyAction(next, { type: "resolve" }, "p1");
    expect(next.scores.p1).toBe(1);
    expect(next.currentPlayerId).toBe("p1");
    expect(next.tiles.filter((t) => t.matched).length).toBe(2);
  });
});
