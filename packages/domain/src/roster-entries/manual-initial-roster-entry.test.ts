import {
  describe,
  expect,
  it
} from "vitest";

import {
  assertManualInitialRosterEntryAllowed
} from "./manual-initial-roster-entry.js";

const validInput = {
  auctionSessionStatus: "SETUP" as const,
  currentInitialRosterCount: 5,
  maximumInitialRosterEntries: 11,
  playerRole: "C" as const,
  currentRosterSize: 5,
  currentRoleCount: 2,
  remainingCredits: 250,
  acquisitionCost: 20,
  contractYear: 2
};

describe(
  "assertManualInitialRosterEntryAllowed",
  () => {
    it.each([
      "SETUP",
      "READY",
      "SUSPENDED",
      "COMPLETED"
    ] as const)(
      "allows a valid manual initial roster entry in %s",
      (auctionSessionStatus) => {
        expect(() =>
          assertManualInitialRosterEntryAllowed({
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
      "rejects a manual initial roster entry in %s",
      (auctionSessionStatus) => {
        expect(() =>
          assertManualInitialRosterEntryAllowed({
            ...validInput,
            auctionSessionStatus
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "MANUAL_INITIAL_ROSTER_NOT_ALLOWED_IN_STATUS"
          })
        );
      }
    );

    it(
      "rejects the twelfth initial roster entry",
      () => {
        expect(() =>
          assertManualInitialRosterEntryAllowed({
            ...validInput,
            currentInitialRosterCount: 11
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INITIAL_ROSTER_LIMIT_EXCEEDED"
          })
        );
      }
    );

    it(
      "uses the configured initial roster entry limit",
      () => {
        expect(() =>
          assertManualInitialRosterEntryAllowed({
            ...validInput,
            currentInitialRosterCount: 7,
            maximumInitialRosterEntries: 8
          })
        ).not.toThrow();

        expect(() =>
          assertManualInitialRosterEntryAllowed({
            ...validInput,
            currentInitialRosterCount: 8,
            maximumInitialRosterEntries: 8
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INITIAL_ROSTER_LIMIT_EXCEEDED"
          })
        );
      }
    );

    it(
      "rejects an invalid configured initial roster entry limit",
      () => {
        expect(() =>
          assertManualInitialRosterEntryAllowed({
            ...validInput,
            maximumInitialRosterEntries: -1
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INVALID_INITIAL_ROSTER_LIMIT"
          })
        );
      }
    );

    it(
      "rejects an invalid contract year",
      () => {
        expect(() =>
          assertManualInitialRosterEntryAllowed({
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
      "rejects a full player role",
      () => {
        expect(() =>
          assertManualInitialRosterEntryAllowed({
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
      "rejects an economically unsustainable confirmed player",
      () => {
        expect(() =>
          assertManualInitialRosterEntryAllowed({
            ...validInput,
            currentInitialRosterCount: 10,
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
      "allows the eleventh confirmed player when thirteen credits remain afterwards",
      () => {
        expect(() =>
          assertManualInitialRosterEntryAllowed({
            ...validInput,
            currentInitialRosterCount: 10,
            currentRosterSize: 10,
            remainingCredits: 21,
            acquisitionCost: 8
          })
        ).not.toThrow();
      }
    );
  }
);
