import {
  describe,
  expect,
  it
} from "vitest";

import {
  assertRosterAssignmentRemovalAllowed
} from "./roster-assignment-removal.js";

describe(
  "assertRosterAssignmentRemovalAllowed",
  () => {
    it.each([
      "SETUP",
      "READY",
      "SUSPENDED",
      "COMPLETED"
    ] as const)(
      "allows roster assignment removal in %s",
      (auctionSessionStatus) => {
        expect(() =>
          assertRosterAssignmentRemovalAllowed({
            auctionSessionStatus
          })
        ).not.toThrow();
      }
    );

    it.each([
      "RUNNING",
      "CLOSED"
    ] as const)(
      "rejects roster assignment removal in %s",
      (auctionSessionStatus) => {
        expect(() =>
          assertRosterAssignmentRemovalAllowed({
            auctionSessionStatus
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "ROSTER_ASSIGNMENT_REMOVAL_NOT_ALLOWED_IN_SESSION_STATUS"
          })
        );
      }
    );
  }
);
