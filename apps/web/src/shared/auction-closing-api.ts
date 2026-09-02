import type {
  AuctionSession
} from "@fantaastaapp/contracts";

export type FmsSessionRosterExportFile = {
  auctionSessionTeamId: string;
  teamId: string;
  tableOrder: number;
  filename: string;
  content: string;
};

type SessionCommandResponse = {
  data: AuctionSession;
  error: null;
};

type FmsGoalkeeperSelectionResponse = {
  data: {
    id: string;
    auctionSessionTeamId: string;
    playerId: string;
  };
  error: null;
};

type FmsSessionRosterExportResponse = {
  data: FmsSessionRosterExportFile[];
  error: null;
};

async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const payload =
    await response.json().catch(
      () => null
    ) as {
      error?: {
        message?: string;
      };
    } | null;

  return (
    payload?.error?.message ??
    `${fallback} (${response.status})`
  );
}

async function executeClosingCommand(
  auctionSessionId: string,
  command: "complete" | "close"
): Promise<AuctionSession> {
  const response = await fetch(
    `/api/auction-sessions/${auctionSessionId}/commands/${command}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    }
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Comando di chiusura asta fallito"
      )
    );
  }

  const payload =
    await response.json() as
      SessionCommandResponse;

  return payload.data;
}

export function completeAuctionSession(
  auctionSessionId: string
): Promise<AuctionSession> {
  return executeClosingCommand(
    auctionSessionId,
    "complete"
  );
}

export async function forceCompleteAuctionSession(
  auctionSessionId: string
): Promise<AuctionSession> {
  const response = await fetch(
    `/api/auction-sessions/${auctionSessionId}/force-complete`,
    {
      method: "POST"
    }
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Interruzione asta fallita"
      )
    );
  }

  const payload =
    await response.json() as
      SessionCommandResponse;

  return payload.data;
}

export function closeAuctionSession(
  auctionSessionId: string
): Promise<AuctionSession> {
  return executeClosingCommand(
    auctionSessionId,
    "close"
  );
}

export async function selectFmsExportGoalkeeper(
  auctionSessionTeamId: string,
  playerId: string
): Promise<void> {
  const response = await fetch(
    `/api/auction-session-teams/${auctionSessionTeamId}/fms-export-goalkeeper`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        playerId
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Selezione terzo portiere FMS fallita"
      )
    );
  }

  await response.json() as
    FmsGoalkeeperSelectionResponse;
}

export async function loadFmsSessionRosterExport(
  auctionSessionId: string
): Promise<FmsSessionRosterExportFile[]> {
  const response = await fetch(
    `/api/auction-sessions/${auctionSessionId}/fms-roster-export`
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Export rose FMS fallito"
      )
    );
  }

  const payload =
    await response.json() as
      FmsSessionRosterExportResponse;

  return payload.data;
}
