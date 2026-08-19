import {
  useEffect,
  useState
} from "react";

import type {
  AuctionSession,
  League
} from "@fantaastaapp/contracts";

import {
  fetchActiveAuctionSession,
  fetchLeagues
} from "../shared/app-api.js";

type AdminStatus =
  | "LOADING"
  | "READY"
  | "ERROR";

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
        setStatus("READY");
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
    };
  }, []);

  if (status === "LOADING") {
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

          <dt>Crediti iniziali</dt>
          <dd>{session.initialCredits}</dd>

          <dt>Confermati massimi</dt>
          <dd>
            {
              session.maximumInitialRosterEntries
            }
          </dd>
        </dl>
      </section>
    </main>
  );
}
