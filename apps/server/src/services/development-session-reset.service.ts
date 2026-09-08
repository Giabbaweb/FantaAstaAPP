import { eq, inArray } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionCalls,
  auctionCallTeams,
  auctionEvents,
  auctionSessions,
  auctionSessionTeams,
  commandRegistry,
  fmsExportGoalkeepers,
  players,
  rosterEntries
} from "../db/schema/index.js";

export type DevelopmentSessionResetErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "AUCTION_SESSION_CLOSED";

export class DevelopmentSessionResetError extends Error {
  constructor(
    readonly code: DevelopmentSessionResetErrorCode,
    message: string
  ) {
    super(message);
    this.name = "DevelopmentSessionResetError";
  }
}

export type DevelopmentSessionResetResult = {
  auctionSessionId: string;
  status: "SETUP";
  stateVersion: 0;
  deletedAuctionEvents: number;
  deletedCommands: number;
  deletedAuctionCalls: number;
  deletedFmsExportGoalkeepers: number;
  deletedRosterEntries: number;
  deletedPlayers: number;
  resetAuctionSessionTeams: number;
};

export class DevelopmentSessionResetService {
  async reset(
    auctionSessionId: string
  ): Promise<DevelopmentSessionResetResult> {
    return db.transaction((tx) => {
      const [session] = tx
        .select({
          id: auctionSessions.id,
          status: auctionSessions.status,
          initialCredits: auctionSessions.initialCredits
        })
        .from(auctionSessions)
        .where(eq(auctionSessions.id, auctionSessionId))
        .limit(1)
        .all();

      if (!session) {
        throw new DevelopmentSessionResetError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${auctionSessionId}" was not found`
        );
      }

      if (session.status === "CLOSED") {
        throw new DevelopmentSessionResetError(
          "AUCTION_SESSION_CLOSED",
          `Auction session "${auctionSessionId}" is closed and cannot be reset`
        );
      }

      const sessionTeams = tx
        .select({
          id: auctionSessionTeams.id
        })
        .from(auctionSessionTeams)
        .where(
          eq(
            auctionSessionTeams.auctionSessionId,
            auctionSessionId
          )
        )
        .all();

      const sessionTeamIds = sessionTeams.map(
        (team) => team.id
      );

      const sessionPlayers = tx
        .select({
          id: players.id
        })
        .from(players)
        .where(
          eq(
            players.auctionSessionId,
            auctionSessionId
          )
        )
        .all();

      const playerIds = sessionPlayers.map(
        (player) => player.id
      );

      const deletedAuctionEvents = tx
        .delete(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionSessionId,
            auctionSessionId
          )
        )
        .run().changes;

      const deletedCommands = tx
        .delete(commandRegistry)
        .where(
          eq(
            commandRegistry.auctionSessionId,
            auctionSessionId
          )
        )
        .run().changes;

      const deletedAuctionCalls = tx
        .delete(auctionCalls)
        .where(
          eq(
            auctionCalls.auctionSessionId,
            auctionSessionId
          )
        )
        .run().changes;

      const deletedFmsExportGoalkeepers =
        sessionTeamIds.length === 0
          ? 0
          : tx
              .delete(fmsExportGoalkeepers)
              .where(
                inArray(
                  fmsExportGoalkeepers.auctionSessionTeamId,
                  sessionTeamIds
                )
              )
              .run().changes;

      const deletedRosterEntries =
        sessionTeamIds.length === 0
          ? 0
          : tx
              .delete(rosterEntries)
              .where(
                inArray(
                  rosterEntries.auctionSessionTeamId,
                  sessionTeamIds
                )
              )
              .run().changes;

      const deletedPlayers =
        playerIds.length === 0
          ? 0
          : tx
              .delete(players)
              .where(
                inArray(
                  players.id,
                  playerIds
                )
              )
              .run().changes;

      const resetAuctionSessionTeams = tx
        .update(auctionSessionTeams)
        .set({
          remainingCredits: session.initialCredits
        })
        .where(
          eq(
            auctionSessionTeams.auctionSessionId,
            auctionSessionId
          )
        )
        .run().changes;

      tx.update(auctionSessions)
        .set({
          status: "SETUP",
          suspensionReason: null,
          stateVersion: 0
        })
        .where(
          eq(
            auctionSessions.id,
            auctionSessionId
          )
        )
        .run();

      return {
        auctionSessionId,
        status: "SETUP",
        stateVersion: 0,
        deletedAuctionEvents,
        deletedCommands,
        deletedAuctionCalls,
        deletedFmsExportGoalkeepers,
        deletedRosterEntries,
        deletedPlayers,
        resetAuctionSessionTeams
      };
    });
  }
}
