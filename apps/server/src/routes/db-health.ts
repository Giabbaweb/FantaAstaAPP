import path from "node:path";

import type { FastifyPluginAsync } from "fastify";

import {
  databasePath,
  sqlite
} from "../db/client.js";

type DatabaseCheck = {
  ok: number;
};

type TableRecord = {
  name: string;
};

type ForeignKeysCheck = {
  foreign_keys: number;
};

export const dbHealthRoutes: FastifyPluginAsync = async (
  app
): Promise<void> => {
  app.get("/api/db-health", async () => {
    const databaseCheck = sqlite
      .prepare("SELECT 1 AS ok")
      .get() as DatabaseCheck;

    const foreignKeysCheck = sqlite
      .prepare("PRAGMA foreign_keys")
      .get() as ForeignKeysCheck;

    const tableRecords = sqlite
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
          AND name NOT LIKE '__drizzle_%'
        ORDER BY name
      `)
      .all() as TableRecord[];

    return {
      status: databaseCheck.ok === 1 ? "ok" : "error",
      database: path.basename(databasePath),
      foreignKeysEnabled:
        foreignKeysCheck.foreign_keys === 1,
      tables: tableRecords.map((table) => table.name),
      timestamp: new Date().toISOString()
    };
  });
};
