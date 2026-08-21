import type {
  AuctionSession,
  AuctionSessionSuspensionReason
} from "@fantaastaapp/contracts";

type AuctionSessionCommandResult = {
  session: AuctionSession;
  stateVersion: number;
};

type RawAuctionSessionCommandResponse = {
  data: AuctionSession;
  stateVersion: number;
  idempotentReplay: boolean;
  error: null;
};

async function executeSessionCommand(
  auctionSessionId: string,
  command: "suspend" | "resume",
  body: Record<string, unknown>
): Promise<AuctionSessionCommandResult> {
  const response = await fetch(
    `/api/auction-sessions/${auctionSessionId}/commands/${command}`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const payload =
      await response.json().catch(
        () => null
      ) as {
        error?: {
          message?: string;
        };
      } | null;

    throw new Error(
      payload?.error?.message ??
        `Comando sessione fallito (${response.status})`
    );
  }

  const payload =
    await response.json() as
      RawAuctionSessionCommandResponse;

  return {
    session: payload.data,
    stateVersion:
      payload.stateVersion
  };
}

export function suspendAuctionSession(
  auctionSessionId: string,
  stateVersion: number,
  reason: AuctionSessionSuspensionReason
): Promise<AuctionSessionCommandResult> {
  return executeSessionCommand(
    auctionSessionId,
    "suspend",
    {
      commandId:
        crypto.randomUUID(),
      stateVersion,
      reason
    }
  );
}

export function resumeAuctionSession(
  auctionSessionId: string,
  stateVersion: number
): Promise<AuctionSessionCommandResult> {
  return executeSessionCommand(
    auctionSessionId,
    "resume",
    {
      commandId:
        crypto.randomUUID(),
      stateVersion
    }
  );
}
