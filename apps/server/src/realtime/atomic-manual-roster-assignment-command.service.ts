import type {
  ManualRosterAssignmentReason,
  RealtimeCommandMetadata
} from "@fantaastaapp/contracts";

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

export type ManualRosterAssignmentCommandActor = {
  name: string;
  role:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
};

export class AtomicManualRosterAssignmentCommandService {
  constructor(
    private readonly executor:
      AtomicManualRosterAssignmentCommandExecutorPort
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
    return this.executor.execute({
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
  }
}
