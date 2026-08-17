import path from "node:path";

import {
  sqlite,
  workspaceRoot
} from "../db/client.js";

import type {
  AuctionBackupRequester,
  CompletedSessionBackupRequest,
  ConfirmedAwardBackupRequest,
  ManualAssignmentBackupRequest,
  SuspendedSessionBackupRequest,
  TechnicalCorrectionBackupRequest
} from "./auction-backup-requester.js";

import {
  SqliteRecoveryPointService
} from "./sqlite-recovery-point.service.js";

import type {
  CreateRecoveryPointInput
} from "./sqlite-recovery-point.service.js";

type RecoveryPointCreator = {
  createRecoveryPoint(
    input: CreateRecoveryPointInput
  ): Promise<unknown>;
};

export class SqliteAuctionBackupRequester
  implements AuctionBackupRequester
{
  private readonly recoveryPointCreator:
    RecoveryPointCreator;

  constructor(
    recoveryPointCreator:
      RecoveryPointCreator =
        new SqliteRecoveryPointService({
          sqlite,
          backupRoot: path.join(
            workspaceRoot,
            "backups"
          )
        })
  ) {
    this.recoveryPointCreator =
      recoveryPointCreator;
  }

  async requestConfirmedAwardBackup(
    request: ConfirmedAwardBackupRequest
  ): Promise<void> {
    await this.recoveryPointCreator
      .createRecoveryPoint({
        auctionSessionId:
          request.auctionSessionId,
        reason: "CONFIRMED_AWARD"
      });
  }

  async requestSuspendedSessionBackup(
    request: SuspendedSessionBackupRequest
  ): Promise<void> {
    await this.recoveryPointCreator
      .createRecoveryPoint({
        auctionSessionId:
          request.auctionSessionId,
        reason: "SESSION_SUSPENDED"
      });
  }

  async requestManualAssignmentBackup(
    request: ManualAssignmentBackupRequest
  ): Promise<void> {
    await this.recoveryPointCreator
      .createRecoveryPoint({
        auctionSessionId:
          request.auctionSessionId,
        reason: "MANUAL_ASSIGNMENT"
      });
  }

  async requestTechnicalCorrectionBackup(
    request: TechnicalCorrectionBackupRequest
  ): Promise<void> {
    await this.recoveryPointCreator
      .createRecoveryPoint({
        auctionSessionId:
          request.auctionSessionId,
        reason: "TECHNICAL_CORRECTION"
      });
  }

  async requestCompletedSessionBackup(
    request: CompletedSessionBackupRequest
  ): Promise<void> {
    await this.recoveryPointCreator
      .createRecoveryPoint({
        auctionSessionId:
          request.auctionSessionId,
        reason: "SESSION_COMPLETED"
      });
  }
}
