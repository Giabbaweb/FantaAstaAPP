import type {
  AuctionSession,
  AuctionSessionTeam,
  Team
} from "@fantaastaapp/contracts";

import {
  apiRequest
} from "../shared/api-client.js";

export function fetchRemoteActiveSession():
  Promise<AuctionSession | null> {
  return apiRequest<AuctionSession | null>(
    "/api/auction-sessions/active"
  );
}

export function fetchRemoteSessionTeams(
  auctionSessionId: string
): Promise<AuctionSessionTeam[]> {
  return apiRequest<AuctionSessionTeam[]>(
    `/api/auction-sessions/${auctionSessionId}/teams`
  );
}

export function fetchRemoteTeams(
  leagueId: string
): Promise<Team[]> {
  return apiRequest<Team[]>(
    `/api/teams?leagueId=${encodeURIComponent(
      leagueId
    )}`
  );
}
