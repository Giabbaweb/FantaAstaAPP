import {
  describe,
  expect,
  it
} from "vitest";

import {
  realtimePublicDisplayProjectionSchema
} from "@fantaastaapp/contracts";

describe("realtime public display contracts", () => {
  const team = {
    auctionSessionTeamId:
      "auction-session-team-1",
    teamId: "team-1",
    teamName: "Team 1",
    shortName: "T1",
    primaryColor: "#112233",
    secondaryColor: "#ffffff",
    logoPath: "/logos/team-1.png",
    tableOrder: 1,
    remainingCredits: 310,
    roster: {
      P: {
        count: 2,
        limit: 2
      },
      D: {
        count: 5,
        limit: 8
      },
      C: {
        count: 4,
        limit: 8
      },
      A: {
        count: 3,
        limit: 6
      },
      rosterSize: 14,
      rosterSizeLimit: 24,
      remainingRosterSlots: 10
    }
  };

  it("accepts a public display projection", () => {
    const projection = {
      teams: [team],
      currentPlayer: {
        id: "player-1",
        name: "Player One",
        role: "A"
      }
    };

    expect(
      realtimePublicDisplayProjectionSchema.parse(
        projection
      )
    ).toEqual(projection);
  });

  it("allows no current player", () => {
    const projection = {
      teams: [team],
      currentPlayer: null
    };

    expect(
      realtimePublicDisplayProjectionSchema.parse(
        projection
      )
    ).toEqual(projection);
  });

  it("rejects invalid roster counts", () => {
    expect(
      realtimePublicDisplayProjectionSchema.safeParse({
        teams: [
          {
            ...team,
            roster: {
              ...team.roster,
              P: {
                count: -1,
                limit: 2
              }
            }
          }
        ],
        currentPlayer: null
      }).success
    ).toBe(false);
  });
});
