import type {
  ManualRosterAssignmentReason,
  RealtimeCommandMetadata
} from "@fantaastaapp/contracts";

import type {
  AuctionBackupRequester
} from "../services/auction-backup-requester.js";
import {
  NoopAuctionBackupRequester
} from "../services/auction-backup-requester.js";
import type {
  ManualRosterAssignmentInput
} from "../services/manual-roster-assignment.service.js";
import type {
  AtomicManualRosterAssignmentCommandExecutor,
  ExecuteAtomicManualRosterAssignmentCommandResult
} from "./atomic-manual-roster-assignment-command.executor.js";

type AtomicManualRosterAssignmentCommandExecutorPort =
  Pick<
    AtomicManualRosterAssignmentCommandExecutor,
    "execute"
  >;

type ManualAssignmentBackupRequesterPort =
  Pick<
    AuctionBackupRequester,
    "requestManualAssignmentBackup"
  >;

export type ManualAssignmentBackupErrorHandler =
  (input: {
    auctionSessionId: string;
    error: unknown;
  }) => void;

export type ManualRosterAssignmentCommandActor = {
  name: string;
  role:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
};

export class AtomicManualRosterAssignmentCommandService {
  constructor(
    private readonly executor:
      AtomicManualRosterAssignmentCommandExecutorPort,
    private readonly backupRequester:
      ManualAssignmentBackupRequesterPort =
        new NoopAuctionBackupRequester(),
    private readonly onBackupError:
      ManualAssignmentBackupErrorHandler =
        () => undefined
  ) {}

  async add(
    metadata: RealtimeCommandMetadata,
    actor: ManualRosterAssignmentCommandActor,
    assignment: ManualRosterAssignmentInput,
    manualAssignmentReason:
      ManualRosterAssignmentReason,
    comment: string
  ): Promise<
    ExecuteAtomicManualRosterAssignmentCommandResult
  > {
    const result =
      await this.executor.execute({
      commandId:
        metadata.commandId,
      commandType:
        "ADD_MANUAL_ROSTER_ASSIGNMENT",
      expectedStateVersion:
        metadata.stateVersion,
      requestFingerprint:
        JSON.stringify({
          commandType:
            "ADD_MANUAL_ROSTER_ASSIGNMENT",
          actorName:
            actor.name,
          actorRole:
            actor.role,
          manualAssignmentReason,
          comment,
          assignment: {
            auctionSessionId:
              assignment.auctionSessionId,
            auctionSessionTeamId:
              assignment.auctionSessionTeamId,
            playerId:
              assignment.playerId,
            acquisitionCost:
              assignment.acquisitionCost,
            contractYear:
              assignment.contractYear
          }
        }),
      actorName:
        actor.name,
      actorRole:
        actor.role,
      manualAssignmentReason,
      comment,
      assignment
    });

    if (!result.idempotentReplay) {
      try {
        await this.backupRequester
          .requestManualAssignmentBackup({
            auctionSessionId:
              assignment.auctionSessionId
          });
      } catch (error) {
        this.onBackupError({
          auctionSessionId:
            assignment.auctionSessionId,
          error
        });
      }
    }

    return result;
  }
}
