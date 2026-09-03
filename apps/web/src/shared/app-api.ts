import type {
  AdminActivityItem,
  AuctionSession,
  League
} from "@fantaastaapp/contracts";

import {
  apiRequest
} from "./api-client.js";

export async function fetchActiveAuctionSession():
  Promise<AuctionSession | null> {
  return apiRequest<AuctionSession | null>(
    "/api/auction-sessions/active"
  );
}

export async function fetchAuctionSessions():
  Promise<AuctionSession[]> {
  return apiRequest<AuctionSession[]>(
    "/api/auction-sessions"
  );
}

export function selectCurrentAuctionSession(
  activeSession: AuctionSession | null,
  availableSessions: AuctionSession[]
): AuctionSession | null {
  return (
    activeSession ??
    availableSessions.find(
      (candidate) =>
        candidate.status === "COMPLETED"
    ) ??
    null
  );
}

export async function fetchLeagues():
  Promise<League[]> {
  return apiRequest<League[]>(
    "/api/leagues"
  );
}

export async function fetchAdminActivity(
  auctionSessionId: string,
  limit = 10
): Promise<AdminActivityItem[]> {
  return apiRequest<AdminActivityItem[]>(
    `/api/auction-sessions/${auctionSessionId}/activity?limit=${limit}`
  );
}
