import {
  auctionCalls,
  auctionCallTeams,
  auctionSessions,
  auctionSessionTeams,
  leagues,
  players,
  teams
} from "../db/schema/index.js";
import {
  db
} from "../db/client.js";

type LeagueInsert =
  typeof leagues.$inferInsert;

type AuctionSessionInsert =
  typeof auctionSessions.$inferInsert;

type TeamInsert =
  typeof teams.$inferInsert;

type AuctionSessionTeamInsert =
  typeof auctionSessionTeams.$inferInsert;

type PlayerInsert =
  typeof players.$inferInsert;

type AuctionCallInsert =
  typeof auctionCalls.$inferInsert;

type AuctionCallTeamInsert =
  typeof auctionCallTeams.$inferInsert;

export async function createLeague(
  overrides: Partial<LeagueInsert> = {}
): Promise<LeagueInsert> {
  const league: LeagueInsert = {
    id: "league-auction-call",
    name: "Auction Call Test League",
    normalizedName: "auction call test league",
    ...overrides
  };

  await db.insert(leagues).values(league);

  return league;
}

export async function createAuctionSession(
  overrides: Partial<AuctionSessionInsert> = {}
): Promise<AuctionSessionInsert> {
  const auctionSession: AuctionSessionInsert = {
    id: "session-auction-call",
    leagueId: "league-auction-call",
    season: "2026/2027",
    editionNumber: 1,
    status: "RUNNING",
    initialCredits: 330,
    ...overrides
  };

  await db
    .insert(auctionSessions)
    .values(auctionSession);

  return auctionSession;
}

export async function createTeam(
  overrides: Partial<TeamInsert> = {}
): Promise<TeamInsert> {
  const team: TeamInsert = {
    id: "team-auction-call-1",
    leagueId: "league-auction-call",
    name: "Auction Call Team 1",
    shortName: "ACT1",
    ...overrides
  };

  await db.insert(teams).values(team);

  return team;
}

export async function createAuctionSessionTeam(
  overrides: Partial<AuctionSessionTeamInsert> = {}
): Promise<AuctionSessionTeamInsert> {
  const auctionSessionTeam:
    AuctionSessionTeamInsert = {
      id: "auction-session-team-1",
      auctionSessionId: "session-auction-call",
      teamId: "team-auction-call-1",
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 330,
      ...overrides
    };

  await db
    .insert(auctionSessionTeams)
    .values(auctionSessionTeam);

  return auctionSessionTeam;
}

export async function createPlayer(
  overrides: Partial<PlayerInsert> = {}
): Promise<PlayerInsert> {
  const player: PlayerInsert = {
    id: "player-auction-call",
    auctionSessionId: "session-auction-call",
    fmsCode: "AC001",
    name: "TEST Player",
    normalizedName: "test player",
    role: "A",
    availabilityStatus: "AVAILABLE",
    ...overrides
  };

  await db.insert(players).values(player);

  return player;
}

export async function createAuctionCall(
  overrides: Partial<AuctionCallInsert> = {}
): Promise<AuctionCallInsert> {
  const auctionCall: AuctionCallInsert = {
    id: "auction-call-1",
    auctionSessionId: "session-auction-call",
    playerId: "player-auction-call",
    callerAuctionSessionTeamId:
      "auction-session-team-1",
    status: "DRAFT",
    openingBid: null,
    currentBid: null,
    currentLeaderAuctionSessionTeamId: null,
    currentTurnAuctionSessionTeamId: null,
    provisionalWinnerAuctionSessionTeamId: null,
    ...overrides
  };

  await db.insert(auctionCalls).values(auctionCall);

  return auctionCall;
}

export async function createAuctionCallTeam(
  overrides: Partial<AuctionCallTeamInsert> = {}
): Promise<AuctionCallTeamInsert> {
  const auctionCallTeam: AuctionCallTeamInsert = {
    id: "auction-call-team-1",
    auctionCallId: "auction-call-1",
    auctionSessionTeamId:
      "auction-session-team-1",
    status: "ACTIVE",
    maximumBid: 307,
    exclusionReason: null,
    ...overrides
  };

  await db
    .insert(auctionCallTeams)
    .values(auctionCallTeam);

  return auctionCallTeam;
}

export type AuctionCallAggregateFixture = {
  leagueId: string;
  auctionSessionId: string;
  playerId: string;
  auctionCallId: string;

  team1Id: string;
  team2Id: string;
  team3Id: string;

  auctionSessionTeam1Id: string;
  auctionSessionTeam2Id: string;
  auctionSessionTeam3Id: string;
};

export async function createAuctionCallAggregate(): Promise<
  AuctionCallAggregateFixture
> {
  const fixture: AuctionCallAggregateFixture = {
    leagueId: "league-auction-call",
    auctionSessionId: "session-auction-call",
    playerId: "player-auction-call",
    auctionCallId: "auction-call-1",

    team1Id: "team-auction-call-1",
    team2Id: "team-auction-call-2",
    team3Id: "team-auction-call-3",

    auctionSessionTeam1Id:
      "auction-session-team-1",
    auctionSessionTeam2Id:
      "auction-session-team-2",
    auctionSessionTeam3Id:
      "auction-session-team-3"
  };

  await createLeague({
    id: fixture.leagueId
  });

  await createAuctionSession({
    id: fixture.auctionSessionId,
    leagueId: fixture.leagueId
  });

  await createTeam({
    id: fixture.team1Id,
    leagueId: fixture.leagueId,
    name: "Auction Call Team 1",
    shortName: "ACT1"
  });

  await createTeam({
    id: fixture.team2Id,
    leagueId: fixture.leagueId,
    name: "Auction Call Team 2",
    shortName: "ACT2"
  });

  await createTeam({
    id: fixture.team3Id,
    leagueId: fixture.leagueId,
    name: "Auction Call Team 3",
    shortName: "ACT3"
  });

  await createAuctionSessionTeam({
    id: fixture.auctionSessionTeam1Id,
    auctionSessionId: fixture.auctionSessionId,
    teamId: fixture.team1Id,
    tableOrder: 1
  });

  await createAuctionSessionTeam({
    id: fixture.auctionSessionTeam2Id,
    auctionSessionId: fixture.auctionSessionId,
    teamId: fixture.team2Id,
    tableOrder: 2
  });

  await createAuctionSessionTeam({
    id: fixture.auctionSessionTeam3Id,
    auctionSessionId: fixture.auctionSessionId,
    teamId: fixture.team3Id,
    tableOrder: 3
  });

  await createPlayer({
    id: fixture.playerId,
    auctionSessionId: fixture.auctionSessionId
  });

  await createAuctionCall({
    id: fixture.auctionCallId,
    auctionSessionId: fixture.auctionSessionId,
    playerId: fixture.playerId,
    callerAuctionSessionTeamId:
      fixture.auctionSessionTeam1Id
  });

  await createAuctionCallTeam({
    id: "auction-call-team-1",
    auctionCallId: fixture.auctionCallId,
    auctionSessionTeamId:
      fixture.auctionSessionTeam1Id,
    maximumBid: 307
  });

  await createAuctionCallTeam({
    id: "auction-call-team-2",
    auctionCallId: fixture.auctionCallId,
    auctionSessionTeamId:
      fixture.auctionSessionTeam2Id,
    maximumBid: 307
  });

  await createAuctionCallTeam({
    id: "auction-call-team-3",
    auctionCallId: fixture.auctionCallId,
    auctionSessionTeamId:
      fixture.auctionSessionTeam3Id,
    maximumBid: 307
  });

  return fixture;
}
