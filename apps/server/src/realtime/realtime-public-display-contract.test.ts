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
    maximumBid: 301,
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
      remainingRosterSlots: 10,
        entries: []
    }
  };

  it("accepts a public display projection", () => {
    const projection = {
      league: {
        id: "league-1",
        name: "SFL'92"
      },
      teams: [team],
      currentPlayer: {
        id: "player-1",
        name: "Player One",
        realTeamName: "Inter",
        role: "A"
      },
      recentAwards: []
    };

    expect(
      realtimePublicDisplayProjectionSchema.parse(
        projection
      )
    ).toEqual(projection);
  });

  it("allows no current player", () => {
    const projection = {
      league: {
        id: "league-1",
        name: "SFL'92"
      },
      teams: [team],
      currentPlayer: null,
      recentAwards: []
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
        league: {
          id: "league-1",
          name: "SFL'92"
        },
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
