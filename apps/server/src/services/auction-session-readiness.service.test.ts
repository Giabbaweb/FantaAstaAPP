import {
  describe,
  expect,
  it
} from "vitest";

import type {
  AuctionSessionReadinessRepository,
  AuctionSessionReadinessSnapshot
} from "../repositories/auction-session-readiness.repository.js";

import {
  AuctionSessionReadinessService
} from "./auction-session-readiness.service.js";

function createValidSnapshot():
  AuctionSessionReadinessSnapshot {
  const sessionTeams =
    Array.from(
      {
        length: 8
      },
      (
        _value,
        index
      ) => ({
        id:
          `session-team-${index + 1}`,
        teamId:
          `team-${index + 1}`,
        tableOrder:
          index + 1
      })
    );

  return {
    session: {
      id: "session-1",
      status: "SETUP",
      initialCredits: 300,
      maximumInitialRosterEntries: 11
    },
    sessionTeams,
    teamOwnerTeamIds:
      sessionTeams.map(
        (record) =>
          record.teamId
      ),
    playerCount: 719,
    rosterEntrySessionTeamIds:
      sessionTeams.flatMap(
        (record) =>
          Array.from(
            {
              length: 10
            },
            () => record.id
          )
      )
  };
}

class FakeRepository
  implements AuctionSessionReadinessRepository
{
  constructor(
    private readonly snapshot:
      AuctionSessionReadinessSnapshot
  ) {}

  async inspect():
    Promise<AuctionSessionReadinessSnapshot> {
    return structuredClone(
      this.snapshot
    );
  }
}

function createService(
  snapshot:
    AuctionSessionReadinessSnapshot
): AuctionSessionReadinessService {
  return new AuctionSessionReadinessService(
    new FakeRepository(snapshot)
  );
}

function checkOk(
  result:
    Awaited<
      ReturnType<
        AuctionSessionReadinessService[
          "getReadiness"
        ]
      >
    >,
  code: string
): boolean | undefined {
  return result
    ?.checks.find(
      (check) =>
        check.code === code
    )
    ?.ok;
}

describe(
  "AuctionSessionReadinessService",
  () => {
    it(
      "reports a fully configured session as ready",
      async () => {
        const result =
          await createService(
            createValidSnapshot()
          ).getReadiness(
            "session-1"
          );

        expect(result?.ready)
          .toBe(true);

        expect(
          result?.checks.every(
            (check) => check.ok
          )
        ).toBe(true);
      }
    );

    it(
      "requires at least eight teams",
      async () => {
        const snapshot =
          createValidSnapshot();

        snapshot.sessionTeams =
          snapshot.sessionTeams
            .slice(0, 7);

        const result =
          await createService(
            snapshot
          ).getReadiness(
            "session-1"
          );

        expect(result?.ready)
          .toBe(false);

        expect(
          checkOk(
            result,
            "MINIMUM_TEAMS_CONFIGURED"
          )
        ).toBe(false);
      }
    );

    it(
      "requires an owner for every participating team",
      async () => {
        const snapshot =
          createValidSnapshot();

        snapshot.teamOwnerTeamIds =
          snapshot.teamOwnerTeamIds
            .slice(0, 7);

        const result =
          await createService(
            snapshot
          ).getReadiness(
            "session-1"
          );

        expect(
          checkOk(
            result,
            "TEAM_OWNERS_CONFIGURED"
          )
        ).toBe(false);
      }
    );

    it(
      "requires a continuous table order",
      async () => {
        const snapshot =
          createValidSnapshot();

        snapshot.sessionTeams[7] = {
          id: "session-team-8",
          teamId: "team-8",
          tableOrder: 9
        };

        const result =
          await createService(
            snapshot
          ).getReadiness(
            "session-1"
          );

        expect(
          checkOk(
            result,
            "TABLE_ORDER_VALID"
          )
        ).toBe(false);
      }
    );

    it(
      "requires a player archive",
      async () => {
        const snapshot =
          createValidSnapshot();

        snapshot.playerCount = 0;

        const result =
          await createService(
            snapshot
          ).getReadiness(
            "session-1"
          );

        expect(
          checkOk(
            result,
            "PLAYER_ARCHIVE_AVAILABLE"
          )
        ).toBe(false);
      }
    );

    it(
      "allows a team to have zero initial roster entries",
      async () => {
        const snapshot =
          createValidSnapshot();

        snapshot.rosterEntrySessionTeamIds =
          snapshot
            .rosterEntrySessionTeamIds
            .filter(
              (sessionTeamId) =>
                sessionTeamId !==
                "session-team-8"
            );

        const result =
          await createService(
            snapshot
          ).getReadiness(
            "session-1"
          );

        expect(
          checkOk(
            result,
            "INITIAL_ROSTERS_WITHIN_LIMIT"
          )
        ).toBe(true);
      }
    );

    it(
      "rejects an initial roster above the configured limit",
      async () => {
        const snapshot =
          createValidSnapshot();

        snapshot
          .rosterEntrySessionTeamIds
          .push(
            "session-team-1",
            "session-team-1"
          );

        const result =
          await createService(
            snapshot
          ).getReadiness(
            "session-1"
          );

        expect(
          checkOk(
            result,
            "INITIAL_ROSTERS_WITHIN_LIMIT"
          )
        ).toBe(false);
      }
    );

    it(
      "returns null for a missing session",
      async () => {
        const snapshot =
          createValidSnapshot();

        snapshot.session = null;

        const result =
          await createService(
            snapshot
          ).getReadiness(
            "missing"
          );

        expect(result).toBeNull();
      }
    );
  }
);
