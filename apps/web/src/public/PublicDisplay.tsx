import {
  useEffect,
  useState
} from "react";

import type {
  AuctionSession,
  RealtimeAuctionSnapshot,
  RealtimeError
} from "@fantaastaapp/contracts";

import {
  fetchActiveAuctionSession
} from "./public-display-api.js";

import {
  createPublicDisplayRealtimeClient
} from "./public-display-realtime.js";

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

type PublicDisplayMode =
  | "STANDARD"
  | "HIGH_CONTRAST_OUTDOOR"
  | "COMPACT"
  | "DARK";

type PublicDisplayView =
  | "AUCTION"
  | "ROSTER_OVERVIEW";

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

  useEffect(() => {
    let disposed = false;
    let disconnect:
      (() => void) | null = null;

    async function start(): Promise<void> {
      try {
        const activeSession =
          await fetchActiveAuctionSession();

        if (disposed) {
          return;
        }

        if (!activeSession) {
          setStatus(
            "NO_ACTIVE_SESSION"
          );

          return;
        }

        setSession(activeSession);
        setStatus("CONNECTING");

        const client =
          createPublicDisplayRealtimeClient({
            deviceId:
              createPublicDisplayDeviceId(),
            auctionSessionId:
              activeSession.id,

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
  }, []);

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
        <p>
          Nessuna sessione d'asta attiva.
        </p>
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

  const displayMode: PublicDisplayMode =
    "STANDARD";

  const activeView =
    "AUCTION" as PublicDisplayView;

  const displayModeLabel: Record<
    PublicDisplayMode,
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
            src="/branding/fantaastaapp-logo.png"
            alt="FantaAstaAPP"
          />

          <h1 className="public-display__title">
            Schermo Pubblico
          </h1>

          <span className="public-display__mode-label">
            Mod. {displayModeLabel[displayMode]}
          </span>
        </div>

        <div className="public-display__league-brand">
          <img
            className="public-display__league-logo"
            src={
              `/league-logos/${snapshot.publicDisplay.league.id}.png`
            }
            alt=""
            aria-hidden="true"
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
          />

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
            </div>
          </div>
        </div>

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
            Stato #{snapshot.stateVersion}
          </small>
        </div>
      </header>

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
                src={`/player-photos/${currentPlayer.id}.png`}
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
                    {currentPlayer.role}
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

          <article className="public-display__metric">
            <span>
              Turno
            </span>

            <strong>
              {currentTurn}
            </strong>
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
    </main>
  );
}
