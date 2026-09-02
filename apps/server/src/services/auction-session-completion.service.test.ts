import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  PlayerRole
} from "@fantaastaapp/contracts";

import {
  AuctionSessionCompletionError,
  AuctionSessionCompletionService
} from "./auction-session-completion.service.js";

const completeRoles: PlayerRole[] = [
  "P", "P",
  "D", "D", "D", "D",
  "D", "D", "D", "D",
  "C", "C", "C", "C",
  "C", "C", "C", "C",
  "A", "A", "A",
  "A", "A", "A"
];

function createSessionTeams() {
  return Array.from(
    { length: 8 },
    (_, index) => ({
      id: `session-team-${index + 1}`
    })
  );
}

function createService(options?: {
  operationalCall?: boolean;
  incompleteTeamIndex?: number;
}) {
  const sessionTeams =
    createSessionTeams();

  const rosterByTeam =
    new Map<string, Array<{
      id: string;
      playerId: string;
    }>>();

  const playersById =
    new Map<string, {
      id: string;
      role: PlayerRole;
    }>();

  sessionTeams.forEach(
    (team, teamIndex) => {
      const roles =
        options?.incompleteTeamIndex ===
        teamIndex
          ? completeRoles.slice(0, -1)
          : completeRoles;

      const entries =
        roles.map(
          (role, playerIndex) => {
            const playerId =
              `${team.id}-player-${playerIndex + 1}`;

            playersById.set(
              playerId,
              {
                id: playerId,
                role
              }
            );

            return {
              id:
                `${team.id}-entry-${playerIndex + 1}`,
              playerId
            };
          }
        );

      rosterByTeam.set(
        team.id,
        entries
      );
    }
  );

  const auctionSessionTeamRepository = {
    findByAuctionSessionId:
      vi.fn().mockResolvedValue(
        sessionTeams
      )
  };

  const rosterEntryRepository = {
    findByAuctionSessionTeamIdWithExecutor:
      vi.fn(
        (
          _executor: unknown,
          auctionSessionTeamId: string
        ) =>
          rosterByTeam.get(
            auctionSessionTeamId
          ) ?? []
      )
  };

  const playerRepository = {
    findByIdsWithExecutor:
      vi.fn(
        (
          _executor: unknown,
          ids: string[]
        ) =>
          ids.map(
            (id) =>
              playersById.get(id)!
          )
      )
  };

  const auctionCallRepository = {
    findOperationalByAuctionSessionId:
      vi.fn().mockResolvedValue(
        options?.operationalCall
          ? {
              call: {
                id: "operational-call"
              },
              teams: []
            }
          : null
      )
  };

  const service =
    new AuctionSessionCompletionService(
      auctionSessionTeamRepository as never,
      rosterEntryRepository as never,
      playerRepository as never,
      auctionCallRepository as never
    );

  return {
    service,
    auctionSessionTeamRepository,
    rosterEntryRepository
  };
}

describe(
  "AuctionSessionCompletionService",
  () => {
    it(
      "rejects completion when an operational auction call exists",
      async () => {
        const {
          service,
          auctionSessionTeamRepository
        } = createService({
          operationalCall: true
        });

        await expect(
          service.assertCanComplete(
            "session-1"
          )
        ).rejects.toMatchObject({
          code:
            "OPERATIONAL_AUCTION_CALL_EXISTS"
        });

        expect(
          auctionSessionTeamRepository
            .findByAuctionSessionId
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects completion when any roster is incomplete",
      async () => {
        const {
          service
        } = createService({
          incompleteTeamIndex: 4
        });

        await expect(
          service.assertCanComplete(
            "session-1"
          )
        ).rejects.toMatchObject({
          code:
            "AUCTION_SESSION_ROSTERS_INCOMPLETE"
        });
      }
    );

    it(
      "allows completion when there is no operational call and every roster is complete",
      async () => {
        const {
          service
        } = createService();

        await expect(
          service.assertCanComplete(
            "session-1"
          )
        ).resolves.toBeUndefined();
      }
    );

    it(
      "uses the dedicated completion error type",
      () => {
        const error =
          new AuctionSessionCompletionError(
            "AUCTION_SESSION_ROSTERS_INCOMPLETE",
            "Incomplete rosters"
          );

        expect(error).toBeInstanceOf(
          AuctionSessionCompletionError
        );
        expect(error.code).toBe(
          "AUCTION_SESSION_ROSTERS_INCOMPLETE"
        );
      }
    );
  }
);
