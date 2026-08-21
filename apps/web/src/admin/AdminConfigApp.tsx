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
  createOwner,
  createTeamOwner,
  deleteTeamOwner,
  fetchAuctionSessionTeams,
  fetchOwners,
  fetchTeamOwners,
  fetchTeamsByLeague,
  reorderAuctionSessionTeams,
  updateTeam,
  updateTeamOwner
} from "../shared/admin-config-api.js";

import "./admin-config.css";

type ConfigStatus =
  | "LOADING"
  | "READY"
  | "ERROR";

type TeamOwnerMap =
  Record<string, TeamOwner[]>;

const NEW_OWNER_VALUE =
  "__NEW_OWNER__";

type TeamEditDraft = {
  name: string;
  shortName: string;
  primaryOwnerId: string;
  primaryOwnerNewName: string;
  secondaryOwnerId: string;
  secondaryOwnerNewName: string;
};

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

  const [
    tableOrderPending,
    setTableOrderPending
  ] = useState(false);

  const [
    tableOrderError,
    setTableOrderError
  ] = useState<string | null>(
    null
  );

  const [
    editingTeamId,
    setEditingTeamId
  ] = useState<string | null>(
    null
  );

  const [
    teamEditDraft,
    setTeamEditDraft
  ] = useState<TeamEditDraft | null>(
    null
  );

  const [
    teamEditPending,
    setTeamEditPending
  ] = useState(false);

  const [
    teamEditError,
    setTeamEditError
  ] = useState<string | null>(
    null
  );

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

  async function moveTeam(
    teamId: string,
    direction: -1 | 1
  ): Promise<void> {
    if (
      !session ||
      tableOrderPending
    ) {
      return;
    }

    const currentIndex =
      orderedTeams.findIndex(
        (team) =>
          team.id === teamId
      );

    if (currentIndex < 0) {
      return;
    }

    const targetIndex =
      currentIndex + direction;

    if (
      targetIndex < 0 ||
      targetIndex >=
        orderedTeams.length
    ) {
      return;
    }

    const reorderedTeams =
      [...orderedTeams];

    const currentTeam =
      reorderedTeams[
        currentIndex
      ];

    const targetTeam =
      reorderedTeams[
        targetIndex
      ];

    if (
      !currentTeam ||
      !targetTeam
    ) {
      return;
    }

    reorderedTeams[
      currentIndex
    ] = targetTeam;

    reorderedTeams[
      targetIndex
    ] = currentTeam;

    setTableOrderPending(true);
    setTableOrderError(null);

    try {
      const reorderedSessionTeams =
        await reorderAuctionSessionTeams(
          session.id,
          reorderedTeams.map(
            (team) => team.id
          )
        );

      setSessionTeams(
        reorderedSessionTeams
      );
    } catch (error) {
      setTableOrderError(
        error instanceof Error
          ? error.message
          : "Errore durante il riordino del girotavolo."
      );
    } finally {
      setTableOrderPending(false);
    }
  }

  function beginTeamEdit(
    team: Team
  ): void {
    const associations =
      teamOwners[team.id] ?? [];

    const primary =
      associations.find(
        (association) =>
          association.isPrimary
      );

    const secondary =
      associations.find(
        (association) =>
          !association.isPrimary
      );

    setEditingTeamId(team.id);
    setTeamEditError(null);

    setTeamEditDraft({
      name: team.name,
      shortName:
        team.shortName ?? "",
      primaryOwnerId:
        primary?.ownerId ?? "",
      primaryOwnerNewName: "",
      secondaryOwnerId:
        secondary?.ownerId ?? "",
      secondaryOwnerNewName: ""
    });
  }

  function cancelTeamEdit(): void {
    if (teamEditPending) {
      return;
    }

    setEditingTeamId(null);
    setTeamEditDraft(null);
    setTeamEditError(null);
  }

  async function resolveOwnerId(
    selectedOwnerId: string,
    newOwnerName: string
  ): Promise<string | null> {
    if (!selectedOwnerId) {
      return null;
    }

    if (
      selectedOwnerId !==
      NEW_OWNER_VALUE
    ) {
      return selectedOwnerId;
    }

    const name =
      newOwnerName.trim();

    if (!name) {
      throw new Error(
        "Inserisci il nome del nuovo Presidente."
      );
    }

    const owner =
      await createOwner({
        name
      });

    return owner.id;
  }

  async function saveTeamEdit(
    team: Team
  ): Promise<void> {
    if (
      !teamEditDraft ||
      editingTeamId !== team.id ||
      teamEditPending
    ) {
      return;
    }

    const name =
      teamEditDraft.name.trim();

    if (!name) {
      setTeamEditError(
        "Il nome della squadra è obbligatorio."
      );
      return;
    }

    setTeamEditPending(true);
    setTeamEditError(null);

    try {
      const primaryOwnerId =
        await resolveOwnerId(
          teamEditDraft.primaryOwnerId,
          teamEditDraft
            .primaryOwnerNewName
        );

      if (!primaryOwnerId) {
        throw new Error(
          "Seleziona il Presidente principale."
        );
      }

      const secondaryOwnerId =
        await resolveOwnerId(
          teamEditDraft.secondaryOwnerId,
          teamEditDraft
            .secondaryOwnerNewName
        );

      if (
        secondaryOwnerId &&
        secondaryOwnerId ===
          primaryOwnerId
      ) {
        throw new Error(
          "Presidente e co-presidente devono essere persone diverse."
        );
      }

      const updatedTeam =
        await updateTeam(
          team.id,
          {
            name,
            shortName:
              teamEditDraft.shortName
                .trim() || null
          }
        );

      const currentAssociations =
        teamOwners[team.id] ?? [];

      const desiredOwnerIds =
        new Set(
          [
            primaryOwnerId,
            secondaryOwnerId
          ].filter(
            (
              ownerId
            ): ownerId is string =>
              Boolean(ownerId)
          )
        );

      for (
        const association
        of currentAssociations
      ) {
        if (
          !desiredOwnerIds.has(
            association.ownerId
          )
        ) {
          await deleteTeamOwner(
            team.id,
            association.ownerId
          );
        }
      }

      const primaryAssociation =
        currentAssociations.find(
          (association) =>
            association.ownerId ===
            primaryOwnerId
        );

      if (primaryAssociation) {
        if (
          !primaryAssociation.isPrimary
        ) {
          await updateTeamOwner(
            team.id,
            primaryOwnerId,
            {
              isPrimary: true
            }
          );
        }
      } else {
        await createTeamOwner(
          team.id,
          {
            ownerId:
              primaryOwnerId,
            isPrimary: true
          }
        );
      }

      if (secondaryOwnerId) {
        const secondaryAssociation =
          currentAssociations.find(
            (association) =>
              association.ownerId ===
              secondaryOwnerId
          );

        if (secondaryAssociation) {
          if (
            secondaryAssociation.isPrimary
          ) {
            await updateTeamOwner(
              team.id,
              secondaryOwnerId,
              {
                isPrimary: false
              }
            );
          }
        } else {
          await createTeamOwner(
            team.id,
            {
              ownerId:
                secondaryOwnerId,
              isPrimary: false
            }
          );
        }
      }

      const [
        refreshedOwners,
        refreshedAssociations
      ] = await Promise.all([
        fetchOwners(),
        fetchTeamOwners(
          team.id
        )
      ]);

      setTeams(
        (currentTeams) =>
          currentTeams.map(
            (currentTeam) =>
              currentTeam.id ===
              updatedTeam.id
                ? updatedTeam
                : currentTeam
          )
      );

      setOwners(
        refreshedOwners
      );

      setTeamOwners(
        (current) => ({
          ...current,
          [team.id]:
            refreshedAssociations
        })
      );

      setEditingTeamId(null);
      setTeamEditDraft(null);
    } catch (error) {
      setTeamEditError(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio della squadra."
      );
    } finally {
      setTeamEditPending(false);
    }
  }

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

        {tableOrderError && (
          <p className="admin-config__table-order-error">
            {tableOrderError}
          </p>
        )}

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
                  <div className="admin-config-team__table-order">
                    <div className="admin-config-team__order">
                      {
                        sessionTeam
                          ?.tableOrder ??
                        "-"
                      }
                    </div>

                    <div className="admin-config-team__order-actions">
                      <button
                        type="button"
                        aria-label={`Sposta ${team.name} verso l'alto`}
                        title="Sposta verso l'alto"
                        disabled={
                          tableOrderPending ||
                          !sessionTeam ||
                          sessionTeam.tableOrder === 1
                        }
                        onClick={() => {
                          void moveTeam(
                            team.id,
                            -1
                          );
                        }}
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        aria-label={`Sposta ${team.name} verso il basso`}
                        title="Sposta verso il basso"
                        disabled={
                          tableOrderPending ||
                          !sessionTeam ||
                          sessionTeam.tableOrder ===
                            sessionTeams.length
                        }
                        onClick={() => {
                          void moveTeam(
                            team.id,
                            1
                          );
                        }}
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  {editingTeamId === team.id &&
                  teamEditDraft ? (
                    <>
                      <div className="admin-config-team__edit-identity">
                        <label>
                          <span>
                            Nome squadra
                          </span>

                          <input
                            type="text"
                            value={
                              teamEditDraft.name
                            }
                            disabled={
                              teamEditPending
                            }
                            onChange={(event) => {
                              setTeamEditDraft(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        name:
                                          event.target.value
                                      }
                                    : current
                              );
                            }}
                          />
                        </label>

                        <label>
                          <span>
                            Nome breve
                          </span>

                          <input
                            type="text"
                            value={
                              teamEditDraft.shortName
                            }
                            disabled={
                              teamEditPending
                            }
                            onChange={(event) => {
                              setTeamEditDraft(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        shortName:
                                          event.target.value
                                      }
                                    : current
                              );
                            }}
                          />
                        </label>
                      </div>

                      <div className="admin-config-team__edit-owners">
                        <label>
                          <span>
                            Presidente
                          </span>

                          <select
                            value={
                              teamEditDraft.primaryOwnerId
                            }
                            disabled={
                              teamEditPending
                            }
                            onChange={(event) => {
                              setTeamEditDraft(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        primaryOwnerId:
                                          event.target.value,
                                        primaryOwnerNewName:
                                          ""
                                      }
                                    : current
                              );
                            }}
                          >
                            <option value="">
                              Seleziona...
                            </option>

                            {owners.map(
                              (owner) => (
                                <option
                                  key={owner.id}
                                  value={owner.id}
                                >
                                  {owner.name}
                                </option>
                              )
                            )}

                            <option
                              value={
                                NEW_OWNER_VALUE
                              }
                            >
                              + Nuovo Presidente
                            </option>
                          </select>

                          {teamEditDraft.primaryOwnerId ===
                            NEW_OWNER_VALUE && (
                            <input
                              type="text"
                              placeholder="Nome nuovo Presidente"
                              value={
                                teamEditDraft
                                  .primaryOwnerNewName
                              }
                              disabled={
                                teamEditPending
                              }
                              onChange={(event) => {
                                setTeamEditDraft(
                                  (current) =>
                                    current
                                      ? {
                                          ...current,
                                          primaryOwnerNewName:
                                            event.target.value
                                        }
                                      : current
                                );
                              }}
                            />
                          )}
                        </label>

                        <label>
                          <span>
                            Co-presidente
                          </span>

                          <select
                            value={
                              teamEditDraft.secondaryOwnerId
                            }
                            disabled={
                              teamEditPending
                            }
                            onChange={(event) => {
                              setTeamEditDraft(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        secondaryOwnerId:
                                          event.target.value,
                                        secondaryOwnerNewName:
                                          ""
                                      }
                                    : current
                              );
                            }}
                          >
                            <option value="">
                              Nessuno
                            </option>

                            {owners.map(
                              (owner) => (
                                <option
                                  key={owner.id}
                                  value={owner.id}
                                >
                                  {owner.name}
                                </option>
                              )
                            )}

                            <option
                              value={
                                NEW_OWNER_VALUE
                              }
                            >
                              + Nuovo co-presidente
                            </option>
                          </select>

                          {teamEditDraft.secondaryOwnerId ===
                            NEW_OWNER_VALUE && (
                            <input
                              type="text"
                              placeholder="Nome nuovo co-presidente"
                              value={
                                teamEditDraft
                                  .secondaryOwnerNewName
                              }
                              disabled={
                                teamEditPending
                              }
                              onChange={(event) => {
                                setTeamEditDraft(
                                  (current) =>
                                    current
                                      ? {
                                          ...current,
                                          secondaryOwnerNewName:
                                            event.target.value
                                        }
                                      : current
                                );
                              }}
                            />
                          )}
                        </label>
                      </div>

                      <div className="admin-config-team__edit-actions">
                        <button
                          type="button"
                          disabled={
                            teamEditPending
                          }
                          onClick={() => {
                            void saveTeamEdit(
                              team
                            );
                          }}
                        >
                          {
                            teamEditPending
                              ? "Salvataggio..."
                              : "Salva"
                          }
                        </button>

                        <button
                          type="button"
                          disabled={
                            teamEditPending
                          }
                          onClick={
                            cancelTeamEdit
                          }
                        >
                          Annulla
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
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
                                team.name.slice(
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
                              {team.shortName}
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
                                  primaryOwner.ownerId
                                )?.name ??
                                primaryOwner.ownerId
                              : "Non assegnato"
                          }
                        </strong>

                        {secondaryOwners.length >
                          0 && (
                          <small>
                            Co-presidente:{" "}
                            {
                              secondaryOwners
                                .slice(
                                  0,
                                  1
                                )
                                .map(
                                  (
                                    association
                                  ) =>
                                    ownerById.get(
                                      association.ownerId
                                    )?.name ??
                                    association.ownerId
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

                      <div className="admin-config-team__actions">
                        <button
                          type="button"
                          disabled={
                            teamEditPending ||
                            tableOrderPending
                          }
                          onClick={() => {
                            beginTeamEdit(
                              team
                            );
                          }}
                        >
                          Modifica
                        </button>
                      </div>
                    </>
                  )}

                  {editingTeamId === team.id &&
                    teamEditError && (
                    <p className="admin-config-team__edit-error">
                      {teamEditError}
                    </p>
                  )}
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
