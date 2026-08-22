import type {
  InitialRosterImportParseResult,
  InitialRosterImportResolution
} from "./player-import.types.js";

export type InitialRosterResolutionErrorCode =
  | "DUPLICATE_RESOLUTION"
  | "ROW_NOT_FOUND"
  | "INVALID_RESOLUTION_TARGET";

export class InitialRosterResolutionError
  extends Error {
  constructor(
    readonly code:
      InitialRosterResolutionErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "InitialRosterResolutionError";
  }
}

export type ResolvedInitialRosterImport = {
  parseResult:
    InitialRosterImportParseResult;
  sourceRows: number;
  correctedRows: number;
  skippedRows: number;
};

export function resolveInitialRosterImport(
  parseResult:
    InitialRosterImportParseResult,
  resolutions:
    InitialRosterImportResolution[]
): ResolvedInitialRosterImport {
  const resolutionByRow =
    new Map<
      number,
      InitialRosterImportResolution
    >();

  for (const resolution of resolutions) {
    if (
      resolutionByRow.has(
        resolution.rowNumber
      )
    ) {
      throw new InitialRosterResolutionError(
        "DUPLICATE_RESOLUTION",
        `More than one resolution was provided for row ${resolution.rowNumber}`
      );
    }

    resolutionByRow.set(
      resolution.rowNumber,
      resolution
    );
  }

  const sourceRowNumbers =
    new Set(
      parseResult.rows.map(
        (row) => row.rowNumber
      )
    );

  for (const resolution of resolutions) {
    if (
      !sourceRowNumbers.has(
        resolution.rowNumber
      )
    ) {
      throw new InitialRosterResolutionError(
        "ROW_NOT_FOUND",
        `Roster row ${resolution.rowNumber} was not found`
      );
    }
  }

  let correctedRows = 0;
  let skippedRows = 0;

  const resolvedRows =
    parseResult.rows.flatMap((row) => {
      const resolution =
        resolutionByRow.get(
          row.rowNumber
        );

      if (!resolution) {
        return [row];
      }

      if (
        resolution.action ===
        "SKIP_ROW"
      ) {
        skippedRows += 1;

        return [];
      }

      const hasContractYearIssue =
        parseResult.issues.some(
          (issue) =>
            issue.rowNumber ===
              row.rowNumber &&
            issue.code ===
              "INVALID_CONTRACT_YEAR"
        );

      if (!hasContractYearIssue) {
        throw new InitialRosterResolutionError(
          "INVALID_RESOLUTION_TARGET",
          `Row ${row.rowNumber} does not contain an INVALID_CONTRACT_YEAR issue`
        );
      }

      correctedRows += 1;

      return [
        {
          ...row,
          contractYear:
            resolution.contractYear
        }
      ];
    });

  const resolvedIssues =
    parseResult.issues.filter(
      (issue) => {
        const resolution =
          resolutionByRow.get(
            issue.rowNumber
          );

        if (!resolution) {
          return true;
        }

        if (
          resolution.action ===
          "SKIP_ROW"
        ) {
          return false;
        }

        return !(
          issue.code ===
            "INVALID_CONTRACT_YEAR"
        );
      }
    );

  return {
    parseResult: {
      rows: resolvedRows,
      issues: resolvedIssues
    },
    sourceRows:
      parseResult.rows.length,
    correctedRows,
    skippedRows
  };
}
