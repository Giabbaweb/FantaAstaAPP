import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionCalls,
  auctionEvents,
  auctionSessions,
  auctionSessionTeams,
  leagues,
  players,
  teams
} from "../db/schema/index.js";
import {
  SqliteAuctionEventRepository
} from "./auction-event.repository.js";

const leagueId = "league-auction-event-test";
const auctionSessionId =
  "session-auction-event-test";
const teamId = "team-auction-event-test";
const auctionSessionTeamId =
  "session-team-auction-event-test";
const playerId = "player-auction-event-test";
const auctionCallId =
  "auction-call-auction-event-test";

const secondTeamId =
  "team-auction-event-test-2";
const secondAuctionSessionTeamId =
  "session-team-auction-event-test-2";
const secondPlayerId =
  "player-auction-event-test-2";

describe("SqliteAuctionEventRepository", () => {
  afterEach(() => {
    db.delete(auctionEvents)
      .where(
        eq(
          auctionEvents.auctionSessionId,
          auctionSessionId
        )
      )
      .run();

    db.delete(auctionCalls)
      .where(
        eq(
          auctionCalls.id,
          auctionCallId
        )
      )
      .run();

    db.delete(players)
      .where(
        eq(
          players.id,
          secondPlayerId
        )
      )
      .run();

    db.delete(players)
      .where(
        eq(
          players.id,
          playerId
        )
      )
      .run();

    db.delete(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.id,
          secondAuctionSessionTeamId
        )
      )
      .run();

    db.delete(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.id,
          auctionSessionTeamId
        )
      )
      .run();

    db.delete(teams)
      .where(
        eq(
          teams.id,
          secondTeamId
        )
      )
      .run();

    db.delete(teams)
      .where(
        eq(
          teams.id,
          teamId
        )
      )
      .run();

    db.delete(auctionSessions)
      .where(
        eq(
          auctionSessions.id,
          auctionSessionId
        )
      )
      .run();

    db.delete(leagues)
      .where(
        eq(
          leagues.id,
          leagueId
        )
      )
      .run();
  });

  it(
    "creates and reads a confirmed auction award event",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Auction Event Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 329
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "AUDIT-001",
          name: "Audit Test Player",
          normalizedName:
            "audit test player",
          role: "A",
          availabilityStatus: "ROSTERED"
        })
        .run();

      db.insert(auctionCalls)
        .values({
          id: auctionCallId,
          auctionSessionId,
          playerId,
          callerAuctionSessionTeamId:
            auctionSessionTeamId,
          status: "CONFIRMED",
          openingBid: 1,
          currentBid: 1,
          currentLeaderAuctionSessionTeamId:
            auctionSessionTeamId,
          currentTurnAuctionSessionTeamId:
            null,
          provisionalWinnerAuctionSessionTeamId:
            auctionSessionTeamId
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      const created = db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionId,
            auctionCallId,
            eventType:
              "AUCTION_AWARD_CONFIRMED",
            auctionSessionTeamId,
            playerId,
            amount: 1,
            creditsBefore: 330,
            creditsAfter: 329
          }
        )
      );

      expect(created).toMatchObject({
        auctionSessionId,
        auctionCallId,
        eventType:
          "AUCTION_AWARD_CONFIRMED",
        auctionSessionTeamId,
        playerId,
        amount: 1,
        creditsBefore: 330,
        creditsAfter: 329
      });

      const events =
        await repository
          .listByAuctionSessionId(
            auctionSessionId
          );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(created);
    }
  );

  it(
    "creates and reads a manually added initial roster event",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Auction Event Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 305
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "AUDIT-MANUAL-001",
          name: "Manual Audit Player",
          normalizedName:
            "manual audit player",
          role: "C",
          availabilityStatus: "ROSTERED"
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      const created = db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionId,
            eventType:
              "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY",
            auctionSessionTeamId,
            playerId,
            amount: 25,
            creditsBefore: 330,
            creditsAfter: 305,
            contractYear: 2,
            actorName: "Gianfranco",
            actorRole: "ADMINISTRATOR"
          }
        )
      );

      expect(created).toMatchObject({
        auctionSessionId,
        auctionCallId: null,
        eventType:
          "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY",
        auctionSessionTeamId,
        playerId,
        amount: 25,
        creditsBefore: 330,
        creditsAfter: 305,
        contractYear: 2,
        actorName: "Gianfranco",
        actorRole: "ADMINISTRATOR",
        comment: null,
        suspensionReason: null
      });

      const events =
        await repository
          .listByAuctionSessionId(
            auctionSessionId
          );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(created);
    }
  );

  it(
    "creates and reads a manual roster assignment event",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Auction Event Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 300
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode:
            "AUDIT-MANUAL-ASSIGNMENT-001",
          name:
            "Manual Assignment Audit Player",
          normalizedName:
            "manual assignment audit player",
          role: "A",
          availabilityStatus:
            "ROSTERED"
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      const created = db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionId,
            eventType:
              "MANUAL_ROSTER_ASSIGNMENT_ADDED",
            auctionSessionTeamId,
            playerId,
            amount: 30,
            creditsBefore: 330,
            creditsAfter: 300,
            contractYear: 3,
            actorName: "Gianfranco",
            actorRole: "AUCTIONEER",
            manualAssignmentReason:
              "OPTION_EXERCISED_MANUALLY",
            comment:
              "Opzione registrata manualmente"
          }
        )
      );

      expect(created).toMatchObject({
        auctionSessionId,
        auctionCallId: null,
        eventType:
          "MANUAL_ROSTER_ASSIGNMENT_ADDED",
        auctionSessionTeamId,
        playerId,
        amount: 30,
        creditsBefore: 330,
        creditsAfter: 300,
        contractYear: 3,
        actorName: "Gianfranco",
        actorRole: "AUCTIONEER",
        manualAssignmentReason:
          "OPTION_EXERCISED_MANUALLY",
        comment:
          "Opzione registrata manualmente",
        suspensionReason: null
      });

      const events =
        await repository
          .listByAuctionSessionId(
            auctionSessionId
          );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(created);
    }
  );

  it(
    "creates and reads a roster assignment removed event",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name:
            "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name:
            "Auction Event Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 310
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode:
            "AUDIT-REMOVAL-001",
          name:
            "Removed Assignment Player",
          normalizedName:
            "removed assignment player",
          role: "C",
          availabilityStatus:
            "AVAILABLE"
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      const created = db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionId,
            eventType:
              "ROSTER_ASSIGNMENT_REMOVED",
            actorName:
              "Gianfranco",
            actorRole:
              "AUCTIONEER",
            comment:
              "Rimossa assegnazione errata",
            beforeAuctionSessionTeamId:
              auctionSessionTeamId,
            beforePlayerId:
              playerId,
            beforeAmount: 20,
            beforeContractYear: 1
          }
        )
      );

      expect(created).toMatchObject({
        auctionSessionId,
        auctionCallId: null,
        eventType:
          "ROSTER_ASSIGNMENT_REMOVED",

        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null,
        contractYear: null,

        actorName:
          "Gianfranco",
        actorRole:
          "AUCTIONEER",
        comment:
          "Rimossa assegnazione errata",

        manualAssignmentReason: null,

        beforeAuctionSessionTeamId:
          auctionSessionTeamId,
        beforePlayerId:
          playerId,
        beforeAmount: 20,
        beforeContractYear: 1,

        afterAuctionSessionTeamId: null,
        afterPlayerId: null,
        afterAmount: null,
        afterContractYear: null,

        suspensionReason: null
      });

      const events =
        await repository
          .listByAuctionSessionId(
            auctionSessionId
          );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(created);
    }
  );

  it(
    "creates and reads a technical roster correction event",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name:
            "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values([
          {
            id: teamId,
            leagueId,
            name:
              "Auction Event Test Team"
          },
          {
            id: secondTeamId,
            leagueId,
            name:
              "Auction Event Test Team 2"
          }
        ])
        .run();

      db.insert(auctionSessionTeams)
        .values([
          {
            id: auctionSessionTeamId,
            auctionSessionId,
            teamId,
            tableOrder: 1,
            renewalCredits: 0,
            remainingCredits: 310
          },
          {
            id:
              secondAuctionSessionTeamId,
            auctionSessionId,
            teamId:
              secondTeamId,
            tableOrder: 2,
            renewalCredits: 0,
            remainingCredits: 295
          }
        ])
        .run();

      db.insert(players)
        .values([
          {
            id: playerId,
            auctionSessionId,
            fmsCode:
              "AUDIT-TECH-CORRECTION-001",
            name:
              "Technical Correction Before Player",
            normalizedName:
              "technical correction before player",
            role: "C",
            availabilityStatus:
              "AVAILABLE"
          },
          {
            id: secondPlayerId,
            auctionSessionId,
            fmsCode:
              "AUDIT-TECH-CORRECTION-002",
            name:
              "Technical Correction After Player",
            normalizedName:
              "technical correction after player",
            role: "A",
            availabilityStatus:
              "ROSTERED"
          }
        ])
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      const created = db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionId,
            eventType:
              "TECHNICAL_ROSTER_CORRECTION",

            actorName:
              "Gianfranco",
            actorRole:
              "AUCTIONEER",
            comment:
              "Corretta squadra, giocatore, costo e anno contrattuale",

            beforeAuctionSessionTeamId:
              auctionSessionTeamId,
            beforePlayerId:
              playerId,
            beforeAmount: 20,
            beforeContractYear: 1,

            afterAuctionSessionTeamId:
              secondAuctionSessionTeamId,
            afterPlayerId:
              secondPlayerId,
            afterAmount: 35,
            afterContractYear: 3
          }
        )
      );

      expect(created).toMatchObject({
        auctionSessionId,
        auctionCallId: null,
        eventType:
          "TECHNICAL_ROSTER_CORRECTION",

        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null,
        contractYear: null,

        actorName:
          "Gianfranco",
        actorRole:
          "AUCTIONEER",
        comment:
          "Corretta squadra, giocatore, costo e anno contrattuale",

        manualAssignmentReason: null,

        beforeAuctionSessionTeamId:
          auctionSessionTeamId,
        beforePlayerId:
          playerId,
        beforeAmount: 20,
        beforeContractYear: 1,

        afterAuctionSessionTeamId:
          secondAuctionSessionTeamId,
        afterPlayerId:
          secondPlayerId,
        afterAmount: 35,
        afterContractYear: 3,

        suspensionReason: null
      });

      const events =
        await repository
          .listByAuctionSessionId(
            auctionSessionId
          );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(created);
    }
  );

  it(
    "creates and reads a suspended session event",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      const created = db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionId,
            eventType:
              "SESSION_SUSPENDED",
            suspensionReason:
              "PIZZA_BREAK"
          }
        )
      );

      expect(created).toMatchObject({
        auctionSessionId,
        auctionCallId: null,
        eventType:
          "SESSION_SUSPENDED",
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null,
        suspensionReason:
          "PIZZA_BREAK"
      });

      const events =
        await repository
          .listByAuctionSessionId(
            auctionSessionId
          );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(created);
    }
  );

  it(
    "creates and reads a resumed session event",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      const created = db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionId,
            eventType:
              "SESSION_RESUMED"
          }
        )
      );

      expect(created).toMatchObject({
        auctionSessionId,
        auctionCallId: null,
        eventType:
          "SESSION_RESUMED",
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null,
        suspensionReason: null
      });

      const events =
        await repository
          .listByAuctionSessionId(
            auctionSessionId
          );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(created);
    }
  );

  it(
    "creates and reads a session reopened event",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      const created = db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionId,
            eventType:
              "SESSION_REOPENED"
          }
        )
      );

      expect(created).toMatchObject({
        auctionSessionId,
        auctionCallId: null,
        eventType:
          "SESSION_REOPENED",
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null,
        contractYear: null,
        actorName: null,
        actorRole: null,
        comment: null,
        manualAssignmentReason: null,
        suspensionReason: null
      });

      const events =
        await repository
          .listByAuctionSessionId(
            auctionSessionId
          );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(created);
    }
  );

  it(
    "rejects an invalid session event shape",
    () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      expect(() =>
        db.insert(auctionEvents)
          .values({
            id:
              "invalid-session-event",
            auctionSessionId,
            eventType:
              "SESSION_RESUMED",
            suspensionReason:
              "PIZZA_BREAK"
          })
          .run()
      ).toThrow();
    }
  );

  it(
    "rejects an inconsistent credit balance",
    () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Auction Event Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 329
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "AUDIT-001",
          name: "Audit Test Player",
          normalizedName:
            "audit test player",
          role: "A",
          availabilityStatus: "ROSTERED"
        })
        .run();

      db.insert(auctionCalls)
        .values({
          id: auctionCallId,
          auctionSessionId,
          playerId,
          callerAuctionSessionTeamId:
            auctionSessionTeamId,
          status: "CONFIRMED",
          openingBid: 1,
          currentBid: 1,
          currentLeaderAuctionSessionTeamId:
            auctionSessionTeamId,
          currentTurnAuctionSessionTeamId:
            null,
          provisionalWinnerAuctionSessionTeamId:
            auctionSessionTeamId
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      expect(() =>
        db.transaction((tx) =>
          repository.createWithExecutor(
            tx,
            {
              auctionSessionId,
              auctionCallId,
              eventType:
                "AUCTION_AWARD_CONFIRMED",
              auctionSessionTeamId,
              playerId,
              amount: 10,
              creditsBefore: 100,
              creditsAfter: 95
            }
          )
        )
      ).toThrow();
    }
  );
});
