import {
  createRandomUuid
} from "../shared/random-uuid.js";

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import type {
  AuctionSession,
  AuctionSessionTeam,
  Owner,
  RealtimeAuctionSnapshot,
  Team,
  TeamOwner
} from "@fantaastaapp/contracts";

import {
  fetchRemoteActiveSession,
  fetchRemoteOwners,
  fetchRemoteSessionTeams,
  fetchRemoteTeamOwners,
  fetchRemoteTeams
} from "./remote-api.js";

import {
  createRemoteRealtimeClient,
  type RemoteRealtimeClient
} from "./remote-realtime.js";

import "./remote.css";

type RemoteStatus =
  | "LOADING"
  | "LOGIN"
  | "CONNECTING"
  | "RECONNECTING"
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

type RemoteQrAccess = {
  teamId: string;
  pin: string;
  role: "OPERATOR";
};

function clearRemoteQrAccessFromUrl(): void {
  const url =
    new URL(window.location.href);

  url.searchParams.delete("team");
  url.searchParams.delete("role");
  url.searchParams.delete("pin");

  window.history.replaceState(
    null,
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
}

function readRemoteQrAccess(): RemoteQrAccess | null {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const teamId =
    params.get("team")?.trim() ?? "";

  const pin =
    params.get("pin")?.trim() ?? "";

  const role =
    params.get("role")?.trim().toUpperCase() ??
    "";

  if (
    !teamId ||
    !/^\d{4}$/.test(pin) ||
    role !== "OPERATOR"
  ) {
    return null;
  }

  return {
    teamId,
    pin,
    role: "OPERATOR"
  };
}

function getPlayerRoleLabel(
  role: "P" | "D" | "C" | "A"
): string {
  switch (role) {
    case "P":
      return "PORTIERE";
    case "D":
      return "DIFENSORE";
    case "C":
      return "CENTRO";
    case "A":
      return "ATTACCANTE";
  }
}

function getDeviceId(): string {
  const existing =
    window.sessionStorage.getItem(
      remoteDeviceStorageKey
    );

  if (existing) {
    return existing;
  }

  const generated =
    `remote-${createRandomUuid()}`;

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
    owners,
    setOwners
  ] = useState<Owner[]>([]);

  const [
    teamOwners,
    setTeamOwners
  ] = useState<TeamOwner[]>([]);

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
          loadedTeams,
          loadedOwners
        ] = await Promise.all([
          fetchRemoteSessionTeams(
            activeSession.id
          ),
          fetchRemoteTeams(
            activeSession.leagueId
          ),
          fetchRemoteOwners()
        ]);

        if (cancelled) {
          return;
        }

        setSession(activeSession);
        setSessionTeams(
          loadedSessionTeams
        );
        setTeams(loadedTeams);
        setOwners(loadedOwners);

        const qrAccess =
          readRemoteQrAccess();

        const qrTeamIsValid =
          qrAccess !== null &&
          loadedSessionTeams.some(
            (sessionTeam) =>
              sessionTeam.teamId ===
              qrAccess.teamId
          );

        if (qrAccess && qrTeamIsValid) {
          setSelectedTeamId(
            qrAccess.teamId
          );
          setPin(qrAccess.pin);
        } else {
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

  useEffect(() => {
    let cancelled = false;

    async function loadTeamOwners() {
      if (!selectedTeamId) {
        setTeamOwners([]);
        return;
      }

      try {
        const loadedTeamOwners =
          await fetchRemoteTeamOwners(
            selectedTeamId
          );

        if (!cancelled) {
          setTeamOwners(
            loadedTeamOwners
          );
        }
      } catch {
        if (!cancelled) {
          setTeamOwners([]);
        }
      }
    }

    void loadTeamOwners();

    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  const primaryTeamOwner =
    teamOwners.find(
      (teamOwner) =>
        teamOwner.isPrimary
    ) ?? null;

  const primaryOwner =
    primaryTeamOwner
      ? owners.find(
          (owner) =>
            owner.id ===
            primaryTeamOwner.ownerId
        ) ?? null
      : null;

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

  const currentPlayer =
    snapshot?.publicDisplay.currentPlayer ??
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
    status === "LIVE" &&
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
    if (!isMyTurn) {
      return;
    }

    setBidValue("");
    setCommandError(null);
  }, [
    isMyTurn,
    minimumBid
  ]);

  function getQuickBidValue(
    increment: number
  ): number | null {
    const currentBid =
      operationalCall?.call.currentBid;

    if (
      typeof currentBid !== "number" ||
      !Number.isInteger(currentBid)
    ) {
      return null;
    }

    return currentBid + increment;
  }

  function canUseQuickBid(
    increment: number
  ): boolean {
    const quickBid =
      getQuickBidValue(increment);

    if (
      !canAct ||
      quickBid === null ||
      effectiveMaximumBid === null
    ) {
      return false;
    }

    return (
      quickBid <=
      effectiveMaximumBid
    );
  }

  async function executeQuickBid(
    increment: number
  ): Promise<void> {
    const quickBid =
      getQuickBidValue(increment);

    if (
      quickBid === null ||
      !canUseQuickBid(increment)
    ) {
      return;
    }

    setCommandPending(true);
    setCommandError(null);

    try {
      const operationalCall =
        snapshot?.operationalAuctionCall;

      if (
        !snapshot ||
        !operationalCall ||
        !realtimeSessionTeam
      ) {
        return;
      }

      const result =
        await realtimeRef.current
          ?.sendCommand({
            command: "BID",
            auctionCallId:
              operationalCall.call.id,
            auctionSessionTeamId:
              realtimeSessionTeam.id,
            bid: quickBid,
            metadata: {
              commandId:
                createRandomUuid(),
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
                createRandomUuid(),
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
                createRandomUuid(),
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

          clearRemoteQrAccessFromUrl();

          setStatus("LIVE");
        },

        onSnapshot: (
          nextSnapshot
        ) => {
          setSnapshot(
            nextSnapshot
          );
        },

        onDisconnected: () => {
          setStatus(
            (current) =>
              current === "LIVE" ||
              current === "RECONNECTING"
                ? "RECONNECTING"
                : current
          );
        },

        onConnectError: () => {
          setStatus(
            (current) =>
              current === "LIVE" ||
              current === "RECONNECTING"
                ? "RECONNECTING"
                : current
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

  function disconnectAndReturnToLogin(): void {
    realtimeRef.current?.disconnect();
    realtimeRef.current = null;

    clearStoredRemoteAccess();

    setSnapshot(null);
    setSelectedTeamId("");
    setPin("");
    setBidValue("");
    setCommandError(null);
    setErrorMessage(null);
    setRestorePending(false);
    setStatus("LOGIN");
  }

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

        {selected &&
        readRemoteQrAccess()?.teamId ===
          selected.sessionTeam.teamId ? (
          <>
            <p>
              Accesso telecomando pronto
            </p>

            <h3>
              Connetti come {selected.team.name}
            </h3>

            <button
              type="button"
              disabled={
                status === "CONNECTING"
              }
              onClick={connect}
            >
              {status === "CONNECTING"
                ? "Connessione..."
                : `Connetti come ${selected.team.name}`}
            </button>
          </>
        ) : (
          <>
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
          </>
        )}

        {errorMessage && (
          <p>{errorMessage}</p>
        )}
      </main>
    );
  }

  const teamPrimaryColor =
    selected?.team.primaryColor ??
    "#123B67";

  const teamSecondaryColor =
    selected?.team.secondaryColor ??
    "#FFFFFF";

  const currentBid =
    operationalCall?.call.currentBid;

  const effectiveMaximumBid =
    callTeam?.maximumBid ??
    publicTeam?.maximumBid ??
    null;

  return (
    <main
      className="remote-app"
      style={
        {
          "--remote-team-primary":
            teamPrimaryColor,
          "--remote-team-secondary":
            teamSecondaryColor
        } as React.CSSProperties
      }
    >
      <header className="remote-header">
        <div className="remote-header__brand">
          <span className="remote-header__app">
            FantaAstaAPP
          </span>
          <span className="remote-header__role">
            Telecomando asta
          </span>
        </div>

        <div className="remote-header__status">
          <span
            className={
              status === "RECONNECTING"
                ? "remote-connection remote-connection--reconnecting"
                : "remote-connection remote-connection--live"
            }
          >
            {status === "RECONNECTING"
              ? "Riconnessione..."
              : "ONLINE"}
          </span>
        </div>
      </header>

      <section className="remote-team-banner">
        <div className="remote-team-banner__identity">
          {selected?.team.logoPath ? (
            <img
              className="remote-team-logo"
              src={selected.team.logoPath}
              alt={`Logo ${selected.team.name}`}
            />
          ) : (
            <div className="remote-team-logo remote-team-logo--fallback">
              {selected?.team.shortName?.slice(
                0,
                3
              ) ??
                selected?.team.name
                  .slice(0, 3)
                  .toUpperCase()}
            </div>
          )}

          <div>
            <h1>
              {selected?.team.name ??
                "Telecomando squadra"}
            </h1>

            <p>
              {liveSessionStatus ===
              "SUSPENDED"
                ? "Asta sospesa"
                : "Connesso come OPERATOR"}
            </p>
          </div>
        </div>

        <button
          className="remote-logout"
          type="button"
          onClick={
            disconnectAndReturnToLogin
          }
        >
          Esci
        </button>
      </section>

      <section
        className={
          isMyTurn
            ? "remote-turn remote-turn--active"
            : "remote-turn remote-turn--waiting"
        }
      >
        <span className="remote-turn__owner">
          {primaryOwner?.name ??
            selected?.team.name ??
            "Squadra"}
        </span>

        <strong className="remote-turn__message">
          {isMyTurn
            ? "TOCCA A TE"
            : "Attendi"}
        </strong>
      </section>

      <section className="remote-player-card">
        <div className="remote-section-label">
          GIOCATORE IN CHIAMATA
        </div>

        {currentPlayer ? (
          <div className="remote-player">
            <div className="remote-player__identity">
              <img
                className="remote-player__photo"
                src={`/api/player-photos/${currentPlayer.fmsCode}`}
                alt=""
                aria-hidden="true"
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />

              <div className="remote-player__main">
                <strong className="remote-player__name">
                  {currentPlayer.name}
                </strong>

                <div className="remote-player__meta">
                <span
                  className={`remote-player-role remote-player-role--${currentPlayer.role.toLowerCase()}`}
                >
                  {getPlayerRoleLabel(
                    currentPlayer.role
                  )}
                </span>

                  {currentPlayer.realTeamName && (
                    <span>
                      {currentPlayer.realTeamName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="remote-player__bid">
              <span>
                Offerta
              </span>
              <strong>
                {currentBid ?? "-"}
              </strong>
            </div>
          </div>
        ) : (
          <p className="remote-empty">
            Nessun giocatore in chiamata
          </p>
        )}
      </section>

      <section className="remote-stats">
        <div className="remote-stat">
          <span>Crediti</span>
          <strong>
            {publicTeam?.remainingCredits ??
              realtimeSessionTeam
                ?.remainingCredits ??
              "-"}
          </strong>
        </div>

        <div className="remote-stat">
          <span>Max offerta</span>
          <strong>
            {publicTeam?.maximumBid ?? "-"}
          </strong>
        </div>

        <div className="remote-stat">
          <span>Max rilancio</span>
          <strong>
            {effectiveMaximumBid ?? "-"}
          </strong>
        </div>
      </section>

      <fieldset
        className="remote-actions"
        disabled={!canAct}
      >
        <legend>
          La tua offerta
        </legend>

        <p className="remote-bid-help">
          Rilancio rapido — invio immediato
        </p>

        <div className="remote-quick-bids">
          {[1, 2, 5].map(
            (increment) => {
              const quickBid =
                getQuickBidValue(
                  increment
                );

              return (
                <button
                  key={increment}
                  type="button"
                  disabled={
                    !canUseQuickBid(
                      increment
                    ) ||
                    commandPending
                  }
                  onClick={() => {
                    void executeQuickBid(
                      increment
                    );
                  }}
                >
                  <strong>
                    +{increment}
                  </strong>

                  <span>
                    {quickBid ?? "-"}
                  </span>
                </button>
              );
            }
          )}
        </div>

        <p className="remote-bid-help remote-bid-help--free">
          Oppure inserisci un importo e premi RILANCIA
        </p>

        <div className="remote-free-bid">
          <label>
            <input
              type="number"
              inputMode="numeric"
              min={
                minimumBid ?? undefined
              }
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
            className="remote-bid-submit"
            type="button"
            onClick={() => {
              void executeBid();
            }}
          >
            {commandPending
              ? "Invio..."
              : "RILANCIA"}
          </button>

          <button
            className="remote-pass"
            type="button"
            onClick={() => {
              void executePass();
            }}
          >
            PASS
          </button>
        </div>
      </fieldset>

      {liveSessionStatus ===
        "SUSPENDED" && (
        <div className="remote-notice">
          Asta temporaneamente sospesa —
          telecomando in sola lettura.
        </div>
      )}

      {commandError && (
        <div
          className="remote-error"
          role="alert"
        >
          {commandError}
        </div>
      )}

      <footer className="remote-footer">
        <span>
          Sessione{" "}
          <strong>
            {liveSessionStatus ?? "-"}
          </strong>
        </span>

        <span>
          Aggiornamento{" "}
          {snapshot?.stateVersion ?? "-"}
        </span>
      </footer>
    </main>
  );
}
