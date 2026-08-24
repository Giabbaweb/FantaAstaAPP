import {
  describe,
  expect,
  it
} from "vitest";

import {
  auctionCallSchema,
  auctionCallTeamSchema,
  realtimeAuctionSnapshotSchema,
  realtimeEventNameSchema
} from "@fantaastaapp/contracts";

describe("realtime auction snapshot contracts", () => {
  const auctionCall = {
    id: "auction-call-1",
    auctionSessionId: "session-1",
    playerId: "player-1",
    callerAuctionSessionTeamId:
      "auction-session-team-1",
    status: "OPEN",
    openingBid: 1,
    currentBid: 5,
    currentLeaderAuctionSessionTeamId:
      "auction-session-team-2",
    currentTurnAuctionSessionTeamId:
      "auction-session-team-3",
    currentTurnStartedAt:
      "2026-08-02T20:01:00.000Z",
    provisionalWinnerAuctionSessionTeamId: null,
    createdAt: "2026-08-02T20:00:00.000Z",
    updatedAt: "2026-08-02T20:01:00.000Z"
  };

  const auctionCallTeam = {
    auctionCallId: "auction-call-1",
    auctionSessionTeamId:
      "auction-session-team-1",
    turnOrder: 1,
    status: "ACTIVE",
    maximumBid: 307,
    exclusionReason: null
  };

  it("validates an auction call", () => {
    expect(
      auctionCallSchema.parse(auctionCall)
    ).toEqual(auctionCall);
  });

  it("validates an auction call team", () => {
    expect(
      auctionCallTeamSchema.parse(
        auctionCallTeam
      )
    ).toEqual(auctionCallTeam);
  });

  it("validates a snapshot with an operational call", () => {
    const snapshot = {
      stateVersion: 4,
      generatedAt:
        "2026-08-02T20:02:00.000Z",
      session: {
        id: "session-1",
        leagueId: "league-1",
        season: "2026/2027",
        editionNumber: 35,
        status: "RUNNING",
        suspensionReason: null,
        initialCredits: 330,
        maximumInitialRosterEntries: 11,
        createdAt:
          "2026-08-02T19:00:00.000Z",
        updatedAt:
          "2026-08-02T20:01:00.000Z"
      },
      sessionTeams: [
        {
          id: "auction-session-team-1",
          auctionSessionId: "session-1",
          teamId: "team-1",
          tableOrder: 1,
          renewalCredits: 20,
          remainingCredits: 310
        }
      ],
      operationalAuctionCall: {
        call: auctionCall,
        teams: [
          auctionCallTeam
        ]
      },
      publicDisplay: {
        league: {
          id: "league-1",
          name: "SFL'92",
          logoPath: null
        },
        teams: [],
        currentPlayer: null,
        recentAwards: []
      }
    };

    expect(
      realtimeAuctionSnapshotSchema.parse(
        snapshot
      )
    ).toEqual(snapshot);
  });

  it("allows a snapshot without an operational call", () => {
    const result =
      realtimeAuctionSnapshotSchema.safeParse({
        stateVersion: 0,
        generatedAt:
          "2026-08-02T20:02:00.000Z",
        session: {
          id: "session-1",
          leagueId: "league-1",
          season: "2026/2027",
          editionNumber: 35,
          status: "READY",
          suspensionReason: null,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          createdAt:
            "2026-08-02T19:00:00.000Z",
          updatedAt:
            "2026-08-02T19:00:00.000Z"
        },
        sessionTeams: [],
        operationalAuctionCall: null,
        publicDisplay: {
          league: {
            id: "league-1",
            name: "SFL'92",
            logoPath: null
          },
          teams: [],
          currentPlayer: null,
          recentAwards: []
        }
      });

    expect(result.success).toBe(true);
  });

  it("rejects a negative state version", () => {
    const result =
      realtimeAuctionSnapshotSchema.safeParse({
        stateVersion: -1,
        generatedAt:
          "2026-08-02T20:02:00.000Z",
        session: {
          id: "session-1",
          leagueId: "league-1",
          season: "2026/2027",
          editionNumber: 35,
          status: "RUNNING",
          suspensionReason: null,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          createdAt:
            "2026-08-02T19:00:00.000Z",
          updatedAt:
            "2026-08-02T20:01:00.000Z"
        },
        sessionTeams: [],
        operationalAuctionCall: null,
        publicDisplay: {
          league: {
            id: "league-1",
            name: "SFL'92",
            logoPath: null
          },
          teams: [],
          currentPlayer: null,
          recentAwards: []
        }
      });

    expect(result.success).toBe(false);
  });

  it("includes the snapshot event name", () => {
    expect(
      realtimeEventNameSchema.parse(
        "auction:snapshot"
      )
    ).toBe("auction:snapshot");
  });

  it("validates a domain exclusion reason", () => {
    expect(
      auctionCallTeamSchema.parse({
        ...auctionCallTeam,
        status: "EXCLUDED",
        exclusionReason:
          "MAXIMUM_BID_TOO_LOW"
      })
    ).toEqual({
      ...auctionCallTeam,
      status: "EXCLUDED",
      exclusionReason:
        "MAXIMUM_BID_TOO_LOW"
    });
  });

});
