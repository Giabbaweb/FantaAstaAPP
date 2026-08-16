import type {
  Player,
  RosterEntry
} from "@fantaastaapp/contracts";

import type {
  FmsRevoRosterExportEntry
} from "./fms-revo-roster.serializer.js";

export type FmsRevoRosterProjectionErrorCode =
  "PLAYER_NOT_FOUND";

export class FmsRevoRosterProjectionError
  extends Error
{
  readonly code:
    FmsRevoRosterProjectionErrorCode;

  constructor(
    code: FmsRevoRosterProjectionErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "FmsRevoRosterProjectionError";
    this.code = code;
  }
}

export function buildFmsRevoRosterProjection(
  rosterEntries: readonly RosterEntry[],
  players: readonly Player[]
): FmsRevoRosterExportEntry[] {
  const playerById = new Map(
    players.map((player) => [
      player.id,
      player
    ])
  );

  return rosterEntries.map((rosterEntry) => {
    const player = playerById.get(
      rosterEntry.playerId
    );

    if (!player) {
      throw new FmsRevoRosterProjectionError(
        "PLAYER_NOT_FOUND",
        `Player "${rosterEntry.playerId}" was not found`
      );
    }

    return {
      role: player.role,
      name: player.name,
      acquisitionCost:
        rosterEntry.acquisitionCost,
      contractYear:
        rosterEntry.contractYear
    };
  });
}
