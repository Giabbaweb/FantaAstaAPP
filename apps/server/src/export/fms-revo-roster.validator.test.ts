import {
  describe,
  expect,
  it
} from "vitest";

import type {
  FmsRevoRosterExportEntry
} from "./fms-revo-roster.serializer.js";
import {
  assertFmsRevoRosterExportable,
  FmsRevoRosterValidationError
} from "./fms-revo-roster.validator.js";

function createValidRoster():
  FmsRevoRosterExportEntry[] {
  const entries: FmsRevoRosterExportEntry[] = [];

  for (let index = 1; index <= 2; index += 1) {
    entries.push({
      role: "P",
      name: `PORTIERE ${index}`,
      acquisitionCost: 1,
      contractYear: 1
    });
  }

  for (let index = 1; index <= 8; index += 1) {
    entries.push({
      role: "D",
      name: `DIFENSORE ${index}`,
      acquisitionCost: 1,
      contractYear: 1
    });
  }

  for (let index = 1; index <= 8; index += 1) {
    entries.push({
      role: "C",
      name: `CENTROCAMPISTA ${index}`,
      acquisitionCost: 1,
      contractYear: 1
    });
  }

  for (let index = 1; index <= 6; index += 1) {
    entries.push({
      role: "A",
      name: `ATTACCANTE ${index}`,
      acquisitionCost: 1,
      contractYear: 1
    });
  }

  return entries;
}

describe("assertFmsRevoRosterExportable", () => {
  it("accepts a complete 24-player roster with 2/8/8/6 roles", () => {
    expect(() =>
      assertFmsRevoRosterExportable(
        createValidRoster()
      )
    ).not.toThrow();
  });

  it("rejects a roster that does not contain exactly 24 players", () => {
    const roster =
      createValidRoster().slice(0, 23);

    expect(() =>
      assertFmsRevoRosterExportable(roster)
    ).toThrowError(
      FmsRevoRosterValidationError
    );

    try {
      assertFmsRevoRosterExportable(roster);
    } catch (error) {
      expect(
        (
          error as
            FmsRevoRosterValidationError
        ).code
      ).toBe("INVALID_ROSTER_SIZE");
    }
  });

  it("rejects a 24-player roster with invalid role distribution", () => {
    const roster = createValidRoster();

    roster[0] = {
      role: "D",
      name: "DIFENSORE EXTRA",
      acquisitionCost: 1,
      contractYear: 1
    };

    expect(() =>
      assertFmsRevoRosterExportable(roster)
    ).toThrowError(
      FmsRevoRosterValidationError
    );

    try {
      assertFmsRevoRosterExportable(roster);
    } catch (error) {
      expect(
        (
          error as
            FmsRevoRosterValidationError
        ).code
      ).toBe("INVALID_ROLE_COUNT");
    }
  });
});
