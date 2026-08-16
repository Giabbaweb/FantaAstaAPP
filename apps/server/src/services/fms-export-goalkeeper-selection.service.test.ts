import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  eq
} from "drizzle-orm";

import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  fmsExportGoalkeepers,
  leagues,
  players,
  rosterEntries,
  teams
} from "../db/schema/index.js";
import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import {
  SqliteAuctionSessionTeamRepository
} from "../repositories/auction-session-team.repository.js";
import {
  SqliteFmsExportGoalkeeperRepository
} from "../repositories/fms-export-goalkeeper.repository.js";
import {
  SqlitePlayerRepository
} from "../repositories/player.repository.js";
import {
  SqliteRosterEntryRepository
} from "../repositories/roster-entry.repository.js";
import {
  FmsExportGoalkeeperSelectionService
} from "./fms-export-goalkeeper-selection.service.js";

const service =
  new FmsExportGoalkeeperSelectionService(
    new SqliteAuctionSessionRepository(),
    new SqliteAuctionSessionTeamRepository(),
    new SqlitePlayerRepository(),
    new SqliteRosterEntryRepository(),
    new SqliteFmsExportGoalkeeperRepository()
  );

async function seedSession(
  suffix: string
): Promise<{
  sessionId: string;
  sessionTeamId: string;
}> {
  const leagueId =
    `league-fms-goalkeeper-selection-${suffix}`;
  const sessionId =
    `session-fms-goalkeeper-selection-${suffix}`;
  const teamId =
    `team-fms-goalkeeper-selection-${suffix}`;
  const sessionTeamId =
    `session-team-fms-goalkeeper-selection-${suffix}`;

  await db.insert(leagues).values({
    id: leagueId,
    name:
      `FMS Goalkeeper Selection ${suffix}`,
    normalizedName:
      `fms goalkeeper selection ${suffix}`
  });

  await db.insert(auctionSessions).values({
    id: sessionId,
    leagueId,
    season: "2026/2027",
    editionNumber:
      suffix === "same-club" ? 61 : 62,
    initialCredits: 300,
    status: "COMPLETED"
  });

  await db.insert(teams).values({
    id: teamId,
    leagueId,
    name: `Team ${suffix}`
  });

  await db
    .insert(auctionSessionTeams)
    .values({
      id: sessionTeamId,
      auctionSessionId: sessionId,
      teamId,
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 100
    });

  return {
    sessionId,
    sessionTeamId
  };
}

async function addRosterGoalkeeper(
  input: {
    sessionId: string;
    sessionTeamId: string;
    id: string;
    realTeamName: string;
  }
): Promise<void> {
  await db.insert(players).values({
    id: input.id,
    auctionSessionId: input.sessionId,
    fmsCode: input.id,
    name: input.id,
    normalizedName:
      input.id.toLocaleLowerCase("it-IT"),
    realTeamName:
      input.realTeamName,
    role: "P",
    availabilityStatus: "ROSTERED"
  });

  await db.insert(rosterEntries).values({
    id: `roster-${input.id}`,
    auctionSessionTeamId:
      input.sessionTeamId,
    playerId: input.id,
    acquisitionCost: 1,
    contractYear: 1,
    source: "AUCTION"
  });
}

async function addCandidateGoalkeeper(
  input: {
    sessionId: string;
    id: string;
    realTeamName: string;
  }
): Promise<void> {
  await db.insert(players).values({
    id: input.id,
    auctionSessionId: input.sessionId,
    fmsCode: input.id,
    name: input.id,
    normalizedName:
      input.id.toLocaleLowerCase("it-IT"),
    realTeamName:
      input.realTeamName,
    role: "P",
    availabilityStatus: "AVAILABLE"
  });
}

afterEach(async () => {
  await db.delete(fmsExportGoalkeepers);
  await db.delete(rosterEntries);
  await db.delete(players);
  await db.delete(auctionSessionTeams);
  await db.delete(teams);
  await db.delete(auctionSessions);
  await db.delete(leagues);
});

describe(
  "FmsExportGoalkeeperSelectionService",
  () => {
    it("selects a goalkeeper from the same real team when both roster goalkeepers share it", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedSession(
        "same-club"
      );

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-milan-1",
        realTeamName: "Milan"
      });

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-milan-2",
        realTeamName: "Milan"
      });

      await addCandidateGoalkeeper({
        sessionId,
        id: "goalkeeper-milan-3",
        realTeamName: "Milan"
      });

      const result = service.select(
        sessionTeamId,
        "goalkeeper-milan-3"
      );

      expect(result).toEqual(
        expect.objectContaining({
          auctionSessionTeamId:
            sessionTeamId,
          playerId:
            "goalkeeper-milan-3"
        })
      );
    });

    it("selects a goalkeeper from either allowed real team when roster goalkeepers differ", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedSession(
        "different-clubs"
      );

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-milan",
        realTeamName: "Milan"
      });

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-inter",
        realTeamName: "Inter"
      });

      await addCandidateGoalkeeper({
        sessionId,
        id: "goalkeeper-inter-extra",
        realTeamName: "Inter"
      });

      const result = service.select(
        sessionTeamId,
        "goalkeeper-inter-extra"
      );

      expect(result).toEqual(
        expect.objectContaining({
          auctionSessionTeamId:
            sessionTeamId,
          playerId:
            "goalkeeper-inter-extra"
        })
      );
    });
    it("rejects a candidate that is not a goalkeeper", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedSession(
        "not-goalkeeper"
      );

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-a",
        realTeamName: "Milan"
      });

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-b",
        realTeamName: "Milan"
      });

      await db.insert(players).values({
        id: "candidate-defender",
        auctionSessionId: sessionId,
        fmsCode: "candidate-defender",
        name: "CANDIDATE DEFENDER",
        normalizedName:
          "candidate defender",
        realTeamName: "Milan",
        role: "D",
        availabilityStatus:
          "AVAILABLE"
      });

      expect(() =>
        service.select(
          sessionTeamId,
          "candidate-defender"
        )
      ).toThrowError(
        expect.objectContaining({
          code:
            "PLAYER_NOT_GOALKEEPER"
        })
      );
    });

    it("rejects a goalkeeper that already belongs to a roster", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedSession(
        "already-rostered"
      );

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-a",
        realTeamName: "Milan"
      });

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-b",
        realTeamName: "Milan"
      });

      await addCandidateGoalkeeper({
        sessionId,
        id: "goalkeeper-rostered",
        realTeamName: "Milan"
      });

      await db.insert(rosterEntries).values({
        id: "roster-goalkeeper-rostered",
        auctionSessionTeamId:
          sessionTeamId,
        playerId:
          "goalkeeper-rostered",
        acquisitionCost: 1,
        contractYear: 1,
        source: "AUCTION"
      });

      expect(() =>
        service.select(
          sessionTeamId,
          "goalkeeper-rostered"
        )
      ).toThrowError(
        expect.objectContaining({
          code:
            "PLAYER_ALREADY_ROSTERED"
        })
      );
    });

    it("rejects a goalkeeper already selected by another auction session team", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedSession(
        "already-selected"
      );

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-a",
        realTeamName: "Milan"
      });

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-b",
        realTeamName: "Milan"
      });

      await addCandidateGoalkeeper({
        sessionId,
        id: "goalkeeper-selected",
        realTeamName: "Milan"
      });

      const secondTeamId =
        "team-fms-goalkeeper-selection-second";
      const secondSessionTeamId =
        "session-team-fms-goalkeeper-selection-second";

      await db.insert(teams).values({
        id: secondTeamId,
        leagueId:
          "league-fms-goalkeeper-selection-already-selected",
        name: "Second Team"
      });

      await db
        .insert(auctionSessionTeams)
        .values({
          id: secondSessionTeamId,
          auctionSessionId: sessionId,
          teamId: secondTeamId,
          tableOrder: 2,
          renewalCredits: 0,
          remainingCredits: 100
        });

      await db
        .insert(fmsExportGoalkeepers)
        .values({
          id:
            "fms-export-goalkeeper-existing",
          auctionSessionTeamId:
            secondSessionTeamId,
          playerId:
            "goalkeeper-selected"
        });

      expect(() =>
        service.select(
          sessionTeamId,
          "goalkeeper-selected"
        )
      ).toThrowError(
        expect.objectContaining({
          code:
            "PLAYER_ALREADY_SELECTED"
        })
      );
    });

    it("rejects a goalkeeper from a real team not represented by the roster goalkeepers", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedSession(
        "invalid-real-team"
      );

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-milan",
        realTeamName: "Milan"
      });

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-inter",
        realTeamName: "Inter"
      });

      await addCandidateGoalkeeper({
        sessionId,
        id: "goalkeeper-juventus",
        realTeamName: "Juventus"
      });

      expect(() =>
        service.select(
          sessionTeamId,
          "goalkeeper-juventus"
        )
      ).toThrowError(
        expect.objectContaining({
          code:
            "INVALID_GOALKEEPER_REAL_TEAM"
        })
      );
    });

    it("rejects selection when the auction session is not selectable", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedSession(
        "running-session"
      );

      await db
        .update(auctionSessions)
        .set({
          status: "RUNNING"
        })
        .where(
          eq(
            auctionSessions.id,
            sessionId
          )
        );

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-running-a",
        realTeamName: "Milan"
      });

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-running-b",
        realTeamName: "Milan"
      });

      await addCandidateGoalkeeper({
        sessionId,
        id: "goalkeeper-running-c",
        realTeamName: "Milan"
      });

      expect(() =>
        service.select(
          sessionTeamId,
          "goalkeeper-running-c"
        )
      ).toThrowError(
        expect.objectContaining({
          code:
            "AUCTION_SESSION_NOT_SELECTABLE"
        })
      );
    });

    it("rejects a roster that does not contain exactly two valid goalkeepers", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedSession(
        "invalid-roster-goalkeepers"
      );

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-only-one",
        realTeamName: "Milan"
      });

      await addCandidateGoalkeeper({
        sessionId,
        id: "goalkeeper-candidate",
        realTeamName: "Milan"
      });

      expect(() =>
        service.select(
          sessionTeamId,
          "goalkeeper-candidate"
        )
      ).toThrowError(
        expect.objectContaining({
          code:
            "ROSTER_GOALKEEPERS_INVALID"
        })
      );
    });

    it("updates the existing selection for the same auction session team", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedSession(
        "update-selection"
      );

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-update-a",
        realTeamName: "Milan"
      });

      await addRosterGoalkeeper({
        sessionId,
        sessionTeamId,
        id: "goalkeeper-update-b",
        realTeamName: "Milan"
      });

      await addCandidateGoalkeeper({
        sessionId,
        id: "goalkeeper-update-first",
        realTeamName: "Milan"
      });

      await addCandidateGoalkeeper({
        sessionId,
        id: "goalkeeper-update-second",
        realTeamName: "Milan"
      });

      const first =
        service.select(
          sessionTeamId,
          "goalkeeper-update-first"
        );

      const second =
        service.select(
          sessionTeamId,
          "goalkeeper-update-second"
        );

      expect(second.id).toBe(first.id);

      expect(second).toEqual(
        expect.objectContaining({
          auctionSessionTeamId:
            sessionTeamId,
          playerId:
            "goalkeeper-update-second"
        })
      );

      const stored =
        await db
          .select()
          .from(fmsExportGoalkeepers);

      expect(stored).toHaveLength(1);
    });

  }
);
