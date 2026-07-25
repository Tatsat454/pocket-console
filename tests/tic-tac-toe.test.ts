import { describe, expect, it } from "vitest";
import { ticTacToe } from "../src/games/tic-tac-toe";

describe("tic-tac-toe", () => {
  it("creates an empty board", () => {
    const state = ticTacToe.createInitialState({
      players: [
        { id: "a", displayName: "A", avatarId: "traveler" },
        { id: "b", displayName: "B", avatarId: "scout" },
      ],
      mode: "same_device",
    });
    expect(state.board.every((c) => c === null)).toBe(true);
    expect(state.currentPlayerId).toBe("a");
  });

  it("rejects out-of-turn moves", () => {
    const state = ticTacToe.createInitialState({
      players: [
        { id: "a", displayName: "A", avatarId: "traveler" },
        { id: "b", displayName: "B", avatarId: "scout" },
      ],
      mode: "same_device",
    });
    const v = ticTacToe.validateAction(state, { type: "place", index: 0 }, "b");
    expect(v.ok).toBe(false);
  });

  it("detects a winning line", () => {
    let state = ticTacToe.createInitialState({
      players: [
        { id: "a", displayName: "A", avatarId: "traveler" },
        { id: "b", displayName: "B", avatarId: "scout" },
      ],
      mode: "same_device",
    });
    const moves: Array<[string, number]> = [
      ["a", 0],
      ["b", 3],
      ["a", 1],
      ["b", 4],
      ["a", 2],
    ];
    for (const [pid, index] of moves) {
      state = ticTacToe.applyAction(state, { type: "place", index }, pid);
    }
    const win = ticTacToe.checkWinner(state);
    expect(win?.winners).toEqual(["a"]);
  });
});
