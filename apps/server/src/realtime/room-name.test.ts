import {
  describe,
  expect,
  it
} from "vitest";

import {
  auctionSessionObserversRoom,
  auctionSessionOperatorsRoom,
  auctionSessionRoom,
  auctionSessionTeamRoom
} from "./room-name.js";

describe("realtime room names", () => {
  it("creates the auction session room name", () => {
    expect(
      auctionSessionRoom("session-1")
    ).toBe(
      "auction-session:session-1"
    );
  });

  it("creates the auction session team room name", () => {
    expect(
      auctionSessionTeamRoom("session-team-1")
    ).toBe(
      "auction-session-team:session-team-1"
    );
  });

  it("creates the auction session operators room name", () => {
    expect(
      auctionSessionOperatorsRoom("session-1")
    ).toBe(
      "auction-session-operators:session-1"
    );
  });

  it("creates the auction session observers room name", () => {
    expect(
      auctionSessionObserversRoom("session-1")
    ).toBe(
      "auction-session-observers:session-1"
    );
  });

  it("trims room identifiers", () => {
    expect(
      auctionSessionRoom(" session-1 ")
    ).toBe(
      "auction-session:session-1"
    );
  });

  it("rejects empty room identifiers", () => {
    expect(() =>
      auctionSessionTeamRoom("   ")
    ).toThrow(
      "auctionSessionTeamId must not be empty"
    );
  });
});
