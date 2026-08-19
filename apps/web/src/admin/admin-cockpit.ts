import type {
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

export type AdminCockpitTeam = {
  auctionSessionTeamId: string;
  teamName: string;
  shortName: string | null;
  logoPath: string | null;
  tableOrder: number;
  remainingCredits: number;
  maximumBid: number | null;
  remainingRosterSlots: number;
  rosterSize: number;
  callStatus:
    | "ACTIVE"
    | "PASSED"
    | "EXCLUDED"
    | null;
  exclusionReason:
    | "MAXIMUM_BID_TOO_LOW"
    | "ROSTER_FULL"
    | "ROLE_LIMIT_REACHED"
    | null;
};

export type AdminCockpitProjection = {
  currentPlayer:
    RealtimeAuctionSnapshot[
      "publicDisplay"
    ]["currentPlayer"];

  currentBid: number | null;
  currentLeaderName: string | null;
  currentTurnName: string | null;
  teams: AdminCockpitTeam[];
};

export function createAdminCockpitProjection(
  snapshot: RealtimeAuctionSnapshot
): AdminCockpitProjection {
  const operationalCall =
    snapshot.operationalAuctionCall;

  const teamNameById = new Map(
    snapshot.publicDisplay.teams.map(
      (team) => [
        team.auctionSessionTeamId,
        team.teamName
      ]
    )
  );

  const operationalTeamById = new Map(
    operationalCall?.teams.map(
      (team) => [
        team.auctionSessionTeamId,
        team
      ]
    ) ?? []
  );

  const currentLeaderId =
    operationalCall?.call
      .currentLeaderAuctionSessionTeamId ??
    null;

  const currentTurnId =
    operationalCall?.call
      .currentTurnAuctionSessionTeamId ??
    null;

  return {
    currentPlayer:
      snapshot.publicDisplay.currentPlayer,

    currentBid:
      operationalCall?.call.currentBid ??
      null,

    currentLeaderName:
      currentLeaderId
        ? teamNameById.get(
            currentLeaderId
          ) ?? null
        : null,

    currentTurnName:
      currentTurnId
        ? teamNameById.get(
            currentTurnId
          ) ?? null
        : null,

    teams:
      snapshot.publicDisplay.teams
        .map((team) => {
          const operationalTeam =
            operationalTeamById.get(
              team.auctionSessionTeamId
            );

          return {
            auctionSessionTeamId:
              team.auctionSessionTeamId,
            teamName: team.teamName,
            shortName: team.shortName,
            logoPath: team.logoPath,
            tableOrder: team.tableOrder,
            remainingCredits:
              team.remainingCredits,
            maximumBid:
              operationalTeam?.maximumBid ??
              team.maximumBid,
            remainingRosterSlots:
              team.roster
                .remainingRosterSlots,
            rosterSize:
              team.roster.rosterSize,
            callStatus:
              operationalTeam?.status ??
              null,
            exclusionReason:
              operationalTeam
                ?.exclusionReason ??
              null
          };
        })
        .sort(
          (left, right) =>
            left.tableOrder -
            right.tableOrder
        )
  };
}
