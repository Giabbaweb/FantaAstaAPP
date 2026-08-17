import type {
  ManualInitialRosterCommandActor
} from "@fantaastaapp/contracts";

import type {
  CreateRecoveryPointResult
} from "./sqlite-recovery-point.service.js";

type RecoveryPointCreatorPort = {
  createRecoveryPoint(input: {
    auctionSessionId: string;
    reason: "MANUAL_BACKUP";
  }): Promise<CreateRecoveryPointResult>;
};

export type ManualBackupResult = {
  actor: ManualInitialRosterCommandActor;
  createdAt: string;
  reason: "MANUAL_BACKUP";
  league: {
    id: string;
    name: string;
  };
  auctionSession: {
    id: string;
    season: string;
    editionNumber: number;
    status: string;
    stateVersion: number;
  };
  database: {
    fileName: string;
    sizeBytes: number;
  };
  integrity: {
    status:
      | "VALID"
      | "INVALID"
      | "UNCHECKED"
      | "INCOMPATIBLE";
    messages: string[];
  };
  timing: {
    backupDurationMs: number;
    totalDurationMs: number;
  };
};

export class ManualBackupService {
  constructor(
    private readonly recoveryPointCreator:
      RecoveryPointCreatorPort
  ) {}

  async create(
    auctionSessionId: string,
    actor: ManualInitialRosterCommandActor
  ): Promise<ManualBackupResult> {
    const result =
      await this.recoveryPointCreator
        .createRecoveryPoint({
          auctionSessionId,
          reason: "MANUAL_BACKUP"
        });

    const {
      manifest
    } = result;

    return {
      actor,
      createdAt:
        manifest.createdAt,
      reason:
        "MANUAL_BACKUP",
      league: {
        id:
          manifest.league.id,
        name:
          manifest.league.name
      },
      auctionSession: {
        id:
          manifest.auctionSession.id,
        season:
          manifest.auctionSession.season,
        editionNumber:
          manifest.auctionSession
            .editionNumber,
        status:
          manifest.auctionSession.status,
        stateVersion:
          manifest.auctionSession
            .stateVersion
      },
      database: {
        fileName:
          manifest.database.fileName,
        sizeBytes:
          manifest.database.sizeBytes
      },
      integrity: {
        status:
          manifest.integrity.status,
        messages:
          manifest.integrity.messages
      },
      timing: {
        backupDurationMs:
          manifest.timing.backupDurationMs,
        totalDurationMs:
          manifest.timing.totalDurationMs
      }
    };
  }
}
