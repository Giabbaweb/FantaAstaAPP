import {
  describe,
  expect,
  it
} from "vitest";

import {
  assertTechnicalRosterCorrectionAllowed
} from "./technical-roster-correction.js";

const validInput = {
  auctionSessionStatus:
    "SUSPENDED" as const,
  playerRole:
    "C" as const,
  targetRosterSizeBeforeCorrectedEntry: 10,
  targetRoleCountBeforeCorrectedEntry: 3,
  availableCreditsBeforeCorrectedAcquisition: 100,
  acquisitionCost: 20,
  contractYear: 2
};

describe(
  "assertTechnicalRosterCorrectionAllowed",
  () => {
    it.each([
      "SETUP",
      "READY",
      "SUSPENDED",
      "COMPLETED"
    ] as const)(
      "allows a valid technical correction in %s",
      (auctionSessionStatus) => {
        expect(() =>
          assertTechnicalRosterCorrectionAllowed({
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
      "rejects a technical correction in %s",
      (auctionSessionStatus) => {
        expect(() =>
          assertTechnicalRosterCorrectionAllowed({
            ...validInput,
            auctionSessionStatus
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "TECHNICAL_CORRECTION_NOT_ALLOWED_IN_SESSION_STATUS"
          })
        );
      }
    );

    it(
      "rejects an invalid contract year",
      () => {
        expect(() =>
          assertTechnicalRosterCorrectionAllowed({
            ...validInput,
            contractYear: 4
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INVALID_CONTRACT_YEAR"
          })
        );
      }
    );

    it(
      "rejects a full target roster",
      () => {
        expect(() =>
          assertTechnicalRosterCorrectionAllowed({
            ...validInput,
            targetRosterSizeBeforeCorrectedEntry:
              24
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
      "rejects a full target role",
      () => {
        expect(() =>
          assertTechnicalRosterCorrectionAllowed({
            ...validInput,
            playerRole: "P",
            targetRoleCountBeforeCorrectedEntry:
              2
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
      "rejects insufficient credits",
      () => {
        expect(() =>
          assertTechnicalRosterCorrectionAllowed({
            ...validInput,
            availableCreditsBeforeCorrectedAcquisition:
              10,
            acquisitionCost: 20
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
      "rejects an economically unsustainable correction",
      () => {
        expect(() =>
          assertTechnicalRosterCorrectionAllowed({
            ...validInput,
            targetRosterSizeBeforeCorrectedEntry:
              10,
            availableCreditsBeforeCorrectedAcquisition:
              20,
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
      "allows a correction when the previous cost has been logically restored",
      () => {
        expect(() =>
          assertTechnicalRosterCorrectionAllowed({
            ...validInput,
            targetRosterSizeBeforeCorrectedEntry:
              10,
            availableCreditsBeforeCorrectedAcquisition:
              40,
            acquisitionCost: 25
          })
        ).not.toThrow();
      }
    );
  }
);
