export const playerRoles = [
  "P",
  "D",
  "C",
  "A"
] as const;

export type PlayerRole =
  (typeof playerRoles)[number];

export const playerAvailabilityStatuses = [
  "AVAILABLE",
  "ROSTERED",
  "UNAVAILABLE"
] as const;

export type PlayerAvailabilityStatus =
  (typeof playerAvailabilityStatuses)[number];

export type Player = {
  id: string;
  auctionSessionId: string;
  fmsCode: string;
  name: string;
  normalizedName: string;
  role: PlayerRole;
  availabilityStatus: PlayerAvailabilityStatus;
  createdAt: string;
  updatedAt: string;
};

const playerRoleAliases: Readonly<
  Record<string, PlayerRole>
> = {
  P: "P",
  POR: "P",
  D: "D",
  DIF: "D",
  C: "C",
  CEN: "C",
  A: "A",
  ATT: "A"
};

export function normalizePlayerRole(
  value: string
): PlayerRole | null {
  const normalizedValue = value.trim().toUpperCase();

  return playerRoleAliases[normalizedValue] ?? null;
}

export function normalizePlayerName(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("it-IT");
}
