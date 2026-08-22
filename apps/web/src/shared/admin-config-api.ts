import type {
  AuctionSession,
  AuctionSessionTeam,
  CreateLeagueInput,
  CreateOwnerInput,
  CreateTeamOwnerInput,
  League,
  Owner,
  Player,
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

export type PlayerArchiveImportResult = {
  importedPlayers: Player[];
  summary: {
    parsedPlayers: number;
    importedPlayers: number;
    issueCount: number;
  };
};

export type SetupDataResetResult = {
  deletedRosterEntries: number;
  deletedPlayers: number;
  resetTeams: number;
};

export type InitialRosterImportIssue = {
  rowNumber: number;
  code: string;
  message: string;
  field?: string;
  rawValue?: string;
  teamName?: string;
  playerName?: string;
  role?: string | null;
  realTeamName?: string;
};

export type InitialRosterPlanningIssue = {
  rowNumber: number;
  code: string;
  message: string;
  teamName: string;
  playerName: string;
};

export type InitialRosterImportSummary = {
  parsedRows: number;
  validEntries: number;
  parserIssueCount: number;
  planningIssueCount: number;
};

export type InitialRosterImportPreviewResult = {
  summary: InitialRosterImportSummary;
  parserIssues: InitialRosterImportIssue[];
  planningIssues: InitialRosterPlanningIssue[];
};

export type InitialRosterImportResolution =
  | {
      rowNumber: number;
      action: "SET_CONTRACT_YEAR";
      contractYear: 1 | 2 | 3;
    }
  | {
      rowNumber: number;
      action: "SKIP_ROW";
    };

export type InitialRosterImportResult = {
  importedEntries: number;
  totalCost: number;
  summary: InitialRosterImportSummary;
};

export type InitialRosterResetResult = {
  deletedRosterEntries: number;
  resetPlayers: number;
  resetTeams: number;
};

export type DevelopmentSessionResetResult = {
  auctionSessionId: string;
  status: "SETUP";
  stateVersion: 0;
  deletedAuctionEvents: number;
  deletedCommands: number;
  deletedAuctionCalls: number;
  deletedFmsExportGoalkeepers: number;
  deletedRosterEntries: number;
  deletedPlayers: number;
  resetAuctionSessionTeams: number;
};

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

export function resetInitialRosters(
  auctionSessionId: string
): Promise<InitialRosterResetResult> {
  return apiRequest<InitialRosterResetResult>(
    `/api/auction-sessions/${auctionSessionId}/reset-initial-rosters`,
    {
      method: "POST"
    }
  );
}

export function resetSetupData(
  auctionSessionId: string
): Promise<SetupDataResetResult> {
  return apiRequest<SetupDataResetResult>(
    `/api/auction-sessions/${auctionSessionId}/reset-setup-data`,
    {
      method: "POST"
    }
  );
}

export function resetDevelopmentSession(
  auctionSessionId: string
): Promise<DevelopmentSessionResetResult> {
  return apiRequest<DevelopmentSessionResetResult>(
    `/api/auction-sessions/${auctionSessionId}/reset-development-session`,
    {
      method: "POST"
    }
  );
}

export function previewInitialRosters(
  auctionSessionId: string,
  content: string
): Promise<InitialRosterImportPreviewResult> {
  return apiRequest<InitialRosterImportPreviewResult>(
    "/api/player-import/initial-rosters/preview",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auctionSessionId,
        content
      })
    }
  );
}

export function importInitialRosters(
  auctionSessionId: string,
  content: string,
  resolutions:
    InitialRosterImportResolution[]
): Promise<InitialRosterImportResult> {
  return apiRequest<InitialRosterImportResult>(
    "/api/player-import/initial-rosters",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auctionSessionId,
        content,
        resolutions
      })
    }
  );
}

export function fetchPlayers(
  auctionSessionId: string
): Promise<Player[]> {
  return apiRequest<Player[]>(
    `/api/players?auctionSessionId=${encodeURIComponent(
      auctionSessionId
    )}`
  );
}

export function importPlayerArchive(
  auctionSessionId: string,
  content: string
): Promise<PlayerArchiveImportResult> {
  return apiRequest<PlayerArchiveImportResult>(
    "/api/player-import/archive",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auctionSessionId,
        content
      })
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
