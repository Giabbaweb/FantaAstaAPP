import {
  db
} from "../db/client.js";

import type {
  AuctionEventRepository
} from "../repositories/auction-event.repository.js";

import {
  SqliteAuctionEventRepository
} from "../repositories/auction-event.repository.js";

import type {
  AuctionSessionRepository
} from "../repositories/auction-session.repository.js";

import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";

import type {
  AuctionSessionStateRepository
} from "../realtime/auction-session-state.repository.js";

import {
  SqliteAuctionSessionStateRepository
} from "../realtime/auction-session-state.repository.js";

import type {
  CreateRecoveryPointInput
} from "./sqlite-recovery-point.service.js";

import {
  SqliteRecoveryPointService
} from "./sqlite-recovery-point.service.js";

import {
  sqlite,
  workspaceRoot
} from "../db/client.js";

import path from "node:path";

type RecoveryPointCreator = {
  createRecoveryPoint(
    input: CreateRecoveryPointInput
  ): Promise<unknown>;
};

export type StartupRecoverySessionResult = {
  auctionSessionId: string;
  previousStateVersion: number;
  recoveredStateVersion: number;
  backupSucceeded: boolean;
  backupError?: unknown;
};

export type StartupRecoveryResult = {
  recoveredSessions:
    StartupRecoverySessionResult[];
};

export class StartupRecoveryService {
  constructor(
    private readonly auctionSessionRepository:
      AuctionSessionRepository =
        new SqliteAuctionSessionRepository(),

    private readonly stateRepository:
      AuctionSessionStateRepository =
        new SqliteAuctionSessionStateRepository(),

    private readonly auctionEventRepository:
      AuctionEventRepository =
        new SqliteAuctionEventRepository(),

    private readonly recoveryPointCreator:
      RecoveryPointCreator =
        new SqliteRecoveryPointService({
          sqlite,
          backupRoot: path.join(
            workspaceRoot,
            "backups"
          )
        })
  ) {}

  async run(): Promise<StartupRecoveryResult> {
    const sessions =
      await this.auctionSessionRepository
        .findAll();

    const runningSessions =
      sessions.filter(
        (session) =>
          session.status === "RUNNING"
      );

    const recoveredSessions:
      StartupRecoverySessionResult[] = [];

    for (
      const session of runningSessions
    ) {
      const currentState =
        await this.stateRepository
          .findByAuctionSessionId(
            session.id
          );

      if (
        !currentState ||
        currentState.status !== "RUNNING"
      ) {
        continue;
      }

      const transitionResult =
        db.transaction((tx) => {
          const stateInsideTransaction =
            this.stateRepository
              .findByAuctionSessionIdWithExecutor(
                tx,
                session.id
              );

          if (
            !stateInsideTransaction ||
            stateInsideTransaction.status !==
              "RUNNING"
          ) {
            return null;
          }

          const updatedState =
            this.stateRepository
              .updateOperationalStateIfMatchesWithExecutor(
                tx,
                session.id,
                stateInsideTransaction
                  .stateVersion,
                {
                  status: "SUSPENDED",
                  suspensionReason:
                    "RECOVERY_RESTART"
                }
              );

          if (!updatedState) {
            throw new Error(
              `Failed to suspend RUNNING auction session "${session.id}" during startup recovery`
            );
          }

          this.auctionEventRepository
            .createWithExecutor(
              tx,
              {
                auctionSessionId:
                  session.id,
                eventType:
                  "SESSION_SUSPENDED",
                suspensionReason:
                  "RECOVERY_RESTART"
              }
            );

          return {
            previousStateVersion:
              stateInsideTransaction
                .stateVersion,
            recoveredStateVersion:
              updatedState.stateVersion
          };
        });

      if (!transitionResult) {
        continue;
      }

      try {
        await this.recoveryPointCreator
          .createRecoveryPoint({
            auctionSessionId:
              session.id,
            reason:
              "RECOVERY_RESTART"
          });

        recoveredSessions.push({
          auctionSessionId:
            session.id,
          previousStateVersion:
            transitionResult
              .previousStateVersion,
          recoveredStateVersion:
            transitionResult
              .recoveredStateVersion,
          backupSucceeded: true
        });
      } catch (error) {
        recoveredSessions.push({
          auctionSessionId:
            session.id,
          previousStateVersion:
            transitionResult
              .previousStateVersion,
          recoveredStateVersion:
            transitionResult
              .recoveredStateVersion,
          backupSucceeded: false,
          backupError: error
        });
      }
    }

    return {
      recoveredSessions
    };
  }
}
