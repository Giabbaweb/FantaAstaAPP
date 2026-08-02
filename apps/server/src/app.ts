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
  AuctionCallCommandCoordinator
} from "./realtime/auction-call-command-coordinator.js";
import {
  AuctionRealtimeDispatcher
} from "./realtime/auction-realtime-dispatcher.js";
import {
  createSocketServer
} from "./realtime/socket-server.js";
import {
  SocketIoRealtimePublisher
} from "./realtime/socket-io-realtime-publisher.js";
import {
  AuctionCallService
} from "./services/auction-call.service.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  const io = createSocketServer(app);

  const realtimePublisher =
    new SocketIoRealtimePublisher(io);

  const auctionRealtimeDispatcher =
    new AuctionRealtimeDispatcher(
      realtimePublisher
    );

  const auctionCallRepository =
    new SqliteAuctionCallRepository();

  const auctionCallService =
    new AuctionCallService(
      auctionCallRepository
    );

  const auctionCallCommandCoordinator =
    new AuctionCallCommandCoordinator(
      auctionCallService,
      auctionRealtimeDispatcher,
      ({ type, aggregate, error }) => {
        app.log.error(
          {
            module: "realtime",
            auctionSessionId:
              aggregate.call.auctionSessionId,
            auctionCallId:
              aggregate.call.id,
            eventType: type,
            error
          },
          "Failed to publish auction realtime event"
        );
      }
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
