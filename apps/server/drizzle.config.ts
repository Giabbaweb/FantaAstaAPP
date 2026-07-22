import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "drizzle-kit";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const configuredDatabasePath =
  process.env.SQLITE_DATABASE_PATH ??
  "../../data/database/fantaasta.sqlite";

const databasePath = path.isAbsolute(configuredDatabasePath)
  ? configuredDatabasePath
  : path.resolve(currentDirectory, configuredDatabasePath);

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databasePath
  },
  verbose: true,
  strict: true
});
