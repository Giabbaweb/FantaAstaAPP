import cors from "@fastify/cors";
import Fastify from "fastify";

import type {
  HealthStatus
} from "@fantaastaapp/contracts";
import {
  APPLICATION_NAME
} from "@fantaastaapp/domain";

import {
  sqlite
} from "./db/client.js";
import {
  SqliteAuctionCallRepository
} from "./repositories/auction-call.repository.js";
import {
  SqliteAuctionEventRepository
} from "./repositories/auction-event.repository.js";
import {
  SqliteAuctionSessionTeamRepository
} from "./repositories/auction-session-team.repository.js";
import {
  SqlitePlayerRepository
} from "./repositories/player.repository.js";
import {
  SqliteRosterEntryRepository
} from "./repositories/roster-entry.repository.js";
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
  teamRoutes
} from "./routes/team.routes.js";
import {
  AtomicAuctionCallCommandService
} from "./realtime/atomic-auction-call-command.service.js";
import {
  AtomicAuctionCommandExecutor
} from "./realtime/atomic-auction-command.executor.js";
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
import {
  NoopAuctionBackupRequester
} from "./services/auction-backup-requester.js";
import {
  AuctionCallService
} from "./services/auction-call.service.js";
import {
  ConfirmedAuctionAwardService
} from "./services/confirmed-auction-award.service.js";

export async function buildApp() {
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

  const confirmedAuctionAwardService =
    new ConfirmedAuctionAwardService(
      new SqliteAuctionSessionTeamRepository(),
      new SqliteRosterEntryRepository(),
      new SqlitePlayerRepository(),
      new SqliteAuctionEventRepository()
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
      new NoopAuctionBackupRequester(),
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
  await app.register(auctionSessionRoutes);
  await app.register(
    auctionCallRoutes(
      auctionCallService,
      auctionCallCommandCoordinator
    )
  );
  await app.register(teamRoutes);
  await app.register(ownerRoutes);
  await app.register(auctionSessionTeamRoutes);
  await app.register(playerRoutes);
  await app.register(playerImportRoutes);
  await app.register(initialRosterImportRoutes);

  app.addHook("onClose", async () => {
    sqlite.close();
  });

  return app;
}
