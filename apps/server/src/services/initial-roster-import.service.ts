import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionSessionTeams,
  players,
  rosterEntries
} from "../db/schema/index.js";
import type {
  InitialRosterImportPlan
} from "../import/player-import.types.js";

export type InitialRosterImportResult = {
  importedEntries: number;
  totalCost: number;
};

export type InitialRosterImportServiceErrorCode =
  | "INVALID_IMPORT_PLAN"
  | "INSUFFICIENT_CREDITS"
  | "IMPORT_FAILED";

export class InitialRosterImportServiceError extends Error {
  readonly code: InitialRosterImportServiceErrorCode;

  constructor(
    code: InitialRosterImportServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name = "InitialRosterImportServiceError";
    this.code = code;
  }
}

export class InitialRosterImportService {
  async execute(
    plan: InitialRosterImportPlan
  ): Promise<InitialRosterImportResult> {
    this.assertPlanExecutable(plan);

    try {
      return db.transaction((tx) => {
        let totalCost = 0;

        for (const entry of plan.entries) {
          const [auctionSessionTeam] = tx
            .select()
            .from(auctionSessionTeams)
            .where(
              eq(
                auctionSessionTeams.id,
                entry.auctionSessionTeamId
              )
            )
            .limit(1)
            .all();

          if (!auctionSessionTeam) {
            throw new InitialRosterImportServiceError(
              "IMPORT_FAILED",
              `Auction session team "${entry.auctionSessionTeamId}" was not found`
            );
          }

          const [player] = tx
            .select()
            .from(players)
            .where(eq(players.id, entry.playerId))
            .limit(1)
            .all();

          if (!player) {
            throw new InitialRosterImportServiceError(
              "IMPORT_FAILED",
              `Player "${entry.playerId}" was not found`
            );
          }

          if (
            player.auctionSessionId !==
            auctionSessionTeam.auctionSessionId
          ) {
            throw new InitialRosterImportServiceError(
              "IMPORT_FAILED",
              `Player "${entry.playerId}" and auction session team ` +
                `"${entry.auctionSessionTeamId}" belong to different auction sessions`
            );
          }

          if (player.availabilityStatus === "ROSTERED") {
            throw new InitialRosterImportServiceError(
              "IMPORT_FAILED",
              `Player "${entry.playerId}" is already rostered`
            );
          }

          if (
            entry.acquisitionCost >
            auctionSessionTeam.remainingCredits
          ) {
            throw new InitialRosterImportServiceError(
              "INSUFFICIENT_CREDITS",
              `Acquisition cost "${entry.acquisitionCost}" exceeds ` +
                `remaining credits "${auctionSessionTeam.remainingCredits}" ` +
                `for auction session team "${entry.auctionSessionTeamId}"`
            );
          }

          tx.insert(rosterEntries)
            .values({
              id: randomUUID(),
              auctionSessionTeamId:
                entry.auctionSessionTeamId,
              playerId: entry.playerId,
              acquisitionCost: entry.acquisitionCost,
              contractYear: entry.contractYear,
              source: entry.source
            })
            .run();

          tx.update(players)
            .set({
              availabilityStatus: "ROSTERED",
              updatedAt: sql`CURRENT_TIMESTAMP`
            })
            .where(eq(players.id, entry.playerId))
            .run();

          tx.update(auctionSessionTeams)
            .set({
              remainingCredits:
                auctionSessionTeam.remainingCredits -
                entry.acquisitionCost
            })
            .where(
              eq(
                auctionSessionTeams.id,
                entry.auctionSessionTeamId
              )
            )
            .run();

          totalCost += entry.acquisitionCost;
        }

        return {
          importedEntries: plan.entries.length,
          totalCost
        };
      });
    } catch (error) {
      if (
        error instanceof
        InitialRosterImportServiceError
      ) {
        throw error;
      }

      throw new InitialRosterImportServiceError(
        "IMPORT_FAILED",
        error instanceof Error
          ? `Initial roster import failed: ${error.message}`
          : "Initial roster import failed"
      );
    }
  }

  private assertPlanExecutable(
    plan: InitialRosterImportPlan
  ): void {
    if (
      plan.parserIssues.length > 0 ||
      plan.planningIssues.length > 0
    ) {
      throw new InitialRosterImportServiceError(
        "INVALID_IMPORT_PLAN",
        "Initial roster import plan contains unresolved issues"
      );
    }
  }
}
