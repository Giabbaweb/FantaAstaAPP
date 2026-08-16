import {
  describe,
  expect,
  it
} from "vitest";

import type {
  Team
} from "@fantaastaapp/contracts";

import type {
  AuctionSessionTeamPersistenceRecord
} from "../repositories/auction-session-team.repository.js";
import {
  FmsSessionRosterExportService,
  FmsSessionRosterExportServiceError
} from "./fms-session-roster-export.service.js";

const sessionTeams:
  AuctionSessionTeamPersistenceRecord[] = [
    {
      id: "session-team-1",
      auctionSessionId: "session-1",
      teamId: "team-1",
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 100
    },
    {
      id: "session-team-2",
      auctionSessionId: "session-1",
      teamId: "team-2",
      tableOrder: 2,
      renewalCredits: 0,
      remainingCredits: 100
    }
  ];

const teams: Record<string, Team> = {
  "team-1": {
    id: "team-1",
    leagueId: "league-1",
    name: "Abbaweb",
    shortName: null,
    primaryColor: null,
    secondaryColor: null,
    logoPath: null,
    createdAt: "2026-08-16 00:00:00",
    updatedAt: "2026-08-16 00:00:00"
  },
  "team-2": {
    id: "team-2",
    leagueId: "league-1",
    name: "Team / Two",
    shortName: null,
    primaryColor: null,
    secondaryColor: null,
    logoPath: null,
    createdAt: "2026-08-16 00:00:00",
    updatedAt: "2026-08-16 00:00:00"
  }
};

function createService(input?: {
  availableTeams?: Record<string, Team>;
}) {
  const availableTeams =
    input?.availableTeams ?? teams;

  return new FmsSessionRosterExportService(
    {
      findByAuctionSessionIdWithExecutor:
        () => sessionTeams
    },
    {
      executeFile:
        (auctionSessionTeamId) => {
          const sessionTeam =
            sessionTeams.find(
              (item) =>
                item.id ===
                auctionSessionTeamId
            );

          if (!sessionTeam) {
            throw new Error(
              "Unexpected session team"
            );
          }

          return {
            content:
              `content-${sessionTeam.id}`,
            teamId:
              sessionTeam.teamId
          };
        }
    },
    {
      findById:
        async (teamId) =>
          availableTeams[teamId] ??
          null
    }
  );
}

describe(
  "FmsSessionRosterExportService",
  () => {
    it("builds ordered export files for all session teams", async () => {
      const service = createService();

      const result =
        await service.execute(
          "session-1"
        );

      expect(result).toEqual([
        {
          auctionSessionTeamId:
            "session-team-1",
          teamId:
            "team-1",
          tableOrder: 1,
          filename:
            "Abbaweb.txt",
          content:
            "content-session-team-1"
        },
        {
          auctionSessionTeamId:
            "session-team-2",
          teamId:
            "team-2",
          tableOrder: 2,
          filename:
            "Team _ Two.txt",
          content:
            "content-session-team-2"
        }
      ]);
    });

    it("rejects export when a team cannot be found", async () => {
      const service = createService({
        availableTeams: {
          "team-1": teams["team-1"]!
        }
      });

      await expect(
        service.execute(
          "session-1"
        )
      ).rejects.toEqual(
        expect.objectContaining({
          name:
            "FmsSessionRosterExportServiceError",
          code: "TEAM_NOT_FOUND"
        })
      );
    });

    it("uses the dedicated service error type for a missing team", async () => {
      const service = createService({
        availableTeams: {}
      });

      await expect(
        service.execute(
          "session-1"
        )
      ).rejects.toBeInstanceOf(
        FmsSessionRosterExportServiceError
      );
    });
  }
);
