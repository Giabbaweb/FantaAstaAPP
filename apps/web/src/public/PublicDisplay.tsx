import {
  useEffect,
  useState
} from "react";

import type {
  AuctionSession,
  League,
  PublicDisplayControlState,
  RealtimeAuctionSnapshot,
  RealtimeError
} from "@fantaastaapp/contracts";

import {
  fetchActiveAuctionSession,
  fetchAuctionSessions,
  selectCurrentAuctionSession
} from "./public-display-api.js";

import {
  fetchLeagues
} from "../shared/app-api.js";

import {
  createPublicDisplayRealtimeClient
} from "./public-display-realtime.js";

import {
  fetchPublicDisplayControl
} from "../shared/public-display-control-api.js";

import {
  RosterOverview
} from "./RosterOverview.js";

import "./public-display.css";

type PublicDisplayStatus =
  | "LOADING"
  | "NO_ACTIVE_SESSION"
  | "CONNECTING"
  | "LIVE"
  | "ERROR";

function parseServerTime(
  value: string
): number {
  const normalized =
    value.includes("T")
      ? value
      : `${value.replace(" ", "T")}Z`;

  return new Date(normalized).getTime();
}

function formatPublicClock(
  now: number
): string {
  return new Intl.DateTimeFormat(
    "it-IT",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  ).format(new Date(now));
}

function formatPublicTurnElapsed(
  startedAt: string | null,
  endAt: number
): string {
  if (!startedAt) {
    return "--:--";
  }

  const started =
    parseServerTime(startedAt);

  if (Number.isNaN(started)) {
    return "--:--";
  }

  const elapsedSeconds =
    Math.max(
      0,
      Math.floor(
        (endAt - started) / 1000
      )
    );

  const minutes =
    Math.floor(
      elapsedSeconds / 60
    );

  const seconds =
    elapsedSeconds % 60;

  return [
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}

function formatPublicPlayerRole(
  role: string
): string {
  switch (role) {
    case "P":
      return "PORTIERE";

    case "D":
      return "DIFENSORE";

    case "C":
      return "CENTROCAMPISTA";

    case "A":
      return "ATTACCANTE";

    default:
      return role;
  }
}

const publicSelectedAuctionSessionStorageKey =
  "fantaastaapp.publicDisplay.selectedAuctionSessionId";

function loadSelectedPublicAuctionSessionId():
  string | null {
  return window.localStorage.getItem(
    publicSelectedAuctionSessionStorageKey
  );
}

function persistSelectedPublicAuctionSessionId(
  auctionSessionId: string
): void {
  window.localStorage.setItem(
    publicSelectedAuctionSessionStorageKey,
    auctionSessionId
  );
}

function createPublicDisplayDeviceId(): string {
  const storageKey =
    "fantaastaapp.publicDisplay.deviceId";

  const existing =
    window.localStorage.getItem(
      storageKey
    );

  if (existing) {
    return existing;
  }

  const deviceId =
    `public-display-${crypto.randomUUID()}`;

  window.localStorage.setItem(
    storageKey,
    deviceId
  );

  return deviceId;
}

export function PublicDisplay():
  React.JSX.Element {
  const [
    status,
    setStatus
  ] = useState<PublicDisplayStatus>(
    "LOADING"
  );

  const [
    session,
    setSession
  ] = useState<AuctionSession | null>(
    null
  );

  const [
    selectedAuctionSessionId,
    setSelectedAuctionSessionId
  ] = useState<string | null>(
    () =>
      loadSelectedPublicAuctionSessionId()
  );

  const [
    auctionSessions,
    setAuctionSessions
  ] = useState<AuctionSession[]>([]);

  const [
    leagues,
    setLeagues
  ] = useState<League[]>([]);

  const [
    sessionSelectorOpen,
    setSessionSelectorOpen
  ] = useState(false);

  const [
    snapshot,
    setSnapshot
  ] = useState<RealtimeAuctionSnapshot | null>(
    null
  );

  const [
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(
    null
  );

  const [
    now,
    setNow
  ] = useState(
    () => Date.now()
  );


  const [
    displayControl,
    setDisplayControl
  ] = useState<PublicDisplayControlState>({
    displayMode: "STANDARD",
    activeView: "AUCTION"
  });

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setNow(Date.now());
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    let disposed = false;

    const refreshControl =
      async (): Promise<void> => {
        try {
          const next =
            await fetchPublicDisplayControl(
              session.id
            );

          if (!disposed) {
            setDisplayControl(next);
          }
        } catch {
          /*
           * Presentation control is non-critical.
           * Keep the last valid display state.
           */
        }
      };

    void refreshControl();

    const timer =
      window.setInterval(
        () => {
          void refreshControl();
        },
        750
      );

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [session?.id]);

  useEffect(() => {
    let disposed = false;
    let disconnect:
      (() => void) | null = null;

    async function start(): Promise<void> {
      setStatus("LOADING");
      setSession(null);
      setSnapshot(null);
      setErrorMessage(null);

      try {
        const [
          activeSession,
          availableSessions,
          availableLeagues
        ] = await Promise.all([
          fetchActiveAuctionSession(),
          fetchAuctionSessions(),
          fetchLeagues()
        ]);

        if (disposed) {
          return;
        }

        setAuctionSessions(
          availableSessions
        );

        setLeagues(
          availableLeagues
        );

        const persistedSession =
          selectedAuctionSessionId
            ? (
                availableSessions.find(
                  (candidate) =>
                    candidate.id ===
                      selectedAuctionSessionId
                ) ?? null
              )
            : null;

        const selectedSession =
          persistedSession ??
          selectCurrentAuctionSession(
            activeSession,
            availableSessions
          );

        if (!selectedSession) {
          setStatus(
            "NO_ACTIVE_SESSION"
          );

          return;
        }

        persistSelectedPublicAuctionSessionId(
          selectedSession.id
        );

        if (
          selectedAuctionSessionId !==
            selectedSession.id
        ) {
          setSelectedAuctionSessionId(
            selectedSession.id
          );
        }

        setSession(selectedSession);
        setStatus("CONNECTING");

        const client =
          createPublicDisplayRealtimeClient({
            deviceId:
              createPublicDisplayDeviceId(),
            auctionSessionId:
              selectedSession.id,

            onRegistered: () => {
              if (!disposed) {
                setStatus("CONNECTING");
              }
            },

            onSnapshot: (
              nextSnapshot
            ) => {
              if (disposed) {
                return;
              }

              setSnapshot(
                nextSnapshot
              );

              setStatus("LIVE");
            },

            onError: (
              realtimeError:
                RealtimeError
            ) => {
              if (disposed) {
                return;
              }

              setErrorMessage(
                realtimeError.message
              );

              setStatus("ERROR");
            }
          });

        disconnect =
          client.disconnect;
      } catch (error) {
        if (disposed) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Public display initialization failed"
        );

        setStatus("ERROR");
      }
    }

    void start();

    return () => {
      disposed = true;
      disconnect?.();
    };
  }, [
    selectedAuctionSessionId
  ]);

  if (
    status === "LOADING" ||
    status === "CONNECTING"
  ) {
    return (
      <main>
        <h1>FantaAstaAPP</h1>
        <p>
          Connessione allo schermo pubblico…
        </p>
      </main>
    );
  }

  if (status === "NO_ACTIVE_SESSION") {
    return (
      <main>
        <h1>FantaAstaAPP</h1>

        {auctionSessions.length > 0 ? (
          <>
            <p>
              Seleziona la sessione da visualizzare.
            </p>

            <div>
              {auctionSessions.map(
                (candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      persistSelectedPublicAuctionSessionId(
                        candidate.id
                      );

                      setSelectedAuctionSessionId(
                        candidate.id
                      );
                    }}
                  >
                    {
                      leagues.find(
                        (league) =>
                          league.id ===
                            candidate.leagueId
                      )?.name ??
                      candidate.leagueId
                    }
                    {" · "}
                    {candidate.season}
                    {" · "}
                    {candidate.editionNumber}ª
                    {" · "}
                    {candidate.status}
                  </button>
                )
              )}
            </div>
          </>
        ) : (
          <p>
            Nessuna sessione d'asta disponibile.
          </p>
        )}
      </main>
    );
  }

  if (
    status === "ERROR" ||
    !session ||
    !snapshot
  ) {
    return (
      <main>
        <h1>FantaAstaAPP</h1>
        <p>
          Errore Schermo Pubblico.
        </p>
        {errorMessage && (
          <p>{errorMessage}</p>
        )}
      </main>
    );
  }

  const operationalCall =
    snapshot.operationalAuctionCall;

  const currentPlayer =
    snapshot.publicDisplay.currentPlayer;

  const findTeamName = (
    auctionSessionTeamId: string | null
  ): string => {
    if (!auctionSessionTeamId) {
      return "-";
    }

    return (
      snapshot.publicDisplay.teams.find(
        (team) =>
          team.auctionSessionTeamId ===
          auctionSessionTeamId
      )?.teamName ?? "-"
    );
  };

  const findOperationalTeam = (
    auctionSessionTeamId: string
  ) =>
    operationalCall?.teams.find(
      (team) =>
        team.auctionSessionTeamId ===
        auctionSessionTeamId
    ) ?? null;

  const formatSuspensionReason = (
    reason:
      | "PIZZA_BREAK"
      | "TECHNICAL_BREAK"
      | "ORGANIZATIONAL_BREAK"
      | "NETWORK_ISSUE"
      | "RECOVERY_RESTART"
      | "OTHER"
      | null
  ): string => {
    switch (reason) {
      case "PIZZA_BREAK":
        return "Pizza Break";

      case "TECHNICAL_BREAK":
        return "Pausa tecnica";

      case "ORGANIZATIONAL_BREAK":
        return "Pausa organizzativa";

      case "NETWORK_ISSUE":
        return "Problema di rete";

      case "RECOVERY_RESTART":
        return "Ripristino dopo riavvio";

      case "OTHER":
        return "Pausa operativa";

      default:
        return "Pausa operativa";
    }
  };

  const formatExclusionReason = (
    reason: string | null | undefined
  ): string => {
    switch (reason) {
      case "MAXIMUM_BID_TOO_LOW":
        return "Max offerta troppo bassa";

      case "ROSTER_FULL":
        return "Rosa completa";

      case "ROLE_LIMIT_REACHED":
        return "Limite ruolo raggiunto";

      default:
        return "Esclusione automatica";
    }
  };

  const currentLeader =
    operationalCall
      ? findTeamName(
          operationalCall.call
            .currentLeaderAuctionSessionTeamId
        )
      : "-";

  const currentTurn =
    operationalCall
      ? findTeamName(
          operationalCall.call
            .currentTurnAuctionSessionTeamId
        )
      : "-";

  const displayMode =
    displayControl.displayMode;

  const activeView =
    displayControl.activeView;

  const displayModeLabel: Record<
    PublicDisplayControlState["displayMode"],
    string
  > = {
    STANDARD: "Standard",
    HIGH_CONTRAST_OUTDOOR: "Outdoor",
    COMPACT: "Compact",
    DARK: "Dark"
  };

  return (
    <main
      className={`public-display public-display--${displayMode.toLowerCase()} public-display--view-${activeView.toLowerCase()}`}
    >
      <header className="public-display__header">
        <div className="public-display__app-brand">
          <img
            className="public-display__app-logo"
            src="/branding/fantaastaapp-banner-faded.png"
            alt="FantaAstaAPP"
          />

          <span className="public-display__mode-label">
            Mod. {displayModeLabel[displayMode]}
          </span>
        </div>

        <button
          className="public-display__league-brand"
          type="button"
          aria-expanded={sessionSelectorOpen}
          aria-label="Cambia sessione d'asta"
          onClick={() => {
            setSessionSelectorOpen(
              (current) => !current
            );
          }}
        >
          {snapshot.publicDisplay.league.logoPath && (
            <img
              className="public-display__league-logo"
              src={
                snapshot.publicDisplay.league.logoPath
              }
              alt=""
              aria-hidden="true"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />
          )}

          <div className="public-display__league-copy">
            <strong className="public-display__league-name">
              {snapshot.publicDisplay.league.name}
            </strong>

            <div className="public-display__league-meta">
              <span>{session.season}</span>

              <span aria-hidden="true">
                ·
              </span>

              <span>
                {session.editionNumber}ª edizione
              </span>

              <span
                className="public-display__session-selector-chevron"
                aria-hidden="true"
              >
                {sessionSelectorOpen ? "▴" : "▾"}
              </span>
            </div>
          </div>
        </button>

        {sessionSelectorOpen && (
          <div
            className="public-display__session-selector"
            role="dialog"
            aria-label="Seleziona sessione d'asta"
          >
            <strong className="public-display__session-selector-title">
              Cambia sessione
            </strong>

            <div className="public-display__session-selector-list">
              {auctionSessions.map(
                (candidate) => {
                  const candidateLeague =
                    leagues.find(
                      (league) =>
                        league.id ===
                          candidate.leagueId
                    )?.name ??
                    candidate.leagueId;

                  const isSelected =
                    candidate.id === session.id;

                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      className="public-display__session-selector-option"
                      data-selected={isSelected}
                      disabled={isSelected}
                      onClick={() => {
                        persistSelectedPublicAuctionSessionId(
                          candidate.id
                        );

                        setSessionSelectorOpen(
                          false
                        );

                        setSelectedAuctionSessionId(
                          candidate.id
                        );
                      }}
                    >
                      <span>
                        <strong>
                          {candidateLeague}
                        </strong>

                        <small>
                          {candidate.season}
                          {" · "}
                          {candidate.editionNumber}ª edizione
                        </small>
                      </span>

                      <span
                        className="public-display__session-selector-status"
                        data-status={
                          candidate.status
                        }
                      >
                        {candidate.status}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        <div className="public-display__runtime">
          {activeView === "AUCTION" && (
            <div
              className="public-display__stadium-clock"
              aria-label="Ora attuale"
            >
              <span>ORA</span>

              <strong>
                {formatPublicClock(now)}
              </strong>
            </div>
          )}

          <div className="public-display__session-meta">
            <span
              className="public-display__status"
              data-status={
                snapshot.session.status
              }
            >
              {snapshot.session.status}
            </span>

            <small>
              Aggiornamento #{snapshot.stateVersion}
            </small>
          </div>
        </div>
      </header>

      {snapshot.session.status === "SUSPENDED" &&
        activeView === "AUCTION" && (
        <section className="public-display__suspended-banner">
          <strong>
            ASTA TEMPORANEAMENTE SOSPESA
          </strong>

          <span>
            {
              formatSuspensionReason(
                snapshot.session
                  .suspensionReason
              )
            }
          </span>

          <small>
            La situazione dell'asta è stata congelata.
            La sessione riprenderà su indicazione del banditore.
          </small>
        </section>
      )}

      {activeView === "ROSTER_OVERVIEW" && (
        <RosterOverview
          teams={snapshot.publicDisplay.teams}
        />
      )}

      <div className="public-display__auction-row">
      <section className="public-display__auction">
        <p className="public-display__section-label">
          Giocatore chiamato
        </p>

        <div className="public-display__player">
          {currentPlayer ? (
            <>
              <img
                className="public-display__player-photo"
                src={`/api/player-photos/${currentPlayer.fmsCode}`}
                alt=""
                aria-hidden="true"
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />

              <div className="public-display__player-info">
                <h2 className="public-display__player-name">
                  {currentPlayer.name}
                </h2>

                <div className="public-display__player-meta">
                  <span
                    className="public-display__player-role"
                    data-role={currentPlayer.role}
                  >
                    {formatPublicPlayerRole(
                      currentPlayer.role
                    )}
                  </span>

                  {currentPlayer.realTeamName && (
                    <span className="public-display__player-real-team">
                      {currentPlayer.realTeamName}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <h2 className="public-display__player-empty">
              Nessun giocatore in chiamata
            </h2>
          )}
        </div>

        <div className="public-display__auction-metrics">
          <article className="public-display__metric">
            <span>
              Prezzo corrente
            </span>

            <strong>
              {
                operationalCall?.call
                  .currentBid ?? "-"
              }
            </strong>
          </article>

          <article className="public-display__metric">
            <span>
              Leader
            </span>

            <strong>
              {currentLeader}
            </strong>
          </article>

          <article className="public-display__metric public-display__metric--turn">
            <div className="public-display__turn-team">
              <span>
                Turno
              </span>

              <strong>
                {currentTurn}
              </strong>
            </div>

            <div className="public-display__turn-timer">
              <span
                className="public-display__turn-timer-icon"
                aria-hidden="true"
              >
                ⏱
              </span>

              <div>
                <strong>
                  {formatPublicTurnElapsed(
                    operationalCall?.call
                      .currentTurnStartedAt ??
                      null,
                    snapshot.session.status ===
                      "SUSPENDED"
                      ? parseServerTime(
                          snapshot.session.updatedAt
                        )
                      : now
                  )}
                </strong>

                <small>
                  tempo trascorso
                </small>
              </div>
            </div>
          </article>
        </div>
      </section>

        <aside className="public-display__recent-awards">
          <p className="public-display__section-label">
            Ultime aggiudicazioni
          </p>

          <div className="public-display__recent-awards-list">
            {snapshot.publicDisplay.recentAwards.map((award) => (
              <article
                className="public-display__recent-award"
                key={award.eventId}
              >
                <span
                  className="public-display__recent-award-role"
                  data-role={award.role}
                >
                  {award.role}
                </span>

                <div className="public-display__recent-award-copy">
                  <strong>
                    {award.playerName}
                  </strong>

                  <span>
                    {award.teamName}
                  </span>
                </div>

                <strong className="public-display__recent-award-amount">
                  {award.amount}
                </strong>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <section className="public-display__teams">
        <div className="public-display__teams-heading">
          <div>
            <p className="public-display__section-label">
              Situazione squadre
            </p>

            <h2>
              Crediti e composizione rose
            </h2>
          </div>

          <span>
            {
              snapshot.publicDisplay
                .teams.length
            } squadre
          </span>
        </div>

        <div className="public-display__team-grid">
          {
            snapshot.publicDisplay
              .teams.map(
                (team) => (
                  <article
                    className="public-display__team-card"
                      data-call-status={
                        findOperationalTeam(
                          team.auctionSessionTeamId
                        )?.status
                      }
                    key={
                      team.auctionSessionTeamId
                    }
                  >
                    <header className="public-display__team-card-header">
                      <div className="public-display__team-logo">
                        {
                          team.logoPath ? (
                            <img
                              src={team.logoPath}
                              alt=""
                            />
                          ) : (
                            <span>
                              {
                                team.shortName ??
                                team.teamName
                                  .slice(0, 3)
                                  .toUpperCase()
                              }
                            </span>
                          )
                        }
                      </div>

                      <div className="public-display__team-identity">
                        <h3>
                          {team.teamName}
                        </h3>

                        {
                          team.shortName && (
                            <span>
                              {team.shortName}
                            </span>
                          )
                        }
                      </div>
                    </header>

                      {(() => {
                        const callTeam =
                          findOperationalTeam(
                            team.auctionSessionTeamId
                          );

                        if (
                          !callTeam ||
                          callTeam.status === "ACTIVE"
                        ) {
                          return null;
                        }

                        const isPassed =
                          callTeam.status ===
                          "PASSED";

                        return (
                          <div
                            className={`public-display__team-status-overlay ${
                              isPassed
                                ? "public-display__team-status-overlay--passed"
                                : "public-display__team-status-overlay--excluded"
                            }`}
                          >
                            <strong className="public-display__team-status-overlay-title">
                              {
                                isPassed
                                  ? "PASS"
                                  : "ESCLUSA"
                              }
                            </strong>

                            <span className="public-display__team-status-overlay-subtitle">
                              {
                                isPassed
                                  ? "Ha Passato!"
                                  : `Motivo: ${formatExclusionReason(
                                      callTeam.exclusionReason
                                    )}`
                              }
                            </span>
                          </div>
                        );
                      })()}


                    <div className="public-display__team-summary">
                      <div>
                        <span>
                          Crediti
                        </span>

                        <strong>
                          {
                            team.remainingCredits
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Max offerta
                        </span>

                        <strong>
                          {
                            team.maximumBid ?? "—"
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="public-display__team-roster">
                      {
                        (
                          [
                            ["P", team.roster.P],
                            ["D", team.roster.D],
                            ["C", team.roster.C],
                            ["A", team.roster.A]
                          ] as const
                        ).map(
                          ([role, data]) => (
                            <div
                              key={role}
                              className="public-display__team-role"
                              data-role={role}
                              data-complete={
                                data.count >= data.limit
                              }
                            >
                              <span>
                                {role}
                              </span>

                              <strong>
                                {data.count}/
                                {data.limit}
                              </strong>
                            </div>
                          )
                        )
                      }
                    </div>
                  </article>
                )
              )
          }
        </div>
      </section>

      <footer className="public-display__signature">
        <span>Powered by</span>

        <img
          src="/branding/arti-john-logo.png"
          alt="Arti John"
        />
      </footer>
    </main>
  );
}
