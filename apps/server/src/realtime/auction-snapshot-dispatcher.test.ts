import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

import {
  AuctionSnapshotDispatcher
} from "./auction-snapshot-dispatcher.js";

describe("AuctionSnapshotDispatcher", () => {
  const snapshot: RealtimeAuctionSnapshot = {
    stateVersion: 5,
    generatedAt:
      "2026-08-02T21:45:00.000Z",
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
        "2026-08-02T20:00:00.000Z",
      updatedAt:
        "2026-08-02T21:40:00.000Z"
    },
  sessionTeams: [],
  operationalAuctionCall: null,
  publicDisplay: {
    league: {
      id: "league-1",
      name: "SFL'92"
    },
    teams: [],
    currentPlayer: null,
    recentAwards: []
  }
  };

  it("builds and publishes the authoritative snapshot", async () => {
    const buildSnapshot =
      vi.fn().mockResolvedValue(snapshot);

    const publishAuctionSnapshot =
      vi.fn().mockResolvedValue(undefined);

    const dispatcher =
      new AuctionSnapshotDispatcher(
        {
          buildSnapshot
        },
        {
          publishAuctionSnapshot
        }
      );

    await expect(
      dispatcher.dispatch("session-1")
    ).resolves.toBe(snapshot);

    expect(buildSnapshot).toHaveBeenCalledWith(
      "session-1"
    );

    expect(
      publishAuctionSnapshot
    ).toHaveBeenCalledWith(snapshot);

    expect(
      buildSnapshot.mock.invocationCallOrder[0]
    ).toBeLessThan(
      publishAuctionSnapshot.mock
        .invocationCallOrder[0]!
    );
  });

  it("does not publish when snapshot creation fails", async () => {
    const snapshotError =
      new Error("Snapshot failed");

    const buildSnapshot =
      vi.fn().mockRejectedValue(
        snapshotError
      );

    const publishAuctionSnapshot =
      vi.fn();

    const dispatcher =
      new AuctionSnapshotDispatcher(
        {
          buildSnapshot
        },
        {
          publishAuctionSnapshot
        }
      );

    await expect(
      dispatcher.dispatch("session-1")
    ).rejects.toThrow("Snapshot failed");

    expect(
      publishAuctionSnapshot
    ).not.toHaveBeenCalled();
  });

  it("propagates snapshot publication failures", async () => {
    const publicationError =
      new Error(
        "Snapshot publication failed"
      );

    const dispatcher =
      new AuctionSnapshotDispatcher(
        {
          buildSnapshot:
            vi.fn().mockResolvedValue(
              snapshot
            )
        },
        {
          publishAuctionSnapshot:
            vi.fn().mockRejectedValue(
              publicationError
            )
        }
      );

    await expect(
      dispatcher.dispatch("session-1")
    ).rejects.toThrow(
      "Snapshot publication failed"
    );
  });
});
