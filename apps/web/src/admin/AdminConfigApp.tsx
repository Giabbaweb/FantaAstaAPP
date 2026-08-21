import {
  useEffect,
  useMemo,
  useState
} from "react";

import type {
  AuctionSession,
  AuctionSessionTeam,
  League,
  Owner,
  Team,
  TeamOwner
} from "@fantaastaapp/contracts";

import {
  fetchActiveAuctionSession,
  fetchLeagues
} from "../shared/app-api.js";

import {
  fetchAuctionSessionTeams,
  fetchOwners,
  fetchTeamOwners,
  fetchTeamsByLeague
} from "../shared/admin-config-api.js";

import "./admin-config.css";

type ConfigStatus =
  | "LOADING"
  | "READY"
  | "ERROR";

type TeamOwnerMap =
  Record<string, TeamOwner[]>;

export function AdminConfigApp() {
  const [
    status,
    setStatus
  ] = useState<ConfigStatus>(
    "LOADING"
  );

  const [
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(
    null
  );

  const [
    session,
    setSession
  ] = useState<AuctionSession | null>(
    null
  );

  const [
    leagues,
    setLeagues
  ] = useState<League[]>([]);

  const [
    teams,
    setTeams
  ] = useState<Team[]>([]);

  const [
    owners,
    setOwners
  ] = useState<Owner[]>([]);

  const [
    sessionTeams,
    setSessionTeams
  ] = useState<AuctionSessionTeam[]>(
    []
  );

  const [
    teamOwners,
    setTeamOwners
  ] = useState<TeamOwnerMap>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [
          activeSession,
          availableLeagues
        ] = await Promise.all([
          fetchActiveAuctionSession(),
          fetchLeagues()
        ]);

        if (cancelled) {
          return;
        }

        setSession(activeSession);
        setLeagues(availableLeagues);

        if (!activeSession) {
          setStatus("READY");
          return;
        }

        const [
          availableTeams,
          availableOwners,
          activeSessionTeams
        ] = await Promise.all([
          fetchTeamsByLeague(
            activeSession.leagueId
          ),
          fetchOwners(),
          fetchAuctionSessionTeams(
            activeSession.id
          )
        ]);

        if (cancelled) {
          return;
        }

        const ownerEntries =
          await Promise.all(
            availableTeams.map(
              async (team) => {
                const associations =
                  await fetchTeamOwners(
                    team.id
                  );

                return [
                  team.id,
                  associations
                ] as const;
              }
            )
          );

        if (cancelled) {
          return;
        }

        setTeams(availableTeams);
        setOwners(availableOwners);
        setSessionTeams(
          activeSessionTeams
        );
        setTeamOwners(
          Object.fromEntries(
            ownerEntries
          )
        );

        setStatus("READY");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento della configurazione."
        );

        setStatus("ERROR");
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const league =
    useMemo(
      () =>
        session
          ? leagues.find(
              (candidate) =>
                candidate.id ===
                session.leagueId
            ) ?? null
          : null,
      [
        leagues,
        session
      ]
    );

  const ownerById =
    useMemo(
      () =>
        new Map(
          owners.map(
            (owner) => [
              owner.id,
              owner
            ]
          )
        ),
      [owners]
    );

  const sessionTeamByTeamId =
    useMemo(
      () =>
        new Map(
          sessionTeams.map(
            (sessionTeam) => [
              sessionTeam.teamId,
              sessionTeam
            ]
          )
        ),
      [sessionTeams]
    );

  const orderedTeams =
    useMemo(
      () =>
        [...teams].sort(
          (left, right) => {
            const leftOrder =
              sessionTeamByTeamId
                .get(left.id)
                ?.tableOrder ??
              Number.MAX_SAFE_INTEGER;

            const rightOrder =
              sessionTeamByTeamId
                .get(right.id)
                ?.tableOrder ??
              Number.MAX_SAFE_INTEGER;

            if (
              leftOrder !== rightOrder
            ) {
              return (
                leftOrder -
                rightOrder
              );
            }

            return left.name.localeCompare(
              right.name,
              "it-IT"
            );
          }
        ),
      [
        teams,
        sessionTeamByTeamId
      ]
    );

  if (status === "LOADING") {
    return (
      <main className="admin-config">
        <h1>
          Configurazione asta
        </h1>

        <p>
          Caricamento dati...
        </p>
      </main>
    );
  }

  if (status === "ERROR") {
    return (
      <main className="admin-config">
        <h1>
          Configurazione asta
        </h1>

        <p className="admin-config__error">
          {
            errorMessage ??
            "Errore di caricamento."
          }
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-config">
        <header className="admin-config__header">
          <div>
            <p className="admin-config__eyebrow">
              FantaAstaAPP
            </p>

            <h1>
              Configurazione asta
            </h1>
          </div>

          <a href="/admin">
            Torna al cockpit
          </a>
        </header>

        <section className="admin-config__panel">
          <h2>
            Nessuna sessione attiva
          </h2>

          <p>
            Sarà necessario creare o selezionare
            una sessione d'asta.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-config">
      <header className="admin-config__header">
        <div>
          <p className="admin-config__eyebrow">
            FantaAstaAPP
          </p>

          <h1>
            Configurazione asta
          </h1>

          <p>
            Preparazione della sessione prima
            dell'apertura dell'asta.
          </p>
        </div>

        <a href="/admin">
          Cockpit asta
        </a>
      </header>

      <section className="admin-config__summary">
        <article>
          <span>
            Lega
          </span>

          <strong>
            {league?.name ?? "-"}
          </strong>
        </article>

        <article>
          <span>
            Stagione
          </span>

          <strong>
            {session.season}
          </strong>
        </article>

        <article>
          <span>
            Edizione
          </span>

          <strong>
            {session.editionNumber}ª
          </strong>
        </article>

        <article>
          <span>
            Crediti iniziali
          </span>

          <strong>
            {session.initialCredits}
          </strong>
        </article>

        <article>
          <span>
            Max confermati
          </span>

          <strong>
            {
              session
                .maximumInitialRosterEntries
            }
          </strong>
        </article>

        <article>
          <span>
            Stato
          </span>

          <strong>
            {session.status}
          </strong>
        </article>
      </section>

      <section className="admin-config__panel">
        <div className="admin-config__section-heading">
          <div>
            <p className="admin-config__eyebrow">
              Squadre e Presidenti
            </p>

            <h2>
              Girotavolo
            </h2>
          </div>

          <span>
            {
              sessionTeams.length
            } partecipanti
          </span>
        </div>

        <div className="admin-config__teams">
          {orderedTeams.map(
            (team) => {
              const sessionTeam =
                sessionTeamByTeamId
                  .get(team.id);

              const associations =
                teamOwners[
                  team.id
                ] ?? [];

              const primaryOwner =
                associations.find(
                  (association) =>
                    association
                      .isPrimary
                );

              const secondaryOwners =
                associations.filter(
                  (association) =>
                    !association
                      .isPrimary
                );

              return (
                <article
                  key={team.id}
                  className="admin-config-team"
                >
                  <div className="admin-config-team__order">
                    {
                      sessionTeam
                        ?.tableOrder ??
                      "-"
                    }
                  </div>

                  <div className="admin-config-team__identity">
                    <div className="admin-config-team__logo">
                      {team.logoPath ? (
                        <img
                          src={team.logoPath}
                          alt=""
                        />
                      ) : (
                        <span>
                          {
                            team.shortName
                              ?.slice(
                                0,
                                3
                              ) ??
                            team.name
                              .slice(
                                0,
                                2
                              )
                          }
                        </span>
                      )}
                    </div>

                    <div>
                      <strong>
                        {team.name}
                      </strong>

                      {team.shortName && (
                        <small>
                          {
                            team.shortName
                          }
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="admin-config-team__owners">
                    <span>
                      Presidente
                    </span>

                    <strong>
                      {
                        primaryOwner
                          ? ownerById.get(
                              primaryOwner
                                .ownerId
                            )?.name ??
                            primaryOwner
                              .ownerId
                          : "Non assegnato"
                      }
                    </strong>

                    {secondaryOwners.length >
                      0 && (
                      <small>
                        Co-presidente:{" "}
                        {
                          secondaryOwners
                            .map(
                              (
                                association
                              ) =>
                                ownerById.get(
                                  association
                                    .ownerId
                                )?.name ??
                                association
                                  .ownerId
                            )
                            .join(", ")
                        }
                      </small>
                    )}
                  </div>

                  <div className="admin-config-team__credits">
                    <span>
                      Crediti
                    </span>

                    <strong>
                      {
                        sessionTeam
                          ?.remainingCredits ??
                        "-"
                      }
                    </strong>
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>

      <section className="admin-config__next">
        <span>
          Prossimo checkpoint
        </span>

        <strong>
          Modifica squadre, Presidenti e ordine del girotavolo
        </strong>
      </section>
    </main>
  );
}
