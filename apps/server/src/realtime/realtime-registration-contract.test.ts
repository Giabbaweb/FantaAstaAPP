import {
  describe,
  expect,
  it
} from "vitest";

import {
  realtimeRegisteredPayloadSchema,
  realtimeRegistrationRequestSchema,
  realtimeRoleSchema
} from "@fantaastaapp/contracts";

describe("realtime registration contracts", () => {
  it("accepts a TEAM registration", () => {
    const registration = {
      kind: "TEAM",
      deviceId: "team-device-1",
      auctionSessionId: "session-1",
      auctionSessionTeamId:
        "auction-session-team-1",
      role: "OPERATOR",
      pin: "1234"
    };

    expect(
      realtimeRegistrationRequestSchema.parse(
        registration
      )
    ).toEqual(registration);
  });

  it("accepts a PUBLIC_DISPLAY registration", () => {
    const registration = {
      kind: "PUBLIC_DISPLAY",
      deviceId: "public-display-1",
      auctionSessionId: "session-1"
    };

    expect(
      realtimeRegistrationRequestSchema.parse(
        registration
      )
    ).toEqual(registration);
  });

  it("accepts an ADMIN registration", () => {
    const registration = {
      kind: "ADMIN",
      deviceId: "admin-device-1",
      auctionSessionId: "session-1"
    };

    expect(
      realtimeRegistrationRequestSchema.parse(
        registration
      )
    ).toEqual(registration);
  });

  it("rejects a registration without kind", () => {
    expect(
      realtimeRegistrationRequestSchema.safeParse({
        deviceId: "device-1",
        auctionSessionId: "session-1"
      }).success
    ).toBe(false);
  });

  it("rejects an incomplete TEAM registration", () => {
    expect(
      realtimeRegistrationRequestSchema.safeParse({
        kind: "TEAM",
        deviceId: "team-device-1",
        auctionSessionId: "session-1",
        role: "OBSERVER"
      }).success
    ).toBe(false);
  });

  it("keeps non-team kinds outside RealtimeRole", () => {
    expect(
      realtimeRoleSchema.safeParse(
        "PUBLIC_DISPLAY"
      ).success
    ).toBe(false);

    expect(
      realtimeRoleSchema.safeParse(
        "ADMIN"
      ).success
    ).toBe(false);

    expect(
      realtimeRoleSchema.parse("OPERATOR")
    ).toBe("OPERATOR");

    expect(
      realtimeRoleSchema.parse("OBSERVER")
    ).toBe("OBSERVER");
  });

  it("accepts a TEAM registered payload", () => {
    const payload = {
      kind: "TEAM",
      socketId: "socket-1",
      deviceId: "team-device-1",
      auctionSessionId: "session-1",
      auctionSessionTeamId:
        "auction-session-team-1",
      role: "OBSERVER",
      connectedAt:
        "2026-08-09T09:00:00.000Z",
      registeredAt:
        "2026-08-09T09:00:01.000Z"
    };

    expect(
      realtimeRegisteredPayloadSchema.parse(
        payload
      )
    ).toEqual(payload);
  });

  it("accepts a PUBLIC_DISPLAY registered payload", () => {
    const payload = {
      kind: "PUBLIC_DISPLAY",
      socketId: "socket-2",
      deviceId: "public-display-1",
      auctionSessionId: "session-1",
      connectedAt:
        "2026-08-09T09:00:00.000Z",
      registeredAt:
        "2026-08-09T09:00:01.000Z"
    };

    expect(
      realtimeRegisteredPayloadSchema.parse(
        payload
      )
    ).toEqual(payload);
  });
  it("accepts an ADMIN registered payload", () => {
    const payload = {
      kind: "ADMIN",
      socketId: "socket-3",
      deviceId: "admin-device-1",
      auctionSessionId: "session-1",
      connectedAt:
        "2026-08-09T09:00:00.000Z",
      registeredAt:
        "2026-08-09T09:00:01.000Z"
    };

    expect(
      realtimeRegisteredPayloadSchema.parse(
        payload
      )
    ).toEqual(payload);
  });
});
