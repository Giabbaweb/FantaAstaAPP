import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import {
  APPLICATION_NAME
} from "@fantaastaapp/domain";

import {
  buildApp
} from "./app.js";

describe("GET /api/health", () => {
  let app: Awaited<
    ReturnType<typeof buildApp>
  >;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the application health status", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health"
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      status: string;
      application: string;
      timestamp: string;
    }>();

    expect(body).toEqual({
      status: "ok",
      application: APPLICATION_NAME,
      timestamp: expect.any(String)
    });

    expect(
      Number.isNaN(Date.parse(body.timestamp))
    ).toBe(false);
  });
});
