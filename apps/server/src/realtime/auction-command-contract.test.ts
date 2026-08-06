import {
  describe,
  expect,
  it
} from "vitest";

import {
  auctionCommandAckSchema,
  auctionCommandRequestSchema
} from "@fantaastaapp/contracts";

describe("auction command contracts", () => {
  const metadata = {
    commandId: "command-1",
    stateVersion: 3
  };

  it.each([
    {
      auctionCallId: "auction-call-1",
      command: "OPEN",
      metadata,
      openingBid: 1
    },
    {
      auctionCallId: "auction-call-1",
      command: "BID",
      metadata,
      auctionSessionTeamId:
        "auction-session-team-1",
      bid: 5
    },
    {
      auctionCallId: "auction-call-1",
      command: "PASS",
      metadata,
      auctionSessionTeamId:
        "auction-session-team-1"
    },
    {
      auctionCallId: "auction-call-1",
      command: "UNDO_PASS",
      metadata,
      auctionSessionTeamId:
        "auction-session-team-1"
    },
    {
      auctionCallId: "auction-call-1",
      command: "CONFIRM",
      metadata
    },
    {
      auctionCallId: "auction-call-1",
      command: "CANCEL",
      metadata
    }
  ])(
    "accepts command $command",
    (payload) => {
      expect(
        auctionCommandRequestSchema.safeParse(
          payload
        ).success
      ).toBe(true);
    }
  );

  it("rejects OPEN without openingBid", () => {
    expect(
      auctionCommandRequestSchema.safeParse({
        auctionCallId: "auction-call-1",
        command: "OPEN",
        metadata
      }).success
    ).toBe(false);
  });

  it("rejects BID without team or bid", () => {
    expect(
      auctionCommandRequestSchema.safeParse({
        auctionCallId: "auction-call-1",
        command: "BID",
        metadata
      }).success
    ).toBe(false);
  });

  it("accepts a successful acknowledgement", () => {
    expect(
      auctionCommandAckSchema.safeParse({
        success: true,
        data: {
          stateVersion: 4,
          idempotentReplay: false
        },
        error: null
      }).success
    ).toBe(true);
  });

  it("accepts a failed acknowledgement", () => {
    expect(
      auctionCommandAckSchema.safeParse({
        success: false,
        data: null,
        error: {
          code: "STALE_STATE",
          message: "State is stale"
        }
      }).success
    ).toBe(true);
  });

  it("rejects an inconsistent acknowledgement", () => {
    expect(
      auctionCommandAckSchema.safeParse({
        success: true,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected error"
        }
      }).success
    ).toBe(false);
  });
});
