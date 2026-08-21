import type {
  AuctionSessionTeam,
  CreateOwnerInput,
  CreateTeamOwnerInput,
  Owner,
  Team,
  TeamOwner,
  UpdateOwnerInput,
  UpdateTeamInput,
  UpdateTeamOwnerInput
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


export function updateTeam(
  teamId: string,
  input: UpdateTeamInput
): Promise<Team> {
  return apiRequest<Team>(
    `/api/teams/${teamId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
}

export function createOwner(
  input: CreateOwnerInput
): Promise<Owner> {
  return apiRequest<Owner>(
    "/api/owners",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
}

export function updateOwner(
  ownerId: string,
  input: UpdateOwnerInput
): Promise<Owner> {
  return apiRequest<Owner>(
    `/api/owners/${ownerId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
}

export function createTeamOwner(
  teamId: string,
  input: CreateTeamOwnerInput
): Promise<TeamOwner> {
  return apiRequest<TeamOwner>(
    `/api/teams/${teamId}/owners`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
}

export function updateTeamOwner(
  teamId: string,
  ownerId: string,
  input: UpdateTeamOwnerInput
): Promise<TeamOwner> {
  return apiRequest<TeamOwner>(
    `/api/teams/${teamId}/owners/${ownerId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
}

export function deleteTeamOwner(
  teamId: string,
  ownerId: string
): Promise<void> {
  return apiRequest<void>(
    `/api/teams/${teamId}/owners/${ownerId}`,
    {
      method: "DELETE"
    }
  );
}
