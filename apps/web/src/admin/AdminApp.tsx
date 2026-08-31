import {
  useEffect,
  useState
} from "react";

import * as XLSX from "xlsx";

import type {
  AdminActivityItem,
  AuctionSession,
  AuctionSessionSuspensionReason,
  League,
  Player,
  PublicDisplayControlState,
  PublicDisplayMode,
  RealtimeAuctionSnapshot,
  RealtimeError
} from "@fantaastaapp/contracts";

import {
  fetchActiveAuctionSession,
  fetchAdminActivity,
  fetchLeagues
} from "../shared/app-api.js";

import {
  fetchAuctionSessions,
  fetchPlayers
} from "../shared/admin-config-api.js";

import {
  fetchPublicDisplayControl,
  updatePublicDisplayControl
} from "../shared/public-display-control-api.js";

import {
  resumeAuctionSession,
  startAuctionSession,
  suspendAuctionSession
} from "../shared/auction-session-command-api.js";

import {
  cancelAuctionCall,
  openAuctionCall,
  confirmAuctionCall,
  createAuctionCallDraft
} from "../shared/auction-call-command-api.js";

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

function getPlayerRoleLabel(
  role: "P" | "D" | "C" | "A"
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
  }
}

function parseServerTime(
  value: string
): number {
  const normalized =
    value.includes("T")
      ? value
      : `${value.replace(" ", "T")}Z`;

  return new Date(normalized).getTime();
}

function formatCurrentTime(
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

function formatTurnElapsed(
  startedAt: string | null,
  now: number
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
        (now - started) / 1000
      )
    );

  const minutes =
    Math.floor(elapsedSeconds / 60);

  const seconds =
    elapsedSeconds % 60;

  return [
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}

function escapePrintHtml(
  value: string | number | null
): string {
  const text =
    value === null
      ? ""
      : String(value);

  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatActivityTime(
  createdAt: string
): string {
  /*
   * I timestamp SQLite prodotti da
   * CURRENT_TIMESTAMP sono UTC ma vengono
   * serializzati senza timezone:
   *
   *   2026-08-20 20:15:00
   *
   * Li interpretiamo esplicitamente come UTC
   * e li visualizziamo nell'ora di Roma.
   */
  const normalized =
    createdAt.includes("T")
      ? createdAt
      : `${createdAt.replace(" ", "T")}Z`;

  const date =
    new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return createdAt.slice(11, 16);
  }

  return new Intl.DateTimeFormat(
    "it-IT",
    {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}

function getActivityLabel(
  item: AdminActivityItem
): string {
  switch (item.eventType) {
    case "AUCTION_AWARD_CONFIRMED":
      return "Aggiudicazione";

    case "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY":
      return "Inserimento rosa";

    case "MANUAL_ROSTER_ASSIGNMENT_ADDED":
      return "Assegnazione manuale";

    case "TECHNICAL_ROSTER_CORRECTION":
      return "Correzione";

    case "SESSION_STARTED":
      return "Avvio asta";

    case "SESSION_SUSPENDED":
      return "Sospensione";

    case "SESSION_RESUMED":
      return "Ripresa";

    case "SESSION_REOPENED":
      return "Riapertura";
  }
}

function getActivityDescription(
  item: AdminActivityItem
): string {
  switch (item.eventType) {
    case "AUCTION_AWARD_CONFIRMED":
      return [
        item.playerName,
        item.teamName
          ? `→ ${item.teamName}`
          : null,
        item.amount !== null
          ? `${item.amount} cr`
          : null
      ]
        .filter(Boolean)
        .join(" · ");

    case "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY":
    case "MANUAL_ROSTER_ASSIGNMENT_ADDED":
      return [
        item.playerName,
        item.teamName
          ? `→ ${item.teamName}`
          : null,
        item.amount !== null
          ? `${item.amount} cr`
          : null,
        item.actorName
      ]
        .filter(Boolean)
        .join(" · ");

    case "TECHNICAL_ROSTER_CORRECTION": {
      const before = [
        item.beforePlayerName,
        item.beforeTeamName,
        item.beforeAmount !== null
          ? `${item.beforeAmount} cr`
          : null
      ]
        .filter(Boolean)
        .join(" · ");

      const after = [
        item.afterPlayerName,
        item.afterTeamName,
        item.afterAmount !== null
          ? `${item.afterAmount} cr`
          : null
      ]
        .filter(Boolean)
        .join(" · ");

      return `${before} → ${after}`;
    }

    case "SESSION_STARTED":
      return "Sessione avviata";

    case "SESSION_SUSPENDED":
      return item.suspensionReason ??
        "Sessione sospesa";

    case "SESSION_RESUMED":
      return "Sessione ripresa";

    case "SESSION_REOPENED":
      return "Sessione riaperta";
  }
}

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

  const [
    activity,
    setActivity
  ] = useState<AdminActivityItem[]>([]);

  const [
    activityError,
    setActivityError
  ] = useState<string | null>(null);

  const [
    now,
    setNow
  ] = useState(() => Date.now());

  const [
    publicDisplayControl,
    setPublicDisplayControl
  ] = useState<PublicDisplayControlState>({
    displayMode: "STANDARD",
    activeView: "AUCTION"
  });

  const [
    publicDisplayControlPending,
    setPublicDisplayControlPending
  ] = useState(false);

  const [
    publicDisplayControlError,
    setPublicDisplayControlError
  ] = useState<string | null>(null);

  const [
    suspensionReason,
    setSuspensionReason
  ] = useState<
    Exclude<
      AuctionSessionSuspensionReason,
      "RECOVERY_RESTART"
    >
  >("PIZZA_BREAK");

  const [
    sessionCommandPending,
    setSessionCommandPending
  ] = useState(false);

  const [
    sessionCommandError,
    setSessionCommandError
  ] = useState<string | null>(null);

  const [
    confirmAwardPending,
    setConfirmAwardPending
  ] = useState(false);

  const [
    confirmAwardError,
    setConfirmAwardError
  ] = useState<string | null>(null);

  const [
    openCallPending,
    setOpenCallPending
  ] = useState(false);

  const [
    openCallError,
    setOpenCallError
  ] = useState<string | null>(null);

  const [
    openingBid,
    setOpeningBid
  ] = useState(1);

  const [
    cancelCallPending,
    setCancelCallPending
  ] = useState(false);

  const [
    cancelCallError,
    setCancelCallError
  ] = useState<string | null>(null);

  const [
    players,
    setPlayers
  ] = useState<Player[]>([]);

  const [
    selectedPlayerFmsCode,
    setSelectedPlayerFmsCode
  ] = useState("");

  const [
    includeNonAvailablePlayers,
    setIncludeNonAvailablePlayers
  ] = useState(false);

  const [
    createCallPending,
    setCreateCallPending
  ] = useState(false);

  const [
    createCallError,
    setCreateCallError
  ] = useState<string | null>(null);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setNow(Date.now());
        },
        1000
      );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let disconnect:
      (() => void) | null = null;

    const load = async () => {
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

        if (cancelled) {
          return;
        }

        const setupSession =
          activeSession
            ? null
            : (
                availableSessions.find(
                  (candidate) =>
                    candidate.status ===
                      "SETUP"
                ) ?? null
              );

        const selectedSession =
          activeSession ??
          setupSession;

        setSession(selectedSession);
        setLeagues(availableLeagues);

        if (activeSession) {
          try {
            const sessionPlayers =
              await fetchPlayers(
                activeSession.id
              );

            if (!cancelled) {
              setPlayers(
                sessionPlayers
              );
            }
          } catch {
            /*
             * Il caricamento dell'archivio
             * giocatori non deve impedire
             * l'apertura della Console Admin.
             */
          }

          try {
            const displayControl =
              await fetchPublicDisplayControl(
                activeSession.id
              );

            if (!cancelled) {
              setPublicDisplayControl(
                displayControl
              );
            }
          } catch {
            /*
             * Un problema al telecomando dello
             * Schermo Pubblico non deve impedire
             * il caricamento della Console Admin.
             */
          }
        }

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

  useEffect(() => {
    if (!session) {
      setActivity([]);
      setActivityError(null);
      return;
    }

    let cancelled = false;

    const loadActivity =
      async () => {
        try {
          const items =
            await fetchAdminActivity(
              session.id,
              8
            );

          if (cancelled) {
            return;
          }

          setActivity(items);
          setActivityError(null);
        } catch (error) {
          if (cancelled) {
            return;
          }

          setActivityError(
            error instanceof Error
              ? error.message
              : "Errore nel caricamento attività."
          );
        }
      };

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, [
    session?.id,
    snapshot?.stateVersion
  ]);

  const exportRosterOverviewExcel =
    (): void => {
      if (!snapshot || !session) {
        return;
      }

      const roleOrder = [
        "P",
        "D",
        "C",
        "A"
      ] as const;

      const teamBlockWidth = 4;
      const teamsPerRow = 4;

      /*
       * Ogni blocco squadra occupa:
       *
       * riga 1  nome squadra
       * riga 2  crediti / max offerta
       * riga 3  intestazioni
       * righe 4-27  i 24 slot della rosa
       *
       * Poi una riga vuota prima della
       * seconda fascia di quattro squadre.
       */
      const blockHeight = 28;

      const sheetData:
        Array<Array<string | number>> =
          [];

      const ensureCell = (
        rowIndex: number,
        columnIndex: number,
        value: string | number
      ): void => {
        while (
          sheetData.length <= rowIndex
        ) {
          sheetData.push([]);
        }

        const row =
          sheetData[rowIndex];

        if (!row) {
          throw new Error(
            "Unable to create Excel worksheet row"
          );
        }

        while (
          row.length <= columnIndex
        ) {
          row.push("");
        }

        row[columnIndex] = value;
      };

      const merges:
        XLSX.Range[] = [];

      snapshot.publicDisplay.teams
        .forEach(
          (team, teamIndex) => {
            const blockRow =
              Math.floor(
                teamIndex /
                  teamsPerRow
              );

            const blockColumn =
              teamIndex %
              teamsPerRow;

            const startRow =
              blockRow *
              blockHeight;

            const startColumn =
              blockColumn *
              teamBlockWidth;

            ensureCell(
              startRow,
              startColumn,
              team.teamName
            );

            merges.push({
              s: {
                r: startRow,
                c: startColumn
              },
              e: {
                r: startRow,
                c:
                  startColumn +
                  teamBlockWidth -
                  1
              }
            });

            ensureCell(
              startRow + 1,
              startColumn,
              "Crediti"
            );

            ensureCell(
              startRow + 1,
              startColumn + 1,
              team.remainingCredits
            );

            ensureCell(
              startRow + 1,
              startColumn + 2,
              "Max offerta"
            );

            ensureCell(
              startRow + 1,
              startColumn + 3,
              team.maximumBid ?? ""
            );

            [
              "Ruolo",
              "Giocatore",
              "Squadra reale",
              "Costo"
            ].forEach(
              (
                header,
                columnOffset
              ) => {
                ensureCell(
                  startRow + 2,
                  startColumn +
                    columnOffset,
                  header
                );
              }
            );

            let slotRow =
              startRow + 3;

            for (
              const role of roleOrder
            ) {
              const entries =
                team.roster.entries
                  .filter(
                    (entry) =>
                      entry.role === role
                  )
                  .sort(
                    (first, second) =>
                      first.playerName.localeCompare(
                        second.playerName,
                        "it"
                      )
                  );

              const limit =
                team.roster[role]
                  .limit;

              for (
                let slotIndex = 0;
                slotIndex < limit;
                slotIndex += 1
              ) {
                const entry =
                  entries[
                    slotIndex
                  ];

                ensureCell(
                  slotRow,
                  startColumn,
                  role
                );

                ensureCell(
                  slotRow,
                  startColumn + 1,
                  entry
                    ? entry.playerName
                    : ""
                );

                ensureCell(
                  slotRow,
                  startColumn + 2,
                  entry?.realTeamName ??
                    ""
                );

                ensureCell(
                  slotRow,
                  startColumn + 3,
                  entry
                    ? entry.acquisitionCost
                    : ""
                );

                slotRow += 1;
              }
            }
          }
        );

      const worksheet =
        XLSX.utils.aoa_to_sheet(
          sheetData
        );

      worksheet["!merges"] =
        merges;

      /*
       * Larghezze ripetute per ciascun
       * blocco squadra.
       */
      worksheet["!cols"] =
        Array.from(
          {
            length:
              teamBlockWidth *
              teamsPerRow
          },
          (_, index) => {
            const position =
              index %
              teamBlockWidth;

            switch (position) {
              case 0:
                return {
                  wch: 8
                };

              case 1:
                return {
                  wch: 22
                };

              case 2:
                return {
                  wch: 16
                };

              default:
                return {
                  wch: 8
                };
            }
          }
        );

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Foglione"
      );

      XLSX.writeFile(
        workbook,
        `foglione-${session.season.replaceAll(
          "/",
          "-"
        )}.xlsx`
      );
    };

  const printRosterOverview =
    (): void => {
      if (!snapshot || !session) {
        return;
      }

      const printWindow =
        window.open(
          "",
          "_blank"
        );

      if (!printWindow) {
        window.alert(
          "Il browser ha bloccato la finestra di stampa."
        );
        return;
      }

      const roleOrder = [
        "P",
        "D",
        "C",
        "A"
      ] as const;

      const teamsHtml =
        snapshot.publicDisplay.teams
          .map((team) => {
            const rolesHtml =
              roleOrder
                .map((role) => {
                  const entries =
                    team.roster.entries
                      .filter(
                        (entry) =>
                          entry.role === role
                      )
                      .sort(
                        (first, second) =>
                          first.playerName.localeCompare(
                            second.playerName,
                            "it"
                          )
                      );

                  const rowsHtml =
                    entries
                      .map(
                        (entry) => `
                          <tr>
                            <td class="role">
                              ${escapePrintHtml(
                                role
                              )}
                            </td>
                            <td class="player">
                              ${escapePrintHtml(
                                entry.playerName
                              )}
                              ${
                                entry.realTeamName
                                  ? `<small>${escapePrintHtml(
                                      entry.realTeamName
                                    )}</small>`
                                  : ""
                              }
                            </td>
                            <td class="cost">
                              ${escapePrintHtml(
                                entry.acquisitionCost
                              )}
                            </td>
                          </tr>
                        `
                      )
                      .join("");

                  const freeSlots =
                    Math.max(
                      0,
                      team.roster[role].limit -
                        entries.length
                    );

                  const freeRowsHtml =
                    Array.from(
                      {
                        length: freeSlots
                      },
                      () => `
                        <tr class="free">
                          <td class="role">
                            ${escapePrintHtml(
                              role
                            )}
                          </td>
                          <td class="player">
                            libero
                          </td>
                          <td class="cost"></td>
                        </tr>
                      `
                    ).join("");

                  return (
                    rowsHtml +
                    freeRowsHtml
                  );
                })
                .join("");

            return `
              <section class="team">
                <header>
                  <strong>
                    ${escapePrintHtml(
                      team.teamName
                    )}
                  </strong>
                  <span>
                    Cr ${escapePrintHtml(
                      team.remainingCredits
                    )}
                  </span>
                </header>

                <table>
                  <tbody>
                    ${rolesHtml}
                  </tbody>
                </table>
              </section>
            `;
          })
          .join("");

      printWindow.document.write(`
        <!doctype html>
        <html lang="it">
          <head>
            <meta charset="utf-8">
            <title>
              Foglione ${escapePrintHtml(
                session.season
              )}
            </title>

            <style>
              @page {
                size: A3 landscape;
                margin: 4mm;
              }

              * {
                box-sizing: border-box;
              }

              html,
              body {
                margin: 0;
                padding: 0;
                font-family:
                  Arial,
                  Helvetica,
                  sans-serif;
                color: #111;
                background: #fff;
              }

              body {
                padding: 0;
              }

              .grid {
                display: grid;
                grid-template-columns:
                  repeat(4, minmax(0, 1fr));
                gap: 5px;
              }

              .team {
                min-width: 0;
                border: 1px solid #555;
              }

              .team > header {
                min-height: 40px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: 4px;
                border-bottom: 2px solid #555;
                background: #eee;
              }

              .team > header strong {
                overflow: hidden;
                font-size: 11px;
                line-height: 1.1;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .team > header span {
                margin-top: 3px;
                font-size: 8px;
                font-weight: 700;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
              }

              td {
                height: 18px;
                padding: 0 2px;
                border-top: 1px solid #bbb;
                vertical-align: middle;
                font-size: 8px;
              }

              tr:first-child td {
                border-top: 0;
              }

              td.role {
                width: 15px;
                text-align: center;
                font-weight: 900;
              }

              td.player {
                overflow: hidden;
                font-weight: 700;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              td.player small {
                display: block;
                overflow: hidden;
                color: #555;
                font-size: 6px;
                font-weight: 400;
                line-height: 1;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              td.cost {
                width: 19px;
                text-align: right;
                font-weight: 900;
              }

              tr.free {
                color: #999;
              }

              tr.free td.player {
                font-style: italic;
                font-weight: 400;
              }

              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>

          <body>
            <main class="grid">
              ${teamsHtml}
            </main>
          </body>
        </html>
      `);

      printWindow.document.close();

      printWindow.addEventListener(
        "load",
        () => {
          printWindow.focus();
          printWindow.print();
        },
        {
          once: true
        }
      );
    };

  const executeCancelCall =
    async (): Promise<void> => {
      const operationalCall =
        snapshot?.operationalAuctionCall;

      if (
        !snapshot ||
        !operationalCall
      ) {
        return;
      }

      const cancellableStatuses = [
        "DRAFT",
        "OPEN",
        "SUSPENDED"
      ] as const;

      if (
        !cancellableStatuses.includes(
          operationalCall.call.status as
            typeof cancellableStatuses[number]
        )
      ) {
        return;
      }

      setCancelCallPending(true);
      setCancelCallError(null);

      try {
        await cancelAuctionCall(
          operationalCall.call.id,
          snapshot.stateVersion
        );

        /*
         * Lo snapshot realtime aggiornerà
         * automaticamente chiamata e cockpit.
         */
      } catch (error) {
        setCancelCallError(
          error instanceof Error
            ? error.message
            : "Errore durante l'annullamento della chiamata."
        );
      } finally {
        setCancelCallPending(false);
      }
    };

  const executeConfirmAward =
    async (): Promise<void> => {
      const operationalCall =
        snapshot?.operationalAuctionCall;

      if (
        !snapshot ||
        !operationalCall ||
        operationalCall.call.status !==
          "PROVISIONAL_AWARD"
      ) {
        return;
      }

      setConfirmAwardPending(true);
      setConfirmAwardError(null);

      try {
        await confirmAuctionCall(
          operationalCall.call.id,
          snapshot.stateVersion
        );

        /*
         * Rosa, crediti, recent awards e chiamata
         * arriveranno dallo snapshot realtime.
         *
         * L'archivio players, invece, non fa parte
         * dello snapshot: dopo una conferma dobbiamo
         * ricaricarlo per recepire il passaggio del
         * giocatore da AVAILABLE a ROSTERED.
         */
        try {
          const refreshedPlayers =
            await fetchPlayers(
              snapshot.session.id
            );

          setPlayers(
            refreshedPlayers
          );
        } catch {
          /*
           * L'aggiudicazione è già stata confermata
           * dal server: un eventuale errore nel refresh
           * dell'archivio non deve trasformarla in un
           * falso errore di conferma.
           */
        }
      } catch (error) {
        setConfirmAwardError(
          error instanceof Error
            ? error.message
            : "Errore durante la conferma dell'aggiudicazione."
        );
      } finally {
        setConfirmAwardPending(false);
      }
    };

  const executeSessionOperationalCommand =
    async (): Promise<void> => {
      if (!session || !snapshot) {
        return;
      }

      if (
        session.status !== "READY" &&
        session.status !== "RUNNING" &&
        session.status !== "SUSPENDED"
      ) {
        return;
      }

      setSessionCommandPending(true);
      setSessionCommandError(null);

      try {
        const result =
          session.status === "READY"
            ? await startAuctionSession(
                session.id,
                snapshot.stateVersion
              )
            : session.status === "RUNNING"
              ? await suspendAuctionSession(
                  session.id,
                  snapshot.stateVersion,
                  suspensionReason
                )
              : await resumeAuctionSession(
                  session.id,
                  snapshot.stateVersion
                );

        /*
         * Il realtime invierà comunque lo snapshot
         * ufficiale. Aggiorniamo subito anche lo stato
         * locale per evitare un breve intervallo con
         * stateVersion obsoleta.
         */
        setSession(result.session);

        setSnapshot(
          (current) =>
            current
              ? {
                  ...current,
                  session:
                    result.session,
                  stateVersion:
                    result.stateVersion
                }
              : current
        );
      } catch (error) {
        setSessionCommandError(
          error instanceof Error
            ? error.message
            : "Errore durante il comando di sessione."
        );
      } finally {
        setSessionCommandPending(false);
      }
    };

  const executeOpenCall =
    async (): Promise<void> => {
      const operationalCall =
        snapshot?.operationalAuctionCall;

      if (
        !snapshot ||
        !operationalCall ||
        operationalCall.call.status !== "DRAFT" ||
        !Number.isInteger(openingBid) ||
        openingBid < 1
      ) {
        return;
      }

      setOpenCallPending(true);
      setOpenCallError(null);

      try {
        await openAuctionCall(
          operationalCall.call.id,
          snapshot.stateVersion,
          openingBid
        );
      } catch (error) {
        setOpenCallError(
          error instanceof Error
            ? error.message
            : "Errore durante l'apertura della chiamata."
        );
      } finally {
        setOpenCallPending(false);
      }
    };

  const createDraftAuctionCall =
    async (): Promise<void> => {
      if (
        !session ||
        !snapshot ||
        session.status !== "RUNNING" ||
        snapshot.operationalAuctionCall ||
        !selectedPlayerFmsCode
      ) {
        return;
      }

      setCreateCallPending(true);
      setCreateCallError(null);

      try {
        await createAuctionCallDraft(
          session.id,
          selectedPlayerFmsCode,
          snapshot.stateVersion
        );

        /*
         * La DRAFT e il nuovo stateVersion
         * arriveranno dallo snapshot realtime
         * autorevole.
         */
        setSelectedPlayerFmsCode("");
      } catch (error) {
        setCreateCallError(
          error instanceof Error
            ? error.message
            : "Errore durante la creazione della chiamata."
        );
      } finally {
        setCreateCallPending(false);
      }
    };

  const changePublicDisplay =
    async (
      next:
        Partial<PublicDisplayControlState>
    ): Promise<void> => {
      if (!session) {
        return;
      }

      setPublicDisplayControlPending(
        true
      );

      setPublicDisplayControlError(
        null
      );

      try {
        const updated =
          await updatePublicDisplayControl(
            session.id,
            next
          );

        setPublicDisplayControl(
          updated
        );
      } catch (error) {
        setPublicDisplayControlError(
          error instanceof Error
            ? error.message
            : "Errore controllo schermo pubblico."
        );
      } finally {
        setPublicDisplayControlPending(
          false
        );
      }
    };

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

  if (session.status === "SETUP") {
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

          <div className="admin-cockpit__runtime">
            <div className="admin-cockpit__state">
              <span data-status={session.status}>
                {session.status}
              </span>
            </div>
          </div>
        </header>

        <section className="admin__setup-panel">
          <p className="admin__eyebrow">
            Preparazione asta
          </p>

          <h2>
            Sessione in configurazione
          </h2>

          <p>
            La sessione non è ancora pronta per
            l'operatività del cockpit. Completa la
            configurazione dell'asta prima di
            procedere.
          </p>

          <dl className="admin__setup-summary">
            <div>
              <dt>Crediti iniziali</dt>
              <dd>
                {session.initialCredits}
              </dd>
            </div>

            <div>
              <dt>Max confermati</dt>
              <dd>
                {
                  session
                    .maximumInitialRosterEntries
                }
              </dd>
            </div>

            <div>
              <dt>Stato</dt>
              <dd>
                {session.status}
              </dd>
            </div>
          </dl>

          <a
            className="admin__setup-action"
            href="/admin/config"
          >
            Configurazione asta
          </a>
        </section>
      </main>
    );
  }

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

        <div className="admin-cockpit__runtime">
          <div className="admin-cockpit__clock">
            <span>Ora</span>
            <strong>
              {formatCurrentTime(now)}
            </strong>
          </div>

          <div className="admin-cockpit__state">
            <span data-status={session.status}>
              {session.status}
            </span>

            <small>
              Aggiornamento #{snapshot?.stateVersion ?? "-"}
            </small>
          </div>
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
                src={`/api/player-photos/${cockpit.currentPlayer.fmsCode}`}
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
                  <strong
                    className={`admin-player-role admin-player-role--${cockpit.currentPlayer.role.toLowerCase()}`}
                  >
                    {getPlayerRoleLabel(
                      cockpit.currentPlayer.role
                    )}
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

                  {cockpit.currentCallerName && (
                    <>
                      {" · "}
                      Chiamante:{" "}
                      <strong>
                        {cockpit.currentCallerName}
                      </strong>
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="admin-empty">
              <p>
                Nessun giocatore in chiamata.
              </p>

              {cockpit?.nextCallerName && (
                <p className="admin-next-caller">
                  Prossimo chiamante: {" "}
                  <strong>
                    {cockpit.nextCallerName}
                  </strong>
                </p>
              )}
            </div>
          )}

          {snapshot
            ?.operationalAuctionCall
            ?.call.status === "DRAFT" && (
            <div className="admin-open-call">
              <label>
                Prezzo iniziale
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={openingBid}
                  disabled={openCallPending}
                  onChange={(event) => {
                    setOpeningBid(
                      Number(event.target.value)
                    );
                    setOpenCallError(null);
                  }}
                />
              </label>

              <button
                type="button"
                disabled={
                  openCallPending ||
                  !Number.isInteger(openingBid) ||
                  openingBid < 1
                }
                onClick={() => {
                  void executeOpenCall();
                }}
              >
                {
                  openCallPending
                    ? "Apertura..."
                    : "Apri chiamata"
                }
              </button>

              {openCallError && (
                <small className="admin-open-call__error">
                  {openCallError}
                </small>
              )}
            </div>
          )}

          <div className="admin-call-metrics">
            <article>
              <span>Prezzo</span>
              <strong>
                {cockpit?.currentBid ?? "-"}
              </strong>
            </article>

            <article className="admin-call-metric--leader">
              <div className="admin-leader-info">
                <span>Leader</span>

                <strong>
                  {
                    cockpit?.currentLeaderName ??
                    "-"
                  }
                </strong>
              </div>

              <button
                type="button"
                className="admin-confirm-award"
                disabled={
                  confirmAwardPending ||
                  snapshot
                    ?.operationalAuctionCall
                    ?.call.status !==
                    "PROVISIONAL_AWARD"
                }
                onClick={() => {
                  void executeConfirmAward();
                }}
              >
                {
                  confirmAwardPending
                    ? (
                        <>
                          Conferma
                          <br />
                          ...
                        </>
                      )
                    : (
                        <>
                          Conferma
                          <br />
                          aggiudicazione
                        </>
                      )
                }
              </button>

              {confirmAwardError && (
                <small className="admin-confirm-award__error">
                  {confirmAwardError}
                </small>
              )}
            </article>

            <article className="admin-call-metric--turn">
              <div className="admin-turn-team">
                <span>Turno</span>

                <strong>
                  {
                    cockpit?.currentTurnName ??
                    "-"
                  }
                </strong>
              </div>

              <div className="admin-turn-timer">
                <span
                  className="admin-turn-timer__icon"
                  aria-hidden="true"
                >
                  ⏱
                </span>

                <div>
                  <strong>
                    {formatTurnElapsed(
                      cockpit?.currentTurnStartedAt ??
                        null,
                      session.status === "SUSPENDED"
                        ? parseServerTime(
                            session.updatedAt
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

        <section className="admin-panel admin-panel--controls">
          <p className="admin-panel__label">
            Controlli asta
          </p>

          <div className="admin-controls">
            <div className="admin-session-control">
              {session.status === "RUNNING" && (
                <select
                  value={suspensionReason}
                  disabled={sessionCommandPending}
                  aria-label="Causale sospensione"
                  onChange={(event) => {
                    setSuspensionReason(
                      event.target.value as
                        Exclude<
                          AuctionSessionSuspensionReason,
                          "RECOVERY_RESTART"
                        >
                    );
                  }}
                >
                  <option value="PIZZA_BREAK">
                    Pizza break
                  </option>

                  <option value="TECHNICAL_BREAK">
                    Pausa tecnica
                  </option>

                  <option value="ORGANIZATIONAL_BREAK">
                    Pausa organizzativa
                  </option>

                  <option value="NETWORK_ISSUE">
                    Problema rete
                  </option>

                  <option value="OTHER">
                    Altro
                  </option>
                </select>
              )}

              <button
                type="button"
                disabled={
                  sessionCommandPending ||
                  (
                    session.status !== "READY" &&
                    session.status !== "RUNNING" &&
                    session.status !== "SUSPENDED"
                  )
                }
                data-action={
                  session.status === "READY"
                    ? "start"
                    : session.status === "SUSPENDED"
                      ? "resume"
                      : "suspend"
                }
                onClick={() => {
                  void executeSessionOperationalCommand();
                }}
              >
                {
                  sessionCommandPending
                    ? "Operazione..."
                    : session.status === "READY"
                      ? "Avvia asta"
                      : session.status === "SUSPENDED"
                        ? "Riprendi sessione"
                        : "Sospendi sessione"
                }
              </button>
            </div>

            <button disabled>
              Correzione amministrativa
            </button>
          </div>

          {sessionCommandError && (
            <small className="admin-session-control__error">
              {sessionCommandError}
            </small>
          )}

          <small className="admin-controls__note">
            Gli altri comandi verranno collegati nei prossimi checkpoint.
          </small>

          <div className="admin-public-display-controls">
            <p className="admin-public-display-controls__title">
              Schermo pubblico
            </p>

            <div className="admin-public-display-modes">
              {(
                [
                  [
                    "STANDARD",
                    "STD"
                  ],
                  [
                    "DARK",
                    "DARK"
                  ],
                  [
                    "HIGH_CONTRAST_OUTDOOR",
                    "OUT"
                  ],
                  [
                    "COMPACT",
                    "COMPACT"
                  ]
                ] as const
              ).map(
                ([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={
                      publicDisplayControlPending
                    }
                    data-active={
                      publicDisplayControl
                        .displayMode ===
                      mode
                    }
                    onClick={() => {
                      void changePublicDisplay({
                        displayMode:
                          mode as PublicDisplayMode
                      });
                    }}
                  >
                    {label}
                  </button>
                )
              )}
            </div>

            <button
              className="admin-public-display-view"
              type="button"
              disabled={
                publicDisplayControlPending
              }
              data-active={
                publicDisplayControl.activeView ===
                "ROSTER_OVERVIEW"
              }
              onClick={() => {
                void changePublicDisplay({
                  activeView:
                    publicDisplayControl
                      .activeView ===
                    "ROSTER_OVERVIEW"
                      ? "AUCTION"
                      : "ROSTER_OVERVIEW"
                });
              }}
            >
              {
                publicDisplayControl.activeView ===
                "ROSTER_OVERVIEW"
                  ? "Nascondi foglione"
                  : "Mostra foglione"
              }
            </button>

            <div className="admin-public-display-export">
              <button
                type="button"
                disabled={!snapshot}
                onClick={
                  printRosterOverview
                }
              >
                Stampa / PDF
              </button>

              <button
                type="button"
                disabled={!snapshot}
                onClick={
                  exportRosterOverviewExcel
                }
              >
                Esporta Excel
              </button>
            </div>

            {publicDisplayControlError && (
              <small className="admin-public-display-controls__error">
                {publicDisplayControlError}
              </small>
            )}
          </div>
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
            list="admin-available-players"
            placeholder="Cerca giocatore..."
            value={selectedPlayerFmsCode}
            disabled={
              session?.status !== "RUNNING" ||
              Boolean(
                snapshot?.operationalAuctionCall
              ) ||
              createCallPending
            }
            onChange={(event) => {
              setSelectedPlayerFmsCode(
                event.target.value
              );
              setCreateCallError(null);
            }}
          />

          <datalist id="admin-available-players">
            {players
              .filter(
                (player) =>
                  includeNonAvailablePlayers ||
                  player.availabilityStatus ===
                    "AVAILABLE"
              )
              .map((player) => (
                <option
                  key={player.id}
                  value={player.fmsCode}
                >
                  {player.name} · {player.role} ·{" "}
                  {player.realTeamName ?? "-"} ·{" "}
                  {player.availabilityStatus}
                </option>
              ))}
          </datalist>

          <label
            className="admin-new-call__availability-toggle"
          >
            <input
              type="checkbox"
              checked={includeNonAvailablePlayers}
              disabled={
                createCallPending ||
                Boolean(
                  snapshot?.operationalAuctionCall
                )
              }
              onChange={(event) => {
                setIncludeNonAvailablePlayers(
                  event.target.checked
                );
                setSelectedPlayerFmsCode("");
                setCreateCallError(null);
              }}
            />
            Includi giocatori non disponibili
          </label>

          <button
            type="button"
            disabled={
              createCallPending ||
              session?.status !== "RUNNING" ||
              Boolean(
                snapshot?.operationalAuctionCall
              ) ||
              !players.some(
                (player) =>
                  player.availabilityStatus ===
                    "AVAILABLE" &&
                  player.fmsCode ===
                    selectedPlayerFmsCode.trim()
              )
            }
            onClick={() => {
              void createDraftAuctionCall();
            }}
          >
            {
              createCallPending
                ? "Preparazione..."
                : "Prepara chiamata"
            }
          </button>

          <button
            type="button"
            className="admin-cancel-call"
            disabled={
              cancelCallPending ||
              !snapshot
                ?.operationalAuctionCall ||
              !(
                snapshot
                  .operationalAuctionCall
                  .call.status === "DRAFT" ||
                snapshot
                  .operationalAuctionCall
                  .call.status === "OPEN" ||
                snapshot
                  .operationalAuctionCall
                  .call.status === "SUSPENDED"
              )
            }
            onClick={() => {
              void executeCancelCall();
            }}
          >
            {
              cancelCallPending
                ? "Annullamento..."
                : "Annulla chiamata"
            }
          </button>
        </div>

        {cancelCallError && (
          <small className="admin-cancel-call__error">
            {cancelCallError}
          </small>
        )}
      </section>

      <section className="admin-cockpit__workspace">
        <div className="admin-activity">
          <div className="admin-activity__heading">
            <div>
              <p className="admin-panel__label">
                Attività recenti
              </p>

              <h2>
                Ultime operazioni
              </h2>
            </div>

            <span>
              {activity.length} eventi
            </span>
          </div>

          {activityError ? (
            <p className="admin-activity__error">
              {activityError}
            </p>
          ) : activity.length === 0 ? (
            <p className="admin-activity__empty">
              Nessuna attività registrata.
            </p>
          ) : (
            <div className="admin-activity__list">
              {activity.map((item) => (
                <article key={item.eventId}>
                  <time>
                    {
                      formatActivityTime(
                        item.createdAt
                      )
                    }
                  </time>

                  <strong>
                    {getActivityLabel(item)}
                  </strong>

                  <span>
                    {
                      getActivityDescription(
                        item
                      )
                    }
                  </span>

                  {item.comment && (
                    <small title={item.comment}>
                      {item.comment}
                    </small>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="admin-workspace__future">
          <span>
            Audit · Backup · Correzioni
          </span>
        </aside>
      </section>
    </main>
  );
}
