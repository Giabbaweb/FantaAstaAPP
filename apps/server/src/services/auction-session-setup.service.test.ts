import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  db,
  sqlite
} from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  leagues,
  teams
} from "../db/schema/index.js";
import {
  AuctionSessionSetupService,
  AuctionSessionSetupServiceError
} from "./auction-session-setup.service.js";

const service =
  new AuctionSessionSetupService();

afterEach(async () => {
  sqlite.exec(`
    DROP TRIGGER IF EXISTS
      test_fail_session_team_insert
  `);

  await db.delete(auctionSessionTeams);
  await db.delete(auctionSessions);
  await db.delete(teams);
  await db.delete(leagues);
});

async function createLeagueWithTeams(
  leagueId: string,
  teamNames: string[]
): Promise<void> {
  await db.insert(leagues).values({
    id: leagueId,
    name: `League ${leagueId}`,
    normalizedName:
      `league ${leagueId}`
  });

  if (teamNames.length === 0) {
    return;
  }

  await db.insert(teams).values(
    teamNames.map(
      (name, index) => ({
        id:
          `${leagueId}-team-${index + 1}`,
        leagueId,
        name
      })
    )
  );
}

describe(
  "AuctionSessionSetupService",
  () => {
    it(
      "creates a SETUP session with exactly 8 participating teams atomically",
      async () => {
        const leagueId =
          "league-session-setup";

        await createLeagueWithTeams(
          leagueId,
          [
            "Zulu",
            "Bravo",
            "Hotel",
            "Alpha",
            "Golf",
            "Charlie",
            "Foxtrot",
            "Delta"
          ]
        );

        const result =
          service.execute({
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 300,
            maximumInitialRosterEntries: 11
          });

        expect(
          result.session
        ).toEqual(
          expect.objectContaining({
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            status: "SETUP",
            suspensionReason: null,
            initialCredits: 300,
            maximumInitialRosterEntries: 11
          })
        );

        expect(
          result.sessionTeams
        ).toHaveLength(8);

        const persistedTeams =
          await db
            .select({
              id: teams.id,
              name: teams.name
            })
            .from(teams);

        const teamNameById =
          new Map(
            persistedTeams.map(
              (team) => [
                team.id,
                team.name
              ]
            )
          );

        expect(
          result.sessionTeams.map(
            (sessionTeam) => ({
              name:
                teamNameById.get(
                  sessionTeam.teamId
                ),
              tableOrder:
                sessionTeam.tableOrder,
              renewalCredits:
                sessionTeam.renewalCredits,
              remainingCredits:
                sessionTeam.remainingCredits
            })
          )
        ).toEqual([
          {
            name: "Alpha",
            tableOrder: 1,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            name: "Bravo",
            tableOrder: 2,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            name: "Charlie",
            tableOrder: 3,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            name: "Delta",
            tableOrder: 4,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            name: "Foxtrot",
            tableOrder: 5,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            name: "Golf",
            tableOrder: 6,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            name: "Hotel",
            tableOrder: 7,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            name: "Zulu",
            tableOrder: 8,
            renewalCredits: 0,
            remainingCredits: 300
          }
        ]);

        const persistedSessions =
          await db
            .select()
            .from(auctionSessions);

        const persistedSessionTeams =
          await db
            .select()
            .from(
              auctionSessionTeams
            );

        expect(
          persistedSessions
        ).toHaveLength(1);

        expect(
          persistedSessionTeams
        ).toHaveLength(8);
      }
    );

    it(
      "rejects creation when the league does not contain exactly 8 teams",
      async () => {
        const leagueId =
          "league-session-setup-seven";

        await createLeagueWithTeams(
          leagueId,
          [
            "Team 1",
            "Team 2",
            "Team 3",
            "Team 4",
            "Team 5",
            "Team 6",
            "Team 7"
          ]
        );

        expect(() =>
          service.execute({
            leagueId,
            season: "2026/2027",
            editionNumber: 1,
            initialCredits: 300,
            maximumInitialRosterEntries: 11
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INVALID_LEAGUE_TEAM_COUNT"
          })
        );

        expect(
          await db
            .select()
            .from(auctionSessions)
        ).toHaveLength(0);

        expect(
          await db
            .select()
            .from(
              auctionSessionTeams
            )
        ).toHaveLength(0);
      }
    );

    it(
      "rolls back the session when participant creation fails",
      async () => {
        const leagueId =
          "league-session-setup-rollback";

        await createLeagueWithTeams(
          leagueId,
          [
            "Alpha",
            "Bravo",
            "Charlie",
            "Delta",
            "Echo",
            "Foxtrot",
            "Golf",
            "Hotel"
          ]
        );

        sqlite.exec(`
          CREATE TRIGGER
            test_fail_session_team_insert
          BEFORE INSERT ON
            auction_session_teams
          WHEN NEW.table_order = 5
          BEGIN
            SELECT RAISE(
              ABORT,
              'forced session setup failure'
            );
          END;
        `);

        expect(() =>
          service.execute({
            leagueId,
            season: "2026/2027",
            editionNumber: 2,
            initialCredits: 300,
            maximumInitialRosterEntries: 11
          })
        ).toThrowError(
          AuctionSessionSetupServiceError
        );

        expect(
          await db
            .select()
            .from(auctionSessions)
        ).toHaveLength(0);

        expect(
          await db
            .select()
            .from(
              auctionSessionTeams
            )
        ).toHaveLength(0);
      }
    );
  }
);
