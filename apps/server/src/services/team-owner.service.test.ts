import {
  describe,
  expect,
  it
} from "vitest";

import type {
  CreateTeamOwnerInput,
  TeamOwner,
  UpdateTeamOwnerInput
} from "@fantaastaapp/contracts";

import type {
  TeamOwnerRepository
} from "../repositories/team-owner.repository.js";
import {
  TeamOwnerService,
  TeamOwnerServiceError
} from "./team-owner.service.js";

class InMemoryTeamOwnerRepository
  implements TeamOwnerRepository
{
  private readonly records =
    new Map<string, TeamOwner>();

  private key(
    teamId: string,
    ownerId: string
  ): string {
    return `${teamId}:${ownerId}`;
  }

  async findByTeamId(
    teamId: string
  ): Promise<TeamOwner[]> {
    return [...this.records.values()]
      .filter(
        (record) =>
          record.teamId === teamId
      )
      .sort((left, right) => {
        if (
          left.isPrimary !==
          right.isPrimary
        ) {
          return left.isPrimary
            ? -1
            : 1;
        }

        return left.ownerId.localeCompare(
          right.ownerId
        );
      });
  }

  async findByOwnerId(
    ownerId: string
  ): Promise<TeamOwner[]> {
    return [...this.records.values()]
      .filter(
        (record) =>
          record.ownerId === ownerId
      );
  }

  async findByTeamAndOwner(
    teamId: string,
    ownerId: string
  ): Promise<TeamOwner | null> {
    return (
      this.records.get(
        this.key(
          teamId,
          ownerId
        )
      ) ?? null
    );
  }

  async create(
    teamId: string,
    input: CreateTeamOwnerInput
  ): Promise<TeamOwner> {
    const record: TeamOwner = {
      teamId,
      ownerId: input.ownerId,
      isPrimary: input.isPrimary
    };

    this.records.set(
      this.key(
        teamId,
        input.ownerId
      ),
      record
    );

    return record;
  }

  async update(
    teamId: string,
    ownerId: string,
    input: UpdateTeamOwnerInput
  ): Promise<TeamOwner | null> {
    const key =
      this.key(teamId, ownerId);

    const existing =
      this.records.get(key);

    if (!existing) {
      return null;
    }

    const updated: TeamOwner = {
      ...existing,
      isPrimary:
        input.isPrimary
    };

    this.records.set(
      key,
      updated
    );

    return updated;
  }

  async delete(
    teamId: string,
    ownerId: string
  ): Promise<boolean> {
    return this.records.delete(
      this.key(
        teamId,
        ownerId
      )
    );
  }
}

function createService(): {
  repository:
    InMemoryTeamOwnerRepository;
  service:
    TeamOwnerService;
} {
  const repository =
    new InMemoryTeamOwnerRepository();

  return {
    repository,
    service:
      new TeamOwnerService(
        repository
      )
  };
}

describe(
  "TeamOwnerService",
  () => {
    it(
      "creates a team owner association",
      async () => {
        const { service } =
          createService();

        const result =
          await service.createTeamOwner(
            "team-1",
            {
              ownerId: "owner-1",
              isPrimary: false
            }
          );

        expect(result).toEqual({
          teamId: "team-1",
          ownerId: "owner-1",
          isPrimary: false
        });
      }
    );

    it(
      "rejects duplicate team owner association",
      async () => {
        const { service } =
          createService();

        await service.createTeamOwner(
          "team-1",
          {
            ownerId: "owner-1",
            isPrimary: false
          }
        );

        await expect(
          service.createTeamOwner(
            "team-1",
            {
              ownerId: "owner-1",
              isPrimary: true
            }
          )
        ).rejects.toMatchObject({
          code:
            "TEAM_OWNER_ALREADY_EXISTS"
        });
      }
    );

    it(
      "keeps only one primary owner per team when creating a new primary",
      async () => {
        const {
          repository,
          service
        } = createService();

        await service.createTeamOwner(
          "team-1",
          {
            ownerId: "owner-1",
            isPrimary: true
          }
        );

        await service.createTeamOwner(
          "team-1",
          {
            ownerId: "owner-2",
            isPrimary: true
          }
        );

        const owners =
          await repository
            .findByTeamId(
              "team-1"
            );

        expect(owners).toEqual([
          {
            teamId: "team-1",
            ownerId: "owner-2",
            isPrimary: true
          },
          {
            teamId: "team-1",
            ownerId: "owner-1",
            isPrimary: false
          }
        ]);
      }
    );

    it(
      "keeps only one primary owner per team when promoting an existing owner",
      async () => {
        const {
          repository,
          service
        } = createService();

        await service.createTeamOwner(
          "team-1",
          {
            ownerId: "owner-1",
            isPrimary: true
          }
        );

        await service.createTeamOwner(
          "team-1",
          {
            ownerId: "owner-2",
            isPrimary: false
          }
        );

        const promoted =
          await service.updateTeamOwner(
            "team-1",
            "owner-2",
            {
              isPrimary: true
            }
          );

        expect(promoted).toEqual({
          teamId: "team-1",
          ownerId: "owner-2",
          isPrimary: true
        });

        const owners =
          await repository
            .findByTeamId(
              "team-1"
            );

        expect(owners).toEqual([
          {
            teamId: "team-1",
            ownerId: "owner-2",
            isPrimary: true
          },
          {
            teamId: "team-1",
            ownerId: "owner-1",
            isPrimary: false
          }
        ]);
      }
    );

    it(
      "rejects update for a missing association",
      async () => {
        const { service } =
          createService();

        await expect(
          service.updateTeamOwner(
            "team-1",
            "owner-missing",
            {
              isPrimary: true
            }
          )
        ).rejects.toBeInstanceOf(
          TeamOwnerServiceError
        );

        await expect(
          service.updateTeamOwner(
            "team-1",
            "owner-missing",
            {
              isPrimary: true
            }
          )
        ).rejects.toMatchObject({
          code:
            "TEAM_OWNER_NOT_FOUND"
        });
      }
    );

    it(
      "deletes an existing association",
      async () => {
        const {
          repository,
          service
        } = createService();

        await service.createTeamOwner(
          "team-1",
          {
            ownerId: "owner-1",
            isPrimary: true
          }
        );

        await service.deleteTeamOwner(
          "team-1",
          "owner-1"
        );

        await expect(
          repository
            .findByTeamAndOwner(
              "team-1",
              "owner-1"
            )
        ).resolves.toBeNull();
      }
    );

    it(
      "rejects delete for a missing association",
      async () => {
        const { service } =
          createService();

        await expect(
          service.deleteTeamOwner(
            "team-1",
            "owner-missing"
          )
        ).rejects.toMatchObject({
          code:
            "TEAM_OWNER_NOT_FOUND"
        });
      }
    );
  }
);
