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
  auctionCalls,
  auctionEvents,
  auctionSessions,
  auctionSessionTeams,
  commandRegistry,
  leagues,
  players,
  teams
} from "../db/schema/index.js";
import {
  SqliteAuctionEventRepository
} from "../repositories/auction-event.repository.js";
import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import {
  SqliteAuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import {
  AtomicAuctionSessionCommandExecutor
} from "./atomic-auction-session-command.executor.js";
import {
  SqliteCommandRegistryRepository
} from "./command-registry.repository.js";

describe("AtomicAuctionSessionCommandExecutor", () => {
  const auctionSessionId = "session-1";

  let executor:
    AtomicAuctionSessionCommandExecutor;

  beforeEach(async () => {
    executor =
      new AtomicAuctionSessionCommandExecutor(
        new SqliteAuctionSessionRepository(),
        new SqliteAuctionSessionStateRepository(),
        new SqliteCommandRegistryRepository(),
        new SqliteAuctionEventRepository()
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
      status: "RUNNING",
      suspensionReason: null,
      initialCredits: 330,
      stateVersion: 0
    });
  });

  function createInput(
    overrides: Partial<{
      commandId: string;
      expectedStateVersion: number;
      requestFingerprint: string;
    }> = {}
  ) {
    return {
      auctionSessionId,
      commandId:
        overrides.commandId ??
        "session-command-1",
      commandType:
        "SUSPEND_SESSION" as const,
      expectedStateVersion:
        overrides.expectedStateVersion ??
        0,
      requestFingerprint:
        overrides.requestFingerprint ??
        "suspend:PIZZA_BREAK",
      update: {
        status: "SUSPENDED" as const,
        suspensionReason:
          "PIZZA_BREAK" as const
      },
      auditEvent: {
        auctionSessionId,
        eventType:
          "SESSION_SUSPENDED" as const,
        suspensionReason:
          "PIZZA_BREAK" as const
      }
    };
  }

  it("persists the operational state and increments stateVersion atomically", async () => {
    const result =
      await executor.execute(
        createInput()
      );

    expect(result).toMatchObject({
      stateVersion: 1,
      idempotentReplay: false,
      session: {
        id: auctionSessionId,
        status: "SUSPENDED",
        suspensionReason: "PIZZA_BREAK"
      }
    });

    const [stored] = await db
      .select({
        status: auctionSessions.status,
        suspensionReason:
          auctionSessions.suspensionReason,
        stateVersion:
          auctionSessions.stateVersion
      })
      .from(auctionSessions);

    expect(stored).toEqual({
      status: "SUSPENDED",
      suspensionReason: "PIZZA_BREAK",
      stateVersion: 1
    });

    const storedEvents =
      await db
        .select()
        .from(auctionEvents);

    expect(storedEvents).toHaveLength(1);
    expect(storedEvents[0]).toMatchObject({
      auctionSessionId,
      eventType:
        "SESSION_SUSPENDED",
      suspensionReason:
        "PIZZA_BREAK"
    });
  });

  it("returns the original result for an identical retry", async () => {
    const firstResult =
      await executor.execute(
        createInput()
      );

    const retryResult =
      await executor.execute(
        createInput()
      );

    expect(retryResult).toEqual({
      ...firstResult,
      idempotentReplay: true
    });

    const [stored] = await db
      .select({
        stateVersion:
          auctionSessions.stateVersion
      })
      .from(auctionSessions);

    expect(
      stored?.stateVersion
    ).toBe(1);

    const storedEvents =
      await db
        .select()
        .from(auctionEvents);

    expect(storedEvents).toHaveLength(1);
    expect(storedEvents[0]).toMatchObject({
      auctionSessionId,
      eventType:
        "SESSION_SUSPENDED",
      suspensionReason:
        "PIZZA_BREAK"
    });
  });

  it("rejects reuse of commandId with different data", async () => {
    await executor.execute(
      createInput()
    );

    await expect(
      executor.execute(
        createInput({
          requestFingerprint:
            "suspend:TECHNICAL_BREAK"
        })
      )
    ).rejects.toMatchObject({
      code: "COMMAND_ID_CONFLICT"
    });
  });

  it("rejects reuse of an auction call commandId for a session command", async () => {
    await db.insert(teams).values({
      id: "team-1",
      leagueId: "league-1",
      name: "Team 1"
    });

    await db.insert(auctionSessionTeams).values({
      id: "session-team-1",
      auctionSessionId,
      teamId: "team-1",
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 330
    });

    await db.insert(players).values({
      id: "player-1",
      auctionSessionId,
      fmsCode: "001",
      name: "Player 1",
      normalizedName: "player 1",
      role: "A"
    });

    await db.insert(auctionCalls).values({
      id: "auction-call-1",
      auctionSessionId,
      playerId: "player-1",
      callerAuctionSessionTeamId:
        "session-team-1",
      status: "DRAFT"
    });

    await db.insert(commandRegistry).values({
      id: "call-command-registry-1",
      auctionSessionId,
      commandScope: "AUCTION_CALL",
      auctionCallId: "auction-call-1",
      commandId: "session-command-1",
      commandType: "OPEN",
      expectedStateVersion: 0,
      resultStateVersion: 1,
      requestFingerprint: "open:1",
      resultPayload: JSON.stringify({
        call: {
          id: "auction-call-1",
          auctionSessionId,
          playerId: "player-1",
          callerAuctionSessionTeamId:
            "session-team-1",
          status: "DRAFT",
          openingBid: null,
          currentBid: null,
          currentLeaderAuctionSessionTeamId:
            null,
          currentTurnAuctionSessionTeamId:
            null,
          provisionalWinnerAuctionSessionTeamId:
            null,
          createdAt:
            "2026-08-12T20:00:00.000Z",
          updatedAt:
            "2026-08-12T20:00:00.000Z"
        },
        teams: []
      })
    });

    await expect(
      executor.execute(
        createInput()
      )
    ).rejects.toMatchObject({
      code: "COMMAND_ID_CONFLICT"
    });
  });

  it("rejects a stale state version", async () => {
    await expect(
      executor.execute(
        createInput({
          expectedStateVersion: 1
        })
      )
    ).rejects.toMatchObject({
      code: "STALE_STATE"
    });
  });

  it("rejects an unknown auction session", async () => {
    await expect(
      executor.execute({
        ...createInput(),
        auctionSessionId:
          "missing-session"
      })
    ).rejects.toMatchObject({
      code: "AUCTION_SESSION_NOT_FOUND"
    });
  });

  it("rolls back operational state when command registration fails", async () => {
    class FailingCommandRegistryRepository
      extends SqliteCommandRegistryRepository
    {
      createSessionCommandWithExecutor(): never {
        throw new Error(
          "simulated registry failure"
        );
      }
    }

    const failingExecutor =
      new AtomicAuctionSessionCommandExecutor(
        new SqliteAuctionSessionRepository(),
        new SqliteAuctionSessionStateRepository(),
        new FailingCommandRegistryRepository(),
        new SqliteAuctionEventRepository()
      );

    await expect(
      failingExecutor.execute(
        createInput()
      )
    ).rejects.toThrow(
      "simulated registry failure"
    );

    const [stored] = await db
      .select({
        status: auctionSessions.status,
        suspensionReason:
          auctionSessions.suspensionReason,
        stateVersion:
          auctionSessions.stateVersion
      })
      .from(auctionSessions);

    expect(stored).toEqual({
      status: "RUNNING",
      suspensionReason: null,
      stateVersion: 0
    });

    const storedEvents =
      await db
        .select()
        .from(auctionEvents);

    expect(storedEvents).toHaveLength(0);
  });
});
