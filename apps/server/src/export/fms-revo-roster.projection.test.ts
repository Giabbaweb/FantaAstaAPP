import type {
  Player,
  RosterEntry
} from "@fantaastaapp/contracts";
import {
  describe,
  expect,
  it
} from "vitest";

import {
  buildFmsRevoRosterProjection,
  FmsRevoRosterProjectionError
} from "./fms-revo-roster.projection.js";

const createdAt = "2026-08-16T18:00:00.000Z";
const updatedAt = createdAt;

function createPlayer(
  overrides: Partial<Player> = {}
): Player {
  return {
    id: "player-1",
    auctionSessionId: "session-1",
    fmsCode: "1001",
    name: "SVILAR Mile",
    normalizedName: "svilar mile",
    realTeamName: "Roma",
    role: "P",
    availabilityStatus: "ROSTERED",
    createdAt,
    updatedAt,
    ...overrides
  };
}

function createRosterEntry(
  overrides: Partial<RosterEntry> = {}
): RosterEntry {
  return {
    id: "roster-entry-1",
    auctionSessionTeamId: "session-team-1",
    playerId: "player-1",
    acquisitionCost: 14,
    contractYear: 2,
    source: "INITIAL_ROSTER",
    createdAt,
    updatedAt,
    ...overrides
  };
}

describe("buildFmsRevoRosterProjection", () => {
  it("projects roster entries using player data", () => {
    const result =
      buildFmsRevoRosterProjection(
        [
          createRosterEntry(),
          createRosterEntry({
            id: "roster-entry-2",
            playerId: "player-2",
            acquisitionCost: 37,
            contractYear: 1,
            source: "AUCTION"
          })
        ],
        [
          createPlayer(),
          createPlayer({
            id: "player-2",
            fmsCode: "1002",
            name: "DIMARCO Federico",
            normalizedName: "dimarco federico",
            realTeamName: "Inter",
            role: "C"
          })
        ]
      );

    expect(result).toEqual([
      {
        role: "P",
        name: "SVILAR Mile",
        acquisitionCost: 14,
        contractYear: 2
      },
      {
        role: "C",
        name: "DIMARCO Federico",
        acquisitionCost: 37,
        contractYear: 1
      }
    ]);
  });

  it("matches players by id instead of array position", () => {
    const result =
      buildFmsRevoRosterProjection(
        [
          createRosterEntry({
            playerId: "player-2"
          }),
          createRosterEntry({
            id: "roster-entry-2",
            playerId: "player-1"
          })
        ],
        [
          createPlayer({
            id: "player-1",
            name: "PLAYER ONE"
          }),
          createPlayer({
            id: "player-2",
            name: "PLAYER TWO"
          })
        ]
      );

    expect(
      result.map((entry) => entry.name)
    ).toEqual([
      "PLAYER TWO",
      "PLAYER ONE"
    ]);
  });

  it("rejects a roster entry without its player", () => {
    expect(() =>
      buildFmsRevoRosterProjection(
        [
          createRosterEntry({
            playerId: "missing-player"
          })
        ],
        []
      )
    ).toThrowError(
      FmsRevoRosterProjectionError
    );

    try {
      buildFmsRevoRosterProjection(
        [
          createRosterEntry({
            playerId: "missing-player"
          })
        ],
        []
      );
    } catch (error) {
      expect(error).toBeInstanceOf(
        FmsRevoRosterProjectionError
      );

      expect(
        (
          error as
            FmsRevoRosterProjectionError
        ).code
      ).toBe("PLAYER_NOT_FOUND");
    }
  });
});
