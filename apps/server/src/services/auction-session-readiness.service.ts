import type {
  AuctionSessionReadinessRepository
} from "../repositories/auction-session-readiness.repository.js";

export const minimumAuctionSessionTeamCount =
  8;

export type AuctionSessionReadinessCheckCode =
  | "SESSION_PARAMETERS_VALID"
  | "MINIMUM_TEAMS_CONFIGURED"
  | "TEAM_OWNERS_CONFIGURED"
  | "TABLE_ORDER_VALID"
  | "PLAYER_ARCHIVE_AVAILABLE"
  | "INITIAL_ROSTERS_WITHIN_LIMIT";

export type AuctionSessionReadinessCheck = {
  code:
    AuctionSessionReadinessCheckCode;
  ok: boolean;
  label: string;
  message: string;
};

export type AuctionSessionReadinessResult = {
  auctionSessionId: string;
  ready: boolean;

  checks:
    AuctionSessionReadinessCheck[];

  summary: {
    teamCount: number;
    minimumTeamCount: number;
    teamsWithOwnerCount: number;
    playerCount: number;
    rosterEntryCount: number;
    maximumInitialRosterEntries: number;
  };
};

export class AuctionSessionReadinessService {
  constructor(
    private readonly repository:
      AuctionSessionReadinessRepository
  ) {}

  async getReadiness(
    auctionSessionId: string
  ): Promise<
    AuctionSessionReadinessResult | null
  > {
    const snapshot =
      await this.repository.inspect(
        auctionSessionId
      );

    if (!snapshot.session) {
      return null;
    }

    const {
      session,
      sessionTeams,
      teamOwnerTeamIds,
      playerCount,
      rosterEntrySessionTeamIds
    } = snapshot;

    const teamCount =
      sessionTeams.length;

    const teamsWithOwner =
      new Set(
        teamOwnerTeamIds
      );

    const tableOrders =
      sessionTeams
        .map(
          (record) =>
            record.tableOrder
        )
        .sort(
          (left, right) =>
            left - right
        );

    const tableOrderValid =
      teamCount >=
        minimumAuctionSessionTeamCount &&
      tableOrders.length ===
        teamCount &&
      tableOrders.every(
        (
          tableOrder,
          index
        ) =>
          tableOrder ===
            index + 1
      );

    const rosterCountBySessionTeam =
      new Map<string, number>();

    for (
      const auctionSessionTeamId of
      rosterEntrySessionTeamIds
    ) {
      rosterCountBySessionTeam.set(
        auctionSessionTeamId,
        (
          rosterCountBySessionTeam.get(
            auctionSessionTeamId
          ) ?? 0
        ) + 1
      );
    }

    const initialRostersAvailable =
      rosterEntrySessionTeamIds.length > 0;

    const initialRostersWithinLimit =
      (
        session.maximumInitialRosterEntries ===
          0
          ? !initialRostersAvailable
          : initialRostersAvailable
      ) &&
      sessionTeams.every(
        (record) =>
          (
            rosterCountBySessionTeam.get(
              record.id
            ) ?? 0
          ) <=
          session.maximumInitialRosterEntries
      );

    const sessionParametersValid =
      Number.isInteger(
        session.initialCredits
      ) &&
      session.initialCredits > 0 &&
      Number.isInteger(
        session.maximumInitialRosterEntries
      ) &&
      session.maximumInitialRosterEntries >=
        0;

    const minimumTeamsConfigured =
      teamCount >=
      minimumAuctionSessionTeamCount;

    const teamOwnersConfigured =
      minimumTeamsConfigured &&
      sessionTeams.every(
        (record) =>
          teamsWithOwner.has(
            record.teamId
          )
      );

    const playerArchiveAvailable =
      playerCount > 0;

    const checks:
      AuctionSessionReadinessCheck[] =
        [
          {
            code:
              "SESSION_PARAMETERS_VALID",
            ok:
              sessionParametersValid,
            label:
              "Parametri sessione",
            message:
              sessionParametersValid
                ? "Crediti iniziali e limite confermati sono validi."
                : "Controllare crediti iniziali e limite massimo dei confermati."
          },
          {
            code:
              "MINIMUM_TEAMS_CONFIGURED",
            ok:
              minimumTeamsConfigured,
            label:
              "Squadre partecipanti",
            message:
              minimumTeamsConfigured
                ? `${teamCount} squadre configurate.`
                : `Servono almeno ${minimumAuctionSessionTeamCount} squadre; configurate ${teamCount}.`
          },
          {
            code:
              "TEAM_OWNERS_CONFIGURED",
            ok:
              teamOwnersConfigured,
            label:
              "Presidenti",
            message:
              teamOwnersConfigured
                ? "Ogni squadra partecipante ha almeno un Presidente."
                : "Ogni squadra partecipante deve avere almeno un Presidente."
          },
          {
            code:
              "TABLE_ORDER_VALID",
            ok:
              tableOrderValid,
            label:
              "Girotavolo",
            message:
              tableOrderValid
                ? `Ordine completo da 1 a ${teamCount}.`
                : "Il girotavolo deve essere completo, univoco e continuo da 1 al numero delle squadre."
          },
          {
            code:
              "PLAYER_ARCHIVE_AVAILABLE",
            ok:
              playerArchiveAvailable,
            label:
              "Archivio giocatori",
            message:
              playerArchiveAvailable
                ? `${playerCount} giocatori disponibili nell'archivio della sessione.`
                : "Importare l'archivio giocatori prima di portare la sessione a READY."
          },
          {
            code:
              "INITIAL_ROSTERS_WITHIN_LIMIT",
            ok:
              initialRostersWithinLimit,
            label:
              "Rose iniziali",
            message:
              session.maximumInitialRosterEntries ===
                0
                ? initialRostersWithinLimit
                  ? "La sessione partirà senza confermati."
                  : "Con limite confermati pari a 0 non devono essere presenti rose iniziali."
                : !initialRostersAvailable
                  ? "Importare le rose iniziali prima di portare la sessione a READY."
                  : initialRostersWithinLimit
                    ? `Tutte le rose rispettano il limite di ${session.maximumInitialRosterEntries} confermati.`
                    : `Almeno una rosa supera il limite di ${session.maximumInitialRosterEntries} confermati.`
          }
        ];

    return {
      auctionSessionId,
      ready:
        checks.every(
          (check) => check.ok
        ),
      checks,
      summary: {
        teamCount,
        minimumTeamCount:
          minimumAuctionSessionTeamCount,
        teamsWithOwnerCount:
          sessionTeams.filter(
            (record) =>
              teamsWithOwner.has(
                record.teamId
              )
          ).length,
        playerCount,
        rosterEntryCount:
          rosterEntrySessionTeamIds.length,
        maximumInitialRosterEntries:
          session.maximumInitialRosterEntries
      }
    };
  }
}
