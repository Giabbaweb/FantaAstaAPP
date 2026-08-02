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

  it("builds an authoritative snapshot", async () => {
    const sessionReader = {
      findById: vi.fn().mockResolvedValue(
        session
      )
    };

    const sessionTeamReader = {
      findByAuctionSessionId:
        vi.fn().mockResolvedValue([
          {
            id: "auction-session-team-1",
            auctionSessionId: "session-1",
            teamId: "team-1",
            tableOrder: 1,
            renewalCredits: 20,
            remainingCredits: 310
          }
        ])
    };

    const auctionCallReader = {
      findById: vi.fn(),
      findOperationalByAuctionSessionId:
        vi.fn().mockResolvedValue(
          operationalAuctionCall
        )
    };

    const service =
      new RealtimeSnapshotService(
        sessionReader,
        sessionTeamReader,
        auctionCallReader,
        () =>
          "2026-08-02T20:02:00.000Z"
      );

    await expect(
      service.buildSnapshot(
        "session-1",
        4
      )
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
      operationalAuctionCall
    });
  });

  it("allows a snapshot without an operational call", async () => {
    const service =
      new RealtimeSnapshotService(
        {
          findById:
            vi.fn().mockResolvedValue(
              session
            )
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
        () =>
          "2026-08-02T20:02:00.000Z"
      );

    const snapshot =
      await service.buildSnapshot(
        "session-1",
        0
      );

    expect(
      snapshot.operationalAuctionCall
    ).toBeNull();

    expect(snapshot.stateVersion).toBe(0);
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
        }
      );

    await expect(
      service.buildSnapshot(
        "missing-session",
        0
      )
    ).rejects.toMatchObject({
      code:
        "REALTIME_SNAPSHOT_SESSION_NOT_FOUND"
    });
  });

  it("rejects an invalid state version", async () => {
    const service =
      new RealtimeSnapshotService(
        {
          findById:
            vi.fn().mockResolvedValue(
              session
            )
        },
        {
          findByAuctionSessionId:
            vi.fn()
        },
        {
          findById: vi.fn(),
          findOperationalByAuctionSessionId:
            vi.fn()
        }
      );

    await expect(
      service.buildSnapshot(
        "session-1",
        -1
      )
    ).rejects.toThrow(
      "Realtime state version must be a nonnegative integer"
    );
  });
});
