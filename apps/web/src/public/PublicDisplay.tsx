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

type PublicDisplayStatus =
  | "LOADING"
  | "NO_ACTIVE_SESSION"
  | "CONNECTING"
  | "LIVE"
  | "ERROR";

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

  return (
    <main>
      <header>
        <h1>FantaAstaAPP — Schermo Pubblico</h1>
        <p>
          {session.season}
          {" · "}
          Sessione: {snapshot.session.status}
          {" · "}
          Versione stato: {snapshot.stateVersion}
        </p>
      </header>

      <section>
        <h2>Giocatore chiamato</h2>

        {currentPlayer ? (
          <>
            <strong>
              {currentPlayer.name}
            </strong>
            <p>
              Ruolo: {currentPlayer.role}
            </p>
          </>
        ) : (
          <p>
            Nessun giocatore in chiamata.
          </p>
        )}

        {operationalCall && (
          <>
            <p>
              Prezzo corrente:{" "}
              {operationalCall.call.currentBid ?? "-"}
            </p>

            <p>
              Leader:{" "}
              {
                operationalCall.call
                  .currentLeaderAuctionSessionTeamId ??
                "-"
              }
            </p>

            <p>
              Turno:{" "}
              {
                operationalCall.call
                  .currentTurnAuctionSessionTeamId ??
                "-"
              }
            </p>
          </>
        )}
      </section>

      <section>
        <h2>Squadre</h2>

        <table>
          <thead>
            <tr>
              <th>Squadra</th>
              <th>Crediti</th>
              <th>Posti</th>
              <th>P</th>
              <th>D</th>
              <th>C</th>
              <th>A</th>
            </tr>
          </thead>

          <tbody>
            {snapshot.publicDisplay.teams.map(
              (team) => (
                <tr
                  key={
                    team.auctionSessionTeamId
                  }
                >
                  <td>{team.teamName}</td>
                  <td>
                    {team.remainingCredits}
                  </td>
                  <td>
                    {
                      team.roster
                        .remainingRosterSlots
                    }
                  </td>
                  <td>
                    {team.roster.P.count}/
                    {team.roster.P.limit}
                  </td>
                  <td>
                    {team.roster.D.count}/
                    {team.roster.D.limit}
                  </td>
                  <td>
                    {team.roster.C.count}/
                    {team.roster.C.limit}
                  </td>
                  <td>
                    {team.roster.A.count}/
                    {team.roster.A.limit}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
