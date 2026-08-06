import {
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  leagues
} from "../db/schema/index.js";
import {
  SqliteAuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import {
  AuctionSessionStateService
} from "./auction-session-state.service.js";

describe("AuctionSessionStateService", () => {
  const auctionSessionId = "session-1";

  let service:
    AuctionSessionStateService;

  beforeEach(async () => {
    const repository =
      new SqliteAuctionSessionStateRepository();

    service =
      new AuctionSessionStateService(
        repository
      );

    await db.insert(leagues).values({
      id: "league-1",
      name: "League 1",
      normalizedName: "league 1"
    });

    await db.insert(auctionSessions).values({
      id: auctionSessionId,
      leagueId: "league-1",
      season: "2026/2027",
      editionNumber: 1,
      initialCredits: 330,
      stateVersion: 0
    });
  });

  it("reads the current state version", async () => {
    await expect(
      service.getStateVersion(
        auctionSessionId
      )
    ).resolves.toBe(0);
  });

  it("accepts the expected state version", async () => {
    await expect(
      service.assertExpectedVersion(
        auctionSessionId,
        0
      )
    ).resolves.toBeUndefined();
  });

  it("rejects a stale expected version", async () => {
    await expect(
      service.assertExpectedVersion(
        auctionSessionId,
        1
      )
    ).rejects.toMatchObject({
      code: "STALE_STATE",
      message:
        'Auction session "session-1" expected state version 1, but current version is 0'
    });
  });

  it("increments the matching state version", async () => {
    await expect(
      service.incrementStateVersion(
        auctionSessionId,
        0
      )
    ).resolves.toBe(1);

    await expect(
      service.getStateVersion(
        auctionSessionId
      )
    ).resolves.toBe(1);
  });

  it("does not increment from a stale version", async () => {
    await service.incrementStateVersion(
      auctionSessionId,
      0
    );

    await expect(
      service.incrementStateVersion(
        auctionSessionId,
        0
      )
    ).rejects.toMatchObject({
      code: "STALE_STATE"
    });

    await expect(
      service.getStateVersion(
        auctionSessionId
      )
    ).resolves.toBe(1);
  });

  it("allows only one command for the same expected version", async () => {
    const firstService =
      new AuctionSessionStateService(
        new SqliteAuctionSessionStateRepository()
      );

    const secondService =
      new AuctionSessionStateService(
        new SqliteAuctionSessionStateRepository()
      );

    await expect(
      firstService.incrementStateVersion(
        auctionSessionId,
        0
      )
    ).resolves.toBe(1);

    await expect(
      secondService.incrementStateVersion(
        auctionSessionId,
        0
      )
    ).rejects.toMatchObject({
      code: "STALE_STATE"
    });

    await expect(
      service.getStateVersion(
        auctionSessionId
      )
    ).resolves.toBe(1);
  });

  it("rejects an unknown auction session", async () => {
    await expect(
      service.getStateVersion(
        "missing-session"
      )
    ).rejects.toMatchObject({
      code:
        "AUCTION_SESSION_STATE_NOT_FOUND"
    });
  });
});
