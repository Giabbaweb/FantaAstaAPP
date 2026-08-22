import {
  describe,
  expect,
  it
} from "vitest";

import {
  InitialRosterResolutionError,
  resolveInitialRosterImport
} from "./initial-roster-import.resolutions.js";

import type {
  InitialRosterImportParseResult
} from "./player-import.types.js";

function createParseResult():
  InitialRosterImportParseResult {
  return {
    rows: [
      {
        rowNumber: 214,
        teamName: "SKETCH F.C.",
        playerName:
          "LOOKMAN Ademola Olajade",
        role: "A",
        realTeamName: "Atalanta",
        contractYear: null,
        acquisitionCost: 7
      },
      {
        rowNumber: 215,
        teamName: "SKETCH F.C.",
        playerName: "PLAYER Valid",
        role: "D",
        realTeamName: "Roma",
        contractYear: 2,
        acquisitionCost: 10
      }
    ],
    issues: [
      {
        rowNumber: 214,
        code:
          "INVALID_CONTRACT_YEAR",
        message:
          "Contract year must be 1, 2 or 3",
        field: "contractYear",
        rawValue: "4"
      }
    ]
  };
}

describe(
  "resolveInitialRosterImport",
  () => {
    it(
      "corrects an invalid contract year",
      () => {
        const result =
          resolveInitialRosterImport(
            createParseResult(),
            [
              {
                rowNumber: 214,
                action:
                  "SET_CONTRACT_YEAR",
                contractYear: 3
              }
            ]
          );

        expect(
          result.parseResult.issues
        ).toEqual([]);

        expect(
          result.parseResult.rows
        ).toHaveLength(2);

        expect(
          result.parseResult.rows[0]
            ?.contractYear
        ).toBe(3);

        expect(
          result.sourceRows
        ).toBe(2);

        expect(
          result.correctedRows
        ).toBe(1);

        expect(
          result.skippedRows
        ).toBe(0);
      }
    );

    it(
      "skips a row and removes its issues",
      () => {
        const result =
          resolveInitialRosterImport(
            createParseResult(),
            [
              {
                rowNumber: 214,
                action: "SKIP_ROW"
              }
            ]
          );

        expect(
          result.parseResult.issues
        ).toEqual([]);

        expect(
          result.parseResult.rows
        ).toHaveLength(1);

        expect(
          result.parseResult.rows[0]
            ?.rowNumber
        ).toBe(215);

        expect(
          result.sourceRows
        ).toBe(2);

        expect(
          result.correctedRows
        ).toBe(0);

        expect(
          result.skippedRows
        ).toBe(1);
      }
    );

    it(
      "rejects more than one resolution for the same row",
      () => {
        expect(() =>
          resolveInitialRosterImport(
            createParseResult(),
            [
              {
                rowNumber: 214,
                action: "SKIP_ROW"
              },
              {
                rowNumber: 214,
                action:
                  "SET_CONTRACT_YEAR",
                contractYear: 3
              }
            ]
          )
        ).toThrowError(
          expect.objectContaining({
            code:
              "DUPLICATE_RESOLUTION"
          })
        );
      }
    );

    it(
      "rejects a resolution for an unknown row",
      () => {
        expect(() =>
          resolveInitialRosterImport(
            createParseResult(),
            [
              {
                rowNumber: 999,
                action: "SKIP_ROW"
              }
            ]
          )
        ).toThrowError(
          expect.objectContaining({
            code: "ROW_NOT_FOUND"
          })
        );
      }
    );

    it(
      "rejects contract-year correction on a valid row",
      () => {
        try {
          resolveInitialRosterImport(
            createParseResult(),
            [
              {
                rowNumber: 215,
                action:
                  "SET_CONTRACT_YEAR",
                contractYear: 3
              }
            ]
          );

          throw new Error(
            "Expected resolution failure"
          );
        } catch (error) {
          expect(error).toBeInstanceOf(
            InitialRosterResolutionError
          );

          expect(
            (
              error as
                InitialRosterResolutionError
            ).code
          ).toBe(
            "INVALID_RESOLUTION_TARGET"
          );
        }
      }
    );
  }
);
