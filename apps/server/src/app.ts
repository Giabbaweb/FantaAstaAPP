import path from "node:path";

import cors from "@fastify/cors";
import Fastify from "fastify";

import type {
  HealthStatus
} from "@fantaastaapp/contracts";
import {
  APPLICATION_NAME
} from "@fantaastaapp/domain";

import {
  databasePath,
  sqlite,
  workspaceRoot
} from "./db/client.js";
import {
  SqliteAuctionCallRepository
} from "./repositories/auction-call.repository.js";
import {
  SqliteAuctionEventRepository
} from "./repositories/auction-event.repository.js";
import {
  SqliteAuctionSessionRepository
} from "./repositories/auction-session.repository.js";
import {
  SqliteAuctionSessionTeamRepository
} from "./repositories/auction-session-team.repository.js";
import {
  SqlitePlayerRepository
} from "./repositories/player.repository.js";
import {
  SqliteFmsExportGoalkeeperRepository
} from "./repositories/fms-export-goalkeeper.repository.js";
import {
  SqliteRosterEntryRepository
} from "./repositories/roster-entry.repository.js";
import {
  SqliteTeamRepository
} from "./repositories/team.repository.js";
import {
  adminActivityRoutes
} from "./routes/admin-activity.routes.js";
import {
  auctionCallRoutes
} from "./routes/auction-call.routes.js";
import {
  auctionSessionRoutes
} from "./routes/auction-session.routes.js";
import {
  auctionSessionTeamRoutes
} from "./routes/auction-session-team.routes.js";
import {
  dbHealthRoutes
} from "./routes/db-health.js";
import {
  fmsRosterExportRoutes
} from "./routes/fms-roster-export.routes.js";
import {
  fmsSessionRosterExportRoutes
} from "./routes/fms-session-roster-export.routes.js";
import {
  fmsExportGoalkeeperRoutes
} from "./routes/fms-export-goalkeeper.routes.js";
import {
  leagueRoutes
} from "./routes/league.routes.js";
import {
  manualBackupRoutes
} from "./routes/manual-backup.routes.js";
import {
  recoveryPointCatalogRoutes
} from "./routes/recovery-point-catalog.routes.js";
import {
  recoveryPointDeletionRoutes
} from "./routes/recovery-point-deletion.routes.js";
import {
  recoveryPointRestoreRoutes
} from "./routes/recovery-point-restore.routes.js";
import {
  ownerRoutes
} from "./routes/owner.routes.js";
import {
  initialRosterImportRoutes
} from "./routes/initial-roster-import.routes.js";
import {
  playerImportRoutes
} from "./routes/player-import.routes.js";
import {
  playerRoutes
} from "./routes/player.routes.js";
import {
  teamAccessRoutes
} from "./routes/team-access.routes.js";
import {
  teamRoutes
} from "./routes/team.routes.js";
import {
  AtomicAuctionCallCommandService
} from "./realtime/atomic-auction-call-command.service.js";
import {
  AtomicAuctionCommandExecutor
} from "./realtime/atomic-auction-command.executor.js";
import {
  AtomicAuctionSessionCommandExecutor
} from "./realtime/atomic-auction-session-command.executor.js";
import {
  AtomicManualInitialRosterCommandExecutor
} from "./realtime/atomic-manual-initial-roster-command.executor.js";
import {
  AtomicManualInitialRosterCommandService
} from "./realtime/atomic-manual-initial-roster-command.service.js";
import {
  AtomicManualRosterAssignmentCommandExecutor
} from "./realtime/atomic-manual-roster-assignment-command.executor.js";
import {
  AtomicManualRosterAssignmentCommandService
} from "./realtime/atomic-manual-roster-assignment-command.service.js";
import {
  AtomicTechnicalRosterCorrectionCommandExecutor
} from "./realtime/atomic-technical-roster-correction-command.executor.js";
import {
  AtomicTechnicalRosterCorrectionCommandService
} from "./realtime/atomic-technical-roster-correction-command.service.js";
import {
  FmsRosterExportService
} from "./services/fms-roster-export.service.js";
import {
  FmsSessionRosterExportService
} from "./services/fms-session-roster-export.service.js";
import {
  FmsExportGoalkeeperSelectionService
} from "./services/fms-export-goalkeeper-selection.service.js";
import {
  AuctionCallCommandCoordinator
} from "./realtime/auction-call-command-coordinator.js";
import {
  AuctionCommandSocketHandler
} from "./realtime/auction-command-socket.handler.js";
import {
  SqliteAuctionSessionStateRepository
} from "./realtime/auction-session-state.repository.js";
import {
  SqliteCommandRegistryRepository
} from "./realtime/command-registry.repository.js";
import {
  AuctionRealtimeDispatcher
} from "./realtime/auction-realtime-dispatcher.js";
import {
  AuctionSessionOperationalCommandCoordinator
} from "./realtime/auction-session-operational-command-coordinator.js";
import {
  AuctionSessionRealtimeDispatcher
} from "./realtime/auction-session-realtime-dispatcher.js";
import {
  AuctionSnapshotDispatcher
} from "./realtime/auction-snapshot-dispatcher.js";
import {
  SqliteRealtimePublicDisplayReader,
  SqliteRealtimeSnapshotSessionReader,
  SqliteRealtimeSnapshotTeamReader
} from "./realtime/realtime-snapshot.repository.js";
import {
  RealtimeSnapshotService
} from "./realtime/realtime-snapshot.service.js";
import {
  createSocketServer,
  registerAuctionCommandSocketHandler
} from "./realtime/socket-server.js";
import {
  SocketIoRealtimePublisher
} from "./realtime/socket-io-realtime-publisher.js";
import {
  AuctionCallCommandHandler
} from "./services/auction-call-command-handler.js";
import type {
  AuctionBackupRequester
} from "./services/auction-backup-requester.js";
import {
  SqliteAuctionBackupRequester
} from "./services/sqlite-auction-backup-requester.js";
import type {
  BackupRecoveryTechnicalLogger
} from "./services/backup-recovery-technical-logger.js";
import {
  AuctionCallService
} from "./services/auction-call.service.js";
import {
  AuctionSessionOperationalCommandService
} from "./services/auction-session-operational-command.service.js";
import {
  ConfirmedAuctionAwardService
} from "./services/confirmed-auction-award.service.js";
import {
  ManualBackupService
} from "./services/manual-backup.service.js";
import {
  RecoveryPointCatalogService
} from "./services/recovery-point-catalog.service.js";
import {
  RecoveryPointDeletionService
} from "./services/recovery-point-deletion.service.js";
import {
  RecoveryPointRestoreService
} from "./services/recovery-point-restore.service.js";
import {
  RestoreRuntimeCoordinator
} from "./services/restore-runtime-coordinator.js";
import {
  SqliteRecoveryPointService
} from "./services/sqlite-recovery-point.service.js";
import {
  ManualInitialRosterEntryService
} from "./services/manual-initial-roster-entry.service.js";
import {
  ManualRosterAssignmentService
} from "./services/manual-roster-assignment.service.js";
import {
  TechnicalRosterCorrectionService
} from "./services/technical-roster-correction.service.js";

export type BuildAppOptions = {
  backupRecoveryTechnicalLogger?:
    BackupRecoveryTechnicalLogger;
  auctionBackupRequester?:
    AuctionBackupRequester;
  manualBackupService?:
    ManualBackupService;
  recoveryPointCatalogService?:
    Pick<
      RecoveryPointCatalogService,
      "listForAuctionSession"
    >;
  recoveryPointDeletionService?:
    Pick<
      RecoveryPointDeletionService,
      "deleteRecoveryPoint"
    >;
  recoveryPointRestoreService?:
    Pick<
      RecoveryPointRestoreService,
      "prepareRestore"
    >;
  restoreRuntimeCoordinator?:
    Pick<
      RestoreRuntimeCoordinator,
      | "prepareAndSchedule"
      | "markResponseFlushed"
    >;
};

export async function buildApp(
  options: BuildAppOptions = {}
) {
  const app = Fastify({
    logger: true
  });

  const auctionCallRepository =
    new SqliteAuctionCallRepository();

  const realtimeSnapshotService =
    new RealtimeSnapshotService(
      new SqliteRealtimeSnapshotSessionReader(),
      new SqliteRealtimeSnapshotTeamReader(),
      auctionCallRepository,
      new SqliteRealtimePublicDisplayReader()
    );

  const {
    io,
    connectionManager
  } = createSocketServer(
    app,
    realtimeSnapshotService
  );

  const realtimePublisher =
    new SocketIoRealtimePublisher(io);

  const auctionRealtimeDispatcher =
    new AuctionRealtimeDispatcher(
      realtimePublisher
    );

  const auctionSessionRealtimeDispatcher =
    new AuctionSessionRealtimeDispatcher(
      realtimePublisher
    );

  const auctionSnapshotDispatcher =
    new AuctionSnapshotDispatcher(
      realtimeSnapshotService,
      realtimePublisher
    );

  const auctionCallCommandHandler =
    new AuctionCallCommandHandler();

  const auctionCallService =
    new AuctionCallService(
      auctionCallRepository,
      auctionCallCommandHandler
    );

  const atomicAuctionCommandExecutor =
    new AtomicAuctionCommandExecutor(
      auctionCallRepository,
      new SqliteAuctionSessionStateRepository(),
      new SqliteCommandRegistryRepository()
    );

  const auctionSessionRepository =
    new SqliteAuctionSessionRepository();

  const atomicAuctionSessionCommandExecutor =
    new AtomicAuctionSessionCommandExecutor(
      auctionSessionRepository,
      new SqliteAuctionSessionStateRepository(),
      new SqliteCommandRegistryRepository(),
      new SqliteAuctionEventRepository(),
      auctionCallRepository
    );

  const auctionSessionOperationalCommandService =
    new AuctionSessionOperationalCommandService(
      atomicAuctionSessionCommandExecutor
    );

  const manualInitialRosterEntryService =
    new ManualInitialRosterEntryService(
      auctionSessionRepository,
      new SqliteAuctionSessionTeamRepository(),
      new SqliteRosterEntryRepository(),
      new SqlitePlayerRepository()
    );

  const atomicManualInitialRosterCommandExecutor =
    new AtomicManualInitialRosterCommandExecutor(
      new SqliteAuctionSessionStateRepository(),
      new SqliteCommandRegistryRepository(),
      manualInitialRosterEntryService,
      new SqliteAuctionSessionTeamRepository(),
      new SqliteAuctionEventRepository()
    );

  const atomicManualInitialRosterCommandService =
    new AtomicManualInitialRosterCommandService(
      atomicManualInitialRosterCommandExecutor
    );

  const recoveryPointService =
    new SqliteRecoveryPointService({
      sqlite,
      backupRoot: path.join(
        workspaceRoot,
        "backups"
      ),
      ...(
        options.backupRecoveryTechnicalLogger
          ? {
              technicalLogger:
                options.backupRecoveryTechnicalLogger
            }
          : {}
      )
    });

  const auctionBackupRequester =
    options.auctionBackupRequester ??
    new SqliteAuctionBackupRequester(
      recoveryPointService
    );

  const manualBackupService =
    options.manualBackupService ??
    new ManualBackupService(
      recoveryPointService
    );

  const recoveryPointCatalogService =
    options.recoveryPointCatalogService ??
    new RecoveryPointCatalogService({
      backupRoot: path.join(
        workspaceRoot,
        "backups"
      )
    });

  const recoveryPointDeletionService =
    options.recoveryPointDeletionService ??
    new RecoveryPointDeletionService({
      backupRoot: path.join(
        workspaceRoot,
        "backups"
      )
    });

  const recoveryPointRestoreService =
    options.recoveryPointRestoreService ??
    new RecoveryPointRestoreService({
      sqlite,
      backupRoot: path.join(
        workspaceRoot,
        "backups"
      ),
      databasePath,
      recoveryPointCreator:
        recoveryPointService,
      ...(
        options.backupRecoveryTechnicalLogger
          ? {
              technicalLogger:
                options.backupRecoveryTechnicalLogger
            }
          : {}
      )
    });

  const restoreRuntimeCoordinator =
    options.restoreRuntimeCoordinator ??
    new RestoreRuntimeCoordinator();

  const manualRosterAssignmentService =
    new ManualRosterAssignmentService(
      auctionSessionRepository,
      new SqliteAuctionSessionTeamRepository(),
      new SqliteRosterEntryRepository(),
      new SqlitePlayerRepository()
    );

  const atomicManualRosterAssignmentCommandExecutor =
    new AtomicManualRosterAssignmentCommandExecutor(
      new SqliteAuctionSessionStateRepository(),
      new SqliteCommandRegistryRepository(),
      manualRosterAssignmentService,
      new SqliteAuctionSessionTeamRepository(),
      new SqliteAuctionEventRepository()
    );

  const atomicManualRosterAssignmentCommandService =
    new AtomicManualRosterAssignmentCommandService(
      atomicManualRosterAssignmentCommandExecutor,
      auctionBackupRequester,
      ({
        auctionSessionId,
        error
      }) => {
        app.log.error(
          {
            module: "backup",
            auctionSessionId,
            backupType:
              "MANUAL_ASSIGNMENT",
            error
          },
          "Post-commit manual assignment backup failed"
        );
      }
    );

  const technicalRosterCorrectionService =
    new TechnicalRosterCorrectionService(
      auctionSessionRepository,
      new SqliteAuctionSessionTeamRepository(),
      new SqliteRosterEntryRepository(),
      new SqlitePlayerRepository()
    );

  const atomicTechnicalRosterCorrectionCommandExecutor =
    new AtomicTechnicalRosterCorrectionCommandExecutor(
      new SqliteAuctionSessionStateRepository(),
      new SqliteCommandRegistryRepository(),
      technicalRosterCorrectionService,
      new SqliteAuctionEventRepository()
    );

  const atomicTechnicalRosterCorrectionCommandService =
    new AtomicTechnicalRosterCorrectionCommandService(
      atomicTechnicalRosterCorrectionCommandExecutor,
      auctionBackupRequester,
      ({
        auctionSessionId,
        error
      }) => {
        app.log.error(
          {
            module: "backup",
            auctionSessionId,
            backupType:
              "TECHNICAL_CORRECTION",
            error
          },
          "Post-commit technical correction backup failed"
        );
      }
    );

  const auctionSessionOperationalCommandCoordinator =
    new AuctionSessionOperationalCommandCoordinator(
      auctionSessionOperationalCommandService,
      auctionSessionRealtimeDispatcher,
      auctionSnapshotDispatcher,
      auctionBackupRequester,
      ({
        stage,
        type,
        auctionSessionId,
        error
      }) => {
        app.log.error(
          {
            module: "realtime",
            auctionSessionId,
            dispatchStage: stage,
            eventType: type,
            error
          },
          "Failed to publish auction session realtime event"
        );
      }
    );

  const confirmedAuctionAwardService =
    new ConfirmedAuctionAwardService(
      new SqliteAuctionSessionTeamRepository(),
      new SqliteRosterEntryRepository(),
      new SqlitePlayerRepository(),
      new SqliteAuctionEventRepository()
    );

  const fmsRosterExportService =
    new FmsRosterExportService(
      auctionSessionRepository,
      new SqliteAuctionSessionTeamRepository(),
      new SqliteRosterEntryRepository(),
      new SqlitePlayerRepository(),
      new SqliteFmsExportGoalkeeperRepository()
    );

  const fmsSessionRosterExportService =
    new FmsSessionRosterExportService(
      auctionSessionRepository,
      new SqliteAuctionSessionTeamRepository(),
      fmsRosterExportService,
      new SqliteTeamRepository()
    );

  const fmsExportGoalkeeperSelectionService =
    new FmsExportGoalkeeperSelectionService(
      auctionSessionRepository,
      new SqliteAuctionSessionTeamRepository(),
      new SqlitePlayerRepository(),
      new SqliteRosterEntryRepository(),
      new SqliteFmsExportGoalkeeperRepository()
    );

  const atomicAuctionCallCommandService =
    new AtomicAuctionCallCommandService(
      atomicAuctionCommandExecutor,
      auctionCallCommandHandler,
      confirmedAuctionAwardService
    );

  const auctionCallCommandCoordinator =
    new AuctionCallCommandCoordinator(
      atomicAuctionCallCommandService,
      auctionRealtimeDispatcher,
      auctionSnapshotDispatcher,
      auctionBackupRequester,
      ({
        stage,
        type,
        aggregate,
        error
      }) => {
        app.log.error(
          {
            module: "realtime",
            auctionSessionId:
              aggregate.call.auctionSessionId,
            auctionCallId:
              aggregate.call.id,
            dispatchStage: stage,
            eventType: type,
            error
          },
          "Failed to publish auction realtime event"
        );
      }
    );

  const auctionCommandSocketHandler =
    new AuctionCommandSocketHandler(
      connectionManager,
      auctionCallService,
      auctionCallCommandCoordinator
    );

  registerAuctionCommandSocketHandler(
    io,
    auctionCommandSocketHandler
  );

  await app.register(cors, {
    origin: true
  });

  app.get(
    "/api/health",
    async (): Promise<HealthStatus> => {
      return {
        status: "ok",
        application: APPLICATION_NAME,
        timestamp: new Date().toISOString()
      };
    }
  );

  await app.register(dbHealthRoutes);
  await app.register(leagueRoutes);
  await app.register(adminActivityRoutes);
  await app.register(
    manualBackupRoutes(
      manualBackupService
    )
  );
  await app.register(
    recoveryPointCatalogRoutes(
      recoveryPointCatalogService
    )
  );
  await app.register(
    recoveryPointDeletionRoutes(
      recoveryPointDeletionService
    )
  );
  await app.register(
    recoveryPointRestoreRoutes(
      recoveryPointRestoreService,
      restoreRuntimeCoordinator
    )
  );
  await app.register(
    auctionSessionRoutes(
      auctionSessionOperationalCommandCoordinator,
      atomicManualInitialRosterCommandService,
      atomicManualRosterAssignmentCommandService,
      atomicTechnicalRosterCorrectionCommandService,
      auctionBackupRequester
    )
  );
  await app.register(
    auctionCallRoutes(
      auctionCallService,
      auctionCallCommandCoordinator
    )
  );
  await app.register(teamAccessRoutes);
  await app.register(teamRoutes);
  await app.register(ownerRoutes);
  await app.register(auctionSessionTeamRoutes);
  await app.register(playerRoutes);
  await app.register(playerImportRoutes);
  await app.register(initialRosterImportRoutes);

  await app.register(
    fmsRosterExportRoutes(
      fmsRosterExportService,
      new SqliteTeamRepository()
    )
  );

  await app.register(
    fmsSessionRosterExportRoutes(
      fmsSessionRosterExportService
    )
  );

  await app.register(
    fmsExportGoalkeeperRoutes(
      fmsExportGoalkeeperSelectionService
    )
  );

  app.addHook("onClose", async () => {
    sqlite.close();
  });

  return app;
}
