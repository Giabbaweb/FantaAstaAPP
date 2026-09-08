import {
  describe,
  expect,
  it
} from "vitest";

import {
  rosterRoleLimits,
  rosterSizeLimit
} from "../roster-entries/index.js";

import {
  CreateAuctionCallDraftDomainError,
  createAuctionCallDraft
} from "./create-auction-call-draft.js";

const now = "2026-09-16T19:00:00.000Z";

const baseTeams = [
  {
    auctionSessionTeamId: "team-1",
    turnOrder: 1,
    remainingCredits: 300,
    currentRosterSize: 10,
    currentRoleCount: 2
  },
  {
    auctionSessionTeamId: "team-2",
    turnOrder: 2,
    remainingCredits: 250,
    currentRosterSize: 11,
    currentRoleCount: 3
  },
  {
    auctionSessionTeamId: "team-3",
    turnOrder: 3,
    remainingCredits: 200,
    currentRosterSize: 12,
    currentRoleCount: 4
  }
] as const;

describe("createAuctionCallDraft", () => {
  it("creates a DRAFT aggregate in table order with sustainable maximum bids", () => {
    const result = createAuctionCallDraft({
      auctionCallId: "call-1",
      auctionSessionId: "session-1",
      playerId: "player-1",
      playerRole: "A",
      callerAuctionSessionTeamId:
        "team-1",
      teams: baseTeams,
      now
    });

    expect(result.call).toEqual({
      id: "call-1",
      auctionSessionId: "session-1",
      playerId: "player-1",
      callerAuctionSessionTeamId:
        "team-1",
      status: "DRAFT",
      openingBid: null,
      currentBid: null,
      currentLeaderAuctionSessionTeamId:
        null,
      currentTurnAuctionSessionTeamId:
        null,
      currentTurnStartedAt: null,
      provisionalWinnerAuctionSessionTeamId:
        null,
      createdAt: now,
      updatedAt: now
    });

    expect(
      result.teams.map(
        (team) => ({
          id:
            team.auctionSessionTeamId,
          turnOrder:
            team.turnOrder,
          maximumBid:
            team.maximumBid,
          status:
            team.status,
          reason:
            team.exclusionReason
        })
      )
    ).toEqual([
      {
        id: "team-1",
        turnOrder: 1,
        maximumBid: 287,
        status: "ACTIVE",
        reason: null
      },
      {
        id: "team-2",
        turnOrder: 2,
        maximumBid: 238,
        status: "ACTIVE",
        reason: null
      },
      {
        id: "team-3",
        turnOrder: 3,
        maximumBid: 189,
        status: "ACTIVE",
        reason: null
      }
    ]);
  });

  it("excludes a team whose roster is already full", () => {
    const result = createAuctionCallDraft({
      auctionCallId: "call-1",
      auctionSessionId: "session-1",
      playerId: "player-1",
      playerRole: "A",
      callerAuctionSessionTeamId:
        "team-1",
      teams: [
        baseTeams[0],
        {
          ...baseTeams[1],
          currentRosterSize:
            rosterSizeLimit
        }
      ],
      now
    });

    expect(result.teams[1]).toMatchObject({
      status: "EXCLUDED",
      maximumBid: 0,
      exclusionReason: "ROSTER_FULL"
    });
  });

  it("excludes a team that reached the selected player's role limit", () => {
    const result = createAuctionCallDraft({
      auctionCallId: "call-1",
      auctionSessionId: "session-1",
      playerId: "player-1",
      playerRole: "A",
      callerAuctionSessionTeamId:
        "team-1",
      teams: [
        baseTeams[0],
        {
          ...baseTeams[1],
          currentRoleCount:
            rosterRoleLimits.A
        }
      ],
      now
    });

    expect(result.teams[1]).toMatchObject({
      status: "EXCLUDED",
      exclusionReason:
        "ROLE_LIMIT_REACHED"
    });
  });

  it("rejects an ineligible caller", () => {
    expect(() =>
      createAuctionCallDraft({
        auctionCallId: "call-1",
        auctionSessionId: "session-1",
        playerId: "player-1",
        playerRole: "A",
        callerAuctionSessionTeamId:
          "team-1",
        teams: [
          {
            ...baseTeams[0],
            currentRosterSize:
              rosterSizeLimit
          },
          baseTeams[1]
        ],
        now
      })
    ).toThrowError(
      expect.objectContaining({
        code: "CALLER_NOT_ELIGIBLE"
      })
    );
  });

  it("rejects duplicated table order", () => {
    expect(() =>
      createAuctionCallDraft({
        auctionCallId: "call-1",
        auctionSessionId: "session-1",
        playerId: "player-1",
        playerRole: "A",
        callerAuctionSessionTeamId:
          "team-1",
        teams: [
          baseTeams[0],
          {
            ...baseTeams[1],
            turnOrder: 1
          }
        ],
        now
      })
    ).toThrowError(
      CreateAuctionCallDraftDomainError
    );
  });
});
