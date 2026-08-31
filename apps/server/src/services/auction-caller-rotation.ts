export type AuctionCallerRotationTeam = {
  id: string;
  tableOrder: number;
};

export type ResolveNextCallerInput = {
  sessionTeams: AuctionCallerRotationTeam[];
  previousCallerAuctionSessionTeamId:
    string | null;
};

export type AuctionCallerRotationErrorCode =
  | "NO_SESSION_TEAMS"
  | "PREVIOUS_CALLER_NOT_FOUND";

export class AuctionCallerRotationError extends Error {
  constructor(
    public readonly code:
      AuctionCallerRotationErrorCode
  ) {
    super(code);
    this.name = "AuctionCallerRotationError";
  }
}

export function resolveNextCallerAuctionSessionTeamId(
  input: ResolveNextCallerInput
): string {
  const orderedSessionTeams =
    [...input.sessionTeams].sort(
      (left, right) =>
        left.tableOrder - right.tableOrder
    );

  const firstTeam =
    orderedSessionTeams[0];

  if (!firstTeam) {
    throw new AuctionCallerRotationError(
      "NO_SESSION_TEAMS"
    );
  }

  if (
    input.previousCallerAuctionSessionTeamId ===
    null
  ) {
    return firstTeam.id;
  }

  const previousCallerIndex =
    orderedSessionTeams.findIndex(
      (team) =>
        team.id ===
        input.previousCallerAuctionSessionTeamId
    );

  if (previousCallerIndex < 0) {
    throw new AuctionCallerRotationError(
      "PREVIOUS_CALLER_NOT_FOUND"
    );
  }

  return orderedSessionTeams[
    (previousCallerIndex + 1) %
      orderedSessionTeams.length
  ]!.id;
}
