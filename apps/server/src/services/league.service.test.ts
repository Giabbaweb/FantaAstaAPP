import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  League
} from "@fantaastaapp/contracts";

import type {
  LeagueRepository
} from "../repositories/league.repository.js";
import {
  LeagueService,
  LeagueServiceError
} from "./league.service.js";

function createLeague(
  overrides: Partial<League> = {}
): League {
  return {
    id: "league-1",
    name: "SFL'92",
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
    ...overrides
  };
}

function createRepository():
  LeagueRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByNormalizedName: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  };
}

describe("LeagueService", () => {
  it("lists leagues", async () => {
    const repository =
      createRepository();

    const leagues = [
      createLeague()
    ];

    vi.mocked(
      repository.findAll
    ).mockResolvedValue(leagues);

    const service =
      new LeagueService(repository);

    await expect(
      service.listLeagues()
    ).resolves.toEqual(leagues);
  });

  it("gets a league by id", async () => {
    const repository =
      createRepository();

    const league =
      createLeague();

    vi.mocked(
      repository.findById
    ).mockResolvedValue(league);

    const service =
      new LeagueService(repository);

    await expect(
      service.getLeagueById("league-1")
    ).resolves.toEqual(league);
  });

  it("throws when league is not found", async () => {
    const repository =
      createRepository();

    vi.mocked(
      repository.findById
    ).mockResolvedValue(null);

    const service =
      new LeagueService(repository);

    await expect(
      service.getLeagueById("missing")
    ).rejects.toMatchObject({
      code: "LEAGUE_NOT_FOUND"
    });
  });

  it("creates a league with normalized name", async () => {
    const repository =
      createRepository();

    const league =
      createLeague({
        name: "SFL'92"
      });

    vi.mocked(
      repository.findByNormalizedName
    ).mockResolvedValue(null);

    vi.mocked(
      repository.create
    ).mockResolvedValue(league);

    const service =
      new LeagueService(repository);

    const result =
      await service.createLeague({
        name: "  SFL'92  "
      });

    expect(result).toEqual(league);

    expect(
      repository.findByNormalizedName
    ).toHaveBeenCalledWith(
      "sfl'92"
    );

    expect(
      repository.create
    ).toHaveBeenCalledWith({
      name: "SFL'92",
      normalizedName: "sfl'92"
    });
  });

  it("collapses whitespace when checking league uniqueness", async () => {
    const repository =
      createRepository();

    vi.mocked(
      repository.findByNormalizedName
    ).mockResolvedValue(
      createLeague()
    );

    const service =
      new LeagueService(repository);

    await expect(
      service.createLeague({
        name: "  SFL'92   "
      })
    ).rejects.toMatchObject({
      code: "LEAGUE_NAME_ALREADY_EXISTS"
    });
  });

  it("rejects a duplicate name case-insensitively", async () => {
    const repository =
      createRepository();

    vi.mocked(
      repository.findByNormalizedName
    ).mockResolvedValue(
      createLeague()
    );

    const service =
      new LeagueService(repository);

    await expect(
      service.createLeague({
        name: "SFL'92"
      })
    ).rejects.toBeInstanceOf(
      LeagueServiceError
    );
  });

  it("updates a league name and normalized name", async () => {
    const repository =
      createRepository();

    const existing =
      createLeague({
        name: "Old League"
      });

    const updated =
      createLeague({
        name: "Nuova Lega"
      });

    vi.mocked(
      repository.findById
    ).mockResolvedValue(existing);

    vi.mocked(
      repository.findByNormalizedName
    ).mockResolvedValue(null);

    vi.mocked(
      repository.update
    ).mockResolvedValue(updated);

    const service =
      new LeagueService(repository);

    await expect(
      service.updateLeague(
        "league-1",
        {
          name: "  Nuova   Lega  "
        }
      )
    ).resolves.toEqual(updated);

    expect(
      repository.update
    ).toHaveBeenCalledWith(
      "league-1",
      {
        name: "Nuova Lega",
        normalizedName:
          "nuova lega"
      }
    );
  });

  it("allows a league to keep its own normalized name", async () => {
    const repository =
      createRepository();

    const existing =
      createLeague();

    vi.mocked(
      repository.findById
    ).mockResolvedValue(existing);

    vi.mocked(
      repository.findByNormalizedName
    ).mockResolvedValue(existing);

    vi.mocked(
      repository.update
    ).mockResolvedValue(existing);

    const service =
      new LeagueService(repository);

    await expect(
      service.updateLeague(
        "league-1",
        {
          name: "SFL'92"
        }
      )
    ).resolves.toEqual(existing);
  });

  it("throws when repository update fails", async () => {
    const repository =
      createRepository();

    vi.mocked(
      repository.findById
    ).mockResolvedValue(
      createLeague()
    );

    vi.mocked(
      repository.findByNormalizedName
    ).mockResolvedValue(null);

    vi.mocked(
      repository.update
    ).mockResolvedValue(null);

    const service =
      new LeagueService(repository);

    await expect(
      service.updateLeague(
        "league-1",
        {
          name: "Nuova Lega"
        }
      )
    ).rejects.toMatchObject({
      code: "LEAGUE_UPDATE_FAILED"
    });
  });
});
