import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  AtomicTechnicalRosterCorrectionCommandService
} from "./atomic-technical-roster-correction-command.service.js";

describe(
  "AtomicTechnicalRosterCorrectionCommandService",
  () => {
    it(
      "maps metadata actor comment and correction to the executor",
      async () => {
        const execute = vi.fn();

        execute.mockResolvedValue({
          correction: {
            before: {},
            after: {}
          },
          stateVersion: 4,
          idempotentReplay: false
        });

        const service =
          new AtomicTechnicalRosterCorrectionCommandService(
            {
              execute
            }
          );

        await service.correct(
          {
            commandId:
              "technical-correction-command-1",
            stateVersion: 3
          },
          {
            name: "Gianfranco",
            role: "AUCTIONEER"
          },
          {
            auctionSessionId:
              "session-1",
            rosterEntryId:
              "roster-entry-1",
            auctionSessionTeamId:
              "session-team-2",
            playerId:
              "player-2",
            acquisitionCost: 35,
            contractYear: 3
          },
          "Correzione tecnica"
        );

        expect(execute).toHaveBeenCalledTimes(1);

        expect(execute).toHaveBeenCalledWith(
          expect.objectContaining({
            commandId:
              "technical-correction-command-1",
            commandType:
              "TECHNICAL_ROSTER_CORRECTION",
            expectedStateVersion: 3,
            actorName:
              "Gianfranco",
            actorRole:
              "AUCTIONEER",
            comment:
              "Correzione tecnica",
            correction: {
              auctionSessionId:
                "session-1",
              rosterEntryId:
                "roster-entry-1",
              auctionSessionTeamId:
                "session-team-2",
              playerId:
                "player-2",
              acquisitionCost: 35,
              contractYear: 3
            }
          })
        );

        const call =
          execute.mock.calls[0]?.[0];

        expect(
          JSON.parse(
            call.requestFingerprint
          )
        ).toEqual({
          commandType:
            "TECHNICAL_ROSTER_CORRECTION",
          actorName:
            "Gianfranco",
          actorRole:
            "AUCTIONEER",
          comment:
            "Correzione tecnica",
          correction: {
            auctionSessionId:
              "session-1",
            rosterEntryId:
              "roster-entry-1",
            auctionSessionTeamId:
              "session-team-2",
            playerId:
              "player-2",
            acquisitionCost: 35,
            contractYear: 3
          }
        });
      }
    );
  }
);
