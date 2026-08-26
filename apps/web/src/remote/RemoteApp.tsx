import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import type {
  AuctionSession,
  AuctionSessionTeam,
  RealtimeAuctionSnapshot,
  Team
} from "@fantaastaapp/contracts";

import {
  fetchRemoteActiveSession,
  fetchRemoteSessionTeams,
  fetchRemoteTeams
} from "./remote-api.js";

import {
  createRemoteRealtimeClient,
  type RemoteRealtimeClient
} from "./remote-realtime.js";

type RemoteStatus =
  | "LOADING"
  | "LOGIN"
  | "CONNECTING"
  | "LIVE"
  | "ERROR";

const remoteDeviceStorageKey =
  "fantaastaapp.remote.device-id";

const remoteAccessStorageKey =
  "fantaastaapp.remote.access";

type StoredRemoteAccess = {
  auctionSessionId: string;
  teamId: string;
  pin: string;
};

function getDeviceId(): string {
  const existing =
    window.sessionStorage.getItem(
      remoteDeviceStorageKey
    );

  if (existing) {
    return existing;
  }

  const generated =
    `remote-${crypto.randomUUID()}`;

  window.sessionStorage.setItem(
    remoteDeviceStorageKey,
    generated
  );

  return generated;
}

function readStoredRemoteAccess():
  StoredRemoteAccess | null {
  const raw =
    window.sessionStorage.getItem(
      remoteAccessStorageKey
    );

  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(raw) as Partial<
        StoredRemoteAccess
      >;

    if (
      typeof parsed.auctionSessionId !==
        "string" ||
      typeof parsed.teamId !== "string" ||
      typeof parsed.pin !== "string" ||
      !/^\d{4,8}$/.test(parsed.pin)
    ) {
      return null;
    }

    return {
      auctionSessionId:
        parsed.auctionSessionId,
      teamId: parsed.teamId,
      pin: parsed.pin
    };
  } catch {
    return null;
  }
}

function writeStoredRemoteAccess(
  access: StoredRemoteAccess
): void {
  window.sessionStorage.setItem(
    remoteAccessStorageKey,
    JSON.stringify(access)
  );
}

function clearStoredRemoteAccess(): void {
  window.sessionStorage.removeItem(
    remoteAccessStorageKey
  );
}

export function RemoteApp() {
  const [
    status,
    setStatus
  ] = useState<RemoteStatus>("LOADING");

  const [
    session,
    setSession
  ] = useState<AuctionSession | null>(
    null
  );

  const [
    sessionTeams,
    setSessionTeams
  ] = useState<AuctionSessionTeam[]>([]);

  const [
    teams,
    setTeams
  ] = useState<Team[]>([]);

  const [
    selectedTeamId,
    setSelectedTeamId
  ] = useState("");

  const [
    pin,
    setPin
  ] = useState("");

  const [
    restorePending,
    setRestorePending
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
    bidValue,
    setBidValue
  ] = useState("");

  const [
    commandPending,
    setCommandPending
  ] = useState(false);

  const [
    commandError,
    setCommandError
  ] = useState<string | null>(
    null
  );

  const realtimeRef =
    useRef<RemoteRealtimeClient | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const activeSession =
          await fetchRemoteActiveSession();

        if (cancelled) {
          return;
        }

        if (!activeSession) {
          setErrorMessage(
            "Nessuna sessione d'asta attiva."
          );
          setStatus("ERROR");
          return;
        }

        const [
          loadedSessionTeams,
          loadedTeams
        ] = await Promise.all([
          fetchRemoteSessionTeams(
            activeSession.id
          ),
          fetchRemoteTeams(
            activeSession.leagueId
          )
        ]);

        if (cancelled) {
          return;
        }

        setSession(activeSession);
        setSessionTeams(
          loadedSessionTeams
        );
        setTeams(loadedTeams);

        const storedAccess =
          readStoredRemoteAccess();

        if (
          storedAccess &&
          storedAccess.auctionSessionId ===
            activeSession.id &&
          loadedSessionTeams.some(
            (sessionTeam) =>
              sessionTeam.teamId ===
              storedAccess.teamId
          )
        ) {
          setSelectedTeamId(
            storedAccess.teamId
          );
          setPin(
            storedAccess.pin
          );
          setRestorePending(true);
        } else if (storedAccess) {
          clearStoredRemoteAccess();
        }

        setStatus("LOGIN");
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
    }

    void load();

    return () => {
      cancelled = true;

      realtimeRef.current?.disconnect();
      realtimeRef.current = null;
    };
  }, []);

  const selectableTeams =
    useMemo(() => {
      return [...sessionTeams]
        .sort(
          (first, second) =>
            first.tableOrder -
            second.tableOrder
        )
        .map((sessionTeam) => ({
          sessionTeam,
          team:
            teams.find(
              (team) =>
                team.id ===
                sessionTeam.teamId
            ) ?? null
        }))
        .filter(
          (
            item
          ): item is {
            sessionTeam: AuctionSessionTeam;
            team: Team;
          } => item.team !== null
        );
    }, [
      sessionTeams,
      teams
    ]);

  const selected =
    selectableTeams.find(
      (item) =>
        item.sessionTeam.teamId ===
        selectedTeamId
    ) ?? null;

  const realtimeSessionTeam =
    snapshot?.sessionTeams.find(
      (team) =>
        team.teamId === selectedTeamId
    ) ?? null;

  const publicTeam =
    snapshot?.publicDisplay.teams.find(
      (team) =>
        team.teamId === selectedTeamId
    ) ?? null;

  const operationalCall =
    snapshot?.operationalAuctionCall ??
    null;

  const callTeam =
    operationalCall?.teams.find(
      (team) =>
        team.auctionSessionTeamId ===
        realtimeSessionTeam?.id
    ) ?? null;

  const isMyTurn =
    Boolean(
      realtimeSessionTeam &&
      operationalCall &&
      operationalCall.call
        .currentTurnAuctionSessionTeamId ===
        realtimeSessionTeam.id
    );

  const liveSessionStatus =
    snapshot?.session.status ??
    session?.status ??
    null;

  const canAct =
    liveSessionStatus === "RUNNING" &&
    operationalCall?.call.status ===
      "OPEN" &&
    callTeam?.status === "ACTIVE" &&
    isMyTurn &&
    !commandPending;

  const minimumBid =
    operationalCall?.call.currentBid !==
      null &&
    operationalCall?.call.currentBid !==
      undefined
      ? operationalCall.call.currentBid + 1
      : null;

  useEffect(() => {
    if (
      !isMyTurn ||
      minimumBid === null
    ) {
      return;
    }

    setBidValue(
      String(minimumBid)
    );

    setCommandError(null);
  }, [
    isMyTurn,
    minimumBid
  ]);

  async function executeBid():
    Promise<void> {
    if (
      !snapshot ||
      !operationalCall ||
      !realtimeSessionTeam ||
      !callTeam ||
      !canAct
    ) {
      return;
    }

    const bid =
      Number(bidValue);

    if (
      !Number.isInteger(bid) ||
      minimumBid === null ||
      bid < minimumBid ||
      bid > callTeam.maximumBid
    ) {
      setCommandError(
        `Offerta valida da ${minimumBid ?? "-"} a ${callTeam.maximumBid}.`
      );

      return;
    }

    setCommandPending(true);
    setCommandError(null);

    try {
      const result =
        await realtimeRef.current
          ?.sendCommand({
            command: "BID",
            auctionCallId:
              operationalCall.call.id,
            auctionSessionTeamId:
              realtimeSessionTeam.id,
            bid,
            metadata: {
              commandId:
                crypto.randomUUID(),
              stateVersion:
                snapshot.stateVersion
            }
          });

      if (!result) {
        throw new Error(
          "Connessione realtime non disponibile."
        );
      }

      if (!result.success) {
        throw new Error(
          result.error.message
        );
      }

      /*
       * Non aggiorniamo lo snapshot localmente:
       * il nuovo stato deve arrivare dal server
       * tramite auction:snapshot.
       */
    } catch (error) {
      setCommandError(
        error instanceof Error
          ? error.message
          : "Rilancio non riuscito."
      );
    } finally {
      setCommandPending(false);
    }
  }

  async function executePass():
    Promise<void> {
    if (
      !snapshot ||
      !operationalCall ||
      !realtimeSessionTeam ||
      !canAct
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Confermi PASS per questa chiamata?"
      );

    if (!confirmed) {
      return;
    }

    setCommandPending(true);
    setCommandError(null);

    try {
      const result =
        await realtimeRef.current
          ?.sendCommand({
            command: "PASS",
            auctionCallId:
              operationalCall.call.id,
            auctionSessionTeamId:
              realtimeSessionTeam.id,
            metadata: {
              commandId:
                crypto.randomUUID(),
              stateVersion:
                snapshot.stateVersion
            }
          });

      if (!result) {
        throw new Error(
          "Connessione realtime non disponibile."
        );
      }

      if (!result.success) {
        throw new Error(
          result.error.message
        );
      }

      /*
       * Anche il PASS viene riflesso solo
       * dallo snapshot autorevole successivo.
       */
    } catch (error) {
      setCommandError(
        error instanceof Error
          ? error.message
          : "PASS non riuscito."
      );
    } finally {
      setCommandPending(false);
    }
  }

  function connect() {
    if (
      !session ||
      !selected ||
      pin.length !== 4
    ) {
      return;
    }

    realtimeRef.current?.disconnect();

    setSnapshot(null);
    setErrorMessage(null);
    setStatus("CONNECTING");

    realtimeRef.current =
      createRemoteRealtimeClient({
        deviceId: getDeviceId(),
        auctionSessionId:
          session.id,

        auctionSessionTeamId:
          selected.sessionTeam.id,

        pin,

        onRegistered: () => {
          writeStoredRemoteAccess({
            auctionSessionId:
              session.id,
            teamId:
              selected.sessionTeam.teamId,
            pin
          });

          setStatus("LIVE");
        },

        onSnapshot: (
          nextSnapshot
        ) => {
          setSnapshot(
            nextSnapshot
          );
        },

        onError: (error) => {
          setErrorMessage(
            error.message
          );

          if (
            error.code === "UNAUTHORIZED" ||
            error.code ===
              "VALIDATION_ERROR"
          ) {
            clearStoredRemoteAccess();
          }

          setStatus("LOGIN");

          realtimeRef.current?.disconnect();
          realtimeRef.current = null;
        }
      });
  }

  useEffect(() => {
    if (
      !restorePending ||
      status !== "LOGIN" ||
      !session ||
      !selected ||
      pin.length < 4
    ) {
      return;
    }

    setRestorePending(false);
    connect();
  }, [
    restorePending,
    status,
    session,
    selected,
    pin
  ]);

  if (status === "LOADING") {
    return (
      <main>
        <h1>FantaAstaAPP</h1>
        <h2>Telecomando squadra</h2>
        <p>Caricamento sessione...</p>
      </main>
    );
  }

  if (
    status === "ERROR" ||
    !session
  ) {
    return (
      <main>
        <h1>FantaAstaAPP</h1>
        <h2>Telecomando squadra</h2>
        <p>
          {errorMessage ??
            "Telecomando non disponibile."}
        </p>
      </main>
    );
  }

  if (
    status === "LOGIN" ||
    status === "CONNECTING"
  ) {
    return (
      <main>
        <h1>FantaAstaAPP</h1>
        <h2>Telecomando squadra</h2>

        <p>
          {session.season} · Edizione{" "}
          {session.editionNumber}
        </p>

        <label>
          Squadra
          <select
            value={selectedTeamId}
            disabled={
              status === "CONNECTING"
            }
            onChange={(event) => {
              setSelectedTeamId(
                event.target.value
              );
              setErrorMessage(null);
            }}
          >
            <option value="">
              Seleziona squadra
            </option>

            {selectableTeams.map(
              ({
                sessionTeam,
                team
              }) => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {sessionTeam.tableOrder}.{" "}
                  {team.name}
                </option>
              )
            )}
          </select>
        </label>

        <br />

        <label>
          PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            disabled={
              status === "CONNECTING"
            }
            onChange={(event) => {
              setPin(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 4)
              );
              setErrorMessage(null);
            }}
          />
        </label>

        <br />

        <button
          type="button"
          disabled={
            status === "CONNECTING" ||
            !selected ||
            pin.length !== 4
          }
          onClick={connect}
        >
          {status === "CONNECTING"
            ? "Connessione..."
            : "Accedi"}
        </button>

        {errorMessage && (
          <p>{errorMessage}</p>
        )}
      </main>
    );
  }

  return (
    <main>
      <h1>FantaAstaAPP</h1>
      <h2>
        {selected?.team.name ??
          "Telecomando squadra"}
      </h2>

      <p>
        Connesso come OPERATOR
      </p>

      <p>
        Sessione:{" "}
        <strong>
          {liveSessionStatus ?? "-"}
        </strong>
      </p>

      <p>
        Crediti:{" "}
        <strong>
          {publicTeam?.remainingCredits ??
            realtimeSessionTeam
              ?.remainingCredits ??
            "-"}
        </strong>
      </p>

      <p>
        Max offerta:{" "}
        <strong>
          {publicTeam?.maximumBid ?? "-"}
        </strong>
      </p>

      <p>
        Turno:{" "}
        <strong>
          {isMyTurn
            ? "TOCCA A TE"
            : "Attendi"}
        </strong>
      </p>

      <p>
        Offerta corrente:{" "}
        <strong>
          {operationalCall?.call
            .currentBid ??
            "-"}
        </strong>
      </p>

      <p>
        Stato chiamata:{" "}
        <strong>
          {operationalCall?.call.status ??
            "Nessuna chiamata"}
        </strong>
      </p>

      <p>
        Stato squadra nella chiamata:{" "}
        <strong>
          {callTeam?.status ?? "-"}
        </strong>
      </p>

      <p>
        Max rilancio chiamata:{" "}
        <strong>
          {callTeam?.maximumBid ?? "-"}
        </strong>
      </p>

      <fieldset
        disabled={!canAct}
      >
        <legend>
          Azioni
        </legend>

        <label>
          Nuova offerta
          <input
            type="number"
            inputMode="numeric"
            min={minimumBid ?? undefined}
            max={
              callTeam?.maximumBid ??
              undefined
            }
            step={1}
            value={bidValue}
            onChange={(event) => {
              setBidValue(
                event.target.value
              );
              setCommandError(null);
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => {
            void executeBid();
          }}
        >
          {commandPending
            ? "Invio..."
            : "Rilancia"}
        </button>

        <button
          type="button"
          onClick={() => {
            void executePass();
          }}
        >
          PASS
        </button>
      </fieldset>

      {liveSessionStatus ===
        "SUSPENDED" && (
        <p>
          Asta sospesa — telecomando in
          sola lettura.
        </p>
      )}

      {commandError && (
        <p role="alert">
          {commandError}
        </p>
      )}

      <p>
        stateVersion:{" "}
        {snapshot?.stateVersion ?? "-"}
      </p>
    </main>
  );
}
