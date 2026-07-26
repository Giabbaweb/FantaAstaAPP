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
  auctionSessionRoutes
} from "./routes/auction-session.routes.js";
import {
  dbHealthRoutes
} from "./routes/db-health.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

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

  app.addHook("onClose", async () => {
    sqlite.close();
  });

  return app;
}
