import type {
  AuctionSession,
  AuctionSessionTeam,
  CreateAuctionSessionInput,
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

export type InitialRosterStatus = {
  count: number;
  lastUpdatedAt: string | null;
};

export type InitialRosterOverviewEntry = {
  playerName: string;
  realTeamName: string | null;
  role: "P" | "D" | "C" | "A";
  acquisitionCost: number;
};

export type InitialRosterOverviewTeam = {
  auctionSessionTeamId: string;
  teamId: string;
  teamName: string;
  tableOrder: number;
  remainingCredits: number;
  maximumBid: number | null;
  entries: InitialRosterOverviewEntry[];
};

export type InitialRosterOverview = {
  rosterSizeLimit: number;
  roleLimits: {
    P: number;
    D: number;
    C: number;
    A: number;
  };
  teams: InitialRosterOverviewTeam[];
};

export type PlayerPhotoCatalog = {
  count: number;
  lastUpdatedAt: string | null;
};

export type PlayerPhotoImportMode =
  | "KEEP"
  | "REPLACE";

export type PlayerPhotoImportIssue = {
  fileName: string;
  reason:
    | "INVALID_FILENAME"
    | "INVALID_PNG";
};

export type PlayerPhotoImportResult = {
  selected: number;
  created: number;
  replaced: number;
  kept: number;
  rejected: number;
  issues: PlayerPhotoImportIssue[];
};

export type PlayerPhotoDeletionResult = {
  deleted: number;
};

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

export type RecoveryPointCatalogEntry = {
  createdAt: string;
  reason:
    | "CONFIRMED_AWARD"
    | "MANUAL_ASSIGNMENT"
    | "TECHNICAL_CORRECTION"
    | "SESSION_SUSPENDED"
    | "SESSION_COMPLETED"
    | "RECOVERY_RESTART"
    | "MANUAL_BACKUP"
    | "PRE_RESTORE";
  league: {
    id: string;
    name: string;
  };
  auctionSession: {
    id: string;
    season: string;
    editionNumber: number;
    status: string;
    stateVersion: number;
  };
  database: {
    fileName: string;
    sizeBytes: number;
    latestMigration: {
      hash: string;
      createdAt: number;
    };
  };
  integrity: {
    status:
      | "VALID"
      | "INVALID"
      | "UNCHECKED"
      | "INCOMPATIBLE";
    messages: string[];
  };
  timing: {
    backupDurationMs: number;
    totalDurationMs: number;
  };
};

export type ManualBackupResult = {
  actor: {
    name: string;
    role:
      | "ADMINISTRATOR"
      | "AUCTIONEER";
  };
  createdAt: string;
  reason: "MANUAL_BACKUP";
  league: {
    id: string;
    name: string;
  };
  auctionSession: {
    id: string;
    season: string;
    editionNumber: number;
    status: string;
    stateVersion: number;
  };
  database: {
    fileName: string;
    sizeBytes: number;
  };
  integrity: {
    status:
      | "VALID"
      | "INVALID"
      | "UNCHECKED"
      | "INCOMPATIBLE";
    messages: string[];
  };
  timing: {
    backupDurationMs: number;
    totalDurationMs: number;
  };
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

export function fetchRecoveryPoints(
  auctionSessionId: string
): Promise<RecoveryPointCatalogEntry[]> {
  return apiRequest<
    RecoveryPointCatalogEntry[]
  >(
    `/api/auction-sessions/${auctionSessionId}/backups`
  );
}

export type RestoreRecoveryPointResult = {
  status: "RESTORE_PREPARED";
  auctionSessionId: string;
  fileName: string;
  restartRequired: boolean;
};

export function restoreRecoveryPoint(
  auctionSessionId: string,
  fileName: string
): Promise<RestoreRecoveryPointResult> {
  return apiRequest<RestoreRecoveryPointResult>(
    `/api/auction-sessions/${auctionSessionId}/backups/${encodeURIComponent(
      fileName
    )}/restore`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        actor: {
          name: "Admin",
          role: "ADMINISTRATOR"
        }
      })
    }
  );
}

export function deleteRecoveryPoint(
  auctionSessionId: string,
  fileName: string
): Promise<{
  fileName: string;
}> {
  return apiRequest<{
    fileName: string;
  }>(
    `/api/auction-sessions/${auctionSessionId}/backups/${encodeURIComponent(
      fileName
    )}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        actor: {
          name: "Admin",
          role: "ADMINISTRATOR"
        }
      })
    }
  );
}

export function createManualBackup(
  auctionSessionId: string
): Promise<ManualBackupResult> {
  return apiRequest<ManualBackupResult>(
    `/api/auction-sessions/${auctionSessionId}/backups/manual`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        actor: {
          name: "Admin",
          role: "ADMINISTRATOR"
        }
      })
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

export function fetchInitialRosterStatus(
  auctionSessionId: string
): Promise<InitialRosterStatus> {
  return apiRequest<InitialRosterStatus>(
    `/api/auction-sessions/${auctionSessionId}/initial-rosters/status`
  );
}

export function fetchInitialRosterOverview(
  auctionSessionId: string
): Promise<InitialRosterOverview> {
  return apiRequest<InitialRosterOverview>(
    `/api/auction-sessions/${auctionSessionId}/initial-rosters/overview`
  );
}

export function fetchPlayerPhotoCatalog():
  Promise<PlayerPhotoCatalog> {
  return apiRequest<PlayerPhotoCatalog>(
    "/api/player-photos"
  );
}

export async function importPlayerPhotos(
  files: File[],
  mode: PlayerPhotoImportMode
): Promise<PlayerPhotoImportResult> {
  const formData =
    new FormData();

  formData.append(
    "mode",
    mode
  );

  for (const file of files) {
    formData.append(
      "files",
      file
    );
  }

  return apiRequest<PlayerPhotoImportResult>(
    "/api/player-photos/import",
    {
      method: "POST",
      body: formData
    }
  );
}

export function deleteAllPlayerPhotos():
  Promise<PlayerPhotoDeletionResult> {
  return apiRequest<PlayerPhotoDeletionResult>(
    "/api/player-photos",
    {
      method: "DELETE"
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

export type AuctionSessionSetupResult = {
  session: AuctionSession;
  sessionTeams: AuctionSessionTeam[];
};

export function createAuctionSessionSetup(
  input: CreateAuctionSessionInput
): Promise<AuctionSessionSetupResult> {
  return apiRequest<AuctionSessionSetupResult>(
    "/api/auction-sessions/setup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
}

export type AuctionSessionReadinessCheck = {
  code: string;
  ok: boolean;
  label: string;
  message: string;
};

export type AuctionSessionReadiness = {
  auctionSessionId: string;
  ready: boolean;
  checks: AuctionSessionReadinessCheck[];
  summary: {
    teamCount: number;
    minimumTeamCount: number;
    teamsWithOwnerCount: number;
    playerCount: number;
    rosterEntryCount: number;
    maximumInitialRosterEntries: number;
  };
};

export function fetchAuctionSessionReadiness(
  auctionSessionId: string
): Promise<AuctionSessionReadiness> {
  return apiRequest<AuctionSessionReadiness>(
    `/api/auction-sessions/${auctionSessionId}/readiness`
  );
}

export function markAuctionSessionReady(
  auctionSessionId: string
): Promise<AuctionSession> {
  return apiRequest<AuctionSession>(
    `/api/auction-sessions/${auctionSessionId}/commands/ready`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    }
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

export type TeamAccessStatus = {
  auctionSessionTeamId: string;
  configured: boolean;
};

export function fetchTeamAccessStatus(
  auctionSessionId: string
): Promise<TeamAccessStatus[]> {
  return apiRequest<TeamAccessStatus[]>(
    `/api/auction-sessions/${auctionSessionId}/team-access`
  );
}

export function setTeamAccessPin(
  auctionSessionTeamId: string,
  pin: string
): Promise<void> {
  return apiRequest<void>(
    `/api/auction-session-teams/${auctionSessionTeamId}/access-pin`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pin
      })
    }
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
