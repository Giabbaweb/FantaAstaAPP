import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const currentDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

const workspaceRoot = path.resolve(
  currentDirectory,
  "../.."
);

const testDatabasePath = path.resolve(
  workspaceRoot,
  "data/database/fantaasta.test.sqlite"
);

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    setupFiles: ["./src/test/setup.ts"],

    // Il database di test è condiviso: i file devono essere
    // eseguiti in sequenza, non contemporaneamente.
    fileParallelism: false,

    env: {
      SQLITE_DATABASE_PATH: testDatabasePath
    }
  }
});
