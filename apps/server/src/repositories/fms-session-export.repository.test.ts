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
  fmsSessionExports,
  leagues
} from "../db/schema/index.js";
import {
  SqliteFmsSessionExportRepository
} from "./fms-session-export.repository.js";

const repository =
  new SqliteFmsSessionExportRepository();

async function seedBaseData(): Promise<void> {
  await db.insert(leagues).values({
    id: "league-fms-session-export-repository",
    name: "FMS Session Export Repository League",
    normalizedName:
      "fms session export repository league"
  });

  await db.insert(auctionSessions).values({
    id: "session-fms-session-export-repository",
    leagueId:
      "league-fms-session-export-repository",
    season: "2026/2027",
    editionNumber: 61,
    initialCredits: 300
  });
}

afterEach(async () => {
  await db.delete(fmsSessionExports);
  await db.delete(auctionSessions);
  await db.delete(leagues);
});

describe("SqliteFmsSessionExportRepository", () => {
  it("returns null when the session was not exported", async () => {
    await seedBaseData();

    const found =
      db.transaction((tx) =>
        repository
          .findByAuctionSessionIdWithExecutor(
            tx,
            "session-fms-session-export-repository"
          )
      );

    expect(found).toBeNull();
  });

  it("persists and finds the session export", async () => {
    await seedBaseData();

    const created =
      db.transaction((tx) =>
        repository.upsertWithExecutor(
          tx,
          "session-fms-session-export-repository"
        )
      );

    const found =
      db.transaction((tx) =>
        repository
          .findByAuctionSessionIdWithExecutor(
            tx,
            "session-fms-session-export-repository"
          )
      );

    expect(found).toEqual(created);
  });

  it("upserts one record for the same auction session", async () => {
    await seedBaseData();

    db.transaction((tx) =>
      repository.upsertWithExecutor(
        tx,
        "session-fms-session-export-repository"
      )
    );

    db.transaction((tx) =>
      repository.upsertWithExecutor(
        tx,
        "session-fms-session-export-repository"
      )
    );

    const records =
      await db
        .select()
        .from(fmsSessionExports);

    expect(records).toHaveLength(1);
  });

  it("invalidates the persisted session export", async () => {
    await seedBaseData();

    db.transaction((tx) =>
      repository.upsertWithExecutor(
        tx,
        "session-fms-session-export-repository"
      )
    );

    db.transaction((tx) =>
      repository
        .deleteByAuctionSessionIdWithExecutor(
          tx,
          "session-fms-session-export-repository"
        )
    );

    const found =
      db.transaction((tx) =>
        repository
          .findByAuctionSessionIdWithExecutor(
            tx,
            "session-fms-session-export-repository"
          )
      );

    expect(found).toBeNull();
  });
});
