import type {
  CreatePlayerInput,
  PlayerAvailabilityStatus,
  PlayerRole
} from "@fantaastaapp/contracts";

export type PlayerImportFormat =
  | "FMS_REVO_ARCHIVE_TAB"
  | "FMS_REVO_ROSTERS_TAB";

export type PlayerImportSource = {
  format: PlayerImportFormat;
  content: string;
  auctionSessionId: string;
};

export type PlayerImportRow = {
  rowNumber: number;
  fmsCode: string;
  name: string;
  role: PlayerRole;
  availabilityStatus: PlayerAvailabilityStatus;
};

export type PlayerImportIssueCode =
  | "HEADER_NOT_FOUND"
  | "INVALID_COLUMNS"
  | "INVALID_FMS_CODE"
  | "INVALID_NAME"
  | "INVALID_ROLE"
  | "INVALID_AVAILABILITY_STATUS"
  | "UNSUPPORTED_FORMAT";

export type PlayerImportIssue = {
  rowNumber: number;
  code: PlayerImportIssueCode;
  message: string;
  rawValue?: string;
};

export type PlayerImportParseResult = {
  players: CreatePlayerInput[];
  issues: PlayerImportIssue[];
};

export interface PlayerImportParser {
  parse(
    source: PlayerImportSource
  ): PlayerImportParseResult;
}

export type InitialRosterImportRow = {
  rowNumber: number;
  teamName: string;
  playerName: string;
  role: PlayerRole | null;
  realTeamName: string;
  contractYear: number | null;
  acquisitionCost: number | null;
};

export type InitialRosterImportIssueCode =
  | "ROSTER_HEADER_NOT_FOUND"
  | "TEAM_NAME_NOT_FOUND"
  | "INVALID_ROSTER_COLUMNS"
  | "INVALID_PLAYER_NAME"
  | "INVALID_ROLE"
  | "INVALID_CONTRACT_YEAR"
  | "INVALID_ACQUISITION_COST";

export type InitialRosterImportIssueField =
  | "teamName"
  | "playerName"
  | "role"
  | "contractYear"
  | "acquisitionCost";

export type InitialRosterImportIssue = {
  rowNumber: number;
  code: InitialRosterImportIssueCode;
  message: string;
  field?: InitialRosterImportIssueField;
  rawValue?: string;
};

export type InitialRosterImportParseResult = {
  rows: InitialRosterImportRow[];
  issues: InitialRosterImportIssue[];
};

export type InitialRosterPlayerLookup = {
  id: string;
  name: string;
  role: PlayerRole;
};

export type InitialRosterTeamLookup = {
  auctionSessionTeamId: string;
  teamName: string;
};

export type InitialRosterImportPlanEntry = {
  rowNumber: number;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: 1 | 2 | 3;
  source: "INITIAL_ROSTER";
};

export type InitialRosterImportPlanIssueCode =
  | "TEAM_NOT_FOUND"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_ROLE_MISMATCH"
  | "DUPLICATE_PLAYER_IN_IMPORT";

export type InitialRosterImportPlanIssue = {
  rowNumber: number;
  code: InitialRosterImportPlanIssueCode;
  message: string;
  teamName: string;
  playerName: string;
};

export type InitialRosterImportPlan = {
  entries: InitialRosterImportPlanEntry[];
  parserIssues: InitialRosterImportIssue[];
  planningIssues: InitialRosterImportPlanIssue[];
  summary: {
    parsedRows: number;
    validEntries: number;
    parserIssueCount: number;
    planningIssueCount: number;
  };
};
