export type AuctionCallerRotationTeam = {
  id: string;
  tableOrder: number;
  isEligibleToCall?: boolean;
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
): string | null {
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

  const isEligible = (
    team: AuctionCallerRotationTeam
  ) =>
    team.isEligibleToCall !== false;

  if (
    input.previousCallerAuctionSessionTeamId ===
    null
  ) {
    return (
      orderedSessionTeams.find(
        isEligible
      )?.id ?? null
    );
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

  for (
    let offset = 1;
    offset <= orderedSessionTeams.length;
    offset += 1
  ) {
    const candidate =
      orderedSessionTeams[
        (previousCallerIndex + offset) %
          orderedSessionTeams.length
      ];

    if (
      candidate &&
      isEligible(candidate)
    ) {
      return candidate.id;
    }
  }

  return null;
}
