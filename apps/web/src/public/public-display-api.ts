import type {
  AuctionSession
} from "@fantaastaapp/contracts";

type ActiveAuctionSessionResponse = {
  data: AuctionSession | null;
  error: null;
};

export async function fetchActiveAuctionSession():
  Promise<AuctionSession | null> {
  const response = await fetch(
    "/api/auction-sessions/active"
  );

  if (!response.ok) {
    throw new Error(
      `Active auction session request failed with status ${response.status}`
    );
  }

  const body =
    await response.json() as ActiveAuctionSessionResponse;

  return body.data;
}
