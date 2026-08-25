import type {
  RealtimeOperationalAuctionCall
} from "@fantaastaapp/contracts";

type AuctionCallCommandResult = {
  aggregate:
    RealtimeOperationalAuctionCall;
  stateVersion: number;
};

type RawAuctionCallCommandResponse = {
  data:
    RealtimeOperationalAuctionCall;
  stateVersion: number;
  idempotentReplay: boolean;
  error: null;
};

export async function openAuctionCall(
  auctionCallId: string,
  stateVersion: number,
  openingBid: number
): Promise<AuctionCallCommandResult> {
  const response = await fetch(
    `/api/auction-calls/${auctionCallId}/commands/open`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        commandId:
          crypto.randomUUID(),
        stateVersion,
        openingBid
      })
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
        `Apertura chiamata fallita (${response.status})`
    );
  }

  const payload =
    await response.json() as
      RawAuctionCallCommandResponse;

  return {
    aggregate:
      payload.data,
    stateVersion:
      payload.stateVersion
  };
}

export async function confirmAuctionCall(
  auctionCallId: string,
  stateVersion: number
): Promise<AuctionCallCommandResult> {
  const response = await fetch(
    `/api/auction-calls/${auctionCallId}/commands/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        commandId:
          crypto.randomUUID(),
        stateVersion
      })
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
        `Conferma aggiudicazione fallita (${response.status})`
    );
  }

  const payload =
    await response.json() as
      RawAuctionCallCommandResponse;

  return {
    aggregate:
      payload.data,
    stateVersion:
      payload.stateVersion
  };
}

export async function cancelAuctionCall(
  auctionCallId: string,
  stateVersion: number
): Promise<AuctionCallCommandResult> {
  const response = await fetch(
    `/api/auction-calls/${auctionCallId}/commands/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        commandId:
          crypto.randomUUID(),
        stateVersion
      })
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
        `Annullamento chiamata fallito (${response.status})`
    );
  }

  const payload =
    await response.json() as
      RawAuctionCallCommandResponse;

  return {
    aggregate:
      payload.data,
    stateVersion:
      payload.stateVersion
  };
}

type RawCreateAuctionCallDraftResponse = {
  data: unknown;
  stateVersion: number;
  idempotentReplay: boolean;
  error: null;
};

export type CreateAuctionCallDraftResult = {
  stateVersion: number;
  idempotentReplay: boolean;
};

export async function createAuctionCallDraft(
  auctionSessionId: string,
  playerFmsCode: string,
  stateVersion: number
): Promise<CreateAuctionCallDraftResult> {
  const response = await fetch(
    `/api/auction-sessions/${auctionSessionId}/auction-calls`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auctionCallId:
          crypto.randomUUID(),
        playerFmsCode,
        commandId:
          crypto.randomUUID(),
        stateVersion
      })
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
        `Creazione chiamata fallita (${response.status})`
    );
  }

  const payload =
    await response.json() as
      RawCreateAuctionCallDraftResponse;

  return {
    stateVersion:
      payload.stateVersion,
    idempotentReplay:
      payload.idempotentReplay
  };
}
