import { describe, expect, it } from "vitest";
import { solitaire } from "../src/games/solitaire";

describe("solitaire", () => {
  it("deals seven tableau columns", () => {
    const state = solitaire.createInitialState({
      players: [{ id: "solo", displayName: "Solo", avatarId: "traveler" }],
      mode: "solo",
      seed: "deal",
    });
    expect(state.tableaus).toHaveLength(7);
    expect(state.tableaus.map((t) => t.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.tableaus.every((t) => t[t.length - 1].faceUp)).toBe(true);
  });

  it("allows drawing from stock", () => {
    let state = solitaire.createInitialState({
      players: [{ id: "solo", displayName: "Solo", avatarId: "traveler" }],
      mode: "solo",
      seed: "draw",
    });
    const before = state.stock.length;
    state = solitaire.applyAction(state, { type: "draw" }, "solo");
    expect(state.waste.length).toBeGreaterThan(0);
    expect(state.stock.length).toBe(before - 1);
  });
});
