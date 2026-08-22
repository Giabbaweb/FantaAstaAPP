import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionCalls,
  auctionCallTeams,
  auctionEvents,
  auctionSessions,
  auctionSessionTeams,
  commandRegistry,
  fmsExportGoalkeepers,
  leagues,
  players,
  rosterEntries,
  teams
} from "../db/schema/index.js";
import {
  DevelopmentSessionResetError,
  DevelopmentSessionResetService
} from "./development-session-reset.service.js";

const leagueId =
  "league-development-reset-test";
const sessionId =
  "session-development-reset-test";
const teamId =
  "team-development-reset-test";
const sessionTeamId =
  "session-team-development-reset-test";
const playerId =
  "player-development-reset-test";
const rosterEntryId =
  "roster-development-reset-test";
const auctionCallId =
  "call-development-reset-test";
const auctionCallTeamId =
  "call-team-development-reset-test";
const commandId =
  "command-development-reset-test";
const eventId =
  "event-development-reset-test";
const goalkeeperSelectionId =
  "goalkeeper-development-reset-test";

const service =
  new DevelopmentSessionResetService();

async function createBaseFixture(
  status:
    | "SETUP"
    | "READY"
    | "RUNNING"
    | "SUSPENDED"
    | "COMPLETED"
    | "CLOSED" = "COMPLETED"
): Promise<void> {
  await db.insert(leagues).values({
    id: leagueId,
    name: "Development Reset League",
    normalizedName:
      "development reset league"
  });

  await db.insert(auctionSessions).values({
    id: sessionId,
    leagueId,
    season: "2026/2027",
    editionNumber: 93,
    status,
    suspensionReason:
      status === "SUSPENDED"
        ? "TECHNICAL_BREAK"
        : null,
    initialCredits: 300,
    stateVersion: 7
  });

  await db.insert(teams).values({
    id: teamId,
    leagueId,
    name: "Development Reset Team"
  });

  await db
    .insert(auctionSessionTeams)
    .values({
      id: sessionTeamId,
      auctionSessionId: sessionId,
      teamId,
      tableOrder: 1,
      renewalCredits: 17,
      remainingCredits: 121,
      accessPinHash: "keep-me"
    });

  await db.insert(players).values({
    id: playerId,
    auctionSessionId: sessionId,
    fmsCode: "DEV-RESET-001",
    name: "Development Reset Player",
    normalizedName:
      "development reset player",
    realTeamName: "Inter",
    role: "P",
    availabilityStatus: "ROSTERED"
  });

  await db.insert(rosterEntries).values({
    id: rosterEntryId,
    auctionSessionTeamId:
      sessionTeamId,
    playerId,
    acquisitionCost: 42,
    contractYear: 1,
    source: "AUCTION"
  });

  await db.insert(auctionCalls).values({
    id: auctionCallId,
    auctionSessionId: sessionId,
    playerId,
    callerAuctionSessionTeamId:
      sessionTeamId,
    status: "CONFIRMED",
    openingBid: 1,
    currentBid: 42,
    currentLeaderAuctionSessionTeamId:
      sessionTeamId,
    provisionalWinnerAuctionSessionTeamId:
      sessionTeamId
  });

  await db
    .insert(auctionCallTeams)
    .values({
      id: auctionCallTeamId,
      auctionCallId,
      auctionSessionTeamId:
        sessionTeamId,
      status: "ACTIVE",
      maximumBid: 121
    });

  await db
    .insert(commandRegistry)
    .values({
      id: commandId,
      auctionSessionId: sessionId,
      commandScope: "AUCTION_CALL",
      auctionCallId,
      commandId:
        "development-reset-command",
      commandType: "CONFIRM",
      expectedStateVersion: 6,
      resultStateVersion: 7,
      requestFingerprint:
        "development-reset",
      resultPayload: "{}"
    });

  await db.insert(auctionEvents).values({
    id: eventId,
    auctionSessionId: sessionId,
    auctionCallId,
    eventType:
      "AUCTION_AWARD_CONFIRMED",
    auctionSessionTeamId:
      sessionTeamId,
    playerId,
    amount: 42,
    creditsBefore: 163,
    creditsAfter: 121
  });

  await db
    .insert(fmsExportGoalkeepers)
    .values({
      id: goalkeeperSelectionId,
      auctionSessionTeamId:
        sessionTeamId,
      playerId
    });
}

async function cleanupFixture():
  Promise<void> {
  await db
    .delete(auctionEvents)
    .where(
      eq(
        auctionEvents.auctionSessionId,
        sessionId
      )
    );

  await db
    .delete(commandRegistry)
    .where(
      eq(
        commandRegistry.auctionSessionId,
        sessionId
      )
    );

  await db
    .delete(auctionCalls)
    .where(
      eq(
        auctionCalls.auctionSessionId,
        sessionId
      )
    );

  await db
    .delete(fmsExportGoalkeepers)
    .where(
      eq(
        fmsExportGoalkeepers
          .auctionSessionTeamId,
        sessionTeamId
      )
    );

  await db
    .delete(rosterEntries)
    .where(
      eq(
        rosterEntries
          .auctionSessionTeamId,
        sessionTeamId
      )
    );

  await db
    .delete(players)
    .where(
      eq(
        players.auctionSessionId,
        sessionId
      )
    );

  await db
    .delete(auctionSessionTeams)
    .where(
      eq(
        auctionSessionTeams
          .auctionSessionId,
        sessionId
      )
    );

  await db
    .delete(teams)
    .where(eq(teams.id, teamId));

  await db
    .delete(auctionSessions)
    .where(
      eq(
        auctionSessions.id,
        sessionId
      )
    );

  await db
    .delete(leagues)
    .where(eq(leagues.id, leagueId));
}

afterEach(async () => {
  await cleanupFixture();
});

describe(
  "DevelopmentSessionResetService",
  () => {
    it(
      "returns a completed test session to a clean SETUP baseline",
      async () => {
        await createBaseFixture(
          "COMPLETED"
        );

        const result =
          await service.reset(
            sessionId
          );

        expect(result).toEqual({
          auctionSessionId: sessionId,
          status: "SETUP",
          stateVersion: 0,
          deletedAuctionEvents: 1,
          deletedCommands: 1,
          deletedAuctionCalls: 1,
          deletedFmsExportGoalkeepers: 1,
          deletedRosterEntries: 1,
          deletedPlayers: 1,
          resetAuctionSessionTeams: 1
        });

        expect(
          await db
            .select()
            .from(auctionEvents)
            .where(
              eq(
                auctionEvents
                  .auctionSessionId,
                sessionId
              )
            )
        ).toHaveLength(0);

        expect(
          await db
            .select()
            .from(commandRegistry)
            .where(
              eq(
                commandRegistry
                  .auctionSessionId,
                sessionId
              )
            )
        ).toHaveLength(0);

        expect(
          await db
            .select()
            .from(auctionCalls)
            .where(
              eq(
                auctionCalls
                  .auctionSessionId,
                sessionId
              )
            )
        ).toHaveLength(0);

        expect(
          await db
            .select()
            .from(auctionCallTeams)
            .where(
              eq(
                auctionCallTeams
                  .auctionSessionTeamId,
                sessionTeamId
              )
            )
        ).toHaveLength(0);

        expect(
          await db
            .select()
            .from(fmsExportGoalkeepers)
            .where(
              eq(
                fmsExportGoalkeepers
                  .auctionSessionTeamId,
                sessionTeamId
              )
            )
        ).toHaveLength(0);

        expect(
          await db
            .select()
            .from(rosterEntries)
            .where(
              eq(
                rosterEntries
                  .auctionSessionTeamId,
                sessionTeamId
              )
            )
        ).toHaveLength(0);

        expect(
          await db
            .select()
            .from(players)
            .where(
              eq(
                players.auctionSessionId,
                sessionId
              )
            )
        ).toHaveLength(0);

        const [storedSession] =
          await db
            .select()
            .from(auctionSessions)
            .where(
              eq(
                auctionSessions.id,
                sessionId
              )
            );

        expect(storedSession).toMatchObject({
          status: "SETUP",
          suspensionReason: null,
          stateVersion: 0,
          initialCredits: 300
        });

        const [storedSessionTeam] =
          await db
            .select()
            .from(auctionSessionTeams)
            .where(
              eq(
                auctionSessionTeams.id,
                sessionTeamId
              )
            );

        expect(storedSessionTeam).toMatchObject({
          tableOrder: 1,
          renewalCredits: 17,
          remainingCredits: 300,
          accessPinHash: "keep-me"
        });
      }
    );

    it.each([
      "SETUP",
      "READY",
      "RUNNING",
      "SUSPENDED",
      "COMPLETED"
    ] as const)(
      "allows development reset from %s",
      async (status) => {
        await createBaseFixture(status);

        const result =
          await service.reset(
            sessionId
          );

        expect(result.status).toBe(
          "SETUP"
        );

        const [storedSession] =
          await db
            .select()
            .from(auctionSessions)
            .where(
              eq(
                auctionSessions.id,
                sessionId
              )
            );

        expect(
          storedSession?.status
        ).toBe("SETUP");

        expect(
          storedSession?.stateVersion
        ).toBe(0);
      }
    );

    it(
      "rejects reset from CLOSED without changing the session",
      async () => {
        await createBaseFixture(
          "CLOSED"
        );

        await expect(
          service.reset(sessionId)
        ).rejects.toMatchObject({
          code:
            "AUCTION_SESSION_CLOSED"
        });

        const [storedSession] =
          await db
            .select()
            .from(auctionSessions)
            .where(
              eq(
                auctionSessions.id,
                sessionId
              )
            );

        expect(storedSession).toMatchObject({
          status: "CLOSED",
          stateVersion: 7
        });

        expect(
          await db
            .select()
            .from(players)
            .where(
              eq(
                players.auctionSessionId,
                sessionId
              )
            )
        ).toHaveLength(1);
      }
    );

    it(
      "rejects a missing session",
      async () => {
        await expect(
          service.reset(
            "missing-development-session"
          )
        ).rejects.toMatchObject({
          code:
            "AUCTION_SESSION_NOT_FOUND"
        });
      }
    );
  }
);
