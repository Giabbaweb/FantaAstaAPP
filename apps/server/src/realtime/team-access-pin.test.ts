import {
  describe,
  expect,
  it
} from "vitest";

import {
  assertTeamAccessPin,
  hashTeamAccessPin,
  verifyTeamAccessPin
} from "./team-access-pin.js";

describe("team access PIN", () => {
  it("accepts PINs containing 4 to 8 digits", () => {
    expect(() =>
      assertTeamAccessPin("1234")
    ).not.toThrow();

    expect(() =>
      assertTeamAccessPin("12345678")
    ).not.toThrow();
  });

  it("rejects PINs with invalid format", () => {
    const invalidPins = [
      "123",
      "123456789",
      "12a4",
      " 1234 ",
      ""
    ];

    for (const pin of invalidPins) {
      expect(() =>
        assertTeamAccessPin(pin)
      ).toThrow(
        "Team access PIN must contain between 4 and 8 digits"
      );
    }
  });

  it("hashes a PIN without storing it in clear text", async () => {
    const hash =
      await hashTeamAccessPin("1234");

    expect(hash).toMatch(
      /^scrypt\$[0-9a-f]+\$[0-9a-f]+$/
    );

    expect(hash).not.toContain("$1234");
    expect(hash).not.toBe("1234");
  });

  it("generates different hashes for the same PIN", async () => {
    const firstHash =
      await hashTeamAccessPin("1234");

    const secondHash =
      await hashTeamAccessPin("1234");

    expect(firstHash).not.toBe(secondHash);
  });

  it("verifies the correct PIN", async () => {
    const hash =
      await hashTeamAccessPin("1234");

    await expect(
      verifyTeamAccessPin("1234", hash)
    ).resolves.toBe(true);
  });

  it("rejects an incorrect PIN", async () => {
    const hash =
      await hashTeamAccessPin("1234");

    await expect(
      verifyTeamAccessPin("9999", hash)
    ).resolves.toBe(false);
  });

  it("rejects malformed stored hashes", async () => {
    const malformedHashes = [
      "",
      "invalid",
      "scrypt$missing",
      "unknown$salt$hash",
      "scrypt$salt$not-hex",
      "scrypt$zzzz$0011",
      "scrypt$0011$0011",
      `scrypt$${"00".repeat(16)}$${"00".repeat(64)}$extra`
    ];

    for (const hash of malformedHashes) {
      await expect(
        verifyTeamAccessPin("1234", hash)
      ).resolves.toBe(false);
    }
  });

  it("rejects invalid candidate PINs", async () => {
    const hash =
      await hashTeamAccessPin("1234");

    await expect(
      verifyTeamAccessPin("12a4", hash)
    ).resolves.toBe(false);
  });
});
