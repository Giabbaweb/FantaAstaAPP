import {
  describe,
  expect,
  it
} from "vitest";

import type {
  AuctionSessionTeam,
  CreateAuctionSessionTeamInput,
  UpdateAuctionSessionTeamInput
} from "@fantaastaapp/contracts";

import type {
  AuctionSessionTeamRepository
} from "../repositories/auction-session-team.repository.js";
import {
  AuctionSessionTeamService
} from "./auction-session-team.service.js";

class InMemoryAuctionSessionTeamRepository
  implements AuctionSessionTeamRepository
{
  constructor(
    private records:
      AuctionSessionTeam[]
  ) {}

  async findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionSessionTeam[]> {
    return this.records
      .filter(
        (record) =>
          record.auctionSessionId ===
          auctionSessionId
      )
      .sort(
        (left, right) =>
          left.tableOrder -
          right.tableOrder
      );
  }

  async findOne(
    auctionSessionId: string,
    teamId: string
  ): Promise<AuctionSessionTeam | null> {
    return (
      this.records.find(
        (record) =>
          record.auctionSessionId ===
            auctionSessionId &&
          record.teamId === teamId
      ) ?? null
    );
  }

  async create(
    auctionSessionId: string,
    input: CreateAuctionSessionTeamInput
  ): Promise<AuctionSessionTeam> {
    const record: AuctionSessionTeam = {
      id: `session-team-${input.teamId}`,
      auctionSessionId,
      teamId: input.teamId,
      tableOrder: input.tableOrder,
      renewalCredits:
        input.renewalCredits,
      remainingCredits:
        input.remainingCredits
    };

    this.records.push(record);

    return record;
  }

  async update(
    auctionSessionId: string,
    teamId: string,
    input: UpdateAuctionSessionTeamInput
  ): Promise<AuctionSessionTeam | null> {
    const existing =
      await this.findOne(
        auctionSessionId,
        teamId
      );

    if (!existing) {
      return null;
    }

    const updated: AuctionSessionTeam = {
      ...existing,
      tableOrder:
        input.tableOrder ??
        existing.tableOrder,
      renewalCredits:
        input.renewalCredits ??
        existing.renewalCredits,
      remainingCredits:
        input.remainingCredits ??
        existing.remainingCredits
    };

    this.records =
      this.records.map(
        (record) =>
          record.auctionSessionId ===
              auctionSessionId &&
          record.teamId === teamId
            ? updated
            : record
      );

    return updated;
  }

  async reorder(
    auctionSessionId: string,
    teamIds: string[]
  ): Promise<AuctionSessionTeam[]> {
    this.records =
      this.records.map(
        (record) => {
          if (
            record.auctionSessionId !==
            auctionSessionId
          ) {
            return record;
          }

          const index =
            teamIds.indexOf(
              record.teamId
            );

          return {
            ...record,
            tableOrder:
              index + 1
          };
        }
      );

    return this.findByAuctionSessionId(
      auctionSessionId
    );
  }

  async delete(
    auctionSessionId: string,
    teamId: string
  ): Promise<boolean> {
    const before =
      this.records.length;

    this.records =
      this.records.filter(
        (record) =>
          !(
            record.auctionSessionId ===
              auctionSessionId &&
            record.teamId === teamId
          )
      );

    return (
      this.records.length <
      before
    );
  }
}

class InMemoryAuctionSessionRepository {
  constructor(
    private readonly status:
      "SETUP" |
      "READY" |
      "RUNNING" |
      "SUSPENDED" |
      "COMPLETED" |
      "CLOSED"
  ) {}

  async findById(id: string) {
    return {
      id,
      leagueId: "league-reorder",
      season: "2026/2027",
      editionNumber: 35,
      status: this.status,
      suspensionReason: null,
      initialCredits: 300,
      maximumInitialRosterEntries: 11,
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z"
    };
  }
}

function createService(
  records:
    AuctionSessionTeam[],
  status:
    "SETUP" |
    "READY" |
    "RUNNING" |
    "SUSPENDED" |
    "COMPLETED" |
    "CLOSED" = "SETUP"
): AuctionSessionTeamService {
  return new AuctionSessionTeamService(
    new InMemoryAuctionSessionTeamRepository(
      records
    ),
    new InMemoryAuctionSessionRepository(
      status
    )
  );
}

const sessionId =
  "session-reorder";

const initialRecords:
  AuctionSessionTeam[] = [
    {
      id: "session-team-a",
      auctionSessionId:
        sessionId,
      teamId: "team-a",
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 300
    },
    {
      id: "session-team-b",
      auctionSessionId:
        sessionId,
      teamId: "team-b",
      tableOrder: 2,
      renewalCredits: 0,
      remainingCredits: 300
    },
    {
      id: "session-team-c",
      auctionSessionId:
        sessionId,
      teamId: "team-c",
      tableOrder: 3,
      renewalCredits: 0,
      remainingCredits: 300
    }
  ];

describe(
  "AuctionSessionTeamService reorder",
  () => {
    it(
      "reorders exactly the participating teams",
      async () => {
        const service =
          createService(
            structuredClone(
              initialRecords
            )
          );

        const result =
          await service
            .reorderSessionTeams(
              sessionId,
              [
                "team-c",
                "team-a",
                "team-b"
              ]
            );

        expect(
          result.map(
            (record) => ({
              teamId:
                record.teamId,
              tableOrder:
                record.tableOrder
            })
          )
        ).toEqual([
          {
            teamId: "team-c",
            tableOrder: 1
          },
          {
            teamId: "team-a",
            tableOrder: 2
          },
          {
            teamId: "team-b",
            tableOrder: 3
          }
        ]);
      }
    );

    it(
      "rejects a reorder with a missing team",
      async () => {
        const service =
          createService(
            structuredClone(
              initialRecords
            )
          );

        await expect(
          service.reorderSessionTeams(
            sessionId,
            [
              "team-a",
              "team-b"
            ]
          )
        ).rejects.toMatchObject({
          code:
            "AUCTION_SESSION_TEAM_REORDER_INVALID"
        });
      }
    );

    it(
      "rejects a reorder with an unknown team",
      async () => {
        const service =
          createService(
            structuredClone(
              initialRecords
            )
          );

        await expect(
          service.reorderSessionTeams(
            sessionId,
            [
              "team-a",
              "team-b",
              "team-x"
            ]
          )
        ).rejects.toMatchObject({
          code:
            "AUCTION_SESSION_TEAM_REORDER_INVALID"
        });
      }
    );

    it(
      "rejects duplicate teams",
      async () => {
        const service =
          createService(
            structuredClone(
              initialRecords
            )
          );

        await expect(
          service.reorderSessionTeams(
            sessionId,
            [
              "team-a",
              "team-a",
              "team-c"
            ]
          )
        ).rejects.toMatchObject({
          code:
            "AUCTION_SESSION_TEAM_REORDER_INVALID"
        });
      }
    );

    it.each([
      "SETUP",
      "READY",
      "SUSPENDED"
    ] as const)(
      "allows reorder while session is %s",
      async (status) => {
        const service =
          createService(
            structuredClone(
              initialRecords
            ),
            status
          );

        const result =
          await service
            .reorderSessionTeams(
              sessionId,
              [
                "team-b",
                "team-c",
                "team-a"
              ]
            );

        expect(
          result.map(
            (record) =>
              record.teamId
          )
        ).toEqual([
          "team-b",
          "team-c",
          "team-a"
        ]);
      }
    );

    it.each([
      "RUNNING",
      "COMPLETED",
      "CLOSED"
    ] as const)(
      "rejects reorder while session is %s",
      async (status) => {
        const service =
          createService(
            structuredClone(
              initialRecords
            ),
            status
          );

        await expect(
          service.reorderSessionTeams(
            sessionId,
            [
              "team-b",
              "team-c",
              "team-a"
            ]
          )
        ).rejects.toMatchObject({
          code:
            "AUCTION_SESSION_TEAM_REORDER_NOT_ALLOWED"
        });
      }
    );

    it(
      "rejects reorder when session has no teams",
      async () => {
        const service =
          createService([]);

        await expect(
          service.reorderSessionTeams(
            "empty-session",
            []
          )
        ).rejects.toMatchObject({
          code:
            "AUCTION_SESSION_TEAM_REORDER_INVALID"
        });
      }
    );
  }
);
