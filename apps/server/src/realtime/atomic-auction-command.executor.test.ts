import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  db
} from "../db/client.js";
import {
  auctionCalls,
  auctionCallTeams,
  auctionSessions,
  auctionSessionTeams,
  commandRegistry,
  leagues,
  players,
  teams
} from "../db/schema/index.js";
import {
  SqliteAuctionCallRepository
} from "../repositories/auction-call.repository.js";
import {
  SqliteAuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import {
  AtomicAuctionCommandExecutor
} from "./atomic-auction-command.executor.js";
import {
  SqliteCommandRegistryRepository
} from "./command-registry.repository.js";

describe("AtomicAuctionCommandExecutor", () => {
  const auctionSessionId = "session-1";
  const auctionCallId = "auction-call-1";

  let executor:
    AtomicAuctionCommandExecutor;

  beforeEach(async () => {
    executor =
      new AtomicAuctionCommandExecutor(
        new SqliteAuctionCallRepository(),
        new SqliteAuctionSessionStateRepository(),
        new SqliteCommandRegistryRepository()
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
      id: auctionCallId,
      auctionSessionId,
      playerId: "player-1",
      callerAuctionSessionTeamId:
        "session-team-1",
      status: "DRAFT"
    });

    await db.insert(auctionCallTeams).values({
      id: "auction-call-team-1",
      auctionCallId,
      auctionSessionTeamId:
        "session-team-1",
      status: "ACTIVE",
      maximumBid: 307
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
      auctionCallId,
      commandId:
        overrides.commandId ??
        "command-1",
      commandType: "OPEN" as const,
      expectedStateVersion:
        overrides.expectedStateVersion ??
        0,
      requestFingerprint:
        overrides.requestFingerprint ??
        "open:1",
      apply: vi.fn((aggregate) => ({
        call: {
          ...aggregate.call,
          status: "OPEN" as const,
          openingBid: 1,
          currentBid: 1,
          currentLeaderAuctionSessionTeamId:
            "session-team-1",
          currentTurnAuctionSessionTeamId:
            "session-team-1"
        },
        teams: aggregate.teams
      }))
    };
  }

  it("persists the command and increments stateVersion atomically", async () => {
    const input = createInput();

    const result =
      await executor.execute(input);

    expect(result).toMatchObject({
      stateVersion: 1,
      idempotentReplay: false,
      aggregate: {
        call: {
          id: auctionCallId,
          status: "OPEN",
          openingBid: 1,
          currentBid: 1
        }
      }
    });

    expect(input.apply).toHaveBeenCalledTimes(1);
  });

  it("returns the original result for an identical retry", async () => {
    const firstInput = createInput();

    const firstResult =
      await executor.execute(firstInput);

    const retryInput = createInput();

    const retryResult =
      await executor.execute(retryInput);

    expect(retryResult).toEqual({
      ...firstResult,
      idempotentReplay: true
    });

    expect(
      retryInput.apply
    ).not.toHaveBeenCalled();
  });

  it("rejects reuse of commandId with different data", async () => {
    await executor.execute(
      createInput()
    );

    await expect(
      executor.execute(
        createInput({
          requestFingerprint:
            "open:2"
        })
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

  it("rejects an unknown auction call", async () => {
    await expect(
      executor.execute({
        ...createInput(),
        auctionCallId:
          "missing-auction-call"
      })
    ).rejects.toMatchObject({
      code: "AUCTION_CALL_NOT_FOUND"
    });
  });

  it("rolls back when command application fails", async () => {
    const input = createInput();

    input.apply.mockImplementationOnce(() => {
      throw new Error("Domain command failed");
    });

    await expect(
      executor.execute(input)
    ).rejects.toThrow(
      "Domain command failed"
    );

    const [session] = await db
      .select({
        stateVersion:
          auctionSessions.stateVersion
      })
      .from(auctionSessions);

    const [call] = await db
      .select({
        status: auctionCalls.status
      })
      .from(auctionCalls);

    const registeredCommands = await db
      .select()
      .from(commandRegistry);

    expect(session?.stateVersion).toBe(0);
    expect(call?.status).toBe("DRAFT");
    expect(registeredCommands).toHaveLength(0);
  });

  it("rolls back aggregate and state version when command registration fails", async () => {
    const auctionCallRepository =
      new SqliteAuctionCallRepository();

    const stateRepository =
      new SqliteAuctionSessionStateRepository();

    const registryRepository =
      new SqliteCommandRegistryRepository();

    const failingExecutor =
      new AtomicAuctionCommandExecutor(
        auctionCallRepository,
        stateRepository,
        registryRepository
      );

    const registrationError =
      new Error("Command registration failed");

    const createSpy = vi
      .spyOn(
        registryRepository,
        "createWithExecutor"
      )
      .mockImplementationOnce(() => {
        throw registrationError;
      });

    await expect(
      failingExecutor.execute(
        createInput()
      )
    ).rejects.toBe(
      registrationError
    );

    const [session] = await db
      .select({
        stateVersion:
          auctionSessions.stateVersion
      })
      .from(auctionSessions);

    const [call] = await db
      .select({
        status: auctionCalls.status,
        openingBid:
          auctionCalls.openingBid,
        currentBid:
          auctionCalls.currentBid
      })
      .from(auctionCalls);

    const registeredCommands = await db
      .select()
      .from(commandRegistry);

    expect(session?.stateVersion).toBe(0);

    expect(call).toEqual({
      status: "DRAFT",
      openingBid: null,
      currentBid: null
    });

    expect(registeredCommands).toHaveLength(0);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

});
