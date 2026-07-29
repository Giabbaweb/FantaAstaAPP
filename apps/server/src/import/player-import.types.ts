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
