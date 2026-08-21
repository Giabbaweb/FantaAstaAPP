import type {
  AuctionSession,
  AuctionSessionTeam,
  CreateLeagueInput,
  CreateOwnerInput,
  CreateTeamOwnerInput,
  League,
  Owner,
  Team,
  TeamOwner,
  UpdateAuctionSessionInput,
  UpdateLeagueInput,
  UpdateOwnerInput,
  UpdateTeamInput,
  UpdateTeamOwnerInput
} from "@fantaastaapp/contracts";

import {
  apiRequest
} from "./api-client.js";

export function createLeague(
  input: CreateLeagueInput
): Promise<League> {
  return apiRequest<League>(
    "/api/leagues",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
}

export function updateLeague(
  leagueId: string,
  input: UpdateLeagueInput
): Promise<League> {
  return apiRequest<League>(
    `/api/leagues/${leagueId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
}

export async function uploadLeagueLogo(
  leagueId: string,
  file: File
): Promise<League> {
  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  return apiRequest<League>(
    `/api/leagues/${leagueId}/logo`,
    {
      method: "POST",
      body: formData
    }
  );
}

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

export function fetchAuctionSessions():
  Promise<AuctionSession[]> {
  return apiRequest<AuctionSession[]>(
    "/api/auction-sessions"
  );
}

export function updateAuctionSession(
  auctionSessionId: string,
  input: UpdateAuctionSessionInput
): Promise<AuctionSession> {
  return apiRequest<AuctionSession>(
    `/api/auction-sessions/${auctionSessionId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
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


export async function uploadTeamLogo(
  teamId: string,
  file: File
): Promise<Team> {
  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  return apiRequest<Team>(
    `/api/teams/${teamId}/logo`,
    {
      method: "POST",
      body: formData
    }
  );
}
