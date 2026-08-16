import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  fmsExportGoalkeepers,
  leagues,
  players,
  teams
} from "../db/schema/index.js";
import {
  SqliteFmsExportGoalkeeperRepository
} from "./fms-export-goalkeeper.repository.js";

const repository =
  new SqliteFmsExportGoalkeeperRepository();

async function seedBaseData(): Promise<void> {
  await db.insert(leagues).values({
    id: "league-fms-goalkeeper-repository",
    name: "FMS Goalkeeper Repository League",
    normalizedName:
      "fms goalkeeper repository league"
  });

  await db.insert(auctionSessions).values({
    id: "session-fms-goalkeeper-repository",
    leagueId:
      "league-fms-goalkeeper-repository",
    season: "2026/2027",
    editionNumber: 60,
    initialCredits: 300
  });

  await db.insert(teams).values([
    {
      id: "team-fms-goalkeeper-1",
      leagueId:
        "league-fms-goalkeeper-repository",
      name: "Team One"
    },
    {
      id: "team-fms-goalkeeper-2",
      leagueId:
        "league-fms-goalkeeper-repository",
      name: "Team Two"
    }
  ]);

  await db.insert(auctionSessionTeams).values([
    {
      id: "session-team-fms-goalkeeper-1",
      auctionSessionId:
        "session-fms-goalkeeper-repository",
      teamId: "team-fms-goalkeeper-1",
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 300
    },
    {
      id: "session-team-fms-goalkeeper-2",
      auctionSessionId:
        "session-fms-goalkeeper-repository",
      teamId: "team-fms-goalkeeper-2",
      tableOrder: 2,
      renewalCredits: 0,
      remainingCredits: 300
    }
  ]);

  await db.insert(players).values([
    {
      id: "player-fms-goalkeeper-1",
      auctionSessionId:
        "session-fms-goalkeeper-repository",
      fmsCode: "fms-goalkeeper-1",
      name: "GOALKEEPER ONE",
      normalizedName: "goalkeeper one",
      role: "P",
      availabilityStatus: "AVAILABLE"
    },
    {
      id: "player-fms-goalkeeper-2",
      auctionSessionId:
        "session-fms-goalkeeper-repository",
      fmsCode: "fms-goalkeeper-2",
      name: "GOALKEEPER TWO",
      normalizedName: "goalkeeper two",
      role: "P",
      availabilityStatus: "AVAILABLE"
    }
  ]);
}

afterEach(async () => {
  await db.delete(fmsExportGoalkeepers);
  await db.delete(players);
  await db.delete(auctionSessionTeams);
  await db.delete(teams);
  await db.delete(auctionSessions);
  await db.delete(leagues);
});

describe("SqliteFmsExportGoalkeeperRepository", () => {
  it("creates and finds a selection by auction session team", async () => {
    await seedBaseData();

    const created =
      db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionTeamId:
              "session-team-fms-goalkeeper-1",
            playerId:
              "player-fms-goalkeeper-1"
          }
        )
      );

    const found =
      db.transaction((tx) =>
        repository
          .findByAuctionSessionTeamIdWithExecutor(
            tx,
            "session-team-fms-goalkeeper-1"
          )
      );

    expect(found).toEqual(created);
  });

  it("finds a selection by player id", async () => {
    await seedBaseData();

    const created =
      db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionTeamId:
              "session-team-fms-goalkeeper-1",
            playerId:
              "player-fms-goalkeeper-1"
          }
        )
      );

    const found =
      db.transaction((tx) =>
        repository
          .findByPlayerIdWithExecutor(
            tx,
            "player-fms-goalkeeper-1"
          )
      );

    expect(found).toEqual(created);
  });

  it("updates the selected player", async () => {
    await seedBaseData();

    const created =
      db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionTeamId:
              "session-team-fms-goalkeeper-1",
            playerId:
              "player-fms-goalkeeper-1"
          }
        )
      );

    const updated =
      db.transaction((tx) =>
        repository.updateWithExecutor(
          tx,
          created.id,
          {
            playerId:
              "player-fms-goalkeeper-2"
          }
        )
      );

    expect(updated).toEqual(
      expect.objectContaining({
        id: created.id,
        auctionSessionTeamId:
          "session-team-fms-goalkeeper-1",
        playerId:
          "player-fms-goalkeeper-2"
      })
    );
  });

  it("rejects more than one selection for the same auction session team", async () => {
    await seedBaseData();

    db.transaction((tx) =>
      repository.createWithExecutor(
        tx,
        {
          auctionSessionTeamId:
            "session-team-fms-goalkeeper-1",
          playerId:
            "player-fms-goalkeeper-1"
        }
      )
    );

    expect(() =>
      db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionTeamId:
              "session-team-fms-goalkeeper-1",
            playerId:
              "player-fms-goalkeeper-2"
          }
        )
      )
    ).toThrow();
  });

  it("rejects the same player for two auction session teams", async () => {
    await seedBaseData();

    db.transaction((tx) =>
      repository.createWithExecutor(
        tx,
        {
          auctionSessionTeamId:
            "session-team-fms-goalkeeper-1",
          playerId:
            "player-fms-goalkeeper-1"
        }
      )
    );

    expect(() =>
      db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionTeamId:
              "session-team-fms-goalkeeper-2",
            playerId:
              "player-fms-goalkeeper-1"
          }
        )
      )
    ).toThrow();
  });
});
