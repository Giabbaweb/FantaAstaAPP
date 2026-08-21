import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  buildApp
} from "../app.js";
import {
  db
} from "../db/client.js";
import {
  leagues,
  owners,
  teamOwners,
  teams
} from "../db/schema/index.js";

describe(
  "team owner routes",
  () => {
    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    beforeAll(async () => {
      app = await buildApp();
    });

    beforeEach(async () => {
      /*
       * Il setup globale di Vitest esegue
       * resetTestDatabase() prima di ogni test.
       * Ogni scenario ricrea quindi la propria
       * fixture di base.
       */
      await db.insert(leagues).values({
        id: "league-team-owner",
        name: "Team Owner League",
        normalizedName:
          "team owner league"
      });

      await db.insert(teams).values({
        id: "team-1",
        leagueId:
          "league-team-owner",
        name: "Team 1"
      });

      await db.insert(owners).values([
        {
          id: "owner-1",
          name: "Owner 1"
        },
        {
          id: "owner-2",
          name: "Owner 2"
        }
      ]);
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "creates a primary team owner association",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/teams/team-1/owners",
            payload: {
              ownerId: "owner-1",
              isPrimary: true
            }
          });

        expect(
          response.statusCode
        ).toBe(201);

        expect(
          response.json()
        ).toEqual({
          data: {
            teamId: "team-1",
            ownerId: "owner-1",
            isPrimary: true
          },
          error: null
        });
      }
    );

    it(
      "replaces the existing primary owner when a new primary is added",
      async () => {
        await db
          .insert(teamOwners)
          .values({
            teamId: "team-1",
            ownerId: "owner-1",
            isPrimary: true
          });

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/teams/team-1/owners",
            payload: {
              ownerId: "owner-2",
              isPrimary: true
            }
          });

        expect(
          response.statusCode
        ).toBe(201);

        const listResponse =
          await app.inject({
            method: "GET",
            url:
              "/api/teams/team-1/owners"
          });

        expect(
          listResponse.statusCode
        ).toBe(200);

        expect(
          listResponse.json()
        ).toEqual({
          data: [
            {
              teamId: "team-1",
              ownerId: "owner-2",
              isPrimary: true
            },
            {
              teamId: "team-1",
              ownerId: "owner-1",
              isPrimary: false
            }
          ],
          error: null
        });
      }
    );

    it(
      "rejects a duplicate association",
      async () => {
        await db
          .insert(teamOwners)
          .values({
            teamId: "team-1",
            ownerId: "owner-2",
            isPrimary: false
          });

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/teams/team-1/owners",
            payload: {
              ownerId: "owner-2",
              isPrimary: true
            }
          });

        expect(
          response.statusCode
        ).toBe(409);

        expect(
          response.json()
        ).toMatchObject({
          data: null,
          error: {
            code:
              "TEAM_OWNER_ALREADY_EXISTS"
          }
        });
      }
    );

    it(
      "updates an existing association and demotes the old primary",
      async () => {
        await db
          .insert(teamOwners)
          .values([
            {
              teamId: "team-1",
              ownerId: "owner-1",
              isPrimary: false
            },
            {
              teamId: "team-1",
              ownerId: "owner-2",
              isPrimary: true
            }
          ]);

        const response =
          await app.inject({
            method: "PATCH",
            url:
              "/api/teams/team-1/owners/owner-1",
            payload: {
              isPrimary: true
            }
          });

        expect(
          response.statusCode
        ).toBe(200);

        expect(
          response.json()
        ).toEqual({
          data: {
            teamId: "team-1",
            ownerId: "owner-1",
            isPrimary: true
          },
          error: null
        });

        const listResponse =
          await app.inject({
            method: "GET",
            url:
              "/api/teams/team-1/owners"
          });

        expect(
          listResponse.json()
        ).toEqual({
          data: [
            {
              teamId: "team-1",
              ownerId: "owner-1",
              isPrimary: true
            },
            {
              teamId: "team-1",
              ownerId: "owner-2",
              isPrimary: false
            }
          ],
          error: null
        });
      }
    );

    it(
      "returns 404 for a missing association",
      async () => {
        const response =
          await app.inject({
            method: "GET",
            url:
              "/api/teams/team-1/owners/missing-owner"
          });

        expect(
          response.statusCode
        ).toBe(404);

        expect(
          response.json()
        ).toMatchObject({
          data: null,
          error: {
            code:
              "TEAM_OWNER_NOT_FOUND"
          }
        });
      }
    );

    it(
      "deletes an existing association",
      async () => {
        await db
          .insert(teamOwners)
          .values({
            teamId: "team-1",
            ownerId: "owner-2",
            isPrimary: false
          });

        const response =
          await app.inject({
            method: "DELETE",
            url:
              "/api/teams/team-1/owners/owner-2"
          });

        expect(
          response.statusCode
        ).toBe(204);

        const detailResponse =
          await app.inject({
            method: "GET",
            url:
              "/api/teams/team-1/owners/owner-2"
          });

        expect(
          detailResponse.statusCode
        ).toBe(404);
      }
    );
  }
);
