import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import type {
  AuctionCommandAck,
  AuctionSession,
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

import {
  createRandomUuid
} from "../shared/random-uuid.js";

import {
  fetchActiveAuctionSession
} from "../shared/app-api.js";

import {
  createAdminRealtimeClient,
  type AdminRealtimeClient
} from "../admin/admin-realtime.js";

import "./remote-all.css";

type RemoteAllStatus =
  | "LOADING"
  | "CONNECTING"
  | "LIVE"
  | "ERROR";

function getTeamStateLabel(
  input: {
    isCurrentTurn: boolean;
    isLeader: boolean;
    status:
      | "ACTIVE"
      | "PASSED"
      | "EXCLUDED"
      | null;
  }
): string {
  if (input.isCurrentTurn) {
    return "TOCCA A TE";
  }

  if (input.status === "PASSED") {
    return "PASSATO";
  }

  if (input.status === "EXCLUDED") {
    return "ESCLUSO";
  }

  if (input.isLeader) {
    return "LEADER";
  }

  return "ATTIVA";
}

function getTeamStateClass(
  input: {
    isCurrentTurn: boolean;
    isLeader: boolean;
    status:
      | "ACTIVE"
      | "PASSED"
      | "EXCLUDED"
      | null;
  }
): string {
  if (input.isCurrentTurn) {
    return "remote-all-team--turn";
  }

  if (
    input.status === "PASSED" ||
    input.status === "EXCLUDED"
  ) {
    return "remote-all-team--inactive";
  }

  if (input.isLeader) {
    return "remote-all-team--leader";
  }

  return "";
}

export function RemoteAllApp() {
  const [
    status,
    setStatus
  ] = useState<RemoteAllStatus>(
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
  ] = useState<
    RealtimeAuctionSnapshot | null
  >(null);

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
    useRef<AdminRealtimeClient | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const activeSession =
          await fetchActiveAuctionSession();

        if (cancelled) {
          return;
        }

        if (!activeSession) {
          setStatus("ERROR");
          setCommandError(
            "Nessuna sessione attiva."
          );

          return;
        }

        setSession(activeSession);
        setStatus("CONNECTING");

        const client =
          createAdminRealtimeClient({
            deviceId:
              `remote-all-${createRandomUuid()}`,
            auctionSessionId:
              activeSession.id,

            onRegistered: () => {
              if (!cancelled) {
                setStatus("LIVE");
              }
            },

            onSnapshot: (
              nextSnapshot
            ) => {
              if (!cancelled) {
                setSnapshot(
                  nextSnapshot
                );
              }
            },

            onError: (error) => {
              if (!cancelled) {
                setCommandError(
                  error.message
                );
              }
            }
          });

        realtimeRef.current =
          client;
      } catch (error) {
        if (!cancelled) {
          setStatus("ERROR");
          setCommandError(
            error instanceof Error
              ? error.message
              : "Connessione non riuscita."
          );
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;

      realtimeRef.current
        ?.disconnect();

      realtimeRef.current = null;
    };
  }, []);

  const operationalCall =
    snapshot?.operationalAuctionCall ??
    null;

  const liveSessionStatus =
    snapshot?.session.status ??
    session?.status ??
    null;

  const publicTeams =
    useMemo(
      () =>
        [...(
          snapshot?.publicDisplay.teams ??
          []
        )].sort(
          (a, b) =>
            a.tableOrder -
            b.tableOrder
        ),
      [snapshot]
    );

  const currentTurnTeamId =
    operationalCall?.call
      .currentTurnAuctionSessionTeamId ??
    null;

  const currentLeaderTeamId =
    operationalCall?.call
      .currentLeaderAuctionSessionTeamId ??
    null;

  const currentPlayer =
    snapshot?.publicDisplay
      .currentPlayer ?? null;

  const currentBid =
    operationalCall?.call.currentBid ??
    null;

  const currentTurnCallTeam =
    operationalCall?.teams.find(
      (team) =>
        team.auctionSessionTeamId ===
        currentTurnTeamId
    ) ?? null;

  const minimumBid =
    typeof currentBid === "number"
      ? currentBid + 1
      : null;

  useEffect(() => {
    if (
      !currentTurnTeamId ||
      minimumBid === null
    ) {
      setBidValue("");
      return;
    }

    setBidValue(
      String(minimumBid)
    );

    setCommandError(null);
  }, [
    currentTurnTeamId,
    minimumBid
  ]);

  const leaderName =
    publicTeams.find(
      (team) =>
        team.auctionSessionTeamId ===
        currentLeaderTeamId
    )?.teamName ?? "-";

  function sendCommand(
    payload: {
      command: "BID" | "PASS";
      auctionCallId: string;
      auctionSessionTeamId: string;
      bid?: number;
    }
  ): Promise<AuctionCommandAck> {
    return new Promise(
      (resolve) => {
        const socket =
          realtimeRef.current
            ?.socket;

        if (!socket) {
          resolve({
            success: false,
            data: null,
            error: {
              code:
                "REALTIME_UNAVAILABLE",
              message:
                "Connessione realtime non disponibile."
            }
          });

          return;
        }

        const commandPayload =
          payload.command === "BID"
            ? {
                auctionCallId:
                  payload.auctionCallId,
                command: "BID" as const,
                auctionSessionTeamId:
                  payload.auctionSessionTeamId,
                bid:
                  payload.bid ?? 0,
                metadata: {
                  commandId:
                    createRandomUuid(),
                  stateVersion:
                    snapshot?.stateVersion ??
                    0
                }
              }
            : {
                auctionCallId:
                  payload.auctionCallId,
                command: "PASS" as const,
                auctionSessionTeamId:
                  payload.auctionSessionTeamId,
                metadata: {
                  commandId:
                    createRandomUuid(),
                  stateVersion:
                    snapshot?.stateVersion ??
                    0
                }
              };

        socket.emit(
          "auction:command",
          commandPayload,
          (
            response:
              AuctionCommandAck
          ) => {
            resolve(response);
          }
        );
      }
    );
  }

  async function executeBid() {
    if (
      !snapshot ||
      !operationalCall ||
      !currentTurnTeamId ||
      !currentTurnCallTeam ||
      minimumBid === null ||
      commandPending
    ) {
      return;
    }

    const bid =
      Number(bidValue);

    if (
      !Number.isInteger(bid) ||
      bid < minimumBid ||
      bid >
        currentTurnCallTeam.maximumBid
    ) {
      setCommandError(
        `Offerta valida da ${minimumBid} a ${currentTurnCallTeam.maximumBid}.`
      );

      return;
    }

    setCommandPending(true);
    setCommandError(null);

    try {
      const result =
        await sendCommand({
          command: "BID",
          auctionCallId:
            operationalCall.call.id,
          auctionSessionTeamId:
            currentTurnTeamId,
          bid
        });

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

  async function executePass() {
    if (
      !snapshot ||
      !operationalCall ||
      !currentTurnTeamId ||
      commandPending
    ) {
      return;
    }

    const currentTeamName =
      publicTeams.find(
        (team) =>
          team.auctionSessionTeamId ===
          currentTurnTeamId
      )?.teamName ?? "la squadra";

    const confirmed =
      window.confirm(
        `Confermi PASS per ${currentTeamName}?`
      );

    if (!confirmed) {
      return;
    }

    setCommandPending(true);
    setCommandError(null);

    try {
      const result =
        await sendCommand({
          command: "PASS",
          auctionCallId:
            operationalCall.call.id,
          auctionSessionTeamId:
            currentTurnTeamId
        });

      if (!result.success) {
        throw new Error(
          result.error.message
        );
      }
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

  return (
    <main className="remote-all-page">
      <header className="remote-all-header">
        <div>
          <span>
            CONTROLLO DI EMERGENZA
          </span>

          <h1>
            Telecomando universale
          </h1>

          <p>
            Uso sostitutivo dei telecomandi
            Presidenti.
          </p>
        </div>

        <div className="remote-all-header__actions">
          <span
            className={
              status === "LIVE"
                ? "remote-all-online"
                : "remote-all-offline"
            }
          >
            {status === "LIVE"
              ? "ONLINE"
              : status}
          </span>

          <span
            className={[
              "remote-all-session-status",
              liveSessionStatus
                ? `remote-all-session-status--${liveSessionStatus.toLowerCase()}`
                : ""
            ]
              .filter(Boolean)
              .join(" ")}
          >
            ASTA {liveSessionStatus ?? "-"}
          </span>

          <a href="/admin">
            Torna al cockpit
          </a>
        </div>
      </header>

      <section className="remote-all-call">
        <div>
          <span>
            GIOCATORE IN CHIAMATA
          </span>

          <strong>
            {currentPlayer?.name ??
              "Nessuna chiamata attiva"}
          </strong>

          {currentPlayer && (
            <small>
              {currentPlayer.role}
              {currentPlayer.realTeamName
                ? ` ? ${currentPlayer.realTeamName}`
                : ""}
            </small>
          )}
        </div>

        <div className="remote-all-call__stat">
          <span>OFFERTA</span>
          <strong>
            {currentBid ?? "-"}
          </strong>
        </div>

        <div className="remote-all-call__stat">
          <span>LEADER</span>
          <strong>
            {leaderName}
          </strong>
        </div>
      </section>

      <section className="remote-all-teams">
        {publicTeams.map(
          (team) => {
            const callTeam =
              operationalCall
                ?.teams.find(
                  (candidate) =>
                    candidate
                      .auctionSessionTeamId ===
                    team
                      .auctionSessionTeamId
                ) ?? null;

            const isCurrentTurn =
              team
                .auctionSessionTeamId ===
              currentTurnTeamId;

            const isLeader =
              team
                .auctionSessionTeamId ===
              currentLeaderTeamId;

            const stateInput = {
              isCurrentTurn,
              isLeader,
              status:
                callTeam?.status ??
                null
            };

            return (
              <article
                key={
                  team.auctionSessionTeamId
                }
                className={[
                  "remote-all-team",
                  getTeamStateClass(
                    stateInput
                  )
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="remote-all-team__order">
                  {team.tableOrder}
                </div>

                <div className="remote-all-team__name">
                  <strong>
                    {team.teamName}
                  </strong>

                  <span>
                    Crediti {team.remainingCredits}
                    {" ? "}
                    Max {team.maximumBid}
                  </span>
                </div>

                <div className="remote-all-team__state">
                  {getTeamStateLabel(
                    stateInput
                  )}
                </div>

                {isCurrentTurn &&
                  operationalCall?.call
                    .status === "OPEN" && (
                    <div className="remote-all-team__controls">
                      <input
                        type="number"
                        min={
                          minimumBid ??
                          undefined
                        }
                        max={
                          callTeam
                            ?.maximumBid ??
                          undefined
                        }
                        value={bidValue}
                        onChange={(
                          event
                        ) => {
                          setBidValue(
                            event.target.value
                          );
                        }}
                        disabled={
                          commandPending
                        }
                        aria-label="Importo rilancio"
                      />

                      <button
                        type="button"
                        className="remote-all-bid"
                        onClick={() => {
                          void executeBid();
                        }}
                        disabled={
                          commandPending
                        }
                      >
                        RILANCIA
                      </button>

                      <button
                        type="button"
                        className="remote-all-pass"
                        onClick={() => {
                          void executePass();
                        }}
                        disabled={
                          commandPending
                        }
                      >
                        PASS
                      </button>
                    </div>
                  )}
              </article>
            );
          }
        )}
      </section>

      {commandError && (
        <div className="remote-all-error">
          {commandError}
        </div>
      )}

      <footer className="remote-all-footer">
        {session
          ? `${session.season} ? Sessione ${session.editionNumber}`
          : "FantaAstaAPP"}
      </footer>
    </main>
  );
}
