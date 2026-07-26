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

describe("application integration", () => {
  let app: Awaited<
    ReturnType<typeof buildApp>
  >;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/health", () => {
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

  describe("GET /api/db-health", () => {
    it("returns the database health status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/db-health"
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        status: string;
        database: string;
        timestamp: string;
      }>();

      expect(body.status).toBe("ok");
      expect(body.database).toBe("fantaasta.sqlite");

      expect(
        Number.isNaN(Date.parse(body.timestamp))
      ).toBe(false);
    });
  });
});
