import type {
  RealtimeCommandMetadata
} from "@fantaastaapp/contracts";

import type {
  ManualInitialRosterEntryInput
} from "../services/manual-initial-roster-entry.service.js";
import type {
  AtomicManualInitialRosterCommandExecutor,
  ExecuteAtomicManualInitialRosterCommandResult
} from "./atomic-manual-initial-roster-command.executor.js";

type AtomicManualInitialRosterCommandExecutorPort = Pick<
  AtomicManualInitialRosterCommandExecutor,
  "execute"
>;

export type ManualInitialRosterCommandActor = {
  name: string;
  role:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
};

export class AtomicManualInitialRosterCommandService {
  constructor(
    private readonly executor:
      AtomicManualInitialRosterCommandExecutorPort
  ) {}

  async add(
    metadata: RealtimeCommandMetadata,
    actor: ManualInitialRosterCommandActor,
    entry: ManualInitialRosterEntryInput,
    comment?: string | null
  ): Promise<ExecuteAtomicManualInitialRosterCommandResult> {
    const normalizedComment =
      comment ?? null;

    return this.executor.execute({
      commandId: metadata.commandId,
      commandType:
        "ADD_MANUAL_INITIAL_ROSTER_ENTRY",
      expectedStateVersion:
        metadata.stateVersion,
      requestFingerprint:
        JSON.stringify({
          commandType:
            "ADD_MANUAL_INITIAL_ROSTER_ENTRY",
          actorName: actor.name,
          actorRole: actor.role,
          comment: normalizedComment,
          entry: {
            auctionSessionId:
              entry.auctionSessionId,
            auctionSessionTeamId:
              entry.auctionSessionTeamId,
            playerId:
              entry.playerId,
            acquisitionCost:
              entry.acquisitionCost,
            contractYear:
              entry.contractYear
          }
        }),
      actorName: actor.name,
      actorRole: actor.role,
      comment: normalizedComment,
      entry
    });
  }
}
