import "dotenv/config";

import cors from "@fastify/cors";
import Fastify from "fastify";

import type { HealthStatus } from "@fantaastaapp/contracts";
import { APPLICATION_NAME } from "@fantaastaapp/domain";

import { sqlite } from "./db/client.js";
import { dbHealthRoutes } from "./routes/db-health.js";
import { auctionSessionRoutes } from "./routes/auction-session.routes.js";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3001);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(
    `PORT non valida: ${process.env.PORT ?? ""}`
  );
}

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

app.get("/api/health", async (): Promise<HealthStatus> => {
  return {
    status: "ok",
    application: APPLICATION_NAME,
    timestamp: new Date().toISOString()
  };
});

await app.register(dbHealthRoutes);

await app.register(auctionSessionRoutes);

app.addHook("onClose", async () => {
  sqlite.close();
});

const start = async (): Promise<void> => {
  try {
    await app.listen({
      host,
      port
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();
