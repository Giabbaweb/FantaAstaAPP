import type {
  RealtimeCommandMetadata
} from "@fantaastaapp/contracts";

import type {
  TechnicalRosterCorrectionInput
} from "../services/technical-roster-correction.service.js";
import type {
  AtomicTechnicalRosterCorrectionCommandExecutor,
  ExecuteAtomicTechnicalRosterCorrectionCommandResult
} from "./atomic-technical-roster-correction-command.executor.js";

type AtomicTechnicalRosterCorrectionCommandExecutorPort =
  Pick<
    AtomicTechnicalRosterCorrectionCommandExecutor,
    "execute"
  >;

export type TechnicalRosterCorrectionCommandActor = {
  name: string;
  role:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
};

export class AtomicTechnicalRosterCorrectionCommandService {
  constructor(
    private readonly executor:
      AtomicTechnicalRosterCorrectionCommandExecutorPort
  ) {}

  async correct(
    metadata: RealtimeCommandMetadata,
    actor: TechnicalRosterCorrectionCommandActor,
    correction: TechnicalRosterCorrectionInput,
    comment: string
  ): Promise<
    ExecuteAtomicTechnicalRosterCorrectionCommandResult
  > {
    return this.executor.execute({
      commandId:
        metadata.commandId,
      commandType:
        "TECHNICAL_ROSTER_CORRECTION",
      expectedStateVersion:
        metadata.stateVersion,
      requestFingerprint:
        JSON.stringify({
          commandType:
            "TECHNICAL_ROSTER_CORRECTION",
          actorName:
            actor.name,
          actorRole:
            actor.role,
          comment,
          correction: {
            auctionSessionId:
              correction.auctionSessionId,
            rosterEntryId:
              correction.rosterEntryId,
            auctionSessionTeamId:
              correction.auctionSessionTeamId,
            playerId:
              correction.playerId,
            acquisitionCost:
              correction.acquisitionCost,
            contractYear:
              correction.contractYear
          }
        }),
      actorName:
        actor.name,
      actorRole:
        actor.role,
      comment,
      correction
    });
  }
}
