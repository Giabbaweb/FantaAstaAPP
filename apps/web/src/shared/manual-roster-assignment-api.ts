import {
  createRandomUuid
} from "./random-uuid.js";

export type ManualRosterAssignmentReason =
  | "OPTION_EXERCISED_MANUALLY"
  | "OPTION_NO_EXTERNAL_BID"
  | "TECHNICAL_CORRECTION"
  | "OTHER";

type ManualRosterAssignmentActor = {
  name: string;
  role:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
};

export type ManualRosterAssignmentResult = {
  id: string;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: number;
  source: string;
};

type RawManualRosterAssignmentResponse = {
  data: ManualRosterAssignmentResult;
  stateVersion: number;
  idempotentReplay: boolean;
  error: null;
};

export type AddManualRosterAssignmentResult = {
  assignment: ManualRosterAssignmentResult;
  stateVersion: number;
};

export async function addManualRosterAssignment(
  auctionSessionId: string,
  stateVersion: number,
  auctionSessionTeamId: string,
  playerId: string,
  acquisitionCost: number,
  contractYear: 1,
  actor: ManualRosterAssignmentActor,
  manualAssignmentReason:
    ManualRosterAssignmentReason,
  comment: string
): Promise<AddManualRosterAssignmentResult> {
  const response = await fetch(
    `/api/auction-sessions/${auctionSessionId}/commands/add-manual-roster-assignment`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        commandId:
          createRandomUuid(),
        stateVersion,
        auctionSessionTeamId,
        playerId,
        acquisitionCost,
        contractYear,
        actor,
        manualAssignmentReason,
        comment
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
        `Assegnazione manuale fallita (${response.status})`
    );
  }

  const payload =
    await response.json() as
      RawManualRosterAssignmentResponse;

  return {
    assignment: payload.data,
    stateVersion:
      payload.stateVersion
  };
}
