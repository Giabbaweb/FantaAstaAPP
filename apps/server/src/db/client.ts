import "dotenv/config";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema/index.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const workspaceRoot = path.resolve(
  currentDirectory,
  "../../../.."
);

const configuredDatabasePath =
  process.env.SQLITE_DATABASE_PATH ??
  "data/database/fantaasta.sqlite";

export const databasePath = path.isAbsolute(configuredDatabasePath)
  ? configuredDatabasePath
  : path.resolve(workspaceRoot, configuredDatabasePath);

mkdirSync(path.dirname(databasePath), {
  recursive: true
});

export const sqlite: Database.Database = new Database(databasePath);

sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, {
  schema
});

export type DatabaseWriteExecutor = Pick<
  typeof db,
  "select" | "insert" | "update" | "delete"
>;
