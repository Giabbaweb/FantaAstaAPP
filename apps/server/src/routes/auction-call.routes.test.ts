import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import { eq } from "drizzle-orm";

import {
  buildApp
} from "../app.js";
import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  players,
  rosterEntries
} from "../db/schema/index.js";
import {
  createAuctionCallAggregate,
  createAuctionSession,
  createLeague
} from "../test/auction-call-fixtures.js";

describe("auction call read routes", () => {
  let app: Awaited<
    ReturnType<typeof buildApp>
  >;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it(
    "returns an auction call aggregate by id",
    async () => {
      const fixture =
        await createAuctionCallAggregate();

      const response = await app.inject({
        method: "GET",
        url:
          `/api/auction-calls/${fixture.auctionCallId}`
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        data: {
          call: {
            id: string;
            auctionSessionId: string;
            playerId: string;
            callerAuctionSessionTeamId: string;
            status: string;
            openingBid: number | null;
            currentBid: number | null;
            currentLeaderAuctionSessionTeamId:
              | string
              | null;
            currentTurnAuctionSessionTeamId:
              | string
              | null;
            currentTurnStartedAt:
              | string
              | null;
            provisionalWinnerAuctionSessionTeamId:
              | string
              | null;
            createdAt: string;
            updatedAt: string;
          };
          teams: Array<{
            auctionCallId: string;
            auctionSessionTeamId: string;
            turnOrder: number;
            status: string;
            maximumBid: number;
            exclusionReason: string | null;
          }>;
        };
        error: null;
      }>();

      expect(body.error).toBeNull();

      expect(body.data.call).toEqual({
        id: fixture.auctionCallId,
        auctionSessionId:
          fixture.auctionSessionId,
        playerId: fixture.playerId,
        callerAuctionSessionTeamId:
          fixture.auctionSessionTeam1Id,
        status: "DRAFT",
        openingBid: null,
        currentBid: null,
        currentLeaderAuctionSessionTeamId: null,
        currentTurnAuctionSessionTeamId: null,
        currentTurnStartedAt: null,
        provisionalWinnerAuctionSessionTeamId: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      expect(body.data.teams).toEqual([
        {
          auctionCallId: fixture.auctionCallId,
          auctionSessionTeamId:
            fixture.auctionSessionTeam1Id,
          turnOrder: 1,
          status: "ACTIVE",
          maximumBid: 307,
          exclusionReason: null
        },
        {
          auctionCallId: fixture.auctionCallId,
          auctionSessionTeamId:
            fixture.auctionSessionTeam2Id,
          turnOrder: 2,
          status: "ACTIVE",
          maximumBid: 307,
          exclusionReason: null
        },
        {
          auctionCallId: fixture.auctionCallId,
          auctionSessionTeamId:
            fixture.auctionSessionTeam3Id,
          turnOrder: 3,
          status: "ACTIVE",
          maximumBid: 307,
          exclusionReason: null
        }
      ]);
    }
  );

  it(
    "returns 404 when the auction call does not exist",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auction-calls/missing-auction-call"
      });

      expect(response.statusCode).toBe(404);

      expect(response.json()).toEqual({
        data: null,
        error: {
          code: "AUCTION_CALL_NOT_FOUND",
          message:
            'Auction call "missing-auction-call" was not found'
        }
      });
    }
  );

  it(
    "returns the operational auction call for a session",
    async () => {
      const fixture =
        await createAuctionCallAggregate();

      const response = await app.inject({
        method: "GET",
        url:
          `/api/auction-sessions/${fixture.auctionSessionId}/auction-call`
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        data: {
          call: {
            id: string;
            status: string;
          };
          teams: unknown[];
        };
        error: null;
      }>();

      expect(body.error).toBeNull();
      expect(body.data.call).toMatchObject({
        id: fixture.auctionCallId,
        status: "DRAFT"
      });
      expect(body.data.teams).toHaveLength(3);
    }
  );

  it(
    "returns null when the session has no operational auction call",
    async () => {
      await createLeague();

      const session =
        await createAuctionSession({
          id: "session-without-auction-call",
          season: "2027/2028",
          editionNumber: 2
        });

      const response = await app.inject({
        method: "GET",
        url:
          `/api/auction-sessions/${session.id}/auction-call`
      });

      expect(response.statusCode).toBe(200);

      expect(response.json()).toEqual({
        data: null,
        error: null
      });
    }
  );

  describe("POST auction call open command", () => {
    it(
      "opens a draft auction call",
      async () => {
        const fixture =
          await createAuctionCallAggregate();

        const response = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/open`,
          payload: {
            commandId: "cmd-open",
            stateVersion: 0,
            openingBid: 1
          }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json<{
          data: {
            call: {
              id: string;
              status: string;
              openingBid: number | null;
              currentBid: number | null;
              currentLeaderAuctionSessionTeamId:
                | string
                | null;
              currentTurnAuctionSessionTeamId:
                | string
                | null;
              provisionalWinnerAuctionSessionTeamId:
                | string
                | null;
            };
            teams: unknown[];
          };
          error: null;
        }>();

        expect(body.error).toBeNull();

        expect(body.data.call).toMatchObject({
          id: fixture.auctionCallId,
          status: "OPEN",
          openingBid: 1,
          currentBid: 1,
          currentLeaderAuctionSessionTeamId:
            fixture.auctionSessionTeam1Id,
          currentTurnAuctionSessionTeamId:
            fixture.auctionSessionTeam2Id,
          provisionalWinnerAuctionSessionTeamId: null
        });

        expect(body.data.teams).toHaveLength(3);

        const storedResponse = await app.inject({
          method: "GET",
          url:
            `/api/auction-calls/${fixture.auctionCallId}`
        });

        expect(storedResponse.statusCode).toBe(200);

        expect(
          storedResponse.json<{
            data: {
              call: {
                status: string;
                currentBid: number | null;
              };
            };
          }>().data.call
        ).toMatchObject({
          status: "OPEN",
          currentBid: 1
        });
      }
    );

    it(
      "returns 400 for an invalid opening bid",
      async () => {
        const fixture =
          await createAuctionCallAggregate();

        const response = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/open`,
          payload: {
            commandId: "cmd-invalid-open",
            stateVersion: 0,
            openingBid: 0
          }
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code: "INVALID_REQUEST",
            message:
              '"openingBid" must be an integer greater than or equal to 1'
          }
        });
      }
    );

    it(
      "returns 400 for an unknown auction call command",
      async () => {
        const response = await app.inject({
          method: "POST",
          url:
            "/api/auction-calls/auction-call-1/commands/unknown",
          payload: {
            commandId: "cmd-unknown",
            stateVersion: 0
          }
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code: "INVALID_REQUEST",
            message:
              'Unknown auction call command "unknown"'
          }
        });
      }
    );

    it(
      "returns 409 when opening an already open auction call",
      async () => {
        const fixture =
          await createAuctionCallAggregate();

        const firstResponse = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/open`,
          payload: {
            commandId: "cmd-open-1",
            stateVersion: 0,
            openingBid: 1
          }
        });

        expect(firstResponse.statusCode).toBe(200);

        const secondResponse = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/open`,
          payload: {
            commandId: "cmd-open-2",
            stateVersion: 1,
            openingBid: 1
          }
        });

        expect(secondResponse.statusCode).toBe(409);

        const body = secondResponse.json<{
          data: null;
          error: {
            code: string;
            message: string;
          };
        }>();

        expect(body.data).toBeNull();
        expect(body.error.code).toBe(
          "INVALID_STATUS_TRANSITION"
        );
        expect(body.error.message).toEqual(
          expect.any(String)
        );
      }
    );
  });


  describe("POST auction call bidding commands", () => {
    async function openCall(
      auctionCallId: string
    ): Promise<void> {
      const response = await app.inject({
        method: "POST",
        url:
          `/api/auction-calls/${auctionCallId}/commands/open`,
        payload: {
          commandId: "cmd-open",
          stateVersion: 0,
          openingBid: 1
        }
      });

      expect(response.statusCode).toBe(200);
    }

    it(
      "places a bid and advances the turn",
      async () => {
        const fixture =
          await createAuctionCallAggregate();

        await openCall(fixture.auctionCallId);

        const response = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/bid`,
          payload: {
            commandId: "cmd-bid",
            stateVersion: 1,
            auctionSessionTeamId:
              fixture.auctionSessionTeam2Id,
            bid: 5
          }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json<{
          data: {
            call: {
              status: string;
              currentBid: number | null;
              currentLeaderAuctionSessionTeamId:
                | string
                | null;
              currentTurnAuctionSessionTeamId:
                | string
                | null;
            };
          };
          error: null;
        }>();

        expect(body.error).toBeNull();

        expect(body.data.call).toMatchObject({
          status: "OPEN",
          currentBid: 5,
          currentLeaderAuctionSessionTeamId:
            fixture.auctionSessionTeam2Id,
          currentTurnAuctionSessionTeamId:
            fixture.auctionSessionTeam3Id
        });
      }
    );

    it(
      "returns 409 for a bid outside the current turn",
      async () => {
        const fixture =
          await createAuctionCallAggregate();

        await openCall(fixture.auctionCallId);

        const response = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/bid`,
          payload: {
            commandId: "cmd-invalid-turn-bid",
            stateVersion: 1,
            auctionSessionTeamId:
              fixture.auctionSessionTeam3Id,
            bid: 5
          }
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toMatchObject({
          data: null,
          error: {
            code: "NOT_TEAM_TURN"
          }
        });
      }
    );

    it(
      "passes and restores a team",
      async () => {
        const fixture =
          await createAuctionCallAggregate();

        await openCall(fixture.auctionCallId);

        const passResponse = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/pass`,
          payload: {
            commandId: "cmd-pass",
            stateVersion: 1,
            auctionSessionTeamId:
              fixture.auctionSessionTeam2Id
          }
        });

        expect(passResponse.statusCode).toBe(200);

        const passedBody = passResponse.json<{
          data: {
            call: {
              status: string;
              currentTurnAuctionSessionTeamId:
                | string
                | null;
            };
            teams: Array<{
              auctionSessionTeamId: string;
              status: string;
            }>;
          };
          error: null;
        }>();

        expect(
          passedBody.data.call
            .currentTurnAuctionSessionTeamId
        ).toBe(fixture.auctionSessionTeam3Id);

        expect(
          passedBody.data.teams.find(
            (team) =>
              team.auctionSessionTeamId ===
              fixture.auctionSessionTeam2Id
          )
        ).toMatchObject({
          status: "PASSED"
        });

        const undoResponse = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/undo-pass`,
          payload: {
            commandId: "cmd-undo-pass",
            stateVersion: 2,
            auctionSessionTeamId:
              fixture.auctionSessionTeam2Id
          }
        });

        expect(undoResponse.statusCode).toBe(200);

        const restoredBody = undoResponse.json<{
          data: {
            call: {
              status: string;
              currentTurnAuctionSessionTeamId:
                | string
                | null;
            };
            teams: Array<{
              auctionSessionTeamId: string;
              status: string;
            }>;
          };
          error: null;
        }>();

        expect(restoredBody.data.call).toMatchObject({
          status: "OPEN",
          currentTurnAuctionSessionTeamId:
            fixture.auctionSessionTeam2Id
        });

        expect(
          restoredBody.data.teams.find(
            (team) =>
              team.auctionSessionTeamId ===
              fixture.auctionSessionTeam2Id
          )
        ).toMatchObject({
          status: "ACTIVE"
        });
      }
    );
  });


  describe("POST auction call finalization commands", () => {
    it(
      "confirms a provisional auction award",
      async () => {
        const fixture =
          await createAuctionCallAggregate();

        const openResponse = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/open`,
          payload: {
            commandId: "cmd-confirm-open",
            stateVersion: 0,
            openingBid: 1
          }
        });

        expect(openResponse.statusCode).toBe(200);

        const team2PassResponse = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/pass`,
          payload: {
            commandId: "cmd-confirm-pass-1",
            stateVersion: 1,
            auctionSessionTeamId:
              fixture.auctionSessionTeam2Id
          }
        });

        expect(team2PassResponse.statusCode).toBe(200);

        const team3PassResponse = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/pass`,
          payload: {
            commandId: "cmd-confirm-pass-2",
            stateVersion: 2,
            auctionSessionTeamId:
              fixture.auctionSessionTeam3Id
          }
        });

        expect(team3PassResponse.statusCode).toBe(200);

        expect(
          team3PassResponse.json<{
            data: {
              call: {
                status: string;
                provisionalWinnerAuctionSessionTeamId:
                  | string
                  | null;
              };
            };
          }>().data.call
        ).toMatchObject({
          status: "PROVISIONAL_AWARD",
          provisionalWinnerAuctionSessionTeamId:
            fixture.auctionSessionTeam1Id
        });

        const confirmResponse = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/confirm`,
          payload: {
            commandId: "cmd-confirm",
            stateVersion: 3
          }
        });

        expect(confirmResponse.statusCode).toBe(200);

        const confirmedCall =
          confirmResponse.json<{
            data: {
              call: {
                status: string;
                currentBid: number | null;
                provisionalWinnerAuctionSessionTeamId:
                  | string
                  | null;
              };
            };
            stateVersion: number;
            error: null;
          }>();

        expect(confirmedCall.error).toBeNull();

        expect(confirmedCall.data.call).toMatchObject({
          status: "CONFIRMED",
          currentBid: 1,
          provisionalWinnerAuctionSessionTeamId:
            fixture.auctionSessionTeam1Id
        });

        expect(
          confirmedCall.stateVersion
        ).toBe(4);

        const [storedRosterEntry] =
          await db
            .select()
            .from(rosterEntries)
            .where(
              eq(
                rosterEntries.playerId,
                fixture.playerId
              )
            )
            .limit(1);

        expect(storedRosterEntry).toMatchObject({
          auctionSessionTeamId:
            fixture.auctionSessionTeam1Id,
          playerId: fixture.playerId,
          acquisitionCost: 1,
          contractYear: 1,
          source: "AUCTION"
        });

        const [storedPlayer] =
          await db
            .select()
            .from(players)
            .where(
              eq(
                players.id,
                fixture.playerId
              )
            )
            .limit(1);

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("ROSTERED");

        const [storedSessionTeam] =
          await db
            .select()
            .from(auctionSessionTeams)
            .where(
              eq(
                auctionSessionTeams.id,
                fixture.auctionSessionTeam1Id
              )
            )
            .limit(1);

        expect(
          storedSessionTeam?.remainingCredits
        ).toBe(329);
      }
    );

    it(
  "rolls back confirm when the player is not available",
  async () => {
    const fixture =
      await createAuctionCallAggregate();

    const openResponse = await app.inject({
      method: "POST",
      url:
        `/api/auction-calls/${fixture.auctionCallId}/commands/open`,
      payload: {
        commandId: "cmd-rollback-open",
        stateVersion: 0,
        openingBid: 1
      }
    });

    expect(openResponse.statusCode).toBe(200);

    const team2PassResponse = await app.inject({
      method: "POST",
      url:
        `/api/auction-calls/${fixture.auctionCallId}/commands/pass`,
      payload: {
        commandId: "cmd-rollback-pass-1",
        stateVersion: 1,
        auctionSessionTeamId:
          fixture.auctionSessionTeam2Id
      }
    });

    expect(
      team2PassResponse.statusCode
    ).toBe(200);

    const team3PassResponse = await app.inject({
      method: "POST",
      url:
        `/api/auction-calls/${fixture.auctionCallId}/commands/pass`,
      payload: {
        commandId: "cmd-rollback-pass-2",
        stateVersion: 2,
        auctionSessionTeamId:
          fixture.auctionSessionTeam3Id
      }
    });

    expect(
      team3PassResponse.statusCode
    ).toBe(200);

    await db
      .update(players)
      .set({
        availabilityStatus: "UNAVAILABLE"
      })
      .where(
        eq(
          players.id,
          fixture.playerId
        )
      );

    const confirmResponse = await app.inject({
      method: "POST",
      url:
        `/api/auction-calls/${fixture.auctionCallId}/commands/confirm`,
      payload: {
        commandId: "cmd-rollback-confirm",
        stateVersion: 3
      }
    });

    expect(
      confirmResponse.statusCode
    ).toBe(409);

    expect(
      confirmResponse.json<{
        data: null;
        error: {
          code: string;
          message: string;
        };
      }>()
    ).toMatchObject({
      data: null,
      error: {
        code: "PLAYER_NOT_AVAILABLE"
      }
    });

    const storedCallResponse =
      await app.inject({
        method: "GET",
        url:
          `/api/auction-calls/${fixture.auctionCallId}`
      });

    expect(
      storedCallResponse.statusCode
    ).toBe(200);

    expect(
      storedCallResponse.json<{
        data: {
          call: {
            status: string;
            currentBid: number | null;
            provisionalWinnerAuctionSessionTeamId:
              | string
              | null;
          };
        };
      }>().data.call
    ).toMatchObject({
      status: "PROVISIONAL_AWARD",
      currentBid: 1,
      provisionalWinnerAuctionSessionTeamId:
        fixture.auctionSessionTeam1Id
    });

    const storedRosterEntries =
      await db
        .select()
        .from(rosterEntries)
        .where(
          eq(
            rosterEntries.playerId,
            fixture.playerId
          )
        );

    expect(
      storedRosterEntries
    ).toHaveLength(0);

    const [storedPlayer] =
      await db
        .select()
        .from(players)
        .where(
          eq(
            players.id,
            fixture.playerId
          )
        )
        .limit(1);

    expect(
      storedPlayer?.availabilityStatus
    ).toBe("UNAVAILABLE");

    const [storedSessionTeam] =
      await db
        .select()
        .from(auctionSessionTeams)
        .where(
          eq(
            auctionSessionTeams.id,
            fixture.auctionSessionTeam1Id
          )
        )
        .limit(1);

    expect(
      storedSessionTeam?.remainingCredits
    ).toBe(330);

    const [storedSession] =
      await db
        .select({
          stateVersion:
            auctionSessions.stateVersion
        })
        .from(auctionSessions)
        .where(
          eq(
            auctionSessions.id,
            fixture.auctionSessionId
          )
        )
        .limit(1);

    expect(
      storedSession?.stateVersion
    ).toBe(3);
  }
);

it(
      "cancels a draft auction call",
      async () => {
        const fixture =
          await createAuctionCallAggregate();

        const response = await app.inject({
          method: "POST",
          url:
            `/api/auction-calls/${fixture.auctionCallId}/commands/cancel`,
          payload: {
            commandId: "cmd-cancel",
            stateVersion: 0
          }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json<{
          data: {
            call: {
              id: string;
              status: string;
              openingBid: number | null;
              currentBid: number | null;
            };
          };
          error: null;
        }>();

        expect(body.error).toBeNull();

        expect(body.data.call).toMatchObject({
          id: fixture.auctionCallId,
          status: "CANCELLED",
          openingBid: null,
          currentBid: null
        });

        const storedResponse = await app.inject({
          method: "GET",
          url:
            `/api/auction-calls/${fixture.auctionCallId}`
        });

        expect(storedResponse.statusCode).toBe(200);

        expect(
          storedResponse.json<{
            data: {
              call: {
                status: string;
              };
            };
          }>().data.call.status
        ).toBe("CANCELLED");
      }
    );
  });

});
