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
    <main>
      <h1>FantaAstaAPP</h1>
      <h2>Console Admin</h2>

      <section>
        <h3>Sessione attiva</h3>

        <dl>
          <dt>Lega</dt>
          <dd>
            {league?.name ?? session.leagueId}
          </dd>

          <dt>Stagione</dt>
          <dd>{session.season}</dd>

          <dt>Edizione</dt>
          <dd>{session.editionNumber}</dd>

          <dt>Stato</dt>
          <dd>{session.status}</dd>

          <dt>State version</dt>
          <dd>
            {snapshot?.stateVersion ?? "-"}
          </dd>
        </dl>
      </section>

      <section>
        <h3>Chiamata corrente</h3>

        {cockpit?.currentPlayer ? (
          <>
            <p>
              <strong>
                {cockpit.currentPlayer.name}
              </strong>
              {" · "}
              {cockpit.currentPlayer.role}
              {cockpit.currentPlayer.realTeamName
                ? ` · ${cockpit.currentPlayer.realTeamName}`
                : ""}
            </p>

            <dl>
              <dt>Prezzo corrente</dt>
              <dd>
                {cockpit.currentBid ?? "-"}
              </dd>

              <dt>Leader</dt>
              <dd>
                {
                  cockpit.currentLeaderName ??
                  "-"
                }
              </dd>

              <dt>Turno</dt>
              <dd>
                {
                  cockpit.currentTurnName ??
                  "-"
                }
              </dd>
            </dl>
          </>
        ) : (
          <p>
            Nessun giocatore in chiamata.
          </p>
        )}
      </section>

      <section>
        <h3>Situazione squadre</h3>

        {cockpit ? (
          <div>
            {cockpit.teams.map((team) => (
              <article
                key={
                  team.auctionSessionTeamId
                }
              >
                <h4>
                  {team.tableOrder}.{" "}
                  {team.teamName}
                </h4>

                <dl>
                  <dt>Crediti</dt>
                  <dd>
                    {team.remainingCredits}
                  </dd>

                  <dt>Massimo rilancio</dt>
                  <dd>
                    {team.maximumBid ?? "-"}
                  </dd>

                  <dt>Rosa</dt>
                  <dd>
                    {team.rosterSize}
                    {" / "}
                    {
                      team.rosterSize +
                      team.remainingRosterSlots
                    }
                  </dd>

                  <dt>Slot residui</dt>
                  <dd>
                    {
                      team.remainingRosterSlots
                    }
                  </dd>

                  <dt>Stato chiamata</dt>
                  <dd>
                    {
                      team.callStatus ??
                      "-"
                    }
                  </dd>

                  {team.exclusionReason && (
                    <>
                      <dt>
                        Motivo esclusione
                      </dt>
                      <dd>
                        {
                          team.exclusionReason
                        }
                      </dd>
                    </>
                  )}
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p>
            Snapshot realtime non ancora disponibile.
          </p>
        )}
      </section>
    </main>
  );
}
