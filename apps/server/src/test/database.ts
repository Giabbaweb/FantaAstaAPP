import path from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import {
  db,
  sqlite
} from "../db/client.js";

type TableRecord = {
  name: string;
};

const currentDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

const migrationsFolder = path.resolve(
  currentDirectory,
  "../../drizzle"
);

export function migrateTestDatabase(): void {
  migrate(db, {
    migrationsFolder
  });
}

export function resetTestDatabase(): void {
  const tables = sqlite
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '__drizzle_%'
      ORDER BY name
    `)
    .all() as TableRecord[];

  sqlite.pragma("foreign_keys = OFF");

  try {
    const reset = sqlite.transaction(() => {
      for (const table of tables) {
        const escapedTableName =
          table.name.replaceAll('"', '""');

        sqlite
          .prepare(
            `DELETE FROM "${escapedTableName}"`
          )
          .run();
      }
    });

    reset();
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }
}
