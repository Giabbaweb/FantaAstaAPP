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

describe("SqliteAuctionSessionStateRepository", () => {
  const auctionSessionId = "session-state-1";

  let repository:
    SqliteAuctionSessionStateRepository;

  beforeEach(async () => {
    repository =
      new SqliteAuctionSessionStateRepository();

    await db.insert(leagues).values({
      id: "league-state-1",
      name: "League State 1",
      normalizedName: "league state 1"
    });

    await db.insert(auctionSessions).values({
      id: auctionSessionId,
      leagueId: "league-state-1",
      season: "2026/2027",
      editionNumber: 1,
      status: "RUNNING",
      suspensionReason: null,
      initialCredits: 330,
      stateVersion: 7
    });
  });

  it("reads the complete session state with a transaction executor", async () => {
    const result = db.transaction((tx) =>
      repository.findByAuctionSessionIdWithExecutor(
        tx,
        auctionSessionId
      )
    );

    expect(result).toEqual({
      auctionSessionId,
      status: "RUNNING",
      suspensionReason: null,
      stateVersion: 7
    });
  });

  it("ignores another ready session when looking for an operational session", async () => {
    await db.insert(leagues).values({
      id: "league-state-ready",
      name: "League State Ready",
      normalizedName:
        "league state ready"
    });

    await db.insert(auctionSessions).values({
      id: "session-state-ready",
      leagueId: "league-state-ready",
      season: "2026/2027",
      editionNumber: 2,
      status: "READY",
      suspensionReason: null,
      initialCredits: 300,
      stateVersion: 0
    });

    const result = db.transaction((tx) =>
      repository
        .findOperationalExcludingWithExecutor(
          tx,
          auctionSessionId
        )
    );

    expect(result).toBeNull();
  });

  it("finds another running or suspended operational session", async () => {
    await db.insert(leagues).values({
      id: "league-state-operational",
      name: "League State Operational",
      normalizedName:
        "league state operational"
    });

    await db.insert(auctionSessions).values({
      id: "session-state-operational",
      leagueId:
        "league-state-operational",
      season: "2026/2027",
      editionNumber: 3,
      status: "SUSPENDED",
      suspensionReason:
        "TECHNICAL_BREAK",
      initialCredits: 300,
      stateVersion: 4
    });

    const result = db.transaction((tx) =>
      repository
        .findOperationalExcludingWithExecutor(
          tx,
          auctionSessionId
        )
    );

    expect(result).toEqual({
      auctionSessionId:
        "session-state-operational",
      status: "SUSPENDED",
      suspensionReason:
        "TECHNICAL_BREAK",
      stateVersion: 4
    });
  });

  it("suspends the session and increments stateVersion atomically", async () => {
    const result =
      await repository.updateOperationalStateIfMatches(
        auctionSessionId,
        7,
        {
          status: "SUSPENDED",
          suspensionReason: "PIZZA_BREAK"
        }
      );

    expect(result).toEqual({
      auctionSessionId,
      status: "SUSPENDED",
      suspensionReason: "PIZZA_BREAK",
      stateVersion: 8
    });

    await expect(
      repository.findByAuctionSessionId(
        auctionSessionId
      )
    ).resolves.toEqual({
      auctionSessionId,
      status: "SUSPENDED",
      suspensionReason: "PIZZA_BREAK",
      stateVersion: 8
    });
  });

  it("resumes the session and clears the suspension reason atomically", async () => {
    await db
      .update(auctionSessions)
      .set({
        status: "SUSPENDED",
        suspensionReason: "PIZZA_BREAK",
        stateVersion: 8
      });

    const result =
      await repository.updateOperationalStateIfMatches(
        auctionSessionId,
        8,
        {
          status: "RUNNING",
          suspensionReason: null
        }
      );

    expect(result).toEqual({
      auctionSessionId,
      status: "RUNNING",
      suspensionReason: null,
      stateVersion: 9
    });

    await expect(
      repository.findByAuctionSessionId(
        auctionSessionId
      )
    ).resolves.toEqual({
      auctionSessionId,
      status: "RUNNING",
      suspensionReason: null,
      stateVersion: 9
    });
  });

  it("reopens a closed session as completed and increments stateVersion atomically", async () => {
    await db
      .update(auctionSessions)
      .set({
        status: "CLOSED",
        suspensionReason: null,
        stateVersion: 8
      });

    const result =
      await repository.updateOperationalStateIfMatches(
        auctionSessionId,
        8,
        {
          status: "COMPLETED",
          suspensionReason: null
        }
      );

    expect(result).toEqual({
      auctionSessionId,
      status: "COMPLETED",
      suspensionReason: null,
      stateVersion: 9
    });

    await expect(
      repository.findByAuctionSessionId(
        auctionSessionId
      )
    ).resolves.toEqual({
      auctionSessionId,
      status: "COMPLETED",
      suspensionReason: null,
      stateVersion: 9
    });
  });

  it("does not change operational state from a stale version", async () => {
    const result =
      await repository.updateOperationalStateIfMatches(
        auctionSessionId,
        6,
        {
          status: "SUSPENDED",
          suspensionReason: "TECHNICAL_BREAK"
        }
      );

    expect(result).toBeNull();

    await expect(
      repository.findByAuctionSessionId(
        auctionSessionId
      )
    ).resolves.toEqual({
      auctionSessionId,
      status: "RUNNING",
      suspensionReason: null,
      stateVersion: 7
    });
  });
});
