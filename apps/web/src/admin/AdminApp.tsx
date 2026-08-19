import {
  useEffect,
  useState
} from "react";

import type {
  AuctionSession,
  League,
  RealtimeAuctionSnapshot,
  RealtimeError
} from "@fantaastaapp/contracts";

import {
  fetchActiveAuctionSession,
  fetchLeagues
} from "../shared/app-api.js";

import {
  createAdminCockpitProjection
} from "./admin-cockpit.js";
import {
  createAdminRealtimeClient
} from "./admin-realtime.js";

import "./admin.css";

type AdminStatus =
  | "LOADING"
  | "CONNECTING"
  | "READY"
  | "ERROR";

function createAdminDeviceId(): string {
  const storageKey =
    "fantaastaapp.admin.deviceId";

  const existing =
    window.localStorage.getItem(
      storageKey
    );

  if (existing) {
    return existing;
  }

  const deviceId =
    `admin-${crypto.randomUUID()}`;

  window.localStorage.setItem(
    storageKey,
    deviceId
  );

  return deviceId;
}

export function AdminApp() {
  const [
    status,
    setStatus
  ] = useState<AdminStatus>("LOADING");

  const [
    session,
    setSession
  ] = useState<AuctionSession | null>(null);

  const [
    leagues,
    setLeagues
  ] = useState<League[]>([]);

  const [
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(null);

  const [
    snapshot,
    setSnapshot
  ] = useState<RealtimeAuctionSnapshot | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    let disconnect:
      (() => void) | null = null;

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

        setStatus("CONNECTING");

        const client =
          createAdminRealtimeClient({
            deviceId:
              createAdminDeviceId(),
            auctionSessionId:
              activeSession.id,

            onRegistered: () => {
              if (!cancelled) {
                setStatus("CONNECTING");
              }
            },

            onSnapshot: (
              nextSnapshot
            ) => {
              if (cancelled) {
                return;
              }

              setSnapshot(
                nextSnapshot
              );

              setSession(
                nextSnapshot.session
              );

              setStatus("READY");
            },

            onError: (
              realtimeError:
                RealtimeError
            ) => {
              if (cancelled) {
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
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento."
        );

        setStatus("ERROR");
      }
    };

    void load();

    return () => {
      cancelled = true;
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
        <h2>Console Admin</h2>
        <p>
          Caricamento dati...
        </p>
      </main>
    );
  }

  if (status === "ERROR") {
    return (
      <main>
        <h1>FantaAstaAPP</h1>
        <h2>Console Admin</h2>
        <p>
          Errore nel caricamento dei dati.
        </p>
        {errorMessage && (
          <p>{errorMessage}</p>
        )}
      </main>
    );
  }

  if (!session) {
    return (
      <main>
        <h1>FantaAstaAPP</h1>
        <h2>Console Admin</h2>
        <p>
          Nessuna sessione d'asta attiva.
        </p>
        <p>
          Leghe configurate: {leagues.length}
        </p>
      </main>
    );
  }

  const league =
    leagues.find(
      (candidate) =>
        candidate.id === session.leagueId
    ) ?? null;

  const cockpit =
    snapshot
      ? createAdminCockpitProjection(
          snapshot
        )
      : null;

  return (
    <main className="admin-cockpit">
      <header className="admin-cockpit__header">
        <div>
          <strong className="admin-cockpit__brand">
            FantaAstaAPP
          </strong>

          <span className="admin-cockpit__surface">
            Console Admin
          </span>
        </div>

        <div className="admin-cockpit__session">
          <strong>
            {league?.name ?? session.leagueId}
          </strong>

          <span>
            {session.season}
          </span>

          <span>
            {session.editionNumber}ª edizione
          </span>
        </div>

        <div className="admin-cockpit__state">
          <span data-status={session.status}>
            {session.status}
          </span>

          <small>
            Stato #{snapshot?.stateVersion ?? "-"}
          </small>
        </div>
      </header>

      <div className="admin-cockpit__top-grid">
        <section className="admin-panel admin-panel--current-call">
          <p className="admin-panel__label">
            Chiamata corrente
          </p>

          {cockpit?.currentPlayer ? (
            <div className="admin-current-player">
              <img
                src={`/player-photos/${cockpit.currentPlayer.fmsCode}.png`}
                alt=""
                aria-hidden="true"
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />

              <div>
                <h1>
                  {cockpit.currentPlayer.name}
                </h1>

                <p>
                  <strong>
                    {cockpit.currentPlayer.role}
                  </strong>

                  {cockpit.currentPlayer.realTeamName && (
                    <>
                      {" · "}
                      {
                        cockpit.currentPlayer
                          .realTeamName
                      }
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="admin-empty">
              Nessun giocatore in chiamata.
            </p>
          )}

          <div className="admin-call-metrics">
            <article>
              <span>Prezzo</span>
              <strong>
                {cockpit?.currentBid ?? "-"}
              </strong>
            </article>

            <article>
              <span>Leader</span>
              <strong>
                {
                  cockpit?.currentLeaderName ??
                  "-"
                }
              </strong>
            </article>

            <article>
              <span>Turno</span>
              <strong>
                {
                  cockpit?.currentTurnName ??
                  "-"
                }
              </strong>
            </article>
          </div>
        </section>

        <section className="admin-panel admin-panel--controls">
          <p className="admin-panel__label">
            Controlli asta
          </p>

          <div className="admin-controls">
            <button disabled>
              Sospendi sessione
            </button>

            <button disabled>
              Conferma aggiudicazione
            </button>

            <button disabled>
              Annulla chiamata
            </button>

            <button disabled>
              Correzione amministrativa
            </button>
          </div>

          <small className="admin-controls__note">
            I comandi verranno collegati nei prossimi checkpoint.
          </small>
        </section>
      </div>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <p className="admin-panel__label">
            Partecipanti alla chiamata
          </p>

          <span>
            {cockpit?.teams.length ?? 0} squadre
          </span>
        </div>

        <div className="admin-call-teams">
          {cockpit?.teams.map((team) => (
            <article
              key={team.auctionSessionTeamId}
              data-status={
                team.callStatus ?? "NONE"
              }
            >
              <div className="admin-call-team__summary">
                <strong
                  className="admin-call-teams__name"
                  title={team.teamName}
                >
                  {team.teamName}
                </strong>

                <span
                  className="admin-call-team__status"
                  data-status={
                    team.callStatus ?? "NONE"
                  }
                >
                  {team.callStatus ?? "-"}
                </span>

                <small>
                  Max {team.maximumBid ?? "-"}
                </small>
              </div>

              <dl className="admin-call-team__details">
                <div>
                  <dt>Crediti</dt>
                  <dd>
                    {team.remainingCredits}
                  </dd>
                </div>

                <div>
                  <dt>Slot tot.</dt>
                  <dd>
                    {
                      team.rosterSize +
                      team.remainingRosterSlots
                    }
                  </dd>
                </div>

                <div>
                  <dt>P</dt>
                  <dd>
                    {team.rosterRoles.P.count}/
                    {team.rosterRoles.P.limit}
                  </dd>
                </div>

                <div>
                  <dt>D</dt>
                  <dd>
                    {team.rosterRoles.D.count}/
                    {team.rosterRoles.D.limit}
                  </dd>
                </div>

                <div>
                  <dt>C</dt>
                  <dd>
                    {team.rosterRoles.C.count}/
                    {team.rosterRoles.C.limit}
                  </dd>
                </div>

                <div>
                  <dt>A</dt>
                  <dd>
                    {team.rosterRoles.A.count}/
                    {team.rosterRoles.A.limit}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel admin-panel--new-call">
        <div>
          <p className="admin-panel__label">
            Nuova chiamata
          </p>

          <h2>
            Cerca e apri il prossimo giocatore
          </h2>
        </div>

        <div className="admin-new-call">
          <input
            type="search"
            placeholder="Cerca giocatore..."
            disabled
          />

          <button disabled>
            Apri chiamata
          </button>
        </div>
      </section>

      <section className="admin-cockpit__workspace">
        <p>
          Spazio disponibile per strumenti operativi aggiuntivi.
        </p>
      </section>
    </main>
  );
}
