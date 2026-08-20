import type {
  PublicDisplayControlPatch,
  PublicDisplayControlState
} from "@fantaastaapp/contracts";

import {
  apiRequest
} from "./api-client.js";

export function fetchPublicDisplayControl(
  auctionSessionId: string
): Promise<PublicDisplayControlState> {
  return apiRequest<PublicDisplayControlState>(
    `/api/auction-sessions/${auctionSessionId}/public-display-control`
  );
}

export function updatePublicDisplayControl(
  auctionSessionId: string,
  patch: PublicDisplayControlPatch
): Promise<PublicDisplayControlState> {
  return apiRequest<
    PublicDisplayControlState
  >(
    `/api/auction-sessions/${auctionSessionId}/public-display-control`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify(patch)
    }
  );
}
