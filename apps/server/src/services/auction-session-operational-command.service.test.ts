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
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import {
  AtomicAuctionSessionCommandExecutor
} from "../realtime/atomic-auction-session-command.executor.js";
import {
  SqliteAuctionSessionStateRepository
} from "../realtime/auction-session-state.repository.js";
import {
  SqliteCommandRegistryRepository
} from "../realtime/command-registry.repository.js";
import {
  AuctionSessionOperationalCommandService
} from "./auction-session-operational-command.service.js";

describe(
  "AuctionSessionOperationalCommandService",
  () => {
    const auctionSessionId = "session-operational-1";

    let service:
      AuctionSessionOperationalCommandService;

    beforeEach(async () => {
      const sessionRepository =
        new SqliteAuctionSessionRepository();

      const executor =
        new AtomicAuctionSessionCommandExecutor(
          sessionRepository,
          new SqliteAuctionSessionStateRepository(),
          new SqliteCommandRegistryRepository()
        );

      service =
        new AuctionSessionOperationalCommandService(
          executor
        );

      await db.insert(leagues).values({
        id: "league-operational-1",
        name: "League Operational 1",
        normalizedName:
          "league operational 1"
      });

      await db.insert(auctionSessions).values({
        id: auctionSessionId,
        leagueId: "league-operational-1",
        season: "2026/2027",
        editionNumber: 1,
        status: "RUNNING",
        suspensionReason: null,
        initialCredits: 330,
        stateVersion: 0
      });
    });

    it("suspends a running session with its reason", async () => {
      const result =
        await service.suspend({
          auctionSessionId,
          commandId: "suspend-command-1",
          expectedStateVersion: 0,
          reason: "PIZZA_BREAK"
        });

      expect(result).toMatchObject({
        stateVersion: 1,
        idempotentReplay: false,
        session: {
          id: auctionSessionId,
          status: "SUSPENDED",
          suspensionReason:
            "PIZZA_BREAK"
        }
      });
    });

    it("resumes a suspended session and clears its reason", async () => {
      await db
        .update(auctionSessions)
        .set({
          status: "SUSPENDED",
          suspensionReason:
            "TECHNICAL_BREAK",
          stateVersion: 4
        });

      const result =
        await service.resume({
          auctionSessionId,
          commandId: "resume-command-1",
          expectedStateVersion: 4
        });

      expect(result).toMatchObject({
        stateVersion: 5,
        idempotentReplay: false,
        session: {
          id: auctionSessionId,
          status: "RUNNING",
          suspensionReason: null
        }
      });
    });

    it("rejects an invalid operational transition", async () => {
      await db
        .update(auctionSessions)
        .set({
          status: "READY"
        });

      await expect(
        service.suspend({
          auctionSessionId,
          commandId: "suspend-command-invalid",
          expectedStateVersion: 0,
          reason: "OTHER"
        })
      ).rejects.toMatchObject({
        code: "INVALID_STATUS_TRANSITION"
      });
    });

    it("rejects an unknown auction session", async () => {
      await expect(
        service.suspend({
          auctionSessionId:
            "missing-session",
          commandId:
            "missing-session-command",
          expectedStateVersion: 0,
          reason: "OTHER"
        })
      ).rejects.toMatchObject({
        code: "AUCTION_SESSION_NOT_FOUND"
      });
    });

    it("returns an idempotent replay for an identical suspend retry", async () => {
      const input = {
        auctionSessionId,
        commandId:
          "suspend-command-retry",
        expectedStateVersion: 0,
        reason:
          "PIZZA_BREAK" as const
      };

      const first =
        await service.suspend(input);

      const retry =
        await service.suspend(input);

      expect(retry).toEqual({
        ...first,
        idempotentReplay: true
      });
    });
  }
);
