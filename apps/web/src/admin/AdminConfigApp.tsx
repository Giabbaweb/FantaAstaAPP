import {
  useEffect,
  useMemo,
  useState
} from "react";

import * as XLSX from "xlsx";

import type {
  AuctionSession,
  AuctionSessionTeam,
  League,
  Owner,
  Player,
  Team,
  TeamOwner
} from "@fantaastaapp/contracts";

import {
  fetchLeagues
} from "../shared/app-api.js";

import {
  createAuctionSessionSetup,
  createLeague,
  createManualBackup,
  createOwner,
  createTeam,
  deleteAllPlayerPhotos,
  deleteRecoveryPoint,
  createTeamOwner,
  deleteTeamOwner,
  fetchAuctionSessions,
  fetchAuctionSessionReadiness,
  fetchAuctionSessionTeams,
  fetchInitialRosterOverview,
  fetchInitialRosterStatus,
  fetchOwners,
  fetchPlayerPhotoCatalog,
  fetchPlayers,
  fetchRecoveryPoints,
  markAuctionSessionReady,
  fetchTeamAccessStatus,
  fetchTeamOwners,
  fetchTeamsByLeague,
  importInitialRosters,
  importPlayerArchive,
  importPlayerPhotos,
  previewInitialRosters,
  reorderAuctionSessionTeams,
  resetDevelopmentSession,
  resetInitialRosters,
  restoreRecoveryPoint,
  resetSetupData,
  setTeamAccessPin,
  updateAuctionSession,
  updateLeague,
  updateTeam,
  updateTeamOwner,
  uploadLeagueLogo,
  uploadTeamLogo
} from "../shared/admin-config-api.js";

import "./admin-config.css";

type InitialRosterResolutionChoice =
  | 1
  | 2
  | 3
  | "SKIP";

type ConfigStatus =
  | "LOADING"
  | "READY"
  | "ERROR";

type UploadPanel =
  | "ARCHIVE"
  | "ROSTERS"
  | "PHOTOS"
  | null;


type TeamOwnerMap =
  Record<string, TeamOwner[]>;

type TeamAccessConfiguredMap =
  Record<string, boolean>;

const NEW_OWNER_VALUE =
  "__NEW_OWNER__";

function formatRecoveryPointReason(
  reason: string
): string {
  const labels: Record<string, string> = {
    CONFIRMED_AWARD:
      "Aggiudicazione confermata",
    MANUAL_ASSIGNMENT:
      "Assegnazione manuale",
    TECHNICAL_CORRECTION:
      "Correzione tecnica",
    SESSION_SUSPENDED:
      "Sessione sospesa",
    SESSION_COMPLETED:
      "Sessione completata",
    RECOVERY_RESTART:
      "Ripristino dopo riavvio",
    MANUAL_BACKUP:
      "Backup manuale",
    PRE_RESTORE:
      "Backup pre-ripristino"
  };

  return labels[reason] ?? reason;
}

function formatRecoveryPointIntegrity(
  status: string
): string {
  const labels: Record<string, string> = {
    VALID: "Valido",
    INVALID: "Non valido",
    UNCHECKED: "Non verificato",
    INCOMPATIBLE: "Incompatibile"
  };

  return labels[status] ?? status;
}

function formatBackupSize(
  sizeBytes: number
): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const kilobytes =
    sizeBytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} kB`;
  }

  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

function formatBackupDate(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "it-IT",
    {
      dateStyle: "short",
      timeStyle: "medium"
    }
  ).format(date);
}

function formatInitialRosterDate(
  value: string
): string {
  const normalizedValue =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
      value
    )
      ? `${value.replace(" ", "T")}Z`
      : value;

  const date =
    new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "it-IT",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Rome"
    }
  ).format(date);
}

type SessionEditDraft = {
  season: string;
  editionNumber: string;
  initialCredits: string;
  maximumInitialRosterEntries: string;
};

type SessionCreateDraft = {
  leagueId: string;
  season: string;
  editionNumber: string;
  initialCredits: string;
  maximumInitialRosterEntries: string;
};

type LeagueEditMode =
  | "CREATE"
  | "EDIT";

type LeagueEditDraft = {
  name: string;
  logoFile: File | null;
};

type TeamEditDraft = {
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logoFile: File | null;
  primaryOwnerId: string;
  primaryOwnerNewName: string;
  secondaryOwnerId: string;
  secondaryOwnerNewName: string;
};

export function AdminConfigApp() {
  const [
    status,
    setStatus
  ] = useState<ConfigStatus>(
    "LOADING"
  );

  const [
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(
    null
  );

  const [
    session,
    setSession
  ] = useState<AuctionSession | null>(
    null
  );

  const [
    sessions,
    setSessions
  ] = useState<AuctionSession[]>([]);

  const [
    leagues,
    setLeagues
  ] = useState<League[]>([]);

  const [
    sessionEditDraft,
    setSessionEditDraft
  ] = useState<SessionEditDraft | null>(
    null
  );

  const [
    sessionEditPending,
    setSessionEditPending
  ] = useState(false);

  const [
    sessionEditError,
    setSessionEditError
  ] = useState<string | null>(
    null
  );

  const [
    sessionCreateDraft,
    setSessionCreateDraft
  ] = useState<SessionCreateDraft | null>(
    null
  );

  const [
    sessionCreatePending,
    setSessionCreatePending
  ] = useState(false);

  const [
    sessionCreateError,
    setSessionCreateError
  ] = useState<string | null>(
    null
  );

  const [
    sessionReadiness,
    setSessionReadiness
  ] = useState<
    Awaited<
      ReturnType<
        typeof fetchAuctionSessionReadiness
      >
    > | null
  >(null);

  const [
    sessionReadinessLoading,
    setSessionReadinessLoading
  ] = useState(false);

  const [
    sessionReadinessError,
    setSessionReadinessError
  ] = useState<string | null>(null);

  const [
    sessionReadyPending,
    setSessionReadyPending
  ] = useState(false);

  const [
    sessionReadyError,
    setSessionReadyError
  ] = useState<string | null>(null);


  const [
    recoveryPoints,
    setRecoveryPoints
  ] = useState<
    Awaited<
      ReturnType<typeof fetchRecoveryPoints>
    >
  >([]);

  const [
    backupSectionExpanded,
    setBackupSectionExpanded
  ] = useState(false);

  const [
    recoveryPointsLoading,
    setRecoveryPointsLoading
  ] = useState(false);

  const [
    recoveryPointsError,
    setRecoveryPointsError
  ] = useState<string | null>(null);

  const [
    manualBackupPending,
    setManualBackupPending
  ] = useState(false);

  const [
    manualBackupSuccess,
    setManualBackupSuccess
  ] = useState<string | null>(null);

  const [
    deletingRecoveryPointFileName,
    setDeletingRecoveryPointFileName
  ] = useState<string | null>(null);

  const [
    recoveryPointDeleteSuccess,
    setRecoveryPointDeleteSuccess
  ] = useState<string | null>(null);

  const [
    restoringRecoveryPointFileName,
    setRestoringRecoveryPointFileName
  ] = useState<string | null>(null);

  const [
    recoveryPointRestoreSuccess,
    setRecoveryPointRestoreSuccess
  ] = useState<string | null>(null);

  const [
    teams,
    setTeams
  ] = useState<Team[]>([]);

  const [
    players,
    setPlayers
  ] = useState<Player[]>([]);

  const [
    uploadPanel,
    setUploadPanel
  ] = useState<UploadPanel>(
    null
  );


  const [
    initialRosterStatus,
    setInitialRosterStatus
  ] = useState<Awaited<
    ReturnType<typeof fetchInitialRosterStatus>
  > | null>(null);

  const [
    initialRosterOverview,
    setInitialRosterOverview
  ] = useState<Awaited<
    ReturnType<typeof fetchInitialRosterOverview>
  > | null>(null);

  const [
    playerPhotoCatalog,
    setPlayerPhotoCatalog
  ] = useState<Awaited<
    ReturnType<typeof fetchPlayerPhotoCatalog>
  > | null>(null);

  const [
    playerPhotoCatalogError,
    setPlayerPhotoCatalogError
  ] = useState<string | null>(null);

  const [
    playerPhotoFiles,
    setPlayerPhotoFiles
  ] = useState<File[]>([]);

  const [
    playerPhotoMode,
    setPlayerPhotoMode
  ] = useState<
    "KEEP" | "REPLACE"
  >("KEEP");

  const [
    playerPhotoImportPending,
    setPlayerPhotoImportPending
  ] = useState(false);

  const [
    playerPhotoDeletePending,
    setPlayerPhotoDeletePending
  ] = useState(false);

  const [
    playerPhotoSuccess,
    setPlayerPhotoSuccess
  ] = useState<string | null>(null);

  const [
    playerPhotoError,
    setPlayerPhotoError
  ] = useState<string | null>(null);

  const [
    playerPhotoIssues,
    setPlayerPhotoIssues
  ] = useState<
    {
      fileName: string;
      reason:
        | "INVALID_FILENAME"
        | "INVALID_PNG";
    }[]
  >([]);

  const [
    playerPhotoInputKey,
    setPlayerPhotoInputKey
  ] = useState(0);

  const [
    playerArchiveFile,
    setPlayerArchiveFile
  ] = useState<File | null>(null);

  const [
    playerArchivePending,
    setPlayerArchivePending
  ] = useState(false);

  const [
    playerArchiveError,
    setPlayerArchiveError
  ] = useState<string | null>(null);

  const [
    playerArchiveSuccess,
    setPlayerArchiveSuccess
  ] = useState<string | null>(null);

  const [
    initialRostersFile,
    setInitialRostersFile
  ] = useState<File | null>(null);

  const [
    initialRostersContent,
    setInitialRostersContent
  ] = useState<string | null>(null);

  const [
    initialRostersPreview,
    setInitialRostersPreview
  ] = useState<Awaited<
    ReturnType<typeof previewInitialRosters>
  > | null>(null);

  const [
    initialRostersPreviewPending,
    setInitialRostersPreviewPending
  ] = useState(false);

  const [
    initialRostersError,
    setInitialRostersError
  ] = useState<string | null>(null);

  const [
    initialRosterResolutions,
    setInitialRosterResolutions
  ] = useState<
    Record<
      number,
      InitialRosterResolutionChoice
    >
  >({});

  const [
    initialRostersImportPending,
    setInitialRostersImportPending
  ] = useState(false);

  const [
    initialRostersImportSuccess,
    setInitialRostersImportSuccess
  ] = useState<string | null>(null);

  const [
    initialRostersResetPending,
    setInitialRostersResetPending
  ] = useState(false);

  const [
    initialRostersResetSuccess,
    setInitialRostersResetSuccess
  ] = useState<string | null>(null);

  const [
    setupResetPending,
    setSetupResetPending
  ] = useState(false);

  const [
    setupResetError,
    setSetupResetError
  ] = useState<string | null>(null);

  const [
    developmentResetPending,
    setDevelopmentResetPending
  ] = useState(false);

  const [
    developmentResetError,
    setDevelopmentResetError
  ] = useState<string | null>(null);

  const [
    developmentResetSuccess,
    setDevelopmentResetSuccess
  ] = useState<string | null>(null);

  const [
    setupResetSuccess,
    setSetupResetSuccess
  ] = useState<string | null>(null);

  const [
    managedLeagueId,
    setManagedLeagueId
  ] = useState<string | null>(
    null
  );

  const [
    leagueEditMode,
    setLeagueEditMode
  ] = useState<LeagueEditMode | null>(
    null
  );

  const [
    leagueEditDraft,
    setLeagueEditDraft
  ] = useState<LeagueEditDraft | null>(
    null
  );

  const [
    leagueEditPending,
    setLeagueEditPending
  ] = useState(false);

  const [
    leagueEditError,
    setLeagueEditError
  ] = useState<string | null>(
    null
  );

  const [
    leagueLogoPreviewUrl,
    setLeagueLogoPreviewUrl
  ] = useState<string | null>(
    null
  );

  const [
    owners,
    setOwners
  ] = useState<Owner[]>([]);

  const [
    sessionTeams,
    setSessionTeams
  ] = useState<AuctionSessionTeam[]>(
    []
  );

  const [
    teamOwners,
    setTeamOwners
  ] = useState<TeamOwnerMap>({});

  const [
    teamAccessConfigured,
    setTeamAccessConfigured
  ] = useState<TeamAccessConfiguredMap>(
    {}
  );

  const [
    teamAccessLoading,
    setTeamAccessLoading
  ] = useState(false);

  const [
    teamAccessError,
    setTeamAccessError
  ] = useState<string | null>(
    null
  );

  const [
    editingTeamAccessId,
    setEditingTeamAccessId
  ] = useState<string | null>(
    null
  );

  const [
    teamAccessPinDraft,
    setTeamAccessPinDraft
  ] = useState("");

  const [
    teamAccessPinPending,
    setTeamAccessPinPending
  ] = useState(false);

  const [
    teamAccessPinError,
    setTeamAccessPinError
  ] = useState<string | null>(
    null
  );

  const [
    tableOrderPending,
    setTableOrderPending
  ] = useState(false);

  const [
    tableOrderError,
    setTableOrderError
  ] = useState<string | null>(
    null
  );

  const [
    editingTeamId,
    setEditingTeamId
  ] = useState<string | null>(
    null
  );

  const [
    teamCreateOpen,
    setTeamCreateOpen
  ] = useState(false);

  const [
    teamCreateName,
    setTeamCreateName
  ] = useState("");

  const [
    teamCreatePending,
    setTeamCreatePending
  ] = useState(false);

  const [
    teamCreateError,
    setTeamCreateError
  ] = useState<string | null>(
    null
  );

  const [
    teamEditDraft,
    setTeamEditDraft
  ] = useState<TeamEditDraft | null>(
    null
  );

  const [
    teamEditPending,
    setTeamEditPending
  ] = useState(false);

  const [
    teamEditError,
    setTeamEditError
  ] = useState<string | null>(
    null
  );

  const [
    teamLogoPreviewUrl,
    setTeamLogoPreviewUrl
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialRosterOverview() {
      if (!session) {
        setInitialRosterOverview(null);
        return;
      }

      try {
        const overview =
          await fetchInitialRosterOverview(
            session.id
          );

        if (!cancelled) {
          setInitialRosterOverview(
            overview
          );
        }
      } catch {
        if (!cancelled) {
          setInitialRosterOverview(
            null
          );
        }
      }
    }

    void loadInitialRosterOverview();

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialRosterStatus() {
      if (!session) {
        setInitialRosterStatus(null);
        return;
      }

      try {
        const loadedStatus =
          await fetchInitialRosterStatus(
            session.id
          );

        if (!cancelled) {
          setInitialRosterStatus(
            loadedStatus
          );
        }
      } catch {
        if (!cancelled) {
          setInitialRosterStatus(null);
        }
      }
    }

    void loadInitialRosterStatus();

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayerPhotoCatalog() {
      try {
        const catalog =
          await fetchPlayerPhotoCatalog();

        if (cancelled) {
          return;
        }

        setPlayerPhotoCatalog(
          catalog
        );
        setPlayerPhotoCatalogError(
          null
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPlayerPhotoCatalog(
          null
        );
        setPlayerPhotoCatalogError(
          error instanceof Error
            ? error.message
            : "Impossibile leggere il catalogo delle faccine"
        );
      }
    }

    void loadPlayerPhotoCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [
          availableSessions,
          availableLeagues
        ] = await Promise.all([
          fetchAuctionSessions(),
          fetchLeagues()
        ]);

        if (cancelled) {
          return;
        }

        const activeSession =
          availableSessions.find(
            (candidate) =>
              candidate.status === "READY" ||
              candidate.status === "RUNNING" ||
              candidate.status === "SUSPENDED"
          ) ??
          availableSessions.find(
            (candidate) =>
              candidate.status === "SETUP"
          ) ??
          null;

        setSessions(availableSessions);
        setSession(activeSession);
        setLeagues(availableLeagues);

        setManagedLeagueId(
          activeSession?.leagueId ??
            availableLeagues[0]?.id ??
            null
        );

        if (!activeSession) {
          setStatus("READY");
          return;
        }

        const [
          availableTeams,
          availableOwners,
          activeSessionTeams
        ] = await Promise.all([
          fetchTeamsByLeague(
            activeSession.leagueId
          ),
          fetchOwners(),
          fetchAuctionSessionTeams(
            activeSession.id
          )
        ]);

        if (cancelled) {
          return;
        }

        const ownerEntries =
          await Promise.all(
            availableTeams.map(
              async (team) => {
                const associations =
                  await fetchTeamOwners(
                    team.id
                  );

                return [
                  team.id,
                  associations
                ] as const;
              }
            )
          );

        if (cancelled) {
          return;
        }

        setTeams(availableTeams);
        setOwners(availableOwners);
        setSessionTeams(
          activeSessionTeams
        );
        setTeamOwners(
          Object.fromEntries(
            ownerEntries
          )
        );

        setStatus("READY");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento della configurazione."
        );

        setStatus("ERROR");
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const league =
    useMemo(
      () =>
        session
          ? leagues.find(
              (candidate) =>
                candidate.id ===
                session.leagueId
            ) ?? null
          : null,
      [
        leagues,
        session
      ]
    );

  const managedLeague =
    useMemo(
      () =>
        managedLeagueId
          ? leagues.find(
              (candidate) =>
                candidate.id ===
                  managedLeagueId
            ) ?? null
          : null,
      [
        leagues,
        managedLeagueId
      ]
    );

  const ownerById =
    useMemo(
      () =>
        new Map(
          owners.map(
            (owner) => [
              owner.id,
              owner
            ]
          )
        ),
      [owners]
    );

  const managedLeagueOwners =
    useMemo(
      () => {
        const ownerIds =
          new Set(
            teams.flatMap(
              (team) =>
                (
                  teamOwners[
                    team.id
                  ] ?? []
                ).map(
                  (association) =>
                    association.ownerId
                )
            )
          );

        return owners.filter(
          (owner) =>
            ownerIds.has(owner.id)
        );
      },
      [
        owners,
        teams,
        teamOwners
      ]
    );

  const sessionTeamByTeamId =
    useMemo(
      () =>
        new Map(
          sessionTeams.map(
            (sessionTeam) => [
              sessionTeam.teamId,
              sessionTeam
            ]
          )
        ),
      [sessionTeams]
    );

  const managedLeagueMatchesSession =
    Boolean(
      session &&
      managedLeagueId === session.leagueId
    );

  const sessionFormDraft =
    sessionCreateDraft ??
    sessionEditDraft;

  const sessionFormPending =
    sessionCreatePending ||
    sessionEditPending;

  const orderedTeams =
    useMemo(
      () =>
        [...teams].sort(
          (left, right) => {
            if (!managedLeagueMatchesSession) {
              return left.name.localeCompare(
                right.name,
                "it-IT"
              );
            }

            const leftOrder =
              sessionTeamByTeamId
                .get(left.id)
                ?.tableOrder ??
              Number.MAX_SAFE_INTEGER;

            const rightOrder =
              sessionTeamByTeamId
                .get(right.id)
                ?.tableOrder ??
              Number.MAX_SAFE_INTEGER;

            if (
              leftOrder !== rightOrder
            ) {
              return (
                leftOrder -
                rightOrder
              );
            }

            return left.name.localeCompare(
              right.name,
              "it-IT"
            );
          }
        ),
      [
        teams,
        managedLeagueMatchesSession,
        sessionTeamByTeamId
      ]
    );

  useEffect(() => {
    if (!session) {
      setSessionTeams([]);
      return;
    }

    let cancelled = false;

    setTableOrderError(null);

    void fetchAuctionSessionTeams(
      session.id
    )
      .then((loadedSessionTeams) => {
        if (!cancelled) {
          setSessionTeams(
            loadedSessionTeams
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSessionTeams([]);
          setTableOrderError(
            error instanceof Error
              ? error.message
              : "Errore durante il caricamento del Girotavolo."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    setEditingTeamAccessId(null);
    setTeamAccessPinDraft("");
    setTeamAccessPinError(null);

    if (!session) {
      setTeamAccessConfigured({});
      setTeamAccessError(null);
      setTeamAccessLoading(false);
      return;
    }

    let cancelled = false;

    setTeamAccessLoading(true);
    setTeamAccessError(null);

    void fetchTeamAccessStatus(
      session.id
    )
      .then((statuses) => {
        if (cancelled) {
          return;
        }

        setTeamAccessConfigured(
          Object.fromEntries(
            statuses.map(
              (status) => [
                status.auctionSessionTeamId,
                status.configured
              ]
            )
          )
        );
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setTeamAccessConfigured({});
        setTeamAccessError(
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento degli accessi /remote."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setTeamAccessLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    if (!managedLeagueId) {
      setTeams([]);
      setTeamOwners({});
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const [
          availableTeams,
          availableOwners
        ] = await Promise.all([
          fetchTeamsByLeague(
            managedLeagueId
          ),
          fetchOwners()
        ]);

        const ownerEntries =
          await Promise.all(
            availableTeams.map(
              async (team) => {
                const associations =
                  await fetchTeamOwners(
                    team.id
                  );

                return [
                  team.id,
                  associations
                ] as const;
              }
            )
          );

        if (cancelled) {
          return;
        }

        setTeams(availableTeams);
        setOwners(availableOwners);
        setTeamOwners(
          Object.fromEntries(
            ownerEntries
          )
        );

        setEditingTeamId(null);
        setTeamEditDraft(null);
        setTeamEditError(null);
        setTeamCreateOpen(false);
        setTeamCreateName("");
        setTeamCreateError(null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Errore durante il caricamento delle squadre della lega."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [managedLeagueId]);

  function beginSessionCreate(): void {
    if (
      !managedLeague ||
      teams.length !== 8 ||
      sessionCreatePending ||
      sessionEditDraft !== null
    ) {
      return;
    }

    setSessionCreateError(null);

    setSessionCreateDraft({
      leagueId: managedLeague.id,
      season: session?.season ?? "",
      editionNumber: session
        ? String(session.editionNumber + 1)
        : "",
      initialCredits: session
        ? String(session.initialCredits)
        : "300",
      maximumInitialRosterEntries:
        session
          ? String(
              session.maximumInitialRosterEntries
            )
          : "11"
    });
  }

  function cancelSessionCreate(): void {
    if (sessionCreatePending) {
      return;
    }

    setSessionCreateDraft(null);
    setSessionCreateError(null);
  }

  async function saveSessionCreate():
    Promise<void> {
    if (
      !sessionCreateDraft ||
      sessionCreatePending
    ) {
      return;
    }

    const season =
      sessionCreateDraft.season.trim();

    const editionNumber =
      Number(
        sessionCreateDraft.editionNumber
      );

    const initialCredits =
      Number(
        sessionCreateDraft.initialCredits
      );

    const maximumInitialRosterEntries =
      Number(
        sessionCreateDraft
          .maximumInitialRosterEntries
      );

    if (!season) {
      setSessionCreateError(
        "Inserisci la stagione."
      );
      return;
    }

    if (
      !Number.isInteger(editionNumber) ||
      editionNumber <= 0
    ) {
      setSessionCreateError(
        "L'edizione deve essere un numero intero positivo."
      );
      return;
    }

    if (
      !Number.isInteger(initialCredits) ||
      initialCredits < 0
    ) {
      setSessionCreateError(
        "I crediti iniziali devono essere un numero intero non negativo."
      );
      return;
    }

    if (
      !Number.isInteger(
        maximumInitialRosterEntries
      ) ||
      maximumInitialRosterEntries < 0 ||
      maximumInitialRosterEntries > 24
    ) {
      setSessionCreateError(
        "Il numero massimo di confermati deve essere compreso tra 0 e 24."
      );
      return;
    }

    setSessionCreatePending(true);
    setSessionCreateError(null);

    try {
      const result =
        await createAuctionSessionSetup({
          leagueId: sessionCreateDraft.leagueId,
          season,
          editionNumber,
          initialCredits,
          maximumInitialRosterEntries
        });

      setSessions(
        (currentSessions) => [
          ...currentSessions,
          result.session
        ]
      );

      setSession(result.session);
      setSessionTeams(
        result.sessionTeams
      );
      setManagedLeagueId(
        result.session.leagueId
      );

      setSessionEditDraft(null);
      setSessionEditError(null);
      setSessionReadyError(null);
      setTableOrderError(null);
      setSessionCreateDraft(null);
    } catch (error) {
      setSessionCreateError(
        error instanceof Error
          ? error.message
          : "Errore durante la creazione della sessione."
      );
    } finally {
      setSessionCreatePending(false);
    }
  }

  function beginTeamAccessEdit(
    auctionSessionTeamId: string
  ): void {
    if (teamAccessPinPending) {
      return;
    }

    setEditingTeamAccessId(
      auctionSessionTeamId
    );
    setTeamAccessPinDraft("");
    setTeamAccessPinError(null);
  }

  function cancelTeamAccessEdit(): void {
    if (teamAccessPinPending) {
      return;
    }

    setEditingTeamAccessId(null);
    setTeamAccessPinDraft("");
    setTeamAccessPinError(null);
  }

  async function saveTeamAccessPin(): Promise<void> {
    if (
      !editingTeamAccessId ||
      teamAccessPinPending
    ) {
      return;
    }

    if (!/^\d{4}$/.test(teamAccessPinDraft)) {
      setTeamAccessPinError(
        "Il PIN deve contenere esattamente 4 cifre."
      );
      return;
    }

    setTeamAccessPinPending(true);
    setTeamAccessPinError(null);

    try {
      await setTeamAccessPin(
        editingTeamAccessId,
        teamAccessPinDraft
      );

      setTeamAccessConfigured(
        (current) => ({
          ...current,
          [editingTeamAccessId]: true
        })
      );

      setEditingTeamAccessId(null);
      setTeamAccessPinDraft("");
    } catch (error) {
      setTeamAccessPinError(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio del PIN."
      );
    } finally {
      setTeamAccessPinPending(false);
    }
  }

  function beginSessionEdit(): void {
    if (
      !session ||
      sessionEditPending
    ) {
      return;
    }

    setSessionEditError(null);

    setSessionEditDraft({
      season: session.season,
      editionNumber:
        String(session.editionNumber),
      initialCredits:
        String(session.initialCredits),
      maximumInitialRosterEntries:
        String(
          session.maximumInitialRosterEntries
        )
    });
  }

  function cancelSessionEdit(): void {
    if (sessionEditPending) {
      return;
    }

    setSessionEditDraft(null);
    setSessionEditError(null);
  }

  useEffect(() => {
    if (!session) {
      setSessionReadiness(null);
      setSessionReadinessError(null);
      setSessionReadinessLoading(false);
      return;
    }

    let cancelled = false;

    setSessionReadinessLoading(true);
    setSessionReadinessError(null);

    void fetchAuctionSessionReadiness(
      session.id
    )
      .then((readiness) => {
        if (!cancelled) {
          setSessionReadiness(readiness);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSessionReadiness(null);
          setSessionReadinessError(
            error instanceof Error
              ? error.message
              : "Errore durante il controllo della prontezza della sessione."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSessionReadinessLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    session?.id,
    session?.status,
    session?.initialCredits,
    session?.maximumInitialRosterEntries,
    sessionTeams,
    teams,
    teamOwners,
    players
  ]);

  useEffect(() => {
    if (!session) {
      setRecoveryPoints([]);
      setRecoveryPointsError(null);
      return;
    }

    let cancelled = false;

    setRecoveryPointsLoading(true);
    setRecoveryPointsError(null);

    void fetchRecoveryPoints(
      session.id
    )
      .then((items) => {
        if (!cancelled) {
          setRecoveryPoints(items);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRecoveryPoints([]);
          setRecoveryPointsError(
            error instanceof Error
              ? error.message
              : "Errore durante il caricamento dei backup."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecoveryPointsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    if (!session) {
      setPlayers([]);
      return;
    }

    let cancelled = false;

    void fetchPlayers(
      session.id
    )
      .then((loadedPlayers) => {
        if (!cancelled) {
          setPlayers(loadedPlayers);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlayers([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  async function saveSessionEdit(): Promise<void> {
    if (
      !session ||
      !sessionEditDraft ||
      sessionEditPending
    ) {
      return;
    }

    const season =
      sessionEditDraft.season.trim();

    const editionNumber =
      Number(
        sessionEditDraft.editionNumber
      );

    const initialCredits =
      Number(
        sessionEditDraft.initialCredits
      );

    const maximumInitialRosterEntries =
      Number(
        sessionEditDraft
          .maximumInitialRosterEntries
      );

    if (!season) {
      setSessionEditError(
        "Inserisci la stagione."
      );
      return;
    }

    if (
      !Number.isInteger(editionNumber) ||
      editionNumber <= 0
    ) {
      setSessionEditError(
        "L'edizione deve essere un numero intero positivo."
      );
      return;
    }

    if (
      !Number.isInteger(initialCredits) ||
      initialCredits < 0
    ) {
      setSessionEditError(
        "I crediti iniziali devono essere un numero intero non negativo."
      );
      return;
    }

    if (
      !Number.isInteger(
        maximumInitialRosterEntries
      ) ||
      maximumInitialRosterEntries < 0 ||
      maximumInitialRosterEntries > 24
    ) {
      setSessionEditError(
        "Il numero massimo di confermati deve essere compreso tra 0 e 24."
      );
      return;
    }

    setSessionEditPending(true);
    setSessionEditError(null);

    try {
      const updatedSession =
        await updateAuctionSession(
          session.id,
          {
            season,
            editionNumber,
            initialCredits,
            maximumInitialRosterEntries
          }
        );

      setSession(updatedSession);

      setSessions(
        (currentSessions) =>
          currentSessions.map(
            (currentSession) =>
              currentSession.id ===
                updatedSession.id
                ? updatedSession
                : currentSession
          )
      );

      setSessionEditDraft(null);
    } catch (error) {
      setSessionEditError(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio della sessione."
      );
    } finally {
      setSessionEditPending(false);
    }
  }

  async function handleMarkSessionReady():
    Promise<void> {
    if (
      !session ||
      session.status !== "SETUP" ||
      !sessionReadiness?.ready ||
      sessionReadyPending
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Confermi il completamento della configurazione? La sessione passerà da SETUP a READY."
      );

    if (!confirmed) {
      return;
    }

    setSessionReadyPending(true);
    setSessionReadyError(null);

    try {
      const updatedSession =
        await markAuctionSessionReady(
          session.id
        );

      setSession(updatedSession);

      setSessions(
        (currentSessions) =>
          currentSessions.map(
            (currentSession) =>
              currentSession.id ===
                updatedSession.id
                ? updatedSession
                : currentSession
          )
      );

      const refreshedReadiness =
        await fetchAuctionSessionReadiness(
          updatedSession.id
        );

      setSessionReadiness(
        refreshedReadiness
      );
    } catch (error) {
      setSessionReadyError(
        error instanceof Error
          ? error.message
          : "Errore durante il passaggio della sessione a READY."
      );
    } finally {
      setSessionReadyPending(false);
    }
  }

  function clearLeagueLogoPreview(): void {
    if (leagueLogoPreviewUrl) {
      URL.revokeObjectURL(
        leagueLogoPreviewUrl
      );
    }

    setLeagueLogoPreviewUrl(null);
  }

  function selectLeagueLogoFile(
    file: File | null
  ): void {
    clearLeagueLogoPreview();

    const previewUrl =
      file
        ? URL.createObjectURL(file)
        : null;

    setLeagueLogoPreviewUrl(
      previewUrl
    );

    setLeagueEditDraft(
      (current) =>
        current
          ? {
              ...current,
              logoFile: file
            }
          : current
    );
  }

  function beginCreateLeague(): void {
    if (leagueEditPending) {
      return;
    }

    clearLeagueLogoPreview();

    setLeagueEditError(null);
    setLeagueEditMode("CREATE");
    setLeagueEditDraft({
      name: "",
      logoFile: null
    });
  }

  function beginEditLeague(): void {
    if (
      !managedLeague ||
      leagueEditPending
    ) {
      return;
    }

    clearLeagueLogoPreview();

    setLeagueEditError(null);
    setLeagueEditMode("EDIT");
    setLeagueEditDraft({
      name: managedLeague.name,
      logoFile: null
    });
  }

  function cancelLeagueEdit(): void {
    if (leagueEditPending) {
      return;
    }

    clearLeagueLogoPreview();

    setLeagueEditMode(null);
    setLeagueEditDraft(null);
    setLeagueEditError(null);
  }

  async function saveLeagueEdit(): Promise<void> {
    if (
      !leagueEditMode ||
      !leagueEditDraft ||
      leagueEditPending
    ) {
      return;
    }

    const name =
      leagueEditDraft.name.trim();

    if (!name) {
      setLeagueEditError(
        "Inserisci il nome della lega."
      );
      return;
    }

    setLeagueEditPending(true);
    setLeagueEditError(null);

    try {
      let savedLeague: League;

      if (leagueEditMode === "CREATE") {
        savedLeague =
          await createLeague({
            name
          });
      } else {
        if (!managedLeague) {
          throw new Error(
            "Lega da modificare non disponibile."
          );
        }

        savedLeague =
          await updateLeague(
            managedLeague.id,
            {
              name
            }
          );
      }

      if (leagueEditDraft.logoFile) {
        savedLeague =
          await uploadLeagueLogo(
            savedLeague.id,
            leagueEditDraft.logoFile
          );
      }

      const refreshedLeagues =
        await fetchLeagues();

      setLeagues(
        refreshedLeagues
      );

      setManagedLeagueId(
        savedLeague.id
      );

      clearLeagueLogoPreview();

      setLeagueEditMode(null);
      setLeagueEditDraft(null);
    } catch (error) {
      setLeagueEditError(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio della lega."
      );
    } finally {
      setLeagueEditPending(false);
    }
  }

  async function moveTeam(
    teamId: string,
    direction: -1 | 1
  ): Promise<void> {
    if (
      !session ||
      tableOrderPending
    ) {
      return;
    }

    const currentIndex =
      orderedTeams.findIndex(
        (team) =>
          team.id === teamId
      );

    if (currentIndex < 0) {
      return;
    }

    const targetIndex =
      currentIndex + direction;

    if (
      targetIndex < 0 ||
      targetIndex >=
        orderedTeams.length
    ) {
      return;
    }

    const reorderedTeams =
      [...orderedTeams];

    const currentTeam =
      reorderedTeams[
        currentIndex
      ];

    const targetTeam =
      reorderedTeams[
        targetIndex
      ];

    if (
      !currentTeam ||
      !targetTeam
    ) {
      return;
    }

    reorderedTeams[
      currentIndex
    ] = targetTeam;

    reorderedTeams[
      targetIndex
    ] = currentTeam;

    setTableOrderPending(true);
    setTableOrderError(null);

    try {
      const reorderedSessionTeams =
        await reorderAuctionSessionTeams(
          session.id,
          reorderedTeams.map(
            (team) => team.id
          )
        );

      setSessionTeams(
        reorderedSessionTeams
      );
    } catch (error) {
      setTableOrderError(
        error instanceof Error
          ? error.message
          : "Errore durante il riordino del girotavolo."
      );
    } finally {
      setTableOrderPending(false);
    }
  }

  function selectTeamLogoFile(
    file: File | null
  ): void {
    if (teamLogoPreviewUrl) {
      URL.revokeObjectURL(
        teamLogoPreviewUrl
      );
    }

    const previewUrl =
      file
        ? URL.createObjectURL(file)
        : null;

    setTeamLogoPreviewUrl(
      previewUrl
    );

    setTeamEditDraft(
      (current) =>
        current
          ? {
              ...current,
              logoFile: file
            }
          : current
    );
  }

  function beginTeamCreate(): void {
    if (
      !managedLeague ||
      teamCreatePending ||
      teamEditPending
    ) {
      return;
    }

    setTeamCreateName("");
    setTeamCreateError(null);
    setTeamCreateOpen(true);
  }

  function cancelTeamCreate(): void {
    if (teamCreatePending) {
      return;
    }

    setTeamCreateOpen(false);
    setTeamCreateName("");
    setTeamCreateError(null);
  }

  async function saveTeamCreate(): Promise<void> {
    if (
      !managedLeague ||
      teamCreatePending
    ) {
      return;
    }

    const name = teamCreateName.trim();

    if (!name) {
      setTeamCreateError(
        "Inserisci il nome della squadra."
      );
      return;
    }

    setTeamCreatePending(true);
    setTeamCreateError(null);

    try {
      const createdTeam =
        await createTeam({
          leagueId: managedLeague.id,
          name
        });

      const refreshedTeams =
        await fetchTeamsByLeague(
          managedLeague.id
        );

      setTeams(refreshedTeams);
      setTeamOwners(
        (current) => ({
          ...current,
          [createdTeam.id]: []
        })
      );

      setTeamCreateOpen(false);
      setTeamCreateName("");

      beginTeamEdit(createdTeam);
    } catch (error) {
      setTeamCreateError(
        error instanceof Error
          ? error.message
          : "Errore durante la creazione della squadra."
      );
    } finally {
      setTeamCreatePending(false);
    }
  }

  function beginTeamEdit(
    team: Team
  ): void {
    const associations =
      teamOwners[team.id] ?? [];

    const primary =
      associations.find(
        (association) =>
          association.isPrimary
      );

    const secondary =
      associations.find(
        (association) =>
          !association.isPrimary
      );

    if (teamLogoPreviewUrl) {
      URL.revokeObjectURL(
        teamLogoPreviewUrl
      );
    }

    setTeamLogoPreviewUrl(null);
    setEditingTeamId(team.id);
    setTeamEditError(null);

    setTeamEditDraft({
      name: team.name,
      shortName:
        team.shortName ?? "",
      primaryColor:
        team.primaryColor ?? "#1976D2",
      secondaryColor:
        team.secondaryColor ?? "#FFFFFF",
      logoFile: null,
      primaryOwnerId:
        primary?.ownerId ?? "",
      primaryOwnerNewName: "",
      secondaryOwnerId:
        secondary?.ownerId ?? "",
      secondaryOwnerNewName: ""
    });
  }

  function cancelTeamEdit(): void {
    if (teamEditPending) {
      return;
    }

    if (teamLogoPreviewUrl) {
      URL.revokeObjectURL(
        teamLogoPreviewUrl
      );
    }

    setTeamLogoPreviewUrl(null);
    setEditingTeamId(null);
    setTeamEditDraft(null);
    setTeamEditError(null);
  }

  async function resolveOwnerId(
    selectedOwnerId: string,
    newOwnerName: string
  ): Promise<string | null> {
    if (!selectedOwnerId) {
      return null;
    }

    if (
      selectedOwnerId !==
      NEW_OWNER_VALUE
    ) {
      return selectedOwnerId;
    }

    const name =
      newOwnerName.trim();

    if (!name) {
      throw new Error(
        "Inserisci il nome del nuovo Presidente."
      );
    }

    const owner =
      await createOwner({
        name
      });

    return owner.id;
  }

  async function saveTeamEdit(
    team: Team
  ): Promise<void> {
    if (
      !teamEditDraft ||
      editingTeamId !== team.id ||
      teamEditPending
    ) {
      return;
    }

    const name =
      teamEditDraft.name.trim();

    if (!name) {
      setTeamEditError(
        "Il nome della squadra è obbligatorio."
      );
      return;
    }

    const hexColorPattern =
      /^#[0-9A-Fa-f]{6}$/;

    if (
      !hexColorPattern.test(
        teamEditDraft.primaryColor
      ) ||
      !hexColorPattern.test(
        teamEditDraft.secondaryColor
      )
    ) {
      setTeamEditError(
        "I colori devono essere nel formato #RRGGBB."
      );
      return;
    }

    setTeamEditPending(true);
    setTeamEditError(null);

    try {
      const primaryOwnerId =
        await resolveOwnerId(
          teamEditDraft.primaryOwnerId,
          teamEditDraft
            .primaryOwnerNewName
        );

      if (!primaryOwnerId) {
        throw new Error(
          "Seleziona il Presidente principale."
        );
      }

      const secondaryOwnerId =
        await resolveOwnerId(
          teamEditDraft.secondaryOwnerId,
          teamEditDraft
            .secondaryOwnerNewName
        );

      if (
        secondaryOwnerId &&
        secondaryOwnerId ===
          primaryOwnerId
      ) {
        throw new Error(
          "Presidente e co-presidente devono essere persone diverse."
        );
      }

      let updatedTeam =
        await updateTeam(
          team.id,
          {
            name,
            shortName:
              teamEditDraft.shortName
                .trim() || null,
            primaryColor:
              teamEditDraft.primaryColor
                .toUpperCase(),
            secondaryColor:
              teamEditDraft.secondaryColor
                .toUpperCase()
          }
        );

      if (
        teamEditDraft.logoFile
      ) {
        updatedTeam =
          await uploadTeamLogo(
            team.id,
            teamEditDraft.logoFile
          );
      }

      const currentAssociations =
        teamOwners[team.id] ?? [];

      const desiredOwnerIds =
        new Set(
          [
            primaryOwnerId,
            secondaryOwnerId
          ].filter(
            (
              ownerId
            ): ownerId is string =>
              Boolean(ownerId)
          )
        );

      for (
        const association
        of currentAssociations
      ) {
        if (
          !desiredOwnerIds.has(
            association.ownerId
          )
        ) {
          await deleteTeamOwner(
            team.id,
            association.ownerId
          );
        }
      }

      const primaryAssociation =
        currentAssociations.find(
          (association) =>
            association.ownerId ===
            primaryOwnerId
        );

      if (primaryAssociation) {
        if (
          !primaryAssociation.isPrimary
        ) {
          await updateTeamOwner(
            team.id,
            primaryOwnerId,
            {
              isPrimary: true
            }
          );
        }
      } else {
        await createTeamOwner(
          team.id,
          {
            ownerId:
              primaryOwnerId,
            isPrimary: true
          }
        );
      }

      if (secondaryOwnerId) {
        const secondaryAssociation =
          currentAssociations.find(
            (association) =>
              association.ownerId ===
              secondaryOwnerId
          );

        if (secondaryAssociation) {
          if (
            secondaryAssociation.isPrimary
          ) {
            await updateTeamOwner(
              team.id,
              secondaryOwnerId,
              {
                isPrimary: false
              }
            );
          }
        } else {
          await createTeamOwner(
            team.id,
            {
              ownerId:
                secondaryOwnerId,
              isPrimary: false
            }
          );
        }
      }

      const [
        refreshedOwners,
        refreshedAssociations
      ] = await Promise.all([
        fetchOwners(),
        fetchTeamOwners(
          team.id
        )
      ]);

      setTeams(
        (currentTeams) =>
          currentTeams.map(
            (currentTeam) =>
              currentTeam.id ===
              updatedTeam.id
                ? updatedTeam
                : currentTeam
          )
      );

      setOwners(
        refreshedOwners
      );

      setTeamOwners(
        (current) => ({
          ...current,
          [team.id]:
            refreshedAssociations
        })
      );

      if (teamLogoPreviewUrl) {
        URL.revokeObjectURL(
          teamLogoPreviewUrl
        );
      }

      setTeamLogoPreviewUrl(null);
      setEditingTeamId(null);
      setTeamEditDraft(null);
    } catch (error) {
      setTeamEditError(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio della squadra."
      );
    } finally {
      setTeamEditPending(false);
    }
  }

  const playerRoleCounts = {
    P: players.filter(
      (player) => player.role === "P"
    ).length,
    D: players.filter(
      (player) => player.role === "D"
    ).length,
    C: players.filter(
      (player) => player.role === "C"
    ).length,
    A: players.filter(
      (player) => player.role === "A"
    ).length
  };

  async function handleRecoveryPointRestore(
    fileName: string
  ): Promise<void> {
    if (!session) {
      return;
    }

    if (session.status !== "SUSPENDED") {
      setRecoveryPointsError(
        "Il ripristino è consentito solo con la sessione sospesa."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `ATTENZIONE: stai per ripristinare il database dal recovery point "${fileName}". Lo stato corrente verrà sostituito e l'applicazione dovrà riavviarsi. Prima del ripristino verrà creato automaticamente un backup PRE_RESTORE. Continuare?`
      );

    if (!confirmed) {
      return;
    }

    setRestoringRecoveryPointFileName(
      fileName
    );
    setRecoveryPointsError(null);
    setRecoveryPointRestoreSuccess(null);
    setRecoveryPointDeleteSuccess(null);
    setManualBackupSuccess(null);

    try {
      const result =
        await restoreRecoveryPoint(
          session.id,
          fileName
        );

      setRecoveryPointRestoreSuccess(
        `Ripristino preparato: ${result.fileName}. Riavvio applicazione richiesto.`
      );
    } catch (error) {
      setRecoveryPointsError(
        error instanceof Error
          ? error.message
          : "Errore durante la preparazione del ripristino."
      );

      setRestoringRecoveryPointFileName(
        null
      );
    }
  }

  async function handleRecoveryPointDelete(
    fileName: string
  ): Promise<void> {
    if (!session) {
      return;
    }

    const confirmed =
      window.confirm(
        `Confermi la cancellazione definitiva del recovery point "${fileName}"? Verranno eliminati sia il file SQLite sia il relativo manifest.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingRecoveryPointFileName(
      fileName
    );
    setRecoveryPointsError(null);
    setRecoveryPointDeleteSuccess(null);
    setManualBackupSuccess(null);

    try {
      const result =
        await deleteRecoveryPoint(
          session.id,
          fileName
        );

      const refreshed =
        await fetchRecoveryPoints(
          session.id
        );

      setRecoveryPoints(refreshed);

      setRecoveryPointDeleteSuccess(
        `Recovery point cancellato: ${result.fileName}`
      );
    } catch (error) {
      setRecoveryPointsError(
        error instanceof Error
          ? error.message
          : "Errore durante la cancellazione del recovery point."
      );
    } finally {
      setDeletingRecoveryPointFileName(
        null
      );
    }
  }

  async function handleManualBackup():
    Promise<void> {
    if (!session) {
      return;
    }

    setManualBackupPending(true);
    setManualBackupSuccess(null);
    setRecoveryPointsError(null);

    try {
      const backup =
        await createManualBackup(
          session.id
        );

      const refreshed =
        await fetchRecoveryPoints(
          session.id
        );

      setRecoveryPoints(refreshed);

      setManualBackupSuccess(
        `Backup manuale creato: ${backup.database.fileName}`
      );
    } catch (error) {
      setRecoveryPointsError(
        error instanceof Error
          ? error.message
          : "Errore durante la creazione del backup manuale."
      );
    } finally {
      setManualBackupPending(false);
    }
  }

  async function handleDevelopmentSessionReset():
    Promise<void> {
    if (!session) {
      return;
    }

    if (session.status === "CLOSED") {
      setDevelopmentResetError(
        "Una sessione CLOSED non può essere riportata a SETUP."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "ATTENZIONE: RESET COMPLETO SESSIONE. Verranno cancellati archivio giocatori, rose, chiamate d'asta, eventi, comandi e altri dati operativi. La sessione tornerà a SETUP con stateVersion 0 e i crediti torneranno al valore iniziale. Questa operazione è pensata per sviluppo e prove. Continuare?"
      );

    if (!confirmed) {
      return;
    }

    setDevelopmentResetPending(true);
    setDevelopmentResetError(null);
    setDevelopmentResetSuccess(null);
    setSetupResetError(null);
    setSetupResetSuccess(null);
    setPlayerArchiveError(null);
    setPlayerArchiveSuccess(null);

    try {
      const result =
        await resetDevelopmentSession(
          session.id
        );

      const [
        refreshedSessions,
        refreshedPlayers,
        refreshedSessionTeams
      ] = await Promise.all([
        fetchAuctionSessions(),
        fetchPlayers(session.id),
        fetchAuctionSessionTeams(
          session.id
        )
      ]);

      const refreshedSession =
        refreshedSessions.find(
          (candidate) =>
            candidate.id === session.id
        ) ?? null;

      if (refreshedSession) {
        setSession(refreshedSession);
      }

      setPlayers(refreshedPlayers);
      setSessionTeams(
        refreshedSessionTeams
      );
      setPlayerArchiveFile(null);

      setDevelopmentResetSuccess(
        `Reset completo eseguito: ${result.deletedPlayers} giocatori, ${result.deletedRosterEntries} elementi rosa, ${result.deletedAuctionCalls} chiamate, ${result.deletedAuctionEvents} eventi e ${result.deletedCommands} comandi eliminati`
      );
    } catch (error) {
      setDevelopmentResetError(
        error instanceof Error
          ? error.message
          : "Errore durante il reset completo della sessione"
      );
    } finally {
      setDevelopmentResetPending(false);
    }
  }

  async function handleSetupDataReset():
    Promise<void> {
    if (!session) {
      return;
    }

    if (session.status !== "SETUP") {
      setSetupResetError(
        "Il reset archivio e rose è consentito solo in stato SETUP."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "ATTENZIONE: questa operazione cancellerà l'archivio giocatori e tutte le rose iniziali della sessione. I crediti delle squadre torneranno al valore iniziale. Continuare?"
      );

    if (!confirmed) {
      return;
    }

    setSetupResetPending(true);
    setSetupResetError(null);
    setSetupResetSuccess(null);
    setPlayerArchiveError(null);
    setPlayerArchiveSuccess(null);

    try {
      const result =
        await resetSetupData(
          session.id
        );

      const [
        refreshedPlayers,
        refreshedSessionTeams
      ] = await Promise.all([
        fetchPlayers(session.id),
        fetchAuctionSessionTeams(
          session.id
        )
      ]);

      setPlayers(refreshedPlayers);
      setSessionTeams(
        refreshedSessionTeams
      );
      setPlayerArchiveFile(null);

      setSetupResetSuccess(
        `Reset completato: ${result.deletedPlayers} giocatori e ${result.deletedRosterEntries} elementi rosa eliminati`
      );
    } catch (error) {
      setSetupResetError(
        error instanceof Error
          ? error.message
          : "Errore durante il reset di archivio e rose"
      );
    } finally {
      setSetupResetPending(false);
    }
  }

  async function handleInitialRostersPreview():
    Promise<void> {
    if (
      !session ||
      !initialRostersFile
    ) {
      return;
    }

    setInitialRostersPreviewPending(true);
    setInitialRostersError(null);
    setInitialRostersPreview(null);
    setInitialRosterResolutions({});
    setInitialRostersImportSuccess(null);

    try {
      const content =
        await initialRostersFile.text();

      const preview =
        await previewInitialRosters(
          session.id,
          content
        );

      setInitialRostersContent(content);
      setInitialRostersPreview(preview);
    } catch (error) {
      setInitialRostersContent(null);
      setInitialRostersPreview(null);

      setInitialRostersError(
        error instanceof Error
          ? error.message
          : "Errore durante l'analisi delle rose iniziali"
      );
    } finally {
      setInitialRostersPreviewPending(false);
    }
  }

  async function handleInitialRostersReset():
    Promise<void> {
    if (!session) {
      return;
    }

    if (session.status !== "SETUP") {
      setInitialRostersError(
        "Il reset delle rose iniziali è consentito solo in stato SETUP."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Confermi il RESET delle sole rose iniziali? L'archivio giocatori FMS sarà conservato. Le rose verranno cancellate, i giocatori coinvolti torneranno disponibili e i crediti delle squadre torneranno al valore iniziale."
      );

    if (!confirmed) {
      return;
    }

    setInitialRostersResetPending(true);
    setInitialRostersError(null);
    setInitialRostersResetSuccess(null);
    setInitialRostersImportSuccess(null);

    try {
      const result =
        await resetInitialRosters(
          session.id
        );

      const [
        refreshedPlayers,
        refreshedSessionTeams
      ] = await Promise.all([
        fetchPlayers(session.id),
        fetchAuctionSessionTeams(
          session.id
        )
      ]);

      setPlayers(refreshedPlayers);
      setSessionTeams(
        refreshedSessionTeams
      );

      setInitialRosterStatus(
        await fetchInitialRosterStatus(
          session.id
        )
      );

      setInitialRostersPreview(null);
      setInitialRostersContent(null);
      setInitialRostersFile(null);
      setInitialRosterResolutions({});

      setInitialRostersResetSuccess(
        `Reset completato: ${result.deletedRosterEntries} elementi rosa eliminati, ${result.resetPlayers} giocatori resi disponibili, ${result.resetTeams} squadre riportate ai crediti iniziali`
      );
    } catch (error) {
      setInitialRostersError(
        error instanceof Error
          ? error.message
          : "Errore durante il reset delle rose iniziali"
      );
    } finally {
      setInitialRostersResetPending(false);
    }
  }

  async function handleInitialRostersImport():
    Promise<void> {
    if (
      !session ||
      !initialRostersContent ||
      !initialRostersPreview
    ) {
      return;
    }

    const unresolvedParserIssues =
      initialRostersPreview.parserIssues.filter(
        (issue) => {
          if (
            issue.code !==
            "INVALID_CONTRACT_YEAR"
          ) {
            return true;
          }

          return (
            initialRosterResolutions[
              issue.rowNumber
            ] === undefined
          );
        }
      );

    if (
      unresolvedParserIssues.length > 0 ||
      initialRostersPreview
        .planningIssues.length > 0
    ) {
      setInitialRostersError(
        "Risolvi tutte le anomalie prima di importare le rose."
      );
      return;
    }

    const resolutions =
      initialRostersPreview.parserIssues
        .filter(
          (issue) =>
            issue.code ===
            "INVALID_CONTRACT_YEAR"
        )
        .map((issue) => {
          const choice =
            initialRosterResolutions[
              issue.rowNumber
            ];

          if (choice === "SKIP") {
            return {
              rowNumber:
                issue.rowNumber,
              action:
                "SKIP_ROW" as const
            };
          }

          return {
            rowNumber:
              issue.rowNumber,
            action:
              "SET_CONTRACT_YEAR" as const,
            contractYear:
              choice as 1 | 2 | 3
          };
        });

    const confirmed =
      window.confirm(
        "Confermi l'importazione definitiva delle rose iniziali? Verranno create le rose dei confermati e aggiornati i crediti disponibili delle squadre."
      );

    if (!confirmed) {
      return;
    }

    setInitialRostersImportPending(true);
    setInitialRostersError(null);
    setInitialRostersImportSuccess(null);
    setInitialRostersResetSuccess(null);

    try {
      const result =
        await importInitialRosters(
          session.id,
          initialRostersContent,
          resolutions
        );

      const [
        refreshedPlayers,
        refreshedSessionTeams
      ] = await Promise.all([
        fetchPlayers(session.id),
        fetchAuctionSessionTeams(
          session.id
        )
      ]);

      setPlayers(refreshedPlayers);
      setSessionTeams(
        refreshedSessionTeams
      );

      setInitialRosterStatus(
        await fetchInitialRosterStatus(
          session.id
        )
      );

      setInitialRostersImportSuccess(
        `Import completato: ${result.importedEntries} confermati, costo totale ${result.totalCost} crediti`
      );
    } catch (error) {
      setInitialRostersError(
        error instanceof Error
          ? error.message
          : "Errore durante l'importazione delle rose iniziali"
      );
    } finally {
      setInitialRostersImportPending(false);
    }
  }

  async function handlePlayerPhotoImport():
    Promise<void> {
    if (playerPhotoFiles.length === 0) {
      return;
    }

    setPlayerPhotoImportPending(true);
    setPlayerPhotoError(null);
    setPlayerPhotoSuccess(null);
    setPlayerPhotoIssues([]);

    try {
      const result =
        await importPlayerPhotos(
          playerPhotoFiles,
          playerPhotoMode
        );

      const refreshedCatalog =
        await fetchPlayerPhotoCatalog();

      setPlayerPhotoCatalog(
        refreshedCatalog
      );
      setPlayerPhotoCatalogError(
        null
      );

      setPlayerPhotoFiles([]);
      setPlayerPhotoInputKey(
        (current) =>
          current + 1
      );

      setPlayerPhotoIssues(
        result.issues
      );

      const parts = [
        `${result.created} nuove`,
        `${result.replaced} sostituite`,
        `${result.kept} mantenute`
      ];

      if (result.rejected > 0) {
        parts.push(
          `${result.rejected} scartate`
        );
      }

      setPlayerPhotoSuccess(
        `Caricamento completato: ${parts.join(", ")}.`
      );
    } catch (error) {
      setPlayerPhotoError(
        error instanceof Error
          ? error.message
          : "Errore durante il caricamento delle faccine"
      );
    } finally {
      setPlayerPhotoImportPending(false);
    }
  }

  async function handleDeleteAllPlayerPhotos():
    Promise<void> {
    const confirmed =
      window.confirm(
        "ATTENZIONE: verranno cancellate tutte le faccine giocatori caricate. Archivio giocatori, rose e dati dell'asta non saranno modificati. Continuare?"
      );

    if (!confirmed) {
      return;
    }

    setPlayerPhotoDeletePending(true);
    setPlayerPhotoError(null);
    setPlayerPhotoSuccess(null);
    setPlayerPhotoIssues([]);

    try {
      const result =
        await deleteAllPlayerPhotos();

      const refreshedCatalog =
        await fetchPlayerPhotoCatalog();

      setPlayerPhotoCatalog(
        refreshedCatalog
      );
      setPlayerPhotoCatalogError(
        null
      );

      setPlayerPhotoFiles([]);
      setPlayerPhotoInputKey(
        (current) =>
          current + 1
      );

      setPlayerPhotoSuccess(
        result.deleted === 0
          ? "Nessuna faccina da cancellare."
          : `Cancellazione completata: ${result.deleted} faccine eliminate.`
      );
    } catch (error) {
      setPlayerPhotoError(
        error instanceof Error
          ? error.message
          : "Errore durante la cancellazione delle faccine"
      );
    } finally {
      setPlayerPhotoDeletePending(false);
    }
  }

  async function handlePlayerArchiveImport():
    Promise<void> {
    if (
      !session ||
      !playerArchiveFile
    ) {
      return;
    }

    setPlayerArchivePending(true);
    setPlayerArchiveError(null);
    setPlayerArchiveSuccess(null);

    try {
      const content =
        await playerArchiveFile.text();

      const result =
        await importPlayerArchive(
          session.id,
          content
        );

      const refreshedPlayers =
        await fetchPlayers(
          session.id
        );

      setPlayers(refreshedPlayers);
      setPlayerArchiveFile(null);

      setPlayerArchiveSuccess(
        `Import completato: ${result.summary.importedPlayers} giocatori`
      );
    } catch (error) {
      setPlayerArchiveError(
        error instanceof Error
          ? error.message
          : "Errore durante l'importazione dell'archivio"
      );
    } finally {
      setPlayerArchivePending(false);
    }
  }

  const exportInitialRosterOverviewExcel =
    (): void => {
      if (
        !session ||
        !initialRosterOverview
      ) {
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

      initialRosterOverview.teams
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
                team.entries
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
                initialRosterOverview
                  .roleLimits[role];

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
        "Rose iniziali"
      );

      XLSX.writeFile(
        workbook,
        `rose-iniziali-${session.season.replaceAll(
          "/",
          "-"
        )}.xlsx`
      );
    };

  if (status === "LOADING") {
    return (
      <main className="admin-config">
        <h1>
          Configurazione asta
        </h1>

        <p>
          Caricamento dati...
        </p>
      </main>
    );
  }

  if (status === "ERROR") {
    return (
      <main className="admin-config">
        <h1>
          Configurazione asta
        </h1>

        <p className="admin-config__error">
          {
            errorMessage ??
            "Errore di caricamento."
          }
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-config">
        <header className="admin-config__header">
          <div>
            <p className="admin-config__eyebrow">
              FantaAstaAPP
            </p>

            <h1>
              Configurazione asta
            </h1>
          </div>

          <a href="/admin">
            Torna al cockpit
          </a>
        </header>

        <section className="admin-config__panel">
          <h2>
            Nessuna sessione attiva
          </h2>

          <p>
            Sarà necessario creare o selezionare
            una sessione d'asta.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-config">
      <header className="admin-config__header admin-config__header--three-zone">
        <div className="admin-config__header-brand">
          <img
            src="/branding/fantaastaapp-banner-faded.png"
            alt="FantaAstaAPP"
            className="admin-config__header-logo"
          />
        </div>

        <div className="admin-config__header-center">
          <h1>
            Configurazione asta
          </h1>

          <p>
            Preparazione della sessione prima
            dell'apertura dell'asta.
          </p>
        </div>

        <div className="admin-config__header-right">
          <div className="admin-config__header-readiness">
            {sessionReadinessLoading ? (
              <strong>
                Verifica configurazione...
              </strong>
            ) : sessionReadinessError ? (
              <strong className="is-blocking">
                Verifica non disponibile
              </strong>
            ) : sessionReadiness ? (
              <strong
                className={
                  sessionReadiness.ready
                    ? "is-ready"
                    : "is-blocking"
                }
              >
                {
                  managedLeagueMatchesSession
                    ? (
                        sessionReadiness.ready
                          ? "✓ CONFIGURAZIONE PRONTA"
                          : "! CONFIGURAZIONE INCOMPLETA"
                      )
                    : `${
                        league?.name ??
                        "Sessione selezionata"
                      } · ${
                        sessionReadiness.ready
                          ? "✓ CONFIGURAZIONE PRONTA"
                          : "! CONFIGURAZIONE INCOMPLETA"
                      }`
                }
                {" · "}
                {
                  sessionReadiness.checks.filter(
                    (check) => check.ok
                  ).length
                }
                /
                {
                  sessionReadiness.checks.length
                }
              </strong>
            ) : (
              <strong>
                Stato configurazione non disponibile
              </strong>
            )}
          </div>

          <div className="admin-config__header-actions">
            <span className="admin-config__header-session-status">
              {session.status}
            </span>

            {session.status === "SETUP" && (
              <button
                type="button"
                disabled={
                  sessionReadyPending ||
                  sessionReadinessLoading ||
                  !sessionReadiness?.ready
                }
                onClick={() => {
                  void handleMarkSessionReady();
                }}
              >
                {
                  sessionReadyPending
                    ? "Passaggio a READY..."
                    : "PORTA SESSIONE A READY"
                }
              </button>
            )}

            <a
              href="/admin"
              className="admin-config__cockpit-link"
            >
              <span aria-hidden="true">
                →
              </span>
              Cockpit asta
            </a>
          </div>
        </div>
      </header>


      <section className="admin-config__panel admin-config__league-panel">
        <div className="admin-config__section-heading">
          <div>
            <p className="admin-config__eyebrow">
              Archivio configurazione
            </p>

            <h2>
              Gestione Leghe
            </h2>
          </div>

          <span>
            {leagues.length} {
              leagues.length === 1
                ? "lega"
                : "leghe"
            }
          </span>
        </div>

        <div className="admin-config-league__toolbar">
          <label>
            <span>
              Lega da gestire
            </span>

            <select
              value={
                managedLeagueId ?? ""
              }
              disabled={
                leagueEditPending ||
                leagueEditMode !== null ||
                sessionCreateDraft !== null
              }
              onChange={(event) => {
                setManagedLeagueId(
                  event.target.value ||
                    null
                );
                setLeagueEditError(null);
              }}
            >
              {leagues.length === 0 && (
                <option value="">
                  Nessuna lega
                </option>
              )}

              {leagues.map(
                (candidate) => (
                  <option
                    key={candidate.id}
                    value={candidate.id}
                  >
                    {candidate.name}
                  </option>
                )
              )}
            </select>
          </label>

          <div className="admin-config-league__actions">
            <button
              type="button"
              disabled={
                leagueEditPending ||
                leagueEditMode !== null ||
                sessionCreateDraft !== null
              }
              onClick={
                beginCreateLeague
              }
            >
              + Nuova lega
            </button>

            <button
              type="button"
              disabled={
                !managedLeague ||
                leagueEditPending ||
                leagueEditMode !== null ||
                sessionCreateDraft !== null
              }
              onClick={
                beginEditLeague
              }
            >
              Modifica lega
            </button>
          </div>
        </div>

        {leagueEditMode === null && (
          <div className="admin-config-league__current">
            <div className="admin-config-league__logo">
              {managedLeague?.logoPath
                ? (
                    <img
                      src={
                        managedLeague.logoPath
                      }
                      alt={
                        `Logo ${managedLeague.name}`
                      }
                    />
                  )
                : (
                    <span>
                      Nessun logo
                    </span>
                  )}
            </div>

            <div>
              <strong>
                {
                  managedLeague?.name ??
                  "Nessuna lega selezionata"
                }
              </strong>

              {managedLeague && (
                <>
                  <small>
                    ID: {managedLeague.id}
                  </small>

                </>
              )}
            </div>
          </div>
        )}

        {leagueEditMode &&
          leagueEditDraft && (
          <div className="admin-config-league__editor">
            <label>
              <span>
                Nome lega
              </span>

              <input
                type="text"
                value={
                  leagueEditDraft.name
                }
                disabled={
                  leagueEditPending
                }
                autoFocus
                onChange={(event) => {
                  setLeagueEditDraft(
                    (current) =>
                      current
                        ? {
                            ...current,
                            name:
                              event.target.value
                          }
                        : current
                  );
                }}
              />
            </label>

            <label>
              <span>
                Logo lega
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={
                  leagueEditPending
                }
                onChange={(event) => {
                  selectLeagueLogoFile(
                    event.target.files?.[0] ??
                      null
                  );
                }}
              />
            </label>

            <div className="admin-config-league__preview">
              <div>
                {
                  leagueLogoPreviewUrl
                    ? (
                        <img
                          src={
                            leagueLogoPreviewUrl
                          }
                          alt="Anteprima nuovo logo lega"
                        />
                      )
                    : leagueEditMode ===
                        "EDIT" &&
                      managedLeague?.logoPath
                      ? (
                          <img
                            src={
                              managedLeague.logoPath
                            }
                            alt="Logo attuale lega"
                          />
                        )
                      : (
                          <span>
                            Nessun logo
                          </span>
                        )
                }
              </div>

              <small>
                {
                  leagueEditDraft.logoFile
                    ? `Nuovo logo: ${leagueEditDraft.logoFile.name}`
                    : leagueEditMode === "EDIT"
                      ? "Logo attuale"
                      : "Logo opzionale"
                }
              </small>
            </div>

            {leagueEditError && (
              <p className="admin-config-league__error">
                {leagueEditError}
              </p>
            )}

            <div className="admin-config-league__editor-actions">
              <button
                type="button"
                disabled={
                  leagueEditPending
                }
                onClick={
                  cancelLeagueEdit
                }
              >
                Annulla
              </button>

              <button
                type="button"
                disabled={
                  leagueEditPending
                }
                onClick={() => {
                  void saveLeagueEdit();
                }}
              >
                {
                  leagueEditPending
                    ? "Salvataggio..."
                    : leagueEditMode ===
                        "CREATE"
                      ? "Crea lega"
                      : "Salva"
                }
              </button>
            </div>
          </div>
        )}

        <p className="admin-config-league__note">
          La lega selezionata determina le squadre e
          i Presidenti mostrati sotto. La sessione
          d'asta resta indipendente e non viene
          modificata cambiando lega.
        </p>
      </section>

      <section className="admin-config-session">
        <div className="admin-config__summary admin-config-session__summary">
          <article className="admin-config-session__selector-card">
            <span>
              {
                sessionCreateDraft
                  ? `Nuova sessione · ${
                      managedLeague?.name ??
                      "Lega"
                    }`
                  : "Sessione d'asta"
              }
            </span>

            {sessionCreateDraft
              ? (
                  <div className="admin-config-session__create-target">
                    {
                      managedLeague?.name ??
                      "Lega selezionata"
                    }
                  </div>
                )
              : (
                  <select
              className="admin-config-session__selector"
              value={session.id}
              disabled={
                sessionFormPending ||
                sessionFormDraft !== null
              }
              onChange={(event) => {
                const selectedSession =
                  sessions.find(
                    (candidate) =>
                      candidate.id ===
                      event.target.value
                  );

                if (!selectedSession) {
                  return;
                }

                setSession(
                  selectedSession
                );

                setManagedLeagueId(
                  selectedSession.leagueId
                );

                setSessionEditDraft(null);
                setSessionEditError(null);
                setSessionReadyError(null);
                setTableOrderError(null);
              }}
            >
              {sessions.map(
                (candidate) => {
                  const candidateLeague =
                    leagues.find(
                      (leagueCandidate) =>
                        leagueCandidate.id ===
                        candidate.leagueId
                    );

                  return (
                    <option
                      key={candidate.id}
                      value={candidate.id}
                    >
                      {
                        candidateLeague?.name ??
                        "Lega"
                      }
                      {" · "}
                      {candidate.season}
                      {" · "}
                      {candidate.editionNumber}ª
                      {" · "}
                      {candidate.status}
                    </option>
                  );
                }
              )}
            </select>
                )}

            <div className="admin-config-session__selector-actions">
              {sessionCreateDraft
                ? (
                    <>
                      <button
                        type="button"
                        disabled={
                          sessionCreatePending
                        }
                        onClick={
                          cancelSessionCreate
                        }
                      >
                        Annulla
                      </button>

                      <button
                        type="button"
                        disabled={
                          sessionCreatePending
                        }
                        onClick={() => {
                          void saveSessionCreate();
                        }}
                      >
                        {
                          sessionCreatePending
                            ? "Creazione..."
                            : "Crea sessione"
                        }
                      </button>
                    </>
                  )
                : sessionEditDraft
                  ? (
                      <>
                        <button
                          type="button"
                          disabled={
                            sessionFormPending
                          }
                          onClick={
                            cancelSessionEdit
                          }
                        >
                          Annulla
                        </button>

                        <button
                          type="button"
                          disabled={
                            sessionFormPending
                          }
                          onClick={() => {
                            void saveSessionEdit();
                          }}
                        >
                          {
                            sessionFormPending
                              ? "Salvataggio..."
                              : "Salva parametri"
                          }
                        </button>
                      </>
                    )
                  : (
                      <>
                        <button
                          type="button"
                          onClick={
                            beginSessionEdit
                          }
                        >
                          Modifica parametri
                        </button>

                        <button
                          type="button"
                          disabled={
                            !managedLeague ||
                            teams.length !== 8
                          }
                          title={
                            !managedLeague
                              ? "Seleziona una lega."
                              : teams.length !== 8
                                ? "Per creare una sessione la lega deve avere esattamente 8 squadre."
                                : undefined
                          }
                          onClick={
                            beginSessionCreate
                          }
                        >
                          + Nuova sessione
                        </button>
                      </>
                    )}
            </div>

            {!sessionCreateDraft &&
              managedLeague &&
              teams.length !== 8 && (
                <p className="admin-config-session__create-hint">
                  La lega selezionata ha{" "}
                  {teams.length} squadre. Per creare
                  una sessione ne servono
                  esattamente 8.
                </p>
              )}
          </article>

          <article>
            <span>
              Stagione
            </span>

            {sessionFormDraft
              ? (
                  <input
                    type="text"
                    value={
                      sessionFormDraft.season
                    }
                    disabled={
                      sessionFormPending
                    }
                    onChange={(event) => {
                      if (sessionCreateDraft) {
                        setSessionCreateDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  season:
                                    event.target.value
                                }
                              : current
                        );
                      } else {
                        setSessionEditDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  season:
                                    event.target.value
                                }
                              : current
                        );
                      }
                    }}
                  />
                )
              : (
                  <strong>
                    {session.season}
                  </strong>
                )}
          </article>

          <article>
            <span>
              Edizione
            </span>

            {sessionFormDraft
              ? (
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      sessionFormDraft
                        .editionNumber
                    }
                    disabled={
                      sessionEditPending
                    }
                    onChange={(event) => {
                      if (sessionCreateDraft) {
                        setSessionCreateDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  editionNumber:
                                    event.target.value
                                }
                              : current
                        );
                      } else {
                        setSessionEditDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  editionNumber:
                                    event.target.value
                                }
                              : current
                        );
                      }
                    }}
                  />
                )
              : (
                  <strong>
                    {session.editionNumber}ª
                  </strong>
                )}
          </article>

          <article>
            <span>
              Crediti iniziali
            </span>

            {sessionFormDraft
              ? (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      sessionFormDraft
                        .initialCredits
                    }
                    disabled={
                      sessionEditPending
                    }
                    onChange={(event) => {
                      if (sessionCreateDraft) {
                        setSessionCreateDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  initialCredits:
                                    event.target.value
                                }
                              : current
                        );
                      } else {
                        setSessionEditDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  initialCredits:
                                    event.target.value
                                }
                              : current
                        );
                      }
                    }}
                  />
                )
              : (
                  <strong>
                    {session.initialCredits}
                  </strong>
                )}
          </article>

          <article>
            <span>
              Max confermati
            </span>

            {sessionFormDraft
              ? (
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="1"
                    value={
                      sessionFormDraft
                        .maximumInitialRosterEntries
                    }
                    disabled={
                      sessionEditPending
                    }
                    onChange={(event) => {
                      if (sessionCreateDraft) {
                        setSessionCreateDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  maximumInitialRosterEntries:
                                    event.target.value
                                }
                              : current
                        );
                      } else {
                        setSessionEditDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  maximumInitialRosterEntries:
                                    event.target.value
                                }
                              : current
                        );
                      }
                    }}
                  />
                )
              : (
                  <strong>
                    {
                      session
                        .maximumInitialRosterEntries
                    }
                  </strong>
                )}
          </article>

          <article>
            <span>
              Stato
            </span>

            <strong>
              {
                sessionCreateDraft
                  ? "SETUP"
                  : session.status
              }
            </strong>
          </article>
        </div>

        {(sessionCreateError ||
          sessionEditError) && (
          <div className="admin-config-session__feedback">
            <p className="admin-config-session__error">
              {
                sessionCreateError ??
                sessionEditError
              }
            </p>
          </div>
        )}
      </section>

      <section className="admin-config__panel">
        <div className="admin-config__girotavolo-heading">
          <span className="admin-config__girotavolo-kicker">
            Squadre e Presidenti
          </span>

          <h2>
            Girotavolo
          </h2>

          <span className="admin-config__girotavolo-count">
            {
              managedLeagueMatchesSession
                ? `${sessionTeams.length} partecipanti`
                : `${teams.length} squadre`
            }
          </span>

          <div className="admin-config__team-create-actions">
            <button
              type="button"
              disabled={
                !managedLeague ||
                teamCreatePending ||
                teamEditPending ||
                teams.length >= 8
              }
              title={
                teams.length >= 8
                  ? "La lega ha già 8 squadre."
                  : undefined
              }
              onClick={beginTeamCreate}
            >
              + Nuova squadra
            </button>
          </div>

          {managedLeagueMatchesSession && (
            <span className="admin-config__girotavolo-pin-count">
              {
                teamAccessLoading
                  ? "PIN..."
                  : teamAccessError
                    ? "PIN ?"
                    : `${
                        Object.values(
                          teamAccessConfigured
                        ).filter(Boolean).length
                      } / ${sessionTeams.length} PIN`
              }
            </span>
          )}
        </div>

        {managedLeagueMatchesSession &&
          teamAccessError && (
          <p className="admin-config__table-order-error">
            Accesso /remote: {teamAccessError}
          </p>
        )}

        {!managedLeagueMatchesSession && (
          <p className="admin-config__context-info">
            <strong>
              Stai gestendo {managedLeague?.name ?? "la lega selezionata"}.
            </strong>
            {" "}
            Il Girotavolo e i PIN saranno disponibili
            dopo la creazione di una sessione d'asta
            per questa lega.
          </p>
        )}

        {teamCreateOpen && (
          <div className="admin-config__team-create-form">
            <div className="admin-config__team-create-copy">
              <strong>Nuova squadra</strong>
              <span>
                La squadra verrà creata nella lega selezionata
                e potrai completarne subito dati e Presidente.
              </span>
            </div>

            <label>
              <span>Nome squadra</span>

              <input
                type="text"
                autoFocus
                maxLength={100}
                value={teamCreateName}
                disabled={teamCreatePending}
                placeholder="Nome squadra"
                onChange={(event) => {
                  setTeamCreateName(
                    event.target.value
                  );
                  setTeamCreateError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveTeamCreate();
                  }
                }}
              />
            </label>

            <div className="admin-config__team-create-buttons">
              <button
                type="button"
                className="admin-config__team-create-primary"
                disabled={
                  teamCreatePending ||
                  !teamCreateName.trim()
                }
                onClick={() => {
                  void saveTeamCreate();
                }}
              >
                {
                  teamCreatePending
                    ? "Creazione..."
                    : "Crea squadra"
                }
              </button>

              <button
                type="button"
                disabled={teamCreatePending}
                onClick={cancelTeamCreate}
              >
                Annulla
              </button>
            </div>

            {teamCreateError && (
              <p className="admin-config__table-order-error">
                {teamCreateError}
              </p>
            )}
          </div>
        )}

        {tableOrderError && (
          <p className="admin-config__table-order-error">
            {tableOrderError}
          </p>
        )}

        <div className="admin-config__teams">
          {orderedTeams.map(
            (team) => {
              const sessionTeam =
                sessionTeamByTeamId
                  .get(team.id);

              const associations =
                teamOwners[
                  team.id
                ] ?? [];

              const primaryOwner =
                associations.find(
                  (association) =>
                    association
                      .isPrimary
                );

              const secondaryOwners =
                associations.filter(
                  (association) =>
                    !association
                      .isPrimary
                );

              return (
                <article
                  key={team.id}
                  className={
                    editingTeamId === team.id
                      ? "admin-config-team admin-config-team--editing"
                      : "admin-config-team"
                  }
                >
                  <div className="admin-config-team__table-order">
                    <div className="admin-config-team__order">
                      {
                        sessionTeam
                          ?.tableOrder ??
                        "-"
                      }
                    </div>

                    <div className="admin-config-team__order-actions">
                      <button
                        type="button"
                        aria-label={`Sposta ${team.name} verso l'alto`}
                        title="Sposta verso l'alto"
                        disabled={
                          !managedLeagueMatchesSession ||
                          tableOrderPending ||
                          !sessionTeam ||
                          sessionTeam.tableOrder === 1
                        }
                        onClick={() => {
                          void moveTeam(
                            team.id,
                            -1
                          );
                        }}
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        aria-label={`Sposta ${team.name} verso il basso`}
                        title="Sposta verso il basso"
                        disabled={
                          !managedLeagueMatchesSession ||
                          tableOrderPending ||
                          !sessionTeam ||
                          sessionTeam.tableOrder ===
                            sessionTeams.length
                        }
                        onClick={() => {
                          void moveTeam(
                            team.id,
                            1
                          );
                        }}
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  {editingTeamId === team.id &&
                  teamEditDraft ? (
                    <>
                      <div className="admin-config-team__edit-identity">
                        <div className="admin-config-team__edit-heading">
                          <span>
                            Dati squadra
                          </span>

                          <strong>
                            {team.name}
                          </strong>
                        </div>

                        <label>
                          <span>
                            Nome squadra
                          </span>

                          <input
                            type="text"
                            value={
                              teamEditDraft.name
                            }
                            disabled={
                              teamEditPending
                            }
                            onChange={(event) => {
                              setTeamEditDraft(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        name:
                                          event.target.value
                                      }
                                    : current
                              );
                            }}
                          />
                        </label>

                        <label>
                          <span>
                            Nome breve
                          </span>

                          <input
                            type="text"
                            value={
                              teamEditDraft.shortName
                            }
                            disabled={
                              teamEditPending
                            }
                            onChange={(event) => {
                              setTeamEditDraft(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        shortName:
                                          event.target.value
                                      }
                                    : current
                              );
                            }}
                          />
                        </label>

                        <label>
                          <span>
                            Colore principale
                          </span>

                          <div className="admin-config-team__color-field">
                            <input
                              type="color"
                              value={
                                teamEditDraft.primaryColor
                              }
                              disabled={
                                teamEditPending
                              }
                              onChange={(event) => {
                                setTeamEditDraft(
                                  (current) =>
                                    current
                                      ? {
                                          ...current,
                                          primaryColor:
                                            event.target.value
                                              .toUpperCase()
                                        }
                                      : current
                                );
                              }}
                            />

                            <input
                              type="text"
                              value={
                                teamEditDraft.primaryColor
                              }
                              maxLength={7}
                              disabled={
                                teamEditPending
                              }
                              onChange={(event) => {
                                setTeamEditDraft(
                                  (current) =>
                                    current
                                      ? {
                                          ...current,
                                          primaryColor:
                                            event.target.value
                                        }
                                      : current
                                );
                              }}
                            />
                          </div>
                        </label>

                        <label>
                          <span>
                            Colore secondario
                          </span>

                          <div className="admin-config-team__color-field">
                            <input
                              type="color"
                              value={
                                teamEditDraft.secondaryColor
                              }
                              disabled={
                                teamEditPending
                              }
                              onChange={(event) => {
                                setTeamEditDraft(
                                  (current) =>
                                    current
                                      ? {
                                          ...current,
                                          secondaryColor:
                                            event.target.value
                                              .toUpperCase()
                                        }
                                      : current
                                );
                              }}
                            />

                            <input
                              type="text"
                              value={
                                teamEditDraft.secondaryColor
                              }
                              maxLength={7}
                              disabled={
                                teamEditPending
                              }
                              onChange={(event) => {
                                setTeamEditDraft(
                                  (current) =>
                                    current
                                      ? {
                                          ...current,
                                          secondaryColor:
                                            event.target.value
                                        }
                                      : current
                                );
                              }}
                            />
                          </div>
                        </label>

                        <label>
                          <span>
                            Logo squadra
                          </span>

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={
                              teamEditPending
                            }
                            onChange={(event) => {
                              const file =
                                event.target.files?.[0] ??
                                null;

                              selectTeamLogoFile(
                                file
                              );
                            }}
                          />

                          <div className="admin-config-team__logo-preview">
                            <div>
                              {
                                teamLogoPreviewUrl
                                  ? (
                                      <img
                                        src={
                                          teamLogoPreviewUrl
                                        }
                                        alt="Anteprima nuovo logo"
                                      />
                                    )
                                  : team.logoPath
                                    ? (
                                        <img
                                          src={
                                            team.logoPath
                                          }
                                          alt="Logo attuale"
                                        />
                                      )
                                    : (
                                        <span>
                                          Nessun logo
                                        </span>
                                      )
                              }
                            </div>

                            <small>
                              {
                                teamEditDraft.logoFile
                                  ? `Nuovo logo: ${teamEditDraft.logoFile.name}`
                                  : "Logo attuale"
                              }
                            </small>
                          </div>
                        </label>
                      </div>

                      <div className="admin-config-team__edit-owners">
                        <div className="admin-config-team__edit-heading">
                          <span>
                            Presidenti
                          </span>

                          <strong>
                            Gestione proprietà
                          </strong>
                        </div>

                        <label>
                          <span>
                            Presidente
                          </span>

                          <select
                            value={
                              teamEditDraft.primaryOwnerId
                            }
                            disabled={
                              teamEditPending
                            }
                            onChange={(event) => {
                              setTeamEditDraft(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        primaryOwnerId:
                                          event.target.value,
                                        primaryOwnerNewName:
                                          ""
                                      }
                                    : current
                              );
                            }}
                          >
                            <option value="">
                              Seleziona...
                            </option>

                            {managedLeagueOwners.map(
                              (owner) => (
                                <option
                                  key={owner.id}
                                  value={owner.id}
                                >
                                  {owner.name}
                                </option>
                              )
                            )}

                            <option
                              value={
                                NEW_OWNER_VALUE
                              }
                            >
                              + Nuovo Presidente
                            </option>
                          </select>

                          {teamEditDraft.primaryOwnerId ===
                            NEW_OWNER_VALUE && (
                            <input
                              type="text"
                              placeholder="Nome nuovo Presidente"
                              value={
                                teamEditDraft
                                  .primaryOwnerNewName
                              }
                              disabled={
                                teamEditPending
                              }
                              onChange={(event) => {
                                setTeamEditDraft(
                                  (current) =>
                                    current
                                      ? {
                                          ...current,
                                          primaryOwnerNewName:
                                            event.target.value
                                        }
                                      : current
                                );
                              }}
                            />
                          )}
                        </label>

                        <label>
                          <span>
                            Co-presidente
                          </span>

                          <select
                            value={
                              teamEditDraft.secondaryOwnerId
                            }
                            disabled={
                              teamEditPending
                            }
                            onChange={(event) => {
                              setTeamEditDraft(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        secondaryOwnerId:
                                          event.target.value,
                                        secondaryOwnerNewName:
                                          ""
                                      }
                                    : current
                              );
                            }}
                          >
                            <option value="">
                              Nessuno
                            </option>

                            {managedLeagueOwners.map(
                              (owner) => (
                                <option
                                  key={owner.id}
                                  value={owner.id}
                                >
                                  {owner.name}
                                </option>
                              )
                            )}

                            <option
                              value={
                                NEW_OWNER_VALUE
                              }
                            >
                              + Nuovo co-presidente
                            </option>
                          </select>

                          {teamEditDraft.secondaryOwnerId ===
                            NEW_OWNER_VALUE && (
                            <input
                              type="text"
                              placeholder="Nome nuovo co-presidente"
                              value={
                                teamEditDraft
                                  .secondaryOwnerNewName
                              }
                              disabled={
                                teamEditPending
                              }
                              onChange={(event) => {
                                setTeamEditDraft(
                                  (current) =>
                                    current
                                      ? {
                                          ...current,
                                          secondaryOwnerNewName:
                                            event.target.value
                                        }
                                      : current
                                );
                              }}
                            />
                          )}
                        </label>
                      </div>

                      <div className="admin-config-team__edit-actions">
                        <button
                          type="button"
                          disabled={
                            teamEditPending
                          }
                          onClick={() => {
                            void saveTeamEdit(
                              team
                            );
                          }}
                        >
                          {
                            teamEditPending
                              ? "Salvataggio..."
                              : "Salva"
                          }
                        </button>

                        <button
                          type="button"
                          disabled={
                            teamEditPending
                          }
                          onClick={
                            cancelTeamEdit
                          }
                        >
                          Annulla
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="admin-config-team__identity">
                        <div className="admin-config-team__logo">
                          {team.logoPath ? (
                            <img
                              src={team.logoPath}
                              alt=""
                            />
                          ) : (
                            <span>
                              {
                                team.shortName
                                  ?.slice(
                                    0,
                                    3
                                  ) ??
                                team.name.slice(
                                  0,
                                  2
                                )
                              }
                            </span>
                          )}
                        </div>

                        <div>
                          <strong>
                            {team.name}
                          </strong>

                          {team.shortName && (
                            <small>
                              {team.shortName}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="admin-config-team__owners">
                        <span>
                          Presidente
                        </span>

                        <strong>
                          {
                            primaryOwner
                              ? ownerById.get(
                                  primaryOwner.ownerId
                                )?.name ??
                                primaryOwner.ownerId
                              : "Non assegnato"
                          }
                        </strong>

                        {secondaryOwners.length >
                          0 && (
                          <small>
                            Co-presidente:{" "}
                            {
                              secondaryOwners
                                .slice(
                                  0,
                                  1
                                )
                                .map(
                                  (
                                    association
                                  ) =>
                                    ownerById.get(
                                      association.ownerId
                                    )?.name ??
                                    association.ownerId
                                )
                                .join(", ")
                            }
                          </small>
                        )}
                      </div>

                      <div className="admin-config-team__credits">
                        <span>
                          Crediti
                        </span>

                        <strong>
                          {
                            sessionTeam
                              ?.remainingCredits ??
                            "-"
                          }
                        </strong>
                      </div>

                      <div className="admin-config-team__actions">
                        <button
                          type="button"
                          disabled={
                            teamEditPending ||
                            tableOrderPending
                          }
                          onClick={() => {
                            beginTeamEdit(
                              team
                            );
                          }}
                        >
                          Modifica squadra
                        </button>
                      </div>

                        {managedLeagueMatchesSession &&
                          sessionTeam && (
                          <div className="admin-config-team__remote-access">
                            <span className="admin-config-team__remote-access-label">
                              Remote
                            </span>

                            <div className="admin-config-team__remote-access-main">
                              <span
                                className={
                                  `admin-config-team__remote-access-status ${
                                    teamAccessConfigured[
                                      sessionTeam.id
                                    ] === true
                                      ? "is-configured"
                                      : "is-missing"
                                  }`
                                }
                              >
                                {
                                  teamAccessConfigured[
                                    sessionTeam.id
                                  ] === true
                                    ? "✓ PIN"
                                    : "PIN mancante"
                                }
                              </span>

                              {editingTeamAccessId ===
                              sessionTeam.id ? (
                                <div className="admin-config-team__remote-access-editor">
                                  <input
                                    type="password"
                                    inputMode="numeric"
                                    autoComplete="new-password"
                                    maxLength={4}
                                    placeholder="4 cifre"
                                    aria-label={
                                      `PIN /remote ${team.name}`
                                    }
                                    value={
                                      teamAccessPinDraft
                                    }
                                    disabled={
                                      teamAccessPinPending
                                    }
                                    onChange={(event) => {
                                      setTeamAccessPinDraft(
                                        event.target.value
                                          .replace(
                                            /\D/g,
                                            ""
                                          )
                                          .slice(0, 4)
                                      );
                                      setTeamAccessPinError(
                                        null
                                      );
                                    }}
                                  />

                                  <button
                                    type="button"
                                    disabled={
                                      teamAccessPinPending
                                    }
                                    onClick={() => {
                                      void saveTeamAccessPin();
                                    }}
                                  >
                                    {
                                      teamAccessPinPending
                                        ? "Salvataggio..."
                                        : "Salva"
                                    }
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      teamAccessPinPending
                                    }
                                    onClick={
                                      cancelTeamAccessEdit
                                    }
                                  >
                                    Annulla
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-config-team__remote-access-edit"
                                  disabled={
                                    teamAccessPinPending ||
                                    teamAccessLoading
                                  }
                                  onClick={() => {
                                    beginTeamAccessEdit(
                                      sessionTeam.id
                                    );
                                  }}
                                >
                                  {
                                    teamAccessConfigured[
                                      sessionTeam.id
                                    ] === true
                                      ? "Modifica PIN"
                                      : "Imposta PIN"
                                  }
                                </button>
                              )}
                            </div>

                            {editingTeamAccessId ===
                              sessionTeam.id &&
                              teamAccessPinError && (
                              <p className="admin-config-team__remote-access-error">
                                {teamAccessPinError}
                              </p>
                            )}
                          </div>
                        )}
                    </>
                  )}

                  {editingTeamId === team.id &&
                    teamEditError && (
                    <p className="admin-config-team__edit-error">
                      {teamEditError}
                    </p>
                  )}
                </article>
              );
            }
          )}
        </div>
      </section>

      <section className="admin-config__uploads">
        <div className="admin-config__section-heading">
          <div>
            <span>
              Importazioni
            </span>

            <strong>
              Upload files
            </strong>
          </div>
        </div>

        <p className="admin-config__uploads-intro">
          Seleziona il tipo di file o archivio
          che vuoi gestire.
        </p>

        <div className="admin-config__upload-selector">
          <button
            type="button"
            className={
              uploadPanel === "ARCHIVE"
                ? "is-selected"
                : undefined
            }
            onClick={() => {
              setUploadPanel(
                uploadPanel === "ARCHIVE"
                  ? null
                  : "ARCHIVE"
              );
            }}
          >
            Archivio giocatori
          </button>

          <button
            type="button"
            className={
              uploadPanel === "ROSTERS"
                ? "is-selected"
                : undefined
            }
            onClick={() => {
              setUploadPanel(
                uploadPanel === "ROSTERS"
                  ? null
                  : "ROSTERS"
              );
            }}
          >
            Rose iniziali
          </button>

          <button
            type="button"
            className={
              uploadPanel === "PHOTOS"
                ? "is-selected"
                : undefined
            }
            onClick={() => {
              setUploadPanel(
                uploadPanel === "PHOTOS"
                  ? null
                  : "PHOTOS"
              );
            }}
          >
            Faccine
          </button>
        </div>
      </section>

      {uploadPanel === "ROSTERS" && (
        <section className="admin-config__initial-rosters">
        <div className="admin-config__section-heading admin-config__initial-rosters-heading">
          <div className="admin-config__initial-rosters-heading-content">
            <div className="admin-config__initial-rosters-heading-row">
              <span className="admin-config__initial-rosters-title">
                Rose iniziali FMS
              </span>

              <span className="admin-config__initial-rosters-badge">
                {initialRosterStatus?.count ?? 0}
                {" "}
                confermati caricati
              </span>
            </div>

            <strong className="admin-config__initial-rosters-subtitle">
              Confermati della sessione
              {" "}
              {session.season}

              <span className="admin-config__initial-rosters-updated">
                {
                  initialRosterStatus?.lastUpdatedAt
                    ? ` · Ultimo caricamento: ${formatInitialRosterDate(
                        initialRosterStatus.lastUpdatedAt
                      )}`
                    : " · Mai caricate"
                }
              </span>
            </strong>
          </div>
        </div>

        <p>
          Seleziona il file rose prodotto da FMS ReVo.
          L'analisi non modifica il database.
        </p>

        <div className="admin-config__player-archive-actions">
          <button
            type="button"
            disabled={
              initialRostersResetPending ||
              session.status !== "SETUP"
            }
            onClick={() => {
              void handleInitialRostersReset();
            }}
          >
            {
              initialRostersResetPending
                ? "Reset rose in corso..."
                : "RESET ROSE INIZIALI"
            }
          </button>

          <button
            type="button"
            disabled={
              !initialRosterOverview ||
              initialRosterStatus?.count === 0
            }
            onClick={
              exportInitialRosterOverviewExcel
            }
          >
            Scarica rose iniziali
          </button>

          <input
            type="file"
            accept=".tab,.txt,text/plain"
            disabled={
              initialRostersPreviewPending
            }
            onChange={(event) => {
              setInitialRostersFile(
                event.target.files?.[0] ??
                null
              );
              setInitialRostersContent(null);
              setInitialRostersPreview(null);
              setInitialRostersError(null);
              setInitialRosterResolutions({});
              setInitialRostersImportSuccess(null);
            }}
          />

          <button
            type="button"
            disabled={
              !initialRostersFile ||
              initialRostersPreviewPending
            }
            onClick={() => {
              void handleInitialRostersPreview();
            }}
          >
            {
              initialRostersPreviewPending
                ? "Analisi in corso..."
                : "Analizza rose"
            }
          </button>
        </div>

        {initialRostersFile && (
          <small>
            File selezionato:{" "}
            {initialRostersFile.name}
          </small>
        )}

        {initialRostersError && (
          <p className="admin-config__player-archive-error">
            {initialRostersError}
          </p>
        )}

        {initialRostersPreview && (
          <div className="admin-config__initial-rosters-preview">
            <div className="admin-config__player-role-counts">
              <span>
                Righe{" "}
                {initialRostersPreview.summary.parsedRows}
              </span>

              <span>
                Valide{" "}
                {initialRostersPreview.summary.validEntries}
              </span>

              <span>
                Errori parser{" "}
                {initialRostersPreview.summary.parserIssueCount}
              </span>

              <span>
                Errori matching{" "}
                {initialRostersPreview.summary.planningIssueCount}
              </span>
            </div>

            {
              initialRostersPreview.parserIssues.length === 0 &&
              initialRostersPreview.planningIssues.length === 0
            ? (
              <p className="admin-config__player-archive-success">
                Analisi completata: nessuna anomalia rilevata.
              </p>
            )
            : (
              <div className="admin-config__initial-rosters-issues">
                {initialRostersPreview.parserIssues.map(
                  (issue) => (
                    <div
                      key={
                        `parser-${issue.rowNumber}-${issue.code}`
                      }
                      className="admin-config__initial-rosters-issue"
                    >
                      <strong>
                        Riga {issue.rowNumber}:{" "}
                        {issue.code}
                      </strong>

                      {issue.playerName && (
                        <span>
                          <strong>
                            {issue.playerName}
                          </strong>

                          {issue.teamName && (
                            <>
                              {" — "}
                              {issue.teamName}
                            </>
                          )}

                          {issue.role && (
                            <>
                              {" — "}
                              ruolo {issue.role}
                            </>
                          )}

                          {issue.realTeamName && (
                            <>
                              {" — "}
                              {issue.realTeamName}
                            </>
                          )}
                        </span>
                      )}

                      <span>
                        <em>
                          {issue.code ===
                          "INVALID_CONTRACT_YEAR"
                            ? "L'anno di contratto può essere solo 1, 2 oppure 3"
                            : issue.message}
                        </em>
                      </span>

                      {issue.rawValue && (
                        <small>
                          Valore nel file FMS:{" "}
                          {issue.rawValue}
                        </small>
                      )}

                      {
                        issue.code ===
                        "INVALID_CONTRACT_YEAR"
                      && (
                        <div className="admin-config__initial-rosters-resolution">
                          <span>
                            Correggi anno:
                          </span>

                          {([1, 2, 3] as const).map(
                            (contractYear) => (
                              <button
                                key={
                                  contractYear
                                }
                                type="button"
                                className={
                                  initialRosterResolutions[
                                    issue.rowNumber
                                  ] ===
                                  contractYear
                                    ? "is-selected"
                                    : undefined
                                }
                                onClick={() => {
                                  setInitialRosterResolutions(
                                    (current) => ({
                                      ...current,
                                      [issue.rowNumber]:
                                        contractYear
                                    })
                                  );
                                  setInitialRostersError(
                                    null
                                  );
                                }}
                              >
                                {contractYear}
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            className={
                              initialRosterResolutions[
                                issue.rowNumber
                              ] === "SKIP"
                                ? "is-selected"
                                : undefined
                            }
                            onClick={() => {
                              setInitialRosterResolutions(
                                (current) => ({
                                  ...current,
                                  [issue.rowNumber]:
                                    "SKIP"
                                })
                              );
                              setInitialRostersError(
                                null
                              );
                            }}
                          >
                            Scarta giocatore
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}

                {initialRostersPreview.planningIssues.map(
                  (issue) => (
                    <div
                      key={
                        `planning-${issue.rowNumber}-${issue.code}`
                      }
                      className="admin-config__initial-rosters-issue"
                    >
                      <strong>
                        Riga {issue.rowNumber}:{" "}
                        {issue.code}
                      </strong>

                      <span>
                        {issue.playerName}
                        {" — "}
                        {issue.teamName}
                      </span>

                      <small>
                        {issue.message}
                      </small>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {initialRostersPreview && (
          <div className="admin-config__initial-rosters-import-actions">
            <button
              type="button"
              disabled={
                initialRostersImportPending ||
                initialRostersPreview
                  .planningIssues.length > 0 ||
                initialRostersPreview
                  .parserIssues.some(
                    (issue) =>
                      issue.code !==
                        "INVALID_CONTRACT_YEAR" ||
                      initialRosterResolutions[
                        issue.rowNumber
                      ] === undefined
                  )
              }
              onClick={() => {
                void handleInitialRostersImport();
              }}
            >
              {
                initialRostersImportPending
                  ? "Importazione in corso..."
                  : "IMPORTA ROSE INIZIALI"
              }
            </button>
          </div>
        )}

        {initialRostersImportSuccess && (
          <p className="admin-config__player-archive-success">
            {initialRostersImportSuccess}
          </p>
        )}

        {initialRostersResetSuccess && (
          <p className="admin-config__player-archive-success">
            {initialRostersResetSuccess}
          </p>
        )}
        </section>
      )}

      {uploadPanel === "ARCHIVE" && (
        <section className="admin-config__player-archive">
        <div className="admin-config__section-heading admin-config__archive-heading">
          <div className="admin-config__archive-heading-content">
            <div className="admin-config__archive-heading-row">
              <span className="admin-config__archive-title">
                Archivio giocatori FMS
              </span>

              <div className="admin-config__archive-badges">
                <span>
                  {players.length} giocatori caricati
                </span>

                <span>
                  P {playerRoleCounts.P}
                </span>

                <span>
                  D {playerRoleCounts.D}
                </span>

                <span>
                  C {playerRoleCounts.C}
                </span>

                <span>
                  A {playerRoleCounts.A}
                </span>
              </div>
            </div>

            <strong className="admin-config__archive-subtitle">
              Archivio della sessione
              {" "}
              {session.season}
            </strong>
          </div>
        </div>

        <div className="admin-config__player-archive-actions">
          <button
            type="button"
            disabled={
              setupResetPending ||
              session.status !== "SETUP"
            }
            onClick={() => {
              void handleSetupDataReset();
            }}
          >
            {
              setupResetPending
                ? "Reset in corso..."
                : "RESET archivio + rose"
            }
          </button>

          <button
            type="button"
            disabled={
              developmentResetPending ||
              session.status === "CLOSED"
            }
            onClick={() => {
              void handleDevelopmentSessionReset();
            }}
          >
            {
              developmentResetPending
                ? "Reset completo in corso..."
                : "RESET COMPLETO SESSIONE"
            }
          </button>

          <input
            type="file"
            accept=".tab,.txt,text/plain"
            disabled={
              playerArchivePending
            }
            onChange={(event) => {
              setPlayerArchiveFile(
                event.target.files?.[0] ??
                null
              );
              setPlayerArchiveError(null);
              setPlayerArchiveSuccess(null);
            }}
          />

          <button
            type="button"
            disabled={
              !playerArchiveFile ||
              playerArchivePending
            }
            onClick={() => {
              void handlePlayerArchiveImport();
            }}
          >
            {
              playerArchivePending
                ? "Importazione..."
                : "Importa archivio"
            }
          </button>
        </div>

        {playerArchiveFile && (
          <small>
            File selezionato:{" "}
            {playerArchiveFile.name}
          </small>
        )}

        {playerArchiveSuccess && (
          <p className="admin-config__player-archive-success">
            {playerArchiveSuccess}
          </p>
        )}

        {playerArchiveError && (
          <p className="admin-config__player-archive-error">
            {playerArchiveError}
          </p>
        )}

        {setupResetSuccess && (
          <p className="admin-config__player-archive-success">
            {setupResetSuccess}
          </p>
        )}

        {setupResetError && (
          <p className="admin-config__player-archive-error">
            {setupResetError}
          </p>
        )}

        {developmentResetSuccess && (
          <p className="admin-config__player-archive-success">
            {developmentResetSuccess}
          </p>
        )}

        {developmentResetError && (
          <p className="admin-config__player-archive-error">
            {developmentResetError}
          </p>
        )}
        </section>
      )}

      {uploadPanel === "PHOTOS" && (
        <section className="admin-config__player-photos">
        <div className="admin-config__section-heading">
          <div className="admin-config__photo-heading">
            <div>
              <span>
                Faccine giocatori
              </span>

              <strong>
                Immagini archivio FMS
              </strong>
            </div>

            <span className="admin-config__upload-count-badge admin-config__upload-count-badge--photos">
              {
                playerPhotoCatalog
                  ? `${playerPhotoCatalog.count} faccine`
                  : "-"
              }
            </span>
          </div>
        </div>

        <div className="admin-config__player-photo-summary">
          <div>
            <span>
              Ultimo aggiornamento
            </span>

            <strong>
              {
                playerPhotoCatalog
                  ?.lastUpdatedAt
                  ? formatBackupDate(
                      playerPhotoCatalog
                        .lastUpdatedAt
                    )
                  : "Mai aggiornate"
              }
            </strong>
          </div>

          <p>
            Le immagini sono indipendenti dalle
            singole sessioni e non vengono incluse
            nei backup dell'asta.
          </p>
        </div>

        <div className="admin-config__player-photo-help">
          <strong>
            Formato richiesto: PNG
          </strong>

          <span>
            Il nome del file deve essere il codice
            FMS del giocatore.
            Esempio:{" "}
            <code>
              100002.png
            </code>
          </span>
        </div>

        <div className="admin-config__player-photo-upload">
          <input
            key={playerPhotoInputKey}
            type="file"
            accept=".png,image/png"
            multiple
            disabled={
              playerPhotoImportPending ||
              playerPhotoDeletePending
            }
            onChange={(event) => {
              const selectedFiles =
                Array.from(
                  event.target.files ?? []
                );

              const invalidFiles =
                selectedFiles.filter(
                  (file) =>
                    !/\.png$/i.test(
                      file.name
                    )
                );

              if (
                invalidFiles.length > 0
              ) {
                setPlayerPhotoFiles([]);
                setPlayerPhotoError(
                  "Sono ammessi esclusivamente file PNG."
                );
                setPlayerPhotoSuccess(null);
                setPlayerPhotoIssues([]);
                return;
              }

              setPlayerPhotoFiles(
                selectedFiles
              );
              setPlayerPhotoError(null);
              setPlayerPhotoSuccess(null);
              setPlayerPhotoIssues([]);
            }}
          />

          <div className="admin-config__player-photo-selection">
            <strong>
              {
                playerPhotoFiles.length === 0
                  ? "Nessun file selezionato"
                  : `${playerPhotoFiles.length} file selezionati`
              }
            </strong>

            <small>
              Massimo 1000 file per caricamento,
              2 MB per singola immagine.
            </small>
          </div>
        </div>

        <fieldset
          className="admin-config__player-photo-mode"
          disabled={
            playerPhotoImportPending ||
            playerPhotoDeletePending
          }
        >
          <legend>
            Se una faccina esiste già
          </legend>

          <label>
            <input
              type="radio"
              name="player-photo-mode"
              value="KEEP"
              checked={
                playerPhotoMode === "KEEP"
              }
              onChange={() => {
                setPlayerPhotoMode(
                  "KEEP"
                );
              }}
            />

            <span>
              Mantieni quella esistente
            </span>
          </label>

          <label>
            <input
              type="radio"
              name="player-photo-mode"
              value="REPLACE"
              checked={
                playerPhotoMode ===
                "REPLACE"
              }
              onChange={() => {
                setPlayerPhotoMode(
                  "REPLACE"
                );
              }}
            />

            <span>
              Sostituiscila con quella caricata
            </span>
          </label>
        </fieldset>

        <div className="admin-config__player-photo-actions">
          <button
            type="button"
            disabled={
              playerPhotoFiles.length === 0 ||
              playerPhotoImportPending ||
              playerPhotoDeletePending
            }
            onClick={() => {
              void handlePlayerPhotoImport();
            }}
          >
            {
              playerPhotoImportPending
                ? "Caricamento in corso..."
                : "CARICA FACCINE"
            }
          </button>

          <button
            type="button"
            className="admin-config__player-photo-delete"
            disabled={
              playerPhotoDeletePending ||
              playerPhotoImportPending ||
              !playerPhotoCatalog ||
              playerPhotoCatalog.count === 0
            }
            onClick={() => {
              void handleDeleteAllPlayerPhotos();
            }}
          >
            {
              playerPhotoDeletePending
                ? "Cancellazione..."
                : "CANCELLA TUTTE LE FACCINE"
            }
          </button>
        </div>

        {playerPhotoCatalogError && (
          <p className="admin-config__player-archive-error">
            {playerPhotoCatalogError}
          </p>
        )}

        {playerPhotoSuccess && (
          <p className="admin-config__player-archive-success">
            {playerPhotoSuccess}
          </p>
        )}

        {playerPhotoError && (
          <p className="admin-config__player-archive-error">
            {playerPhotoError}
          </p>
        )}

        {playerPhotoIssues.length > 0 && (
          <div className="admin-config__player-photo-issues">
            <strong>
              File scartati
            </strong>

            {playerPhotoIssues.map(
              (issue) => (
                <span
                  key={
                    `${issue.fileName}-${issue.reason}`
                  }
                >
                  {issue.fileName}:{" "}
                  {
                    issue.reason ===
                    "INVALID_FILENAME"
                      ? "nome file non valido"
                      : "contenuto PNG non valido"
                  }
                </span>
              )
            )}
          </div>
        )}
        </section>
      )}

      <section
        className={
          `admin-config__backup ${
            backupSectionExpanded
              ? "is-expanded"
              : "is-collapsed"
          }`
        }
      >
        <button
          type="button"
          className="admin-config__backup-toggle"
          aria-expanded={backupSectionExpanded}
          onClick={() => {
            setBackupSectionExpanded(
              (current) => !current
            );
          }}
        >
          <div className="admin-config__backup-toggle-copy">
            <span className="admin-config__backup-eyebrow">
              SICUREZZA DATI
            </span>

            <span>
              Backup e ripristino
            </span>

            <span className="admin-config__backup-count">
              {recoveryPoints.length}
              {" "}
              backup
            </span>

            <strong>
              Recovery point della sessione
              {" "}
              {session.season}
            </strong>
          </div>

          <span
            className="admin-config__backup-chevron"
            aria-hidden="true"
          >
            {backupSectionExpanded ? "▲" : "▼"}
          </span>
        </button>

        {backupSectionExpanded && (
          <div className="admin-config__backup-content">
            <p>
              I recovery point vengono creati
              automaticamente durante le operazioni
              critiche. Puoi creare anche un backup
              manuale in qualsiasi momento.
            </p>

        <div className="admin-config__backup-actions">
          <button
            type="button"
            disabled={
              manualBackupPending ||
              recoveryPointsLoading
            }
            onClick={() => {
              void handleManualBackup();
            }}
          >
            {
              manualBackupPending
                ? "Backup in corso..."
                : "CREA BACKUP MANUALE"
            }
          </button>
        </div>

        {manualBackupSuccess && (
          <p className="admin-config__player-archive-success">
            {manualBackupSuccess}
          </p>
        )}

        {recoveryPointDeleteSuccess && (
          <p className="admin-config__player-archive-success">
            {recoveryPointDeleteSuccess}
          </p>
        )}

        {recoveryPointRestoreSuccess && (
          <p className="admin-config__player-archive-success">
            {recoveryPointRestoreSuccess}
          </p>
        )}

        {recoveryPointsError && (
          <p className="admin-config__player-archive-error">
            {recoveryPointsError}
          </p>
        )}

        {recoveryPointsLoading ? (
          <p>
            Caricamento backup...
          </p>
        ) : recoveryPoints.length === 0 ? (
          <p>
            Nessun recovery point disponibile
            per questa sessione.
          </p>
        ) : (
          <div className="admin-config__backup-list">
            {recoveryPoints.map(
              (recoveryPoint) => (
                <article
                  key={
                    recoveryPoint
                      .database.fileName
                  }
                  className="admin-config__backup-item"
                >
                  <div className="admin-config__backup-item-main">
                    <strong>
                      {
                        formatRecoveryPointReason(
                          recoveryPoint.reason
                        )
                      }
                    </strong>
                  </div>

                  <div className="admin-config__backup-meta">
                    <span>
                      Data:{" "}
                      {
                        formatBackupDate(
                          recoveryPoint.createdAt
                        )
                      }
                    </span>
                    <span>
                      Integrità:{" "}
                      <strong>
                        {
                          formatRecoveryPointIntegrity(
                            recoveryPoint
                              .integrity.status
                          )
                        }
                      </strong>
                    </span>

                    <span>
                      Dimensione:{" "}
                      {
                        formatBackupSize(
                          recoveryPoint
                            .database.sizeBytes
                        )
                      }
                    </span>

                    <span>
                      Stato sessione:{" "}
                      {
                        recoveryPoint
                          .auctionSession.status
                      }
                    </span>

                    <span>
                      Aggiornamento:{" "}
                      {
                        recoveryPoint
                          .auctionSession
                          .stateVersion
                      }
                    </span>

                    <span>
                      Backup:{" "}
                      {
                        recoveryPoint
                          .timing.backupDurationMs
                      }
                      {" ms"}
                    </span>
                  </div>

                  <small
                    className="admin-config__backup-filename"
                    title={
                      recoveryPoint
                        .database.fileName
                    }
                  >
                    {
                      recoveryPoint
                        .database.fileName
                    }
                  </small>

                  <div className="admin-config__backup-item-actions">
                    <button
                      type="button"
                      disabled={
                        session.status !== "SUSPENDED" ||
                        restoringRecoveryPointFileName !== null ||
                        deletingRecoveryPointFileName !== null ||
                        manualBackupPending
                      }
                      onClick={() => {
                        void handleRecoveryPointRestore(
                          recoveryPoint.database.fileName
                        );
                      }}
                    >
                      {
                        restoringRecoveryPointFileName ===
                          recoveryPoint.database.fileName
                          ? "Ripristino..."
                          : "Ripristina"
                      }
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingRecoveryPointFileName !== null ||
                        restoringRecoveryPointFileName !== null ||
                        manualBackupPending
                      }
                      onClick={() => {
                        void handleRecoveryPointDelete(
                          recoveryPoint.database.fileName
                        );
                      }}
                    >
                      {
                        deletingRecoveryPointFileName ===
                          recoveryPoint.database.fileName
                          ? "Cancellazione..."
                          : "Cancella"
                      }
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
          </div>
        )}
      </section>

    </main>
  );
}
