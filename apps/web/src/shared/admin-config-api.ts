import type {
  AuctionSessionTeam,
  Owner,
  Team,
  TeamOwner
} from "@fantaastaapp/contracts";

import {
  apiRequest
} from "./api-client.js";

export function fetchTeamsByLeague(
  leagueId: string
): Promise<Team[]> {
  return apiRequest<Team[]>(
    `/api/teams?leagueId=${encodeURIComponent(
      leagueId
    )}`
  );
}

export function fetchOwners():
  Promise<Owner[]> {
  return apiRequest<Owner[]>(
    "/api/owners"
  );
}

export function fetchTeamOwners(
  teamId: string
): Promise<TeamOwner[]> {
  return apiRequest<TeamOwner[]>(
    `/api/teams/${teamId}/owners`
  );
}

export function fetchAuctionSessionTeams(
  auctionSessionId: string
): Promise<AuctionSessionTeam[]> {
  return apiRequest<AuctionSessionTeam[]>(
    `/api/auction-sessions/${auctionSessionId}/teams`
  );
}

export function reorderAuctionSessionTeams(
  auctionSessionId: string,
  teamIds: string[]
): Promise<AuctionSessionTeam[]> {
  return apiRequest<AuctionSessionTeam[]>(
    `/api/auction-sessions/${auctionSessionId}/teams/reorder`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamIds
      })
    }
  );
}
