import {
  describe,
  expect,
  it
} from "vitest";

import {
  isRosterComplete
} from "./roster-completion.js";

describe("isRosterComplete", () => {
  it("accepts exactly 2P 8D 8C 6A", () => {
    expect(
      isRosterComplete({
        P: 2,
        D: 8,
        C: 8,
        A: 6
      })
    ).toBe(true);
  });

  it("rejects a roster with fewer than 24 players", () => {
    expect(
      isRosterComplete({
        P: 2,
        D: 8,
        C: 8,
        A: 5
      })
    ).toBe(false);
  });

  it("rejects 24 players with the wrong role distribution", () => {
    expect(
      isRosterComplete({
        P: 1,
        D: 9,
        C: 8,
        A: 6
      })
    ).toBe(false);
  });

  it("rejects an empty roster", () => {
    expect(
      isRosterComplete({
        P: 0,
        D: 0,
        C: 0,
        A: 0
      })
    ).toBe(false);
  });
});
