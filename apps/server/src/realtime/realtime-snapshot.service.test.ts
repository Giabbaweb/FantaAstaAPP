import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  AuctionSession
} from "@fantaastaapp/contracts";
import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";

import {
  RealtimeSnapshotService
} from "./realtime-snapshot.service.js";

describe("RealtimeSnapshotService", () => {
  const session: AuctionSession = {
    id: "session-1",
    leagueId: "league-1",
    season: "2026/2027",
    editionNumber: 35,
    status: "RUNNING",
    suspensionReason: null,
    initialCredits: 330,
    createdAt:
      "2026-08-02T18:00:00.000Z",
    updatedAt:
      "2026-08-02T20:00:00.000Z"
  };

  const operationalAuctionCall:
    AuctionCallAggregate = {
      call: {
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
        provisionalWinnerAuctionSessionTeamId:
          null,
        createdAt:
          "2026-08-02T20:00:00.000Z",
        updatedAt:
          "2026-08-02T20:01:00.000Z"
      },
      teams: [
        {
          auctionCallId: "auction-call-1",
          auctionSessionTeamId:
            "auction-session-team-1",
          turnOrder: 1,
          status: "ACTIVE",
          maximumBid: 307,
          exclusionReason: null
        }
      ]
    };

  it("builds an authoritative snapshot using the persisted version", async () => {
    const service =
      new RealtimeSnapshotService(
        {
          findById:
            vi.fn().mockResolvedValue({
              session,
              stateVersion: 4
            })
        },
        {
          findByAuctionSessionId:
            vi.fn().mockResolvedValue([
              {
                id:
                  "auction-session-team-1",
                auctionSessionId:
                  "session-1",
                teamId: "team-1",
                tableOrder: 1,
                renewalCredits: 20,
                remainingCredits: 310
              }
            ])
        },
        {
          findById: vi.fn(),
          findOperationalByAuctionSessionId:
            vi.fn().mockResolvedValue(
              operationalAuctionCall
            )
        },
        {
          findLeagueByAuctionSessionId:
            vi.fn().mockResolvedValue({
              id: "league-1",
              name: "SFL'92"
            }),
          findTeamsByAuctionSessionId:
            vi.fn().mockResolvedValue([
              {
                auctionSessionTeamId:
                  "auction-session-team-1",
                teamId: "team-1",
                teamName: "Team One",
                shortName: "ONE",
                primaryColor: "#112233",
                secondaryColor: "#ffffff",
                logoPath: "/logos/team-1.png",
                tableOrder: 1,
                remainingCredits: 310,
                roleCounts: {
                  P: 2,
                  D: 5,
                  C: 4,
                  A: 3
                }
              }
            ]),
          findPlayerById:
            vi.fn().mockResolvedValue({
              id: "player-1",
              name: "Player One",
              role: "A"
            }),
            findRecentAwardsByAuctionSessionId: vi.fn().mockResolvedValue([]),
        },
        () =>
          "2026-08-02T20:02:00.000Z"
      );

    await expect(
      service.buildSnapshot("session-1")
    ).resolves.toEqual({
      stateVersion: 4,
      generatedAt:
        "2026-08-02T20:02:00.000Z",
      session,
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
      operationalAuctionCall,
      publicDisplay: {
        league: {
          id: "league-1",
          name: "SFL'92"
        },
        teams: [
          {
            auctionSessionTeamId:
              "auction-session-team-1",
            teamId: "team-1",
            teamName: "Team One",
            shortName: "ONE",
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
              remainingRosterSlots: 10
            }
          }
        ],
        currentPlayer: {
          id: "player-1",
          name: "Player One",
          role: "A"
        },
        recentAwards: []
      }
    });
  });

  it("allows a snapshot without an operational call", async () => {
  const service =
    new RealtimeSnapshotService(
      {
        findById:
          vi.fn().mockResolvedValue({
            session,
            stateVersion: 0
          })
      },
      {
        findByAuctionSessionId:
          vi.fn().mockResolvedValue([])
      },
      {
        findById: vi.fn(),
        findOperationalByAuctionSessionId:
          vi.fn().mockResolvedValue(null)
      },
      {
          findLeagueByAuctionSessionId:
            vi.fn().mockResolvedValue({
              id: "league-1",
              name: "SFL'92"
            }),
          findTeamsByAuctionSessionId:
            vi.fn().mockResolvedValue([]),
          findPlayerById:
            vi.fn(),
            findRecentAwardsByAuctionSessionId: vi.fn().mockResolvedValue([]),
        },
      () =>
        "2026-08-02T20:02:00.000Z"
    );

  const snapshot =
    await service.buildSnapshot(
      "session-1"
    );

  expect(
    snapshot.operationalAuctionCall
  ).toBeNull();

  expect(snapshot.stateVersion).toBe(0);

  expect(snapshot.publicDisplay).toEqual({
    league: {
      id: "league-1",
      name: "SFL'92"
    },
    teams: [],
    currentPlayer: null,
      recentAwards: []
  });
});

  it("rejects a missing auction session", async () => {
    const service =
      new RealtimeSnapshotService(
        {
          findById:
            vi.fn().mockResolvedValue(null)
        },
        {
          findByAuctionSessionId:
            vi.fn()
        },
        {
          findById: vi.fn(),
          findOperationalByAuctionSessionId:
            vi.fn()
        },
        {
          findLeagueByAuctionSessionId:
            vi.fn().mockResolvedValue({
              id: "league-1",
              name: "SFL'92"
            }),
          findTeamsByAuctionSessionId:
            vi.fn(),
            findPlayerById:
              vi.fn(),
            findRecentAwardsByAuctionSessionId: vi.fn().mockResolvedValue([])
        }
      );

    await expect(
      service.buildSnapshot(
        "missing-session"
      )
    ).rejects.toMatchObject({
      code:
        "REALTIME_SNAPSHOT_SESSION_NOT_FOUND"
    });
  });
  });
