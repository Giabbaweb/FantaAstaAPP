import {
  describe,
  expect,
  it
} from "vitest";

import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";

import {
  AuctionCallCommandHandler
} from "./auction-call-command-handler.js";

const timestamps = {
  open:
    "2026-09-16T19:00:00.000Z",
  bid:
    "2026-09-16T19:00:12.000Z",
  pass:
    "2026-09-16T19:00:21.000Z",
  undo:
    "2026-09-16T19:00:35.000Z"
};

function createDraftAggregate():
  AuctionCallAggregate {
  return {
    call: {
      id: "auction-call-timer",
      auctionSessionId:
        "auction-session-timer",
      playerId: "player-timer",
      callerAuctionSessionTeamId:
        "session-team-1",
      status: "DRAFT",
      openingBid: null,
      currentBid: null,
      currentLeaderAuctionSessionTeamId:
        null,
      currentTurnAuctionSessionTeamId:
        null,
      currentTurnStartedAt: null,
      provisionalWinnerAuctionSessionTeamId:
        null,
      createdAt:
        "2026-09-16T18:59:50.000Z",
      updatedAt:
        "2026-09-16T18:59:50.000Z"
    },

    teams: [
      {
        auctionCallId:
          "auction-call-timer",
        auctionSessionTeamId:
          "session-team-1",
        turnOrder: 1,
        status: "ACTIVE",
        maximumBid: 300,
        exclusionReason: null
      },
      {
        auctionCallId:
          "auction-call-timer",
        auctionSessionTeamId:
          "session-team-2",
        turnOrder: 2,
        status: "ACTIVE",
        maximumBid: 300,
        exclusionReason: null
      },
      {
        auctionCallId:
          "auction-call-timer",
        auctionSessionTeamId:
          "session-team-3",
        turnOrder: 3,
        status: "ACTIVE",
        maximumBid: 300,
        exclusionReason: null
      }
    ]
  };
}

describe(
  "AuctionCallCommandHandler turn timer",
  () => {
    it(
      "starts a new timestamp whenever the current turn changes",
      () => {
        const values = [
          timestamps.open,
          timestamps.bid,
          timestamps.pass
        ];

        const handler =
          new AuctionCallCommandHandler(
            () => {
              const value =
                values.shift();

              if (!value) {
                throw new Error(
                  "Unexpected clock read"
                );
              }

              return value;
            }
          );

        const draft =
          createDraftAggregate();

        const opened =
          handler.open(
            draft,
            1
          );

        expect(
          opened.call
            .currentTurnAuctionSessionTeamId
        ).toBe(
          "session-team-2"
        );

        expect(
          opened.call.currentTurnStartedAt
        ).toBe(
          timestamps.open
        );

        const bid =
          handler.placeBid(
            opened,
            "session-team-2",
            2
          );

        expect(
          bid.call
            .currentTurnAuctionSessionTeamId
        ).toBe(
          "session-team-3"
        );

        expect(
          bid.call.currentTurnStartedAt
        ).toBe(
          timestamps.bid
        );

        const passed =
          handler.passTurn(
            bid,
            "session-team-3"
          );

        expect(
          passed.call
            .currentTurnAuctionSessionTeamId
        ).toBe(
          "session-team-1"
        );

        expect(
          passed.call.currentTurnStartedAt
        ).toBe(
          timestamps.pass
        );

        expect(values).toHaveLength(0);
      }
    );

    it(
      "clears the timestamp when the call reaches provisional award",
      () => {
        const handler =
          new AuctionCallCommandHandler(
            () =>
              timestamps.open
          );

        const draft =
          createDraftAggregate();

        draft.teams[2] = {
          ...draft.teams[2]!,
          status: "PASSED"
        };

        const opened =
          handler.open(
            draft,
            1
          );

        expect(
          opened.call
            .currentTurnAuctionSessionTeamId
        ).toBe(
          "session-team-2"
        );

        expect(
          opened.call.currentTurnStartedAt
        ).toBe(
          timestamps.open
        );

        const passed =
          handler.passTurn(
            opened,
            "session-team-2"
          );

        expect(
          passed.call.status
        ).toBe(
          "PROVISIONAL_AWARD"
        );

        expect(
          passed.call
            .currentTurnAuctionSessionTeamId
        ).toBeNull();

        expect(
          passed.call.currentTurnStartedAt
        ).toBeNull();
      }
    );

    it(
      "starts a new timestamp when undo pass restores a turn",
      () => {
        const handler =
          new AuctionCallCommandHandler(
            () =>
              timestamps.undo
          );

        const aggregate =
          createDraftAggregate();

        aggregate.call = {
          ...aggregate.call,
          status:
            "PROVISIONAL_AWARD",
          openingBid: 10,
          currentBid: 10,
          currentLeaderAuctionSessionTeamId:
            "session-team-1",
          currentTurnAuctionSessionTeamId:
            null,
          currentTurnStartedAt:
            null,
          provisionalWinnerAuctionSessionTeamId:
            "session-team-1"
        };

        aggregate.teams =
          aggregate.teams.map(
            (team) => {
              if (
                team.auctionSessionTeamId ===
                "session-team-2"
              ) {
                return {
                  ...team,
                  status:
                    "PASSED" as const
                };
              }

              if (
                team.auctionSessionTeamId ===
                "session-team-3"
              ) {
                return {
                  ...team,
                  status:
                    "PASSED" as const
                };
              }

              return team;
            }
          );

        const restored =
          handler.undoPass(
            aggregate,
            "session-team-2"
          );

        expect(
          restored.call.status
        ).toBe(
          "OPEN"
        );

        expect(
          restored.call
            .currentTurnAuctionSessionTeamId
        ).toBe(
          "session-team-2"
        );

        expect(
          restored.call.currentTurnStartedAt
        ).toBe(
          timestamps.undo
        );
      }
    );
  }
);
