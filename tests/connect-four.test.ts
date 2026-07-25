import { describe, expect, it } from "vitest";
import { connectFour } from "../src/games/connect-four";

const players = [
  { id: "a", displayName: "A", avatarId: "spark" },
  { id: "b", displayName: "B", avatarId: "spark" },
];

describe("connect four", () => {
  it("detects a vertical win", () => {
    let state = connectFour.createInitialState({ players, mode: "same_device" });
    for (let i = 0; i < 3; i++) {
      state = connectFour.applyAction(state, { type: "drop", column: 0 }, "a");
      state = connectFour.applyAction(state, { type: "drop", column: 1 }, "b");
    }
    state = connectFour.applyAction(state, { type: "drop", column: 0 }, "a");
    const win = connectFour.checkWinner(state);
    expect(win?.winners).toEqual(["a"]);
  });

  it("rejects drops in a full column", () => {
    const state = connectFour.createInitialState({ players, mode: "same_device" });
    const full = {
      ...state,
      board: state.board.map((row) => {
        const next = [...row];
        next[0] = "R";
        return next;
      }),
      currentPlayerId: "a",
    };
    const v = connectFour.validateAction(full, { type: "drop", column: 0 }, "a");
    expect(v.ok).toBe(false);
  });
});

