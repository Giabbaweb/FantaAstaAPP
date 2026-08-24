import {
  createAuctionCallDraft
} from "@fantaastaapp/domain";

import type {
  AuctionSessionTeamTransactionalRepository
} from "../repositories/auction-session-team.repository.js";
import type {
  PlayerRepository
} from "../repositories/player.repository.js";
import type {
  RosterEntryRepository
} from "../repositories/roster-entry.repository.js";
import type {
  ExecuteAtomicAuctionCallCreationResult
} from "../realtime/atomic-auction-call-creation.executor.js";
import {
  AtomicAuctionCallCreationExecutor
} from "../realtime/atomic-auction-call-creation.executor.js";

export type AuctionCallCreationServiceErrorCode =
  | "PLAYER_NOT_FOUND"
  | "PLAYER_NOT_AVAILABLE"
  | "PLAYER_ALREADY_ROSTERED"
  | "NO_SESSION_TEAMS"
  | "CALLER_NOT_FOUND";

export class AuctionCallCreationServiceError
  extends Error
{
  readonly code:
    AuctionCallCreationServiceErrorCode;

  constructor(
    code: AuctionCallCreationServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AuctionCallCreationServiceError";
    this.code = code;
  }
}

export type CreateAuctionCallInput = {
  auctionSessionId: string;
  auctionCallId: string;
  playerFmsCode: string;
  commandId: string;
  expectedStateVersion: number;
};

export class AuctionCallCreationService {
  constructor(
    private readonly executor:
      AtomicAuctionCallCreationExecutor,
    private readonly auctionSessionTeamRepository:
      AuctionSessionTeamTransactionalRepository,
    private readonly playerRepository:
      PlayerRepository,
    private readonly rosterEntryRepository:
      RosterEntryRepository,
    private readonly now:
      () => string =
        () => new Date().toISOString()
  ) {}

  async createDraft(
    input: CreateAuctionCallInput
  ): Promise<ExecuteAtomicAuctionCallCreationResult> {
    const requestFingerprint = [
      "create",
      input.playerFmsCode
    ].join(":");

    return this.executor.execute({
      auctionSessionId:
        input.auctionSessionId,
      auctionCallId:
        input.auctionCallId,
      commandId:
        input.commandId,
      expectedStateVersion:
        input.expectedStateVersion,
      requestFingerprint,
      create: (transactionExecutor) => {
        const player =
          this.playerRepository
            .findByFmsCodeWithExecutor(
              transactionExecutor,
              input.auctionSessionId,
              input.playerFmsCode
            );

        if (!player) {
          throw new AuctionCallCreationServiceError(
            "PLAYER_NOT_FOUND",
            `Player with FMS code "${input.playerFmsCode}" was not found in auction session "${input.auctionSessionId}"`
          );
        }

        if (
          player.availabilityStatus !==
          "AVAILABLE"
        ) {
          throw new AuctionCallCreationServiceError(
            "PLAYER_NOT_AVAILABLE",
            `Player "${input.playerFmsCode}" is not available`
          );
        }

        const existingRosterEntry =
          this.rosterEntryRepository
            .findByPlayerIdWithExecutor(
              transactionExecutor,
              player.id
            );

        if (existingRosterEntry) {
          throw new AuctionCallCreationServiceError(
            "PLAYER_ALREADY_ROSTERED",
            `Player "${input.playerFmsCode}" is already assigned to a roster`
          );
        }

        const sessionTeams =
          this.auctionSessionTeamRepository
            .findByAuctionSessionIdWithExecutor(
              transactionExecutor,
              input.auctionSessionId
            );

        if (sessionTeams.length === 0) {
          throw new AuctionCallCreationServiceError(
            "NO_SESSION_TEAMS",
            `Auction session "${input.auctionSessionId}" has no participating teams`
          );
        }

        const orderedSessionTeams =
          [...sessionTeams].sort(
            (left, right) =>
              left.tableOrder -
              right.tableOrder
          );

        const latestConfirmedCall =
          this.executor
            .findLatestConfirmedCallWithExecutor(
              transactionExecutor,
              input.auctionSessionId
            );

        let callerAuctionSessionTeamId =
          orderedSessionTeams[0]?.id;

        if (latestConfirmedCall) {
          const previousCallerIndex =
            orderedSessionTeams.findIndex(
              (team) =>
                team.id ===
                latestConfirmedCall.call
                  .callerAuctionSessionTeamId
            );

          if (previousCallerIndex < 0) {
            throw new AuctionCallCreationServiceError(
              "CALLER_NOT_FOUND",
              `Previous confirmed caller does not belong to auction session "${input.auctionSessionId}"`
            );
          }

          callerAuctionSessionTeamId =
            orderedSessionTeams[
              (
                previousCallerIndex + 1
              ) %
              orderedSessionTeams.length
            ]?.id;
        }

        if (!callerAuctionSessionTeamId) {
          throw new AuctionCallCreationServiceError(
            "NO_SESSION_TEAMS",
            `Auction session "${input.auctionSessionId}" has no participating teams`
          );
        }

        const draftTeams =
          sessionTeams.map((sessionTeam) => {
            const rosterEntries =
              this.rosterEntryRepository
                .findByAuctionSessionTeamIdWithExecutor(
                  transactionExecutor,
                  sessionTeam.id
                );

            const rosterPlayers =
              this.playerRepository
                .findByIdsWithExecutor(
                  transactionExecutor,
                  rosterEntries.map(
                    (entry) => entry.playerId
                  )
                );

            const currentRoleCount =
              rosterPlayers.filter(
                (rosterPlayer) =>
                  rosterPlayer.role ===
                  player.role
              ).length;

            return {
              auctionSessionTeamId:
                sessionTeam.id,
              turnOrder:
                sessionTeam.tableOrder,
              remainingCredits:
                sessionTeam.remainingCredits,
              currentRosterSize:
                rosterEntries.length,
              currentRoleCount
            };
          });

        return createAuctionCallDraft({
          auctionCallId:
            input.auctionCallId,
          auctionSessionId:
            input.auctionSessionId,
          playerId:
            player.id,
          playerRole:
            player.role,
          callerAuctionSessionTeamId,
          teams:
            draftTeams,
          now: this.now()
        });
      }
    });
  }
}
