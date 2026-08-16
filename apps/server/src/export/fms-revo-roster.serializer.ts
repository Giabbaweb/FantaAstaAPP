import type {
  ContractYear,
  PlayerRole
} from "@fantaastaapp/contracts";

const fmsRoleLabels: Readonly<
  Record<PlayerRole, string>
> = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante"
};

const roleOrder: Readonly<
  Record<PlayerRole, number>
> = {
  P: 0,
  D: 1,
  C: 2,
  A: 3
};

export type FmsRevoRosterExportEntry = {
  role: PlayerRole;
  name: string;
  acquisitionCost: number;
  contractYear: ContractYear;
};

export function serializeFmsRevoRoster(
  entries: readonly FmsRevoRosterExportEntry[]
): string {
  const sortedEntries = [...entries].sort(
    (left, right) => {
      const roleDifference =
        roleOrder[left.role] -
        roleOrder[right.role];

      if (roleDifference !== 0) {
        return roleDifference;
      }

      return left.name.localeCompare(
        right.name,
        "it-IT"
      );
    }
  );

  return sortedEntries
    .map((entry) =>
      [
        fmsRoleLabels[entry.role],
        entry.name,
        entry.acquisitionCost,
        entry.contractYear
      ].join("\t")
    )
    .join("\n");
}
