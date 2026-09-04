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
  fetchLeagues,
  selectCurrentAuctionSession
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
  closeAuctionSession,
  completeAuctionSession,
  confirmFmsSessionExport,
  forceCompleteAuctionSession,
  loadFmsExportGoalkeeperSelection,
  loadFmsSessionExportState,
  loadFmsSessionRosterExport,
  selectFmsExportGoalkeeper
} from "../shared/auction-closing-api.js";

import {
  removeRosterAssignment
} from "../shared/roster-assignment-removal-api.js";

import {
  addManualRosterAssignment
} from "../shared/manual-roster-assignment-api.js";
import type {
  ManualRosterAssignmentReason
} from "../shared/manual-roster-assignment-api.js";

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

function getManualAssignmentReasonLabel(
  reason: ManualRosterAssignmentReason
): string {
  switch (reason) {
    case "OPTION_EXERCISED_MANUALLY":
      return "Giocatore precedentemente opzionato";

    case "OPTION_NO_EXTERNAL_BID":
      return "Assegnazione manuale per mancanza di concorrenti";

    case "TECHNICAL_CORRECTION":
      return "Correzione tecnica";

    case "OTHER":
      return "Altro";
  }
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

    case "ROSTER_ASSIGNMENT_REMOVED":
      return "Rimozione dalla rosa";

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

    case "ROSTER_ASSIGNMENT_REMOVED":
      return [
        item.beforePlayerName,
        item.beforeTeamName,
        item.beforeAmount !== null
          ? `${item.beforeAmount} cr`
          : null,
        item.actorName
      ]
        .filter(Boolean)
        .join(" · ");

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

const adminSelectedAuctionSessionStorageKey =
  "fantaastaapp.admin.selectedAuctionSessionId";

function loadSelectedAdminAuctionSessionId():
  string | null {
  return window.localStorage.getItem(
    adminSelectedAuctionSessionStorageKey
  );
}

function persistSelectedAdminAuctionSessionId(
  auctionSessionId: string
): void {
  window.localStorage.setItem(
    adminSelectedAuctionSessionStorageKey,
    auctionSessionId
  );
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
    selectedAuctionSessionId,
    setSelectedAuctionSessionId
  ] = useState<string | null>(
    () =>
      loadSelectedAdminAuctionSessionId()
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
    completeSessionPending,
    setCompleteSessionPending
  ] = useState(false);

  const [
    completeSessionError,
    setCompleteSessionError
  ] = useState<string | null>(null);

  const [
    fmsGoalkeeperSelections,
    setFmsGoalkeeperSelections
  ] = useState<Record<string, string | null>>({});

  const [
    fmsGoalkeeperSelectionsLoading,
    setFmsGoalkeeperSelectionsLoading
  ] = useState(false);

  const [
    fmsGoalkeeperSelectionPendingTeamId,
    setFmsGoalkeeperSelectionPendingTeamId
  ] = useState<string | null>(null);

  const [
    fmsGoalkeeperSelectionError,
    setFmsGoalkeeperSelectionError
  ] = useState<string | null>(null);

  const [
    fmsExportPending,
    setFmsExportPending
  ] = useState(false);

  const [
    fmsExportCompleted,
    setFmsExportCompleted
  ] = useState(false);

  const [
    fmsClosingPending,
    setFmsClosingPending
  ] = useState(false);

  const [
    fmsClosingError,
    setFmsClosingError
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
    playerSearchQuery,
    setPlayerSearchQuery
  ] = useState("");

  const [
    playerSearchOpen,
    setPlayerSearchOpen
  ] = useState(false);

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

  const [
    administrativeCorrectionOpen,
    setAdministrativeCorrectionOpen
  ] = useState(false);

  const [
    correctionTeamId,
    setCorrectionTeamId
  ] = useState("");

  const [
    correctionRosterEntryId,
    setCorrectionRosterEntryId
  ] = useState("");

  const [
    correctionComment,
    setCorrectionComment
  ] = useState("");

  const [
    correctionPending,
    setCorrectionPending
  ] = useState(false);

  const [
    correctionError,
    setCorrectionError
  ] = useState<string | null>(null);

  const [
    manualAssignmentOpen,
    setManualAssignmentOpen
  ] = useState(false);

  const [
    manualAssignmentTeamId,
    setManualAssignmentTeamId
  ] = useState("");

  const [
    manualAssignmentPlayerId,
    setManualAssignmentPlayerId
  ] = useState("");

  const [
    manualAssignmentCost,
    setManualAssignmentCost
  ] = useState("1");

  const [
    manualAssignmentReason,
    setManualAssignmentReason
  ] = useState<
    ManualRosterAssignmentReason | ""
  >("");

  const [
    manualAssignmentComment,
    setManualAssignmentComment
  ] = useState("");

  const [
    manualAssignmentPending,
    setManualAssignmentPending
  ] = useState(false);

  const [
    manualAssignmentError,
    setManualAssignmentError
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
      setStatus("LOADING");
      setSession(null);
      setSnapshot(null);
      setPlayers([]);
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

        if (cancelled) {
          return;
        }

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

        const currentSession =
          persistedSession ??
          selectCurrentAuctionSession(
            activeSession,
            availableSessions
          );

        const setupSession =
          currentSession
            ? null
            : (
                availableSessions.find(
                  (candidate) =>
                    candidate.status ===
                      "SETUP"
                ) ?? null
              );

        const selectedSession =
          currentSession ??
          setupSession;

        if (selectedSession) {
          persistSelectedAdminAuctionSessionId(
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
        }

        setAuctionSessions(
          availableSessions
        );
        setSession(selectedSession);
        setLeagues(availableLeagues);

        if (selectedSession) {
          try {
            const sessionPlayers =
              await fetchPlayers(
                selectedSession.id
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
                selectedSession.id
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

        if (!selectedSession) {
          setStatus("READY");
          return;
        }

        setStatus("CONNECTING");

        const client =
          createAdminRealtimeClient({
            deviceId:
              createAdminDeviceId(),
            auctionSessionId:
              selectedSession.id,

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
  }, [
    selectedAuctionSessionId
  ]);

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

  useEffect(() => {
    if (
      !session ||
      !snapshot ||
      (
        session.status !== "COMPLETED" &&
        session.status !== "CLOSED"
      )
    ) {
      setFmsGoalkeeperSelections({});
      setFmsGoalkeeperSelectionError(null);
      return;
    }

    let cancelled = false;

    const loadSelections =
      async (): Promise<void> => {
        setFmsGoalkeeperSelectionsLoading(true);
        setFmsGoalkeeperSelectionError(null);
        setFmsExportCompleted(false);
        setFmsClosingError(null);

        try {
          const [
            selections,
            exportState
          ] =
            await Promise.all([
              Promise.all(
                snapshot.publicDisplay.teams.map(
                  async (team) => {
                    const selection =
                      await loadFmsExportGoalkeeperSelection(
                        team.auctionSessionTeamId
                      );

                    return [
                      team.auctionSessionTeamId,
                      selection?.playerId ?? null
                    ] as const;
                  }
                )
              ),
              loadFmsSessionExportState(
                session.id
              )
            ]);

          if (!cancelled) {
            setFmsGoalkeeperSelections(
              Object.fromEntries(
                selections
              )
            );
            setFmsExportCompleted(
              exportState !== null
            );
          }
        } catch (error) {
          if (!cancelled) {
            setFmsGoalkeeperSelectionError(
              error instanceof Error
                ? error.message
                : "Errore durante il caricamento dei terzi portieri FMS."
            );
          }
        } finally {
          if (!cancelled) {
            setFmsGoalkeeperSelectionsLoading(false);
          }
        }
      };

    void loadSelections();

    return () => {
      cancelled = true;
    };
  }, [
    session?.id,
    session?.status,
    snapshot?.session.id
  ]);

  useEffect(() => {
    if (
      !session ||
      session.status !== "COMPLETED"
    ) {
      return;
    }

    let cancelled = false;

    const refreshExportState =
      async (): Promise<void> => {
        try {
          const exportState =
            await loadFmsSessionExportState(
              session.id
            );

          if (!cancelled) {
            setFmsExportCompleted(
              exportState !== null
            );
          }
        } catch {
          /*
           * Il polling serve solo a sincronizzare
           * gli altri dispositivi. Un errore
           * temporaneo non deve degradare
           * l'intera Console Admin.
           */
        }
      };

    const intervalId =
      window.setInterval(
        () => {
          void refreshExportState();
        },
        5000
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        intervalId
      );
    };
  }, [
    session?.id,
    session?.status
  ]);

  const executeSelectFmsExportGoalkeeper =
    async (
      auctionSessionTeamId: string,
      playerId: string
    ): Promise<void> => {
      if (
        !session ||
        session.status !== "COMPLETED" ||
        !playerId
      ) {
        return;
      }

      setFmsGoalkeeperSelectionPendingTeamId(
        auctionSessionTeamId
      );
      setFmsGoalkeeperSelectionError(null);

      try {
        await selectFmsExportGoalkeeper(
          auctionSessionTeamId,
          playerId
        );

        setFmsGoalkeeperSelections(
          (current) => ({
            ...current,
            [auctionSessionTeamId]:
              playerId
          })
        );

        setFmsExportCompleted(false);
        setFmsClosingError(null);
      } catch (error) {
        setFmsGoalkeeperSelectionError(
          error instanceof Error
            ? error.message
            : "Errore durante la selezione del terzo portiere FMS."
        );
      } finally {
        setFmsGoalkeeperSelectionPendingTeamId(
          null
        );
      }
    };

  const executeFmsSessionExport =
    async (): Promise<void> => {
      if (
        !session ||
        session.status !== "COMPLETED"
      ) {
        return;
      }

      setFmsExportPending(true);
      setFmsGoalkeeperSelectionError(null);
      setFmsClosingError(null);

      try {
        const files =
          await loadFmsSessionRosterExport(
            session.id
          );

        for (const file of files) {
          const blob =
            new Blob(
              [file.content],
              {
                type:
                  "text/plain;charset=utf-8"
              }
            );

          const url =
            URL.createObjectURL(blob);

          const anchor =
            document.createElement("a");

          anchor.href = url;
          anchor.download = file.filename;
          anchor.style.display = "none";

          document.body.appendChild(
            anchor
          );

          anchor.click();
          anchor.remove();

          URL.revokeObjectURL(url);
        }

        await confirmFmsSessionExport(
          session.id
        );

        setFmsExportCompleted(true);
      } catch (error) {
        setFmsExportCompleted(false);

        setFmsGoalkeeperSelectionError(
          error instanceof Error
            ? error.message
            : "Errore durante l'export delle rose FMS ReVo."
        );
      } finally {
        setFmsExportPending(false);
      }
    };

  const executeCloseAuctionSession =
    async (): Promise<void> => {
      if (
        !session ||
        !snapshot ||
        session.status !== "COMPLETED" ||
        !fmsExportCompleted
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          [
            "CHIUDERE DEFINITIVAMENTE LA SESSIONE?",
            "",
            "La sessione passerà allo stato CHIUSA.",
            "",
            "Hai già esportato le rose finali per FMS ReVo.",
            "Dopo la chiusura il normale lavoro d'asta è terminato."
          ].join("\n")
        );

      if (!confirmed) {
        return;
      }

      setFmsClosingPending(true);
      setFmsClosingError(null);

      try {
        const closedSession =
          await closeAuctionSession(
            session.id
          );

        setSession(closedSession);

        setSnapshot(
          (current) =>
            current
              ? {
                  ...current,
                  session: {
                    ...current.session,
                    status:
                      closedSession.status
                  }
                }
              : current
        );
      } catch (error) {
        setFmsClosingError(
          error instanceof Error
            ? error.message
            : "Errore durante la chiusura definitiva della sessione."
        );
      } finally {
        setFmsClosingPending(false);
      }
    };

  const executeCompleteSession =
    async (): Promise<void> => {
      if (
        !session ||
        !snapshot ||
        session.status !== "RUNNING" ||
        snapshot.operationalAuctionCall ||
        remainingRoleSlots.P !== 0 ||
        remainingRoleSlots.D !== 0 ||
        remainingRoleSlots.C !== 0 ||
        remainingRoleSlots.A !== 0
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "TERMINARE L'ASTA?\n\n" +
          "La sessione passerà allo stato COMPLETATA. " +
          "Non sarà più possibile effettuare normali chiamate d'asta.\n\n" +
          "Dopo il completamento potrai preparare ed esportare le rose per FMS ReVo."
        );

      if (!confirmed) {
        return;
      }

      setCompleteSessionPending(true);
      setCompleteSessionError(null);

      try {
        const completedSession =
          await completeAuctionSession(
            session.id
          );

        /*
         * Il comando complete usa ancora il percorso
         * HTTP legacy e non pubblica lo snapshot
         * realtime atomico. Aggiorniamo quindi subito
         * lo stato locale della sessione.
         */
        setSession(completedSession);

        setSnapshot(
          (current) =>
            current
              ? {
                  ...current,
                  session:
                    completedSession
                }
              : current
        );
      } catch (error) {
        setCompleteSessionError(
          error instanceof Error
            ? error.message
            : "Errore durante il completamento dell'asta."
        );
      } finally {
        setCompleteSessionPending(false);
      }
    };

  const executeForceCompleteSession =
    async (): Promise<void> => {
      if (
        !session ||
        !snapshot ||
        session.status !== "RUNNING" ||
        snapshot.operationalAuctionCall
      ) {
        return;
      }

      const missingSlots =
        remainingRoleSlots.P +
        remainingRoleSlots.D +
        remainingRoleSlots.C +
        remainingRoleSlots.A;

      if (missingSlots === 0) {
        return;
      }

      const missingSummary =
        `P ${remainingRoleSlots.P} · ` +
        `D ${remainingRoleSlots.D} · ` +
        `C ${remainingRoleSlots.C} · ` +
        `A ${remainingRoleSlots.A}`;

      const confirmed =
        window.confirm(
          "INTERROMPERE L'ASTA?\n\n" +
          "Questa è una chiusura di emergenza. " +
          "La sessione passerà allo stato COMPLETATA " +
          "anche se alcune rose sono incomplete.\n\n" +
          `Posti ancora da coprire: ${missingSummary}.\n\n` +
          "Dopo l'interruzione non sarà più possibile effettuare " +
          "normali chiamate d'asta. " +
          "Gli eventuali posti mancanti potranno essere completati " +
          "tramite assegnazioni manuali prima dell'export FMS ReVo."
        );

      if (!confirmed) {
        return;
      }

      setCompleteSessionPending(true);
      setCompleteSessionError(null);

      try {
        const completedSession =
          await forceCompleteAuctionSession(
            session.id
          );

        /*
         * Anche force-complete usa il percorso
         * HTTP legacy della sessione e non pubblica
         * uno snapshot realtime atomico.
         */
        setSession(completedSession);

        setSnapshot(
          (current) =>
            current
              ? {
                  ...current,
                  session:
                    completedSession
                }
              : current
        );
      } catch (error) {
        setCompleteSessionError(
          error instanceof Error
            ? error.message
            : "Errore durante l'interruzione dell'asta."
        );
      } finally {
        setCompleteSessionPending(false);
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
        setPlayerSearchQuery("");
        setPlayerSearchOpen(false);
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

  const executeAdministrativeCorrection =
    async (): Promise<void> => {
      if (
        !session ||
        !snapshot ||
        snapshot.operationalAuctionCall ||
        !correctionTeamId ||
        !correctionRosterEntryId ||
        !correctionComment.trim()
      ) {
        return;
      }

      const allowedStatuses = [
        "SETUP",
        "READY",
        "SUSPENDED",
        "COMPLETED"
      ] as const;

      if (
        !allowedStatuses.includes(
          session.status as
            typeof allowedStatuses[number]
        )
      ) {
        return;
      }

      const selectedTeam =
        snapshot.publicDisplay.teams.find(
          (team) =>
            team.auctionSessionTeamId ===
            correctionTeamId
        );

      const selectedEntry =
        selectedTeam?.roster.entries.find(
          (entry) =>
            entry.rosterEntryId ===
            correctionRosterEntryId
        );

      if (!selectedTeam || !selectedEntry) {
        setCorrectionError(
          "Giocatore della rosa non più disponibile per la correzione."
        );
        return;
      }

      setCorrectionPending(true);
      setCorrectionError(null);

      try {
        await removeRosterAssignment(
          session.id,
          snapshot.stateVersion,
          selectedEntry.rosterEntryId,
          {
            name: "Admin",
            role: "ADMINISTRATOR"
          },
          correctionComment.trim()
        );

        /*
         * Rosa, crediti, massimo rilancio e
         * stateVersion arriveranno dallo snapshot
         * realtime autorevole.
         *
         * L'archivio players non fa parte dello
         * snapshot: il giocatore rimosso deve tornare
         * AVAILABLE anche nella selezione locale.
         */
        try {
          const refreshedPlayers =
            await fetchPlayers(
              session.id
            );

          setPlayers(
            refreshedPlayers
          );
        } catch {
          /*
           * La rimozione è già stata confermata dal
           * server: un errore nel refresh players non
           * deve trasformarla in un falso errore.
           */
        }

        setCorrectionTeamId("");
        setCorrectionRosterEntryId("");
        setCorrectionComment("");
        setAdministrativeCorrectionOpen(
          false
        );
      } catch (error) {
        setCorrectionError(
          error instanceof Error
            ? error.message
            : "Errore durante la correzione amministrativa."
        );
      } finally {
        setCorrectionPending(false);
      }
    };

  const executeManualAssignment =
    async (): Promise<void> => {
      if (
        !session ||
        !snapshot ||
        snapshot.operationalAuctionCall ||
        !manualAssignmentTeamId ||
        !manualAssignmentPlayerId ||
        !manualAssignmentReason
      ) {
        return;
      }

      const allowedStatuses = [
        "SETUP",
        "READY",
        "SUSPENDED",
        "COMPLETED"
      ] as const;

      if (
        !allowedStatuses.includes(
          session.status as
            typeof allowedStatuses[number]
        )
      ) {
        return;
      }

      const selectedTeam =
        snapshot.publicDisplay.teams.find(
          (team) =>
            team.auctionSessionTeamId ===
            manualAssignmentTeamId
        );

      const selectedPlayer =
        players.find(
          (player) =>
            player.id ===
              manualAssignmentPlayerId &&
            player.availabilityStatus ===
              "AVAILABLE"
        );

      const acquisitionCost =
        Number(manualAssignmentCost);

      if (!selectedTeam) {
        setManualAssignmentError(
          "Squadra non più disponibile per l'assegnazione."
        );
        return;
      }

      if (!selectedPlayer) {
        setManualAssignmentError(
          "Giocatore non più disponibile per l'assegnazione."
        );
        return;
      }

      if (
        !Number.isInteger(acquisitionCost) ||
        acquisitionCost <= 0
      ) {
        setManualAssignmentError(
          "Il costo deve essere un numero intero positivo."
        );
        return;
      }

      setManualAssignmentPending(true);
      setManualAssignmentError(null);

      try {
        await addManualRosterAssignment(
          session.id,
          snapshot.stateVersion,
          selectedTeam.auctionSessionTeamId,
          selectedPlayer.id,
          acquisitionCost,
          1,
          {
            name: "Admin",
            role: "ADMINISTRATOR"
          },
          manualAssignmentReason,
          manualAssignmentComment.trim() ||
            getManualAssignmentReasonLabel(
              manualAssignmentReason
            )
        );

        /*
         * Rosa, crediti, massimo rilancio e
         * stateVersion arriveranno dallo snapshot
         * realtime autorevole.
         *
         * L'archivio players non fa parte dello
         * snapshot: il giocatore assegnato deve
         * diventare ROSTERED anche nella selezione
         * locale.
         */
        try {
          const refreshedPlayers =
            await fetchPlayers(
              session.id
            );

          setPlayers(
            refreshedPlayers
          );
        } catch {
          /*
           * L'assegnazione è già stata confermata dal
           * server: un errore nel refresh players non
           * deve trasformarla in un falso errore.
           */
        }

        setManualAssignmentTeamId("");
        setManualAssignmentPlayerId("");
        setManualAssignmentCost("1");
        setManualAssignmentReason("");
        setManualAssignmentComment("");
        setManualAssignmentOpen(false);
      } catch (error) {
        setManualAssignmentError(
          error instanceof Error
            ? error.message
            : "Errore durante l'assegnazione manuale."
        );
      } finally {
        setManualAssignmentPending(false);
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

  const administrativeCorrectionAllowed =
    session !== null &&
    !snapshot?.operationalAuctionCall &&
    (
      session.status === "SETUP" ||
      session.status === "READY" ||
      session.status === "SUSPENDED" ||
      session.status === "COMPLETED"
    );

  const correctionSelectedTeam =
    snapshot?.publicDisplay.teams.find(
      (team) =>
        team.auctionSessionTeamId ===
        correctionTeamId
    ) ?? null;

  const correctionSelectedEntry =
    correctionSelectedTeam?.roster.entries.find(
      (entry) =>
        entry.rosterEntryId ===
        correctionRosterEntryId
    ) ?? null;

  const manualAssignmentAllowed =
    administrativeCorrectionAllowed;

  const manualAssignmentSelectedTeam =
    snapshot?.publicDisplay.teams.find(
      (team) =>
        team.auctionSessionTeamId ===
        manualAssignmentTeamId
    ) ?? null;

  const manualAssignmentSelectedPlayer =
    players.find(
      (player) =>
        player.id ===
          manualAssignmentPlayerId &&
        player.availabilityStatus ===
          "AVAILABLE"
    ) ?? null;

  const manualAssignmentAvailablePlayers =
    players.filter(
      (player) =>
        player.availabilityStatus ===
        "AVAILABLE"
    );

  const manualAssignmentNumericCost =
    Number(manualAssignmentCost);

  const manualAssignmentCostValid =
    Number.isInteger(
      manualAssignmentNumericCost
    ) &&
    manualAssignmentNumericCost > 0;

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

  const remainingRoleSlots =
    cockpit
      ? (["P", "D", "C", "A"] as const).reduce(
          (totals, role) => {
            totals[role] =
              cockpit.teams.reduce(
                (total, team) =>
                  total +
                  Math.max(
                    0,
                    team.rosterRoles[role].limit -
                      team.rosterRoles[role].count
                  ),
                0
              );

            return totals;
          },
          {
            P: 0,
            D: 0,
            C: 0,
            A: 0
          }
        )
      : {
          P: 0,
          D: 0,
          C: 0,
          A: 0
        };

  const latestActivity = activity[0];

  const completedFmsTeams =
    session.status === "COMPLETED" &&
    snapshot
      ? cockpit?.teams.map((team) => {
          const publicTeam =
            snapshot.publicDisplay.teams.find(
              (candidate) =>
                candidate.auctionSessionTeamId ===
                team.auctionSessionTeamId
            );

          const ordinaryGoalkeepers =
            publicTeam?.roster.entries.filter(
              (entry) =>
                entry.role === "P"
            ) ?? [];

          const eligibleRealTeams =
            new Set(
              ordinaryGoalkeepers
                .map(
                  (entry) =>
                    entry.realTeamName
                )
                .filter(
                  (
                    realTeamName
                  ): realTeamName is string =>
                    Boolean(
                      realTeamName?.trim()
                    )
                )
            );

          const selectedPlayerId =
            fmsGoalkeeperSelections[
              team.auctionSessionTeamId
            ] ?? null;

          const candidateGoalkeepers =
            players
              .filter(
                (player) =>
                  player.role === "P" &&
                  player.availabilityStatus ===
                    "AVAILABLE" &&
                  Boolean(
                    player.realTeamName &&
                    eligibleRealTeams.has(
                      player.realTeamName
                    )
                  )
              )
              .sort(
                (left, right) =>
                  left.name.localeCompare(
                    right.name,
                    "it"
                  )
              );

          return {
            ...team,
            ordinaryGoalkeepers,
            candidateGoalkeepers,
            selectedPlayerId
          };
        }) ?? []
      : [];

  const completedFmsSelectionCount =
    completedFmsTeams.filter(
      (team) =>
        Boolean(team.selectedPlayerId)
    ).length;

  const completedOrdinaryRostersReady =
    remainingRoleSlots.P === 0 &&
    remainingRoleSlots.D === 0 &&
    remainingRoleSlots.C === 0 &&
    remainingRoleSlots.A === 0;

  const completedFmsGoalkeepersReady =
    completedFmsTeams.length > 0 &&
    completedFmsSelectionCount ===
      completedFmsTeams.length;

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

        <div className="admin-public-display-controls">
            <p className="admin-public-display-controls__title">
              Display
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

            <div className="admin-current-call__new-call">
              <div className="admin-new-call admin-new-call--inline">
              <span className="admin-new-call__inline-label">
                Cerca e apri il prossimo giocatore
              </span>
              <div className="admin-player-search">
                <input
                  type="search"
                  placeholder="Cerca giocatore..."
                  value={playerSearchQuery}
                  autoComplete="off"
                  disabled={
                    session?.status !== "RUNNING" ||
                    Boolean(
                      snapshot?.operationalAuctionCall
                    ) ||
                    createCallPending
                  }
                  onFocus={() => {
                    setPlayerSearchOpen(true);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setPlayerSearchOpen(false);
                    }, 150);
                  }}
                  onChange={(event) => {
                    setPlayerSearchQuery(
                      event.target.value
                    );
                    setSelectedPlayerFmsCode("");
                    setPlayerSearchOpen(true);
                    setCreateCallError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setPlayerSearchOpen(false);
                    }
                  }}
                />

                {playerSearchOpen &&
                  (() => {
                    const query =
                      playerSearchQuery
                        .trim()
                        .toLocaleLowerCase("it");

                    const matchingPlayers =
                      players
                        .filter(
                          (player) =>
                            includeNonAvailablePlayers ||
                            player.availabilityStatus ===
                              "AVAILABLE"
                        )
                        .filter((player) => {
                          if (!query) {
                            return true;
                          }

                          const searchableText = [
                            player.fmsCode,
                            player.name,
                            player.realTeamName ?? "",
                            player.role
                          ]
                            .join(" ")
                            .toLocaleLowerCase("it");

                          return searchableText.includes(
                            query
                          );
                        });

                    const visiblePlayers =
                      query
                        ? matchingPlayers
                        : matchingPlayers.slice(0, 10);

                    return (
                      <div
                        className="admin-player-search__results"
                        role="listbox"
                        aria-label="Risultati ricerca giocatori"
                      >
                        {visiblePlayers.length === 0 ? (
                          <div className="admin-player-search__empty">
                            Nessun giocatore trovato
                          </div>
                        ) : (
                          visiblePlayers.map(
                            (player) => (
                              <button
                                key={player.id}
                                type="button"
                                className="admin-player-search__result"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                }}
                                onClick={() => {
                                  setSelectedPlayerFmsCode(
                                    player.fmsCode
                                  );
                                  setPlayerSearchQuery(
                                    player.name
                                  );
                                  setPlayerSearchOpen(false);
                                  setCreateCallError(null);
                                }}
                              >
                                <span className="admin-player-search__result-main">
                                  <strong>
                                    {player.name}
                                  </strong>

                                  <span
                                    className={`admin-player-search__role admin-player-search__role--${player.role.toLowerCase()}`}
                                  >
                                    {getPlayerRoleLabel(
                                      player.role
                                    )}
                                  </span>
                                </span>

                                <span className="admin-player-search__result-meta">
                                  {player.realTeamName ?? "-"}
                                  {" · "}
                                  FMS {player.fmsCode}
                                </span>
                              </button>
                            )
                          )
                        )}
                      </div>
                    );
                  })()}
              </div>

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
                    setPlayerSearchQuery("");
                    setPlayerSearchOpen(false);
                    setCreateCallError(null);
                  }}
                />
                Includi giocatori non disponibili
              </label>

              <button
                className="admin-prepare-call"
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
            </div>
          <div className="admin-extraordinary-control">
              <span className="admin-extraordinary-control__label">
                Operazioni straordinarie
              </span>

              <div className="admin-extraordinary-control__actions">
                <div className="admin-extraordinary-control__action">
                  <button
                    type="button"
                    disabled={
                      correctionPending ||
                      !administrativeCorrectionAllowed
                    }
                    title={
                      administrativeCorrectionAllowed
                        ? "Rimuovi un giocatore da una rosa"
                        : snapshot?.operationalAuctionCall
                          ? "Annulla prima la chiamata corrente"
                          : "Disponibile solo a sessione non in corso"
                    }
                    onClick={() => {
                      setAdministrativeCorrectionOpen(
                        (current) => !current
                      );
                      setManualAssignmentOpen(false);
                      setCorrectionError(null);
                    }}
                  >
                    Correzione amministrativa
                  </button>

                  <small>
                    {
                      administrativeCorrectionAllowed
                        ? "Rimozione dalla rosa"
                        : snapshot?.operationalAuctionCall
                          ? "Annulla prima la chiamata corrente"
                          : session.status === "RUNNING"
                            ? "Sospendi prima l'asta"
                            : "Non disponibile"
                    }
                  </small>
                </div>

                <div className="admin-extraordinary-control__action">
                  <button
                    type="button"
                    disabled={
                      manualAssignmentPending ||
                      !manualAssignmentAllowed
                    }
                    title={
                      manualAssignmentAllowed
                        ? "Assegna direttamente un giocatore a una rosa"
                        : snapshot?.operationalAuctionCall
                          ? "Annulla prima la chiamata corrente"
                          : "Disponibile solo a sessione non in corso"
                    }
                    onClick={() => {
                      setManualAssignmentOpen(
                        (current) => !current
                      );
                      setAdministrativeCorrectionOpen(false);
                      setManualAssignmentError(null);
                    }}
                  >
                    Assegnazione manuale
                  </button>

                  <small>
                    {
                      manualAssignmentAllowed
                        ? "Inserimento diretto in rosa"
                        : snapshot?.operationalAuctionCall
                          ? "Annulla prima la chiamata corrente"
                          : session.status === "RUNNING"
                            ? "Sospendi prima l'asta"
                            : "Non disponibile"
                    }
                  </small>
                </div>
              </div>

              {administrativeCorrectionOpen && (
                <div className="admin-extraordinary-control__panel">
                  <label>
                    Squadra
                    <select
                      value={correctionTeamId}
                      disabled={correctionPending}
                      onChange={(event) => {
                        setCorrectionTeamId(
                          event.target.value
                        );
                        setCorrectionRosterEntryId("");
                        setCorrectionError(null);
                      }}
                    >
                      <option value="">
                        Seleziona squadra
                      </option>

                      {snapshot?.publicDisplay.teams.map(
                        (team) => (
                          <option
                            key={team.auctionSessionTeamId}
                            value={team.auctionSessionTeamId}
                          >
                            {team.teamName}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Giocatore
                    <select
                      value={correctionRosterEntryId}
                      disabled={
                        correctionPending ||
                        !correctionSelectedTeam
                      }
                      onChange={(event) => {
                        setCorrectionRosterEntryId(
                          event.target.value
                        );
                        setCorrectionError(null);
                      }}
                    >
                      <option value="">
                        Seleziona giocatore
                      </option>

                      {correctionSelectedTeam?.roster.entries.map(
                        (entry) => (
                          <option
                            key={entry.rosterEntryId}
                            value={entry.rosterEntryId}
                          >
                            {entry.playerName}
                            {" · "}
                            {entry.role}
                            {" · "}
                            {entry.acquisitionCost} cr
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Note (facoltative)
                    <input
                      type="text"
                      value={correctionComment}
                      disabled={correctionPending}
                      maxLength={500}
                      placeholder="Motivo della correzione"
                      onChange={(event) => {
                        setCorrectionComment(
                          event.target.value
                        );
                        setCorrectionError(null);
                      }}
                    />
                  </label>

                  {correctionSelectedEntry && (
                    <p className="admin-extraordinary-control__summary">
                      Rimuovi{" "}
                      <strong>
                        {correctionSelectedEntry.playerName}
                      </strong>
                      {" "}da{" "}
                      <strong>
                        {correctionSelectedTeam?.teamName}
                      </strong>
                      {" · Rimborso "}
                      <strong>
                        {correctionSelectedEntry.acquisitionCost} cr
                      </strong>
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={
                      correctionPending ||
                      !administrativeCorrectionAllowed ||
                      !correctionSelectedEntry ||
                      !correctionComment.trim()
                    }
                    onClick={() => {
                      if (
                        !correctionSelectedEntry ||
                        !correctionSelectedTeam
                      ) {
                        return;
                      }

                      const confirmed =
                        window.confirm(
                          `Confermi la rimozione di ${correctionSelectedEntry.playerName} dalla rosa di ${correctionSelectedTeam.teamName} con rimborso di ${correctionSelectedEntry.acquisitionCost} crediti?`
                        );

                      if (confirmed) {
                        void executeAdministrativeCorrection();
                      }
                    }}
                  >
                    {
                      correctionPending
                        ? "Correzione..."
                        : "Conferma correzione"
                    }
                  </button>

                  {correctionError && (
                    <small className="admin-extraordinary-control__error">
                      {correctionError}
                    </small>
                  )}
                </div>
              )}

              {manualAssignmentOpen && (
                <div className="admin-extraordinary-control__panel admin-extraordinary-control__panel--manual">
                  <label>
                    Squadra
                    <select
                      value={manualAssignmentTeamId}
                      disabled={manualAssignmentPending}
                      onChange={(event) => {
                        setManualAssignmentTeamId(
                          event.target.value
                        );
                        setManualAssignmentError(null);
                      }}
                    >
                      <option value="">
                        Seleziona squadra
                      </option>

                      {snapshot?.publicDisplay.teams.map(
                        (team) => (
                          <option
                            key={team.auctionSessionTeamId}
                            value={team.auctionSessionTeamId}
                          >
                            {team.teamName}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Giocatore
                    <select
                      value={manualAssignmentPlayerId}
                      disabled={manualAssignmentPending}
                      onChange={(event) => {
                        setManualAssignmentPlayerId(
                          event.target.value
                        );
                        setManualAssignmentError(null);
                      }}
                    >
                      <option value="">
                        Seleziona giocatore
                      </option>

                      {manualAssignmentAvailablePlayers.map(
                        (player) => (
                          <option
                            key={player.id}
                            value={player.id}
                          >
                            {player.name}
                            {" · "}
                            {player.role}
                            {" · "}
                            {player.realTeamName ?? "-"}
                            {" · FMS "}
                            {player.fmsCode}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Costo
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={manualAssignmentCost}
                      disabled={manualAssignmentPending}
                      onChange={(event) => {
                        setManualAssignmentCost(
                          event.target.value
                        );
                        setManualAssignmentError(null);
                      }}
                    />
                  </label>

                  <label>
                    Causale
                    <select
                      value={manualAssignmentReason}
                      disabled={manualAssignmentPending}
                      onChange={(event) => {
                        setManualAssignmentReason(
                          event.target.value as
                            ManualRosterAssignmentReason | ""
                        );
                        setManualAssignmentError(null);
                      }}
                    >
                      <option value="">
                        Seleziona causale
                      </option>

                      <option value="OPTION_EXERCISED_MANUALLY">
                        Giocatore precedentemente opzionato
                      </option>

                      <option value="OPTION_NO_EXTERNAL_BID">
                        Assegnazione manuale per mancanza di concorrenti
                      </option>

                      <option value="TECHNICAL_CORRECTION">
                        Correzione tecnica
                      </option>

                      <option value="OTHER">
                        Altro
                      </option>
                    </select>
                  </label>

                  <label>
                    Motivo
                    <input
                      type="text"
                      value={manualAssignmentComment}
                      disabled={manualAssignmentPending}
                      maxLength={500}
                      placeholder="Eventuali note aggiuntive"
                      onChange={(event) => {
                        setManualAssignmentComment(
                          event.target.value
                        );
                        setManualAssignmentError(null);
                      }}
                    />
                  </label>

                  {
                    manualAssignmentSelectedPlayer &&
                    manualAssignmentSelectedTeam &&
                    manualAssignmentCostValid && (
                      <p className="admin-extraordinary-control__summary">
                        Assegna{" "}
                        <strong>
                          {manualAssignmentSelectedPlayer.name}
                        </strong>
                        {" "}(
                        {manualAssignmentSelectedPlayer.role}
                        {" · "}
                        {manualAssignmentSelectedPlayer.realTeamName ?? "-"}
                        {" · FMS "}
                        {manualAssignmentSelectedPlayer.fmsCode}
                        ) a{" "}
                        <strong>
                          {manualAssignmentSelectedTeam.teamName}
                        </strong>
                        {" · Costo "}
                        <strong>
                          {manualAssignmentNumericCost} cr
                        </strong>
                      </p>
                    )
                  }

                  <button
                    type="button"
                    disabled={
                      manualAssignmentPending ||
                      !manualAssignmentAllowed ||
                      !manualAssignmentSelectedTeam ||
                      !manualAssignmentSelectedPlayer ||
                      !manualAssignmentCostValid ||
                      !manualAssignmentReason
                    }
                    onClick={() => {
                      if (
                        !manualAssignmentSelectedPlayer ||
                        !manualAssignmentSelectedTeam ||
                        !manualAssignmentCostValid
                      ) {
                        return;
                      }

                      const confirmed =
                        window.confirm(
                          `Confermi l'assegnazione di ${manualAssignmentSelectedPlayer.name} alla rosa di ${manualAssignmentSelectedTeam.teamName} al costo di ${manualAssignmentNumericCost} crediti?`
                        );

                      if (confirmed) {
                        void executeManualAssignment();
                      }
                    }}
                  >
                    {
                      manualAssignmentPending
                        ? "Assegnazione..."
                        : "Conferma assegnazione"
                    }
                  </button>

                  {manualAssignmentError && (
                    <small className="admin-extraordinary-control__error">
                      {manualAssignmentError}
                    </small>
                  )}
                </div>
              )}
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

            <div className="admin-session-completion">
              <div className="admin-session-completion__actions">
                <button
                  type="button"
                disabled={
                  completeSessionPending ||
                  sessionCommandPending ||
                  session.status !== "RUNNING" ||
                  Boolean(
                    snapshot?.operationalAuctionCall
                  ) ||
                  remainingRoleSlots.P !== 0 ||
                  remainingRoleSlots.D !== 0 ||
                  remainingRoleSlots.C !== 0 ||
                  remainingRoleSlots.A !== 0
                }
                title={
                  snapshot?.operationalAuctionCall
                    ? "Annulla prima la chiamata corrente"
                    : session.status !== "RUNNING"
                      ? "Disponibile durante l'asta"
                      : (
                            remainingRoleSlots.P !== 0 ||
                            remainingRoleSlots.D !== 0 ||
                            remainingRoleSlots.C !== 0 ||
                            remainingRoleSlots.A !== 0
                          )
                        ? "Completa tutte le rose prima di terminare l'asta"
                        : "Termina l'asta"
                }
                onClick={() => {
                  void executeCompleteSession();
                }}
              >
                {
                  completeSessionPending
                    ? "Completamento..."
                    : "Termina asta"
                }
              </button>

                <button
                  type="button"
                  disabled={
                    completeSessionPending ||
                    sessionCommandPending ||
                    session.status !== "RUNNING" ||
                    Boolean(
                      snapshot?.operationalAuctionCall
                    ) ||
                    (
                      remainingRoleSlots.P === 0 &&
                      remainingRoleSlots.D === 0 &&
                      remainingRoleSlots.C === 0 &&
                      remainingRoleSlots.A === 0
                    )
                  }
                  title={
                    snapshot?.operationalAuctionCall
                      ? "Annulla prima la chiamata corrente"
                      : session.status !== "RUNNING"
                        ? "Disponibile durante l'asta"
                        : (
                              remainingRoleSlots.P === 0 &&
                              remainingRoleSlots.D === 0 &&
                              remainingRoleSlots.C === 0 &&
                              remainingRoleSlots.A === 0
                            )
                          ? "Le rose sono complete: usa Termina asta"
                          : "Interrompi eccezionalmente l'asta con rose incomplete"
                  }
                  className="admin-session-completion__emergency"
                  onClick={() => {
                    void executeForceCompleteSession();
                  }}
                >
                  {
                    completeSessionPending
                      ? "Completamento..."
                      : "Interrompi asta…"
                  }
                </button>

                <details className="admin-session-completion__info">
                  <summary
                    aria-label="Informazioni sulla chiusura dell'asta"
                    title="Informazioni sulla chiusura dell'asta"
                  >
                    i
                  </summary>

                  <div className="admin-session-completion__popover">
                    {
                      snapshot?.operationalAuctionCall &&
                      session.status === "RUNNING"
                        ? "Annulla prima la chiamata corrente."
                        : session.status === "RUNNING" &&
                            (
                              remainingRoleSlots.P !== 0 ||
                              remainingRoleSlots.D !== 0 ||
                              remainingRoleSlots.C !== 0 ||
                              remainingRoleSlots.A !== 0
                            )
                          ? "Completa tutte le rose prima di terminare l'asta."
                          : session.status === "RUNNING"
                            ? "L'asta può essere terminata normalmente."
                            : "I comandi di chiusura sono disponibili durante l'asta."
                    }
                  </div>
                </details>
              </div>

              {completeSessionError && (
                <small className="admin-extraordinary-control__error">
                  {completeSessionError}
                </small>
              )}
            </div>

            {session.status === "COMPLETED" && (
              <section className="admin-fms-closing">
                <div className="admin-fms-closing__header">
                  <div>
                    <strong>
                      Preparazione export FMS ReVo
                    </strong>
                    <small>
                      Seleziona il terzo portiere
                      per ogni fantasquadra.
                    </small>
                  </div>

                  <span className="admin-fms-closing__progress">
                    {
                      completedFmsSelectionCount
                    }/{completedFmsTeams.length}
                  </span>
                </div>

                {fmsGoalkeeperSelectionsLoading ? (
                  <p className="admin-fms-closing__message">
                    Caricamento selezioni…
                  </p>
                ) : (
                  <div className="admin-fms-closing__teams">
                    {completedFmsTeams.map(
                      (team) => {
                        const pending =
                          fmsGoalkeeperSelectionPendingTeamId ===
                          team.auctionSessionTeamId;

                        return (
                          <div
                            className="admin-fms-closing-team"
                            key={
                              team.auctionSessionTeamId
                            }
                          >
                            <div className="admin-fms-closing-team__identity">
                              <strong>
                                {team.teamName}
                              </strong>

                              <small>
                                {
                                  team.ordinaryGoalkeepers
                                    .map(
                                      (goalkeeper) =>
                                        `${goalkeeper.playerName} (${goalkeeper.realTeamName ?? "—"})`
                                    )
                                    .join(" · ") ||
                                  "Portieri ordinari non disponibili"
                                }
                              </small>
                            </div>

                            <select
                              aria-label={
                                `Terzo portiere FMS ${team.teamName}`
                              }
                              disabled={
                                pending ||
                                team.ordinaryGoalkeepers.length !==
                                  2
                              }
                              value={
                                team.selectedPlayerId ??
                                ""
                              }
                              onChange={(event) => {
                                const playerId =
                                  event.target.value;

                                if (!playerId) {
                                  return;
                                }

                                void executeSelectFmsExportGoalkeeper(
                                  team.auctionSessionTeamId,
                                  playerId
                                );
                              }}
                            >
                              <option value="">
                                {
                                  team.ordinaryGoalkeepers.length !==
                                  2
                                    ? "Rosa portieri incompleta"
                                    : "Seleziona terzo portiere…"
                                }
                              </option>

                              {team.candidateGoalkeepers.map(
                                (player) => (
                                  <option
                                    key={player.id}
                                    value={player.id}
                                  >
                                    {player.name}
                                    {
                                      player.realTeamName
                                        ? ` · ${player.realTeamName}`
                                        : ""
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {fmsGoalkeeperSelectionError && (
                  <small className="admin-extraordinary-control__error">
                    {fmsGoalkeeperSelectionError}
                  </small>
                )}

                <div className="admin-fms-closing__checklist">
                  <span
                    data-ready={
                      completedOrdinaryRostersReady
                    }
                  >
                    {
                      completedOrdinaryRostersReady
                        ? "✓"
                        : "○"
                    }
                    Rose ordinarie complete
                  </span>

                  <span
                    data-ready={
                      completedFmsGoalkeepersReady
                    }
                  >
                    {
                      completedFmsGoalkeepersReady
                        ? "✓"
                        : "○"
                    }
                    Terzi portieri {
                      completedFmsSelectionCount
                    }/{completedFmsTeams.length}
                  </span>

                  <span
                    data-ready={
                      fmsExportCompleted
                    }
                  >
                    {
                      fmsExportCompleted
                        ? "✓"
                        : "○"
                    }
                    Export FMS ReVo
                  </span>
                </div>

                <div className="admin-fms-closing__actions">
                  <button
                    type="button"
                    disabled={
                      fmsExportPending ||
                      fmsClosingPending ||
                      !completedOrdinaryRostersReady ||
                      !completedFmsGoalkeepersReady
                    }
                    onClick={() => {
                      void executeFmsSessionExport();
                    }}
                  >
                    {
                      fmsExportPending
                        ? "Esportazione..."
                        : fmsExportCompleted
                          ? "Esporta nuovamente"
                          : "Esporta rose FMS ReVo"
                    }
                  </button>

                  <button
                    type="button"
                    className="admin-fms-closing__close"
                    disabled={
                      fmsExportPending ||
                      fmsClosingPending ||
                      !fmsExportCompleted
                    }
                    title={
                      fmsExportCompleted
                        ? "Chiudi definitivamente la sessione"
                        : "Esegui prima l'export FMS ReVo"
                    }
                    onClick={() => {
                      void executeCloseAuctionSession();
                    }}
                  >
                    {
                      fmsClosingPending
                        ? "Chiusura..."
                        : "Chiudi sessione"
                    }
                  </button>
                </div>

                {fmsClosingError && (
                  <small className="admin-extraordinary-control__error">
                    {fmsClosingError}
                  </small>
                )}
              </section>
            )}

            <div className="admin-controls-dashboard">
              <div className="admin-role-needs">
                <span className="admin-controls-section__label">
                  Posti ancora da coprire
                </span>

                <div className="admin-role-needs__grid">
                  {(["P", "D", "C", "A"] as const).map(
                    (role) => (
                      <div
                        key={role}
                        data-role={role}
                      >
                        <strong>{role}</strong>
                        <span>
                          {remainingRoleSlots[role]}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="admin-recent-awards">
                <span className="admin-controls-section__label">
                  Ultime aggiudicazioni
                </span>

                <div className="admin-recent-awards__list">
                  {
                    snapshot?.publicDisplay
                      .recentAwards.length ? (
                      snapshot.publicDisplay
                        .recentAwards.map(
                          (award) => (
                            <article
                              key={award.eventId}
                              className="admin-recent-award"
                            >
                              <span
                                className="admin-recent-award__role"
                                data-role={award.role}
                              >
                                {award.role}
                              </span>

                              <div className="admin-recent-award__copy">
                                <strong title={award.playerName}>
                                  {award.playerName}
                                </strong>

                                <span title={award.teamName}>
                                  {award.teamName}
                                </span>
                              </div>

                              <strong className="admin-recent-award__amount">
                                {award.amount}
                              </strong>
                            </article>
                          )
                        )
                    ) : (
                      <p className="admin-recent-awards__empty">
                        Nessuna aggiudicazione.
                      </p>
                    )
                  }
                </div>
              </div>
            </div>


          </div>

          {sessionCommandError && (
            <small className="admin-session-control__error">
              {sessionCommandError}
            </small>
          )}

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


                <div
                  data-role="P"
                  data-complete={
                    team.rosterRoles.P.count >=
                    team.rosterRoles.P.limit
                  }
                >
                  <dt>P</dt>
                  <dd>
                    {team.rosterRoles.P.count}/
                    {team.rosterRoles.P.limit}
                  </dd>
                </div>

                <div
                  data-role="D"
                  data-complete={
                    team.rosterRoles.D.count >=
                    team.rosterRoles.D.limit
                  }
                >
                  <dt>D</dt>
                  <dd>
                    {team.rosterRoles.D.count}/
                    {team.rosterRoles.D.limit}
                  </dd>
                </div>

                <div
                  data-role="C"
                  data-complete={
                    team.rosterRoles.C.count >=
                    team.rosterRoles.C.limit
                  }
                >
                  <dt>C</dt>
                  <dd>
                    {team.rosterRoles.C.count}/
                    {team.rosterRoles.C.limit}
                  </dd>
                </div>

                <div
                  data-role="A"
                  data-complete={
                    team.rosterRoles.A.count >=
                    team.rosterRoles.A.limit
                  }
                >
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


      <section className="admin-cockpit__workspace">
        <details className="admin-activity">
          <summary className="admin-activity__summary">
            <div className="admin-activity__summary-main">
              <span className="admin-panel__label">
                Attività recenti
              </span>

              <strong>
                {activity.length} eventi
              </strong>
            </div>

            <div className="admin-activity__summary-latest">
              {activityError ? (
                <span className="admin-activity__error-inline">
                  Errore caricamento attività
                </span>
              ) : latestActivity ? (
                <>
                  <time>
                    {
                      formatActivityTime(
                        latestActivity.createdAt
                      )
                    }
                  </time>

                  <strong>
                    {getActivityLabel(latestActivity)}
                  </strong>

                  <span>
                    {
                      getActivityDescription(
                        latestActivity
                      )
                    }
                  </span>
                </>
              ) : (
                <span>
                  Nessuna attività registrata
                </span>
              )}
            </div>

            <span
              className="admin-activity__chevron"
              aria-hidden="true"
            >
              ▾
            </span>
          </summary>

          <div className="admin-activity__body">
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
        </details>
      </section>
    </main>
  );
}
