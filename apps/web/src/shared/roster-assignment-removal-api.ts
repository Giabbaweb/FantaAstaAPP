type RosterAssignmentRemovalActor = {
  name: string;
  role:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
};

export type RosterAssignmentRemovalResult = {
  removed: {
    rosterEntry: {
      id: string;
      auctionSessionTeamId: string;
      playerId: string;
      acquisitionCost: number;
      contractYear: number;
      source: string;
    };
    auctionSessionTeamId: string;
    playerId: string;
    acquisitionCost: number;
  };
  remainingCreditsAfterRemoval: number;
};

type RawRosterAssignmentRemovalResponse = {
  data: RosterAssignmentRemovalResult;
  stateVersion: number;
  idempotentReplay: boolean;
  error: null;
};

export type RemoveRosterAssignmentResult = {
  removal: RosterAssignmentRemovalResult;
  stateVersion: number;
};

export async function removeRosterAssignment(
  auctionSessionId: string,
  stateVersion: number,
  rosterEntryId: string,
  actor: RosterAssignmentRemovalActor,
  comment: string
): Promise<RemoveRosterAssignmentResult> {
  const response = await fetch(
    `/api/auction-sessions/${auctionSessionId}/commands/remove-roster-assignment`,
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
        rosterEntryId,
        actor,
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
        `Correzione amministrativa fallita (${response.status})`
    );
  }

  const payload =
    await response.json() as
      RawRosterAssignmentRemovalResponse;

  return {
    removal: payload.data,
    stateVersion:
      payload.stateVersion
  };
}
