import {
  rosterRoleLimits,
  rosterSizeLimit
} from "@fantaastaapp/domain";
import type {
  PlayerRole
} from "@fantaastaapp/contracts";

import type {
  FmsRevoRosterExportEntry
} from "./fms-revo-roster.serializer.js";

export type FmsRevoRosterValidationErrorCode =
  | "INVALID_ROSTER_SIZE"
  | "INVALID_ROLE_COUNT";

export class FmsRevoRosterValidationError
  extends Error
{
  readonly code:
    FmsRevoRosterValidationErrorCode;

  constructor(
    code: FmsRevoRosterValidationErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "FmsRevoRosterValidationError";
    this.code = code;
  }
}

export function assertFmsRevoRosterExportable(
  entries: readonly FmsRevoRosterExportEntry[]
): void {
  if (entries.length !== rosterSizeLimit) {
    throw new FmsRevoRosterValidationError(
      "INVALID_ROSTER_SIZE",
      `FMS roster export requires exactly ${rosterSizeLimit} players`
    );
  }

  const roleCounts: Record<PlayerRole, number> = {
    P: 0,
    D: 0,
    C: 0,
    A: 0
  };

  for (const entry of entries) {
    roleCounts[entry.role] += 1;
  }

  for (
    const role of Object.keys(
      rosterRoleLimits
    ) as PlayerRole[]
  ) {
    if (
      roleCounts[role] !==
      rosterRoleLimits[role]
    ) {
      throw new FmsRevoRosterValidationError(
        "INVALID_ROLE_COUNT",
        `FMS roster export requires ${rosterRoleLimits[role]} players for role "${role}", found ${roleCounts[role]}`
      );
    }
  }
}
