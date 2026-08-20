import {
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import { eq } from "drizzle-orm";

import {
  db
} from "../db/client.js";
import {
  auctionEvents,
  auctionSessions,
  leagues
} from "../db/schema/index.js";
import {
  SqliteAuctionEventRepository
} from "../repositories/auction-event.repository.js";
import {
  SqliteAuctionCallRepository
} from "../repositories/auction-call.repository.js";
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
          new SqliteCommandRegistryRepository(),
          new SqliteAuctionEventRepository(),
          new SqliteAuctionCallRepository()
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

      const events = await db
        .select()
        .from(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionSessionId,
            auctionSessionId
          )
        );

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        auctionSessionId,
        eventType:
          "SESSION_SUSPENDED",
        suspensionReason:
          "PIZZA_BREAK",
        auctionCallId: null,
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null
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

      const events = await db
        .select()
        .from(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionSessionId,
            auctionSessionId
          )
        );

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        auctionSessionId,
        eventType:
          "SESSION_RESUMED",
        suspensionReason: null,
        auctionCallId: null,
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null
      });
    });

    it("reopens a closed session as completed", async () => {
      await db
        .update(auctionSessions)
        .set({
          status: "CLOSED",
          suspensionReason: null,
          stateVersion: 6
        });

      const result =
        await service.reopen({
          auctionSessionId,
          commandId:
            "reopen-command-1",
          expectedStateVersion: 6
        });

      expect(result).toMatchObject({
        stateVersion: 7,
        idempotentReplay: false,
        session: {
          id: auctionSessionId,
          status: "COMPLETED",
          suspensionReason: null
        }
      });

      const events = await db
        .select()
        .from(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionSessionId,
            auctionSessionId
          )
        );

      expect(events).toHaveLength(1);

      expect(events[0]).toMatchObject({
        auctionSessionId,
        eventType:
          "SESSION_REOPENED",
        suspensionReason: null,
        auctionCallId: null,
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null
      });
    });

    it("returns an idempotent replay for an identical reopen retry", async () => {
      await db
        .update(auctionSessions)
        .set({
          status: "CLOSED",
          suspensionReason: null,
          stateVersion: 8
        });

      const input = {
        auctionSessionId,
        commandId:
          "reopen-command-retry",
        expectedStateVersion: 8
      };

      const first =
        await service.reopen(input);

      const retry =
        await service.reopen(input);

      expect(retry).toEqual({
        ...first,
        idempotentReplay: true
      });

      expect(first).toMatchObject({
        stateVersion: 9,
        session: {
          status: "COMPLETED",
          suspensionReason: null
        }
      });

      const events = await db
        .select()
        .from(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionSessionId,
            auctionSessionId
          )
        );

      expect(events).toHaveLength(1);

      expect(events[0]).toMatchObject({
        eventType:
          "SESSION_REOPENED"
      });
    });

    it("rejects reuse of a reopen command id with different command data", async () => {
      await db
        .update(auctionSessions)
        .set({
          status: "CLOSED",
          suspensionReason: null,
          stateVersion: 10
        });

      await service.reopen({
        auctionSessionId,
        commandId:
          "reopen-command-conflict",
        expectedStateVersion: 10
      });

      await expect(
        service.reopen({
          auctionSessionId,
          commandId:
            "reopen-command-conflict",
          expectedStateVersion: 11
        })
      ).rejects.toMatchObject({
        code:
          "COMMAND_ID_CONFLICT"
      });

      const events = await db
        .select()
        .from(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionSessionId,
            auctionSessionId
          )
        );

      expect(events).toHaveLength(1);

      expect(events[0]).toMatchObject({
        eventType:
          "SESSION_REOPENED"
      });
    });

    it("rejects reopening a session that is not closed", async () => {
      await expect(
        service.reopen({
          auctionSessionId,
          commandId:
            "reopen-command-invalid",
          expectedStateVersion: 0
        })
      ).rejects.toMatchObject({
        code:
          "INVALID_STATUS_TRANSITION"
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

      const events = await db
        .select()
        .from(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionSessionId,
            auctionSessionId
          )
        );

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventType:
          "SESSION_SUSPENDED",
        suspensionReason:
          "PIZZA_BREAK"
      });
    });
  }
);
