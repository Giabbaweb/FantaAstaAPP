import {
  describe,
  expect,
  it
} from "vitest";

import {
  assertManualRosterAssignmentAllowed,
  manualRosterAssignmentReasons
} from "./manual-roster-assignment.js";

const validInput = {
  auctionSessionStatus: "READY" as const,
  playerRole: "C" as const,
  currentRosterSize: 10,
  currentRoleCount: 2,
  remainingCredits: 200,
  acquisitionCost: 20,
  contractYear: 2
};

describe(
  "assertManualRosterAssignmentAllowed",
  () => {
    it.each([
      "SETUP",
      "READY",
      "SUSPENDED",
      "COMPLETED"
    ] as const)(
      "allows a valid manual roster assignment in %s",
      (auctionSessionStatus) => {
        expect(() =>
          assertManualRosterAssignmentAllowed({
            ...validInput,
            auctionSessionStatus
          })
        ).not.toThrow();
      }
    );

    it.each([
      "RUNNING",
      "CLOSED"
    ] as const)(
      "rejects a manual roster assignment in %s",
      (auctionSessionStatus) => {
        expect(() =>
          assertManualRosterAssignmentAllowed({
            ...validInput,
            auctionSessionStatus
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "MANUAL_ASSIGNMENT_NOT_ALLOWED_IN_SESSION_STATUS"
          })
        );
      }
    );

    it(
      "defines the supported manual assignment reasons",
      () => {
        expect(
          manualRosterAssignmentReasons
        ).toEqual([
          "OPTION_EXERCISED_MANUALLY",
          "OPTION_NO_EXTERNAL_BID",
          "TECHNICAL_CORRECTION",
          "OTHER"
        ]);
      }
    );

    it(
      "rejects an invalid contract year",
      () => {
        expect(() =>
          assertManualRosterAssignmentAllowed({
            ...validInput,
            contractYear: 4
          })
        ).toThrowError(
          expect.objectContaining({
            code: "INVALID_CONTRACT_YEAR"
          })
        );
      }
    );

    it(
      "rejects an invalid acquisition cost",
      () => {
        expect(() =>
          assertManualRosterAssignmentAllowed({
            ...validInput,
            acquisitionCost: 0
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INVALID_ACQUISITION_COST"
          })
        );
      }
    );

    it(
      "rejects a full player role",
      () => {
        expect(() =>
          assertManualRosterAssignmentAllowed({
            ...validInput,
            playerRole: "P",
            currentRoleCount: 2
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "ROSTER_ROLE_LIMIT_EXCEEDED"
          })
        );
      }
    );

    it(
      "rejects a full roster",
      () => {
        expect(() =>
          assertManualRosterAssignmentAllowed({
            ...validInput,
            currentRosterSize: 24
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "ROSTER_SIZE_LIMIT_EXCEEDED"
          })
        );
      }
    );

    it(
      "rejects an acquisition above remaining credits",
      () => {
        expect(() =>
          assertManualRosterAssignmentAllowed({
            ...validInput,
            remainingCredits: 10,
            acquisitionCost: 11
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INSUFFICIENT_CREDITS"
          })
        );
      }
    );

    it(
      "rejects an economically unsustainable assignment",
      () => {
        expect(() =>
          assertManualRosterAssignmentAllowed({
            ...validInput,
            currentRosterSize: 10,
            remainingCredits: 20,
            acquisitionCost: 8
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER"
          })
        );
      }
    );

    it(
      "allows an assignment at the maximum sustainable cost",
      () => {
        expect(() =>
          assertManualRosterAssignmentAllowed({
            ...validInput,
            currentRosterSize: 10,
            remainingCredits: 21,
            acquisitionCost: 8
          })
        ).not.toThrow();
      }
    );
  }
);
