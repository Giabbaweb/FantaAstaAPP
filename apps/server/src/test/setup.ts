import {
  beforeAll,
  beforeEach
} from "vitest";

import {
  migrateTestDatabase,
  resetTestDatabase
} from "./database.js";

beforeAll(() => {
  migrateTestDatabase();
});

beforeEach(() => {
  resetTestDatabase();
});
