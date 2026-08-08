import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionSessions,
  leagues,
  players
} from "../db/schema/index.js";
import {
  SqlitePlayerRepository
} from "./player.repository.js";

const leagueId = "league-player-repository-test";
const auctionSessionId =
  "session-player-repository-test";

const player1Id =
  "player-repository-test-1";
const player2Id =
  "player-repository-test-2";

describe("SqlitePlayerRepository", () => {
  afterEach(() => {
    db.delete(players)
      .where(
        eq(
          players.auctionSessionId,
          auctionSessionId
        )
      )
      .run();

    db.delete(auctionSessions)
      .where(
        eq(
          auctionSessions.id,
          auctionSessionId
        )
      )
      .run();

    db.delete(leagues)
      .where(eq(leagues.id, leagueId))
      .run();
  });

  it(
    "finds multiple players inside a transaction",
    () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Player Repository Test League",
          normalizedName:
            "player repository test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 97,
          initialCredits: 330
        })
        .run();

      db.insert(players)
        .values([
          {
            id: player1Id,
            auctionSessionId,
            fmsCode: "PLAYER-REPO-001",
            name: "Player One",
            normalizedName: "player one",
            role: "D",
            availabilityStatus: "ROSTERED"
          },
          {
            id: player2Id,
            auctionSessionId,
            fmsCode: "PLAYER-REPO-002",
            name: "Player Two",
            normalizedName: "player two",
            role: "A",
            availabilityStatus: "ROSTERED"
          }
        ])
        .run();

      const repository =
        new SqlitePlayerRepository();

      db.transaction((tx) => {
        const found =
          repository.findByIdsWithExecutor(
            tx,
            [
              player2Id,
              player1Id
            ]
          );

        expect(found).toHaveLength(2);

        expect(
          found.map((player) => player.id).sort()
        ).toEqual(
          [player1Id, player2Id].sort()
        );
      });
    }
  );

  it(
    "returns an empty array for an empty id list",
    () => {
      const repository =
        new SqlitePlayerRepository();

      db.transaction((tx) => {
        expect(
          repository.findByIdsWithExecutor(
            tx,
            []
          )
        ).toEqual([]);
      });
    }
  );
});
