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

function createService(
  records:
    AuctionSessionTeam[]
): AuctionSessionTeamService {
  return new AuctionSessionTeamService(
    new InMemoryAuctionSessionTeamRepository(
      records
    )
  );
}

const sessionId =
  "session-reorder";

const initialRecords:
  AuctionSessionTeam[] = [
    {
      auctionSessionId:
        sessionId,
      teamId: "team-a",
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 300
    },
    {
      auctionSessionId:
        sessionId,
      teamId: "team-b",
      tableOrder: 2,
      renewalCredits: 0,
      remainingCredits: 300
    },
    {
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
