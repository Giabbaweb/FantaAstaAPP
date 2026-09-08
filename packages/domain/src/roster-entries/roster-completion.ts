import type {
  PlayerRole
} from "@fantaastaapp/contracts";

import {
  rosterRoleLimits,
  rosterSizeLimit
} from "./roster-entry.js";

export type RosterRoleCounts =
  Readonly<Record<PlayerRole, number>>;

export function isRosterComplete(
  roleCounts: RosterRoleCounts
): boolean {
  const total =
    roleCounts.P +
    roleCounts.D +
    roleCounts.C +
    roleCounts.A;

  return (
    total === rosterSizeLimit &&
    roleCounts.P === rosterRoleLimits.P &&
    roleCounts.D === rosterRoleLimits.D &&
    roleCounts.C === rosterRoleLimits.C &&
    roleCounts.A === rosterRoleLimits.A
  );
}
