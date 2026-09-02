import type {
  RealtimeCommandMetadata
} from "@fantaastaapp/contracts";

import type {
  AuctionBackupRequester
} from "../services/auction-backup-requester.js";
import {
  NoopAuctionBackupRequester
} from "../services/auction-backup-requester.js";
import type {
  RosterAssignmentRemovalInput
} from "../services/roster-assignment-removal.service.js";
import type {
  AtomicRosterAssignmentRemovalCommandExecutor,
  ExecuteAtomicRosterAssignmentRemovalCommandResult
} from "./atomic-roster-assignment-removal-command.executor.js";

type AtomicRosterAssignmentRemovalCommandExecutorPort =
  Pick<
    AtomicRosterAssignmentRemovalCommandExecutor,
    "execute"
  >;

type RosterAssignmentRemovalBackupRequesterPort =
  Pick<
    AuctionBackupRequester,
    "requestTechnicalCorrectionBackup"
  >;

export type RosterAssignmentRemovalBackupErrorHandler =
  (input: {
    auctionSessionId: string;
    error: unknown;
  }) => void;

export type RosterAssignmentRemovalCommandActor = {
  name: string;
  role:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
};

export class AtomicRosterAssignmentRemovalCommandService {
  constructor(
    private readonly executor:
      AtomicRosterAssignmentRemovalCommandExecutorPort,
    private readonly backupRequester:
      RosterAssignmentRemovalBackupRequesterPort =
        new NoopAuctionBackupRequester(),
    private readonly onBackupError:
      RosterAssignmentRemovalBackupErrorHandler =
        () => undefined
  ) {}

  async remove(
    metadata: RealtimeCommandMetadata,
    actor: RosterAssignmentRemovalCommandActor,
    removal: RosterAssignmentRemovalInput,
    comment: string
  ): Promise<
    ExecuteAtomicRosterAssignmentRemovalCommandResult
  > {
    const result =
      await this.executor.execute({
        commandId:
          metadata.commandId,
        commandType:
          "REMOVE_ROSTER_ASSIGNMENT",
        expectedStateVersion:
          metadata.stateVersion,
        requestFingerprint:
          JSON.stringify({
            commandType:
              "REMOVE_ROSTER_ASSIGNMENT",
            actorName:
              actor.name,
            actorRole:
              actor.role,
            comment,
            removal: {
              auctionSessionId:
                removal.auctionSessionId,
              rosterEntryId:
                removal.rosterEntryId
            }
          }),
        actorName:
          actor.name,
        actorRole:
          actor.role,
        comment,
        removal
      });

    if (!result.idempotentReplay) {
      try {
        await this.backupRequester
          .requestTechnicalCorrectionBackup({
            auctionSessionId:
              removal.auctionSessionId
          });
      } catch (error) {
        this.onBackupError({
          auctionSessionId:
            removal.auctionSessionId,
          error
        });
      }
    }

    return result;
  }
}
