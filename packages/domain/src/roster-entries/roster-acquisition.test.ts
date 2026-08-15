import {
  describe,
  expect,
  it
} from "vitest";

import {
  assertRosterAcquisitionAllowed
} from "./roster-acquisition.js";

describe("assertRosterAcquisitionAllowed", () => {
  it("allows a sustainable roster acquisition", () => {
    expect(() =>
      assertRosterAcquisitionAllowed({
        playerRole: "A",
        currentRosterSize: 10,
        currentRoleCount: 2,
        remainingCredits: 100,
        acquisitionCost: 50
      })
    ).not.toThrow();
  });

  it("allows the maximum sustainable acquisition cost", () => {
    expect(() =>
      assertRosterAcquisitionAllowed({
        playerRole: "A",
        currentRosterSize: 14,
        currentRoleCount: 3,
        remainingCredits: 20,
        acquisitionCost: 11
      })
    ).not.toThrow();
  });

  it("rejects an acquisition above the maximum sustainable cost", () => {
    expect(() =>
      assertRosterAcquisitionAllowed({
        playerRole: "A",
        currentRosterSize: 14,
        currentRoleCount: 3,
        remainingCredits: 20,
        acquisitionCost: 12
      })
    ).toThrowError(
      expect.objectContaining({
        code:
          "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER"
      })
    );
  });

  it("rejects an acquisition above remaining credits", () => {
    expect(() =>
      assertRosterAcquisitionAllowed({
        playerRole: "A",
        currentRosterSize: 23,
        currentRoleCount: 5,
        remainingCredits: 5,
        acquisitionCost: 6
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INSUFFICIENT_CREDITS"
      })
    );
  });

  it("rejects a full roster", () => {
    expect(() =>
      assertRosterAcquisitionAllowed({
        playerRole: "A",
        currentRosterSize: 24,
        currentRoleCount: 5,
        remainingCredits: 20,
        acquisitionCost: 1
      })
    ).toThrowError(
      expect.objectContaining({
        code: "ROSTER_SIZE_LIMIT_EXCEEDED"
      })
    );
  });

  it("rejects a full role slot", () => {
    expect(() =>
      assertRosterAcquisitionAllowed({
        playerRole: "P",
        currentRosterSize: 10,
        currentRoleCount: 2,
        remainingCredits: 100,
        acquisitionCost: 1
      })
    ).toThrowError(
      expect.objectContaining({
        code: "ROSTER_ROLE_LIMIT_EXCEEDED"
      })
    );
  });

  it("rejects an invalid acquisition cost", () => {
    expect(() =>
      assertRosterAcquisitionAllowed({
        playerRole: "C",
        currentRosterSize: 10,
        currentRoleCount: 3,
        remainingCredits: 100,
        acquisitionCost: 0
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_ACQUISITION_COST"
      })
    );
  });
});
