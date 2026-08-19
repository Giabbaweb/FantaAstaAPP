import type {
  AuctionSession
} from "@fantaastaapp/contracts";

import {
  apiRequest
} from "../shared/api-client.js";

export async function fetchActiveAuctionSession():
  Promise<AuctionSession | null> {
  return apiRequest<AuctionSession | null>(
    "/api/auction-sessions/active"
  );
}
