import {
  describe,
  expect,
  it
} from "vitest";

import {
  resolveNextCallerAuctionSessionTeamId
} from "./auction-caller-rotation.js";

describe(
  "resolveNextCallerAuctionSessionTeamId",
  () => {
    it(
      "skips completed teams after the previous caller",
      () => {
        const result =
          resolveNextCallerAuctionSessionTeamId({
            sessionTeams: [
              {
                id: "team-6",
                tableOrder: 6,
                isEligibleToCall: false
              },
              {
                id: "team-7",
                tableOrder: 7,
                isEligibleToCall: false
              },
              {
                id: "team-8",
                tableOrder: 8,
                isEligibleToCall: true
              },
              {
                id: "team-1",
                tableOrder: 1,
                isEligibleToCall: false
              }
            ],
            previousCallerAuctionSessionTeamId:
              "team-6"
          });

        expect(result).toBe("team-8");
      }
    );

    it(
      "wraps around the table while skipping completed teams",
      () => {
        const result =
          resolveNextCallerAuctionSessionTeamId({
            sessionTeams: [
              {
                id: "team-1",
                tableOrder: 1,
                isEligibleToCall: false
              },
              {
                id: "team-3",
                tableOrder: 3,
                isEligibleToCall: true
              },
              {
                id: "team-8",
                tableOrder: 8,
                isEligibleToCall: false
              }
            ],
            previousCallerAuctionSessionTeamId:
              "team-8"
          });

        expect(result).toBe("team-3");
      }
    );

    it(
      "returns null when every roster is complete",
      () => {
        const result =
          resolveNextCallerAuctionSessionTeamId({
            sessionTeams: [
              {
                id: "team-1",
                tableOrder: 1,
                isEligibleToCall: false
              },
              {
                id: "team-2",
                tableOrder: 2,
                isEligibleToCall: false
              }
            ],
            previousCallerAuctionSessionTeamId:
              "team-1"
          });

        expect(result).toBeNull();
      }
    );

    it(
      "keeps existing behavior when eligibility is omitted",
      () => {
        const result =
          resolveNextCallerAuctionSessionTeamId({
            sessionTeams: [
              {
                id: "team-1",
                tableOrder: 1
              },
              {
                id: "team-2",
                tableOrder: 2
              }
            ],
            previousCallerAuctionSessionTeamId:
              "team-1"
          });

        expect(result).toBe("team-2");
      }
    );
  }
);
