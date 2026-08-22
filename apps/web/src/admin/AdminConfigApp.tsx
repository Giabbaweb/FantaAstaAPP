import {
  useEffect,
  useMemo,
  useState
} from "react";

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
  createLeague,
  createOwner,
  createTeamOwner,
  deleteTeamOwner,
  fetchAuctionSessions,
  fetchAuctionSessionTeams,
  fetchOwners,
  fetchPlayers,
  fetchTeamOwners,
  fetchTeamsByLeague,
  importInitialRosters,
  importPlayerArchive,
  previewInitialRosters,
  reorderAuctionSessionTeams,
  resetDevelopmentSession,
  resetInitialRosters,
  resetSetupData,
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

type TeamOwnerMap =
  Record<string, TeamOwner[]>;

const NEW_OWNER_VALUE =
  "__NEW_OWNER__";

type SessionEditDraft = {
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
    teams,
    setTeams
  ] = useState<Team[]>([]);

  const [
    players,
    setPlayers
  ] = useState<Player[]>([]);

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

  const orderedTeams =
    useMemo(
      () =>
        [...teams].sort(
          (left, right) => {
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
        sessionTeamByTeamId
      ]
    );

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
      <header className="admin-config__header">
        <div>
          <p className="admin-config__eyebrow">
            FantaAstaAPP
          </p>

          <h1>
            Configurazione asta
          </h1>

          <p>
            Preparazione della sessione prima
            dell'apertura dell'asta.
          </p>
        </div>

        <a href="/admin">
          Cockpit asta
        </a>
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
                leagueEditMode !== null
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
                    {
                      session &&
                      candidate.id ===
                        session.leagueId
                        ? " · sessione attiva"
                        : ""
                    }
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
                leagueEditMode !== null
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
                leagueEditMode !== null
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

                  {session &&
                    managedLeague.id ===
                      session.leagueId && (
                      <small className="admin-config-league__active">
                        Lega della sessione attiva
                      </small>
                    )}
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
          Creare o modificare una lega non cambia
          automaticamente la lega associata alla
          sessione d'asta attiva. Squadre e girotavolo
          mostrati sotto continuano a riferirsi alla
          sessione corrente.
        </p>
      </section>

      <section className="admin-config-session">
        <div className="admin-config__summary">
          <article>
            <span>
              Lega
            </span>

            <strong>
              {league?.name ?? "-"}
            </strong>
          </article>

          <article>
            <span>
              Stagione
            </span>

            {sessionEditDraft
              ? (
                  <input
                    type="text"
                    value={
                      sessionEditDraft.season
                    }
                    disabled={
                      sessionEditPending
                    }
                    onChange={(event) => {
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

            {sessionEditDraft
              ? (
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      sessionEditDraft
                        .editionNumber
                    }
                    disabled={
                      sessionEditPending
                    }
                    onChange={(event) => {
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

            {sessionEditDraft
              ? (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      sessionEditDraft
                        .initialCredits
                    }
                    disabled={
                      sessionEditPending
                    }
                    onChange={(event) => {
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

            {sessionEditDraft
              ? (
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="1"
                    value={
                      sessionEditDraft
                        .maximumInitialRosterEntries
                    }
                    disabled={
                      sessionEditPending
                    }
                    onChange={(event) => {
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
              {session.status}
            </strong>
          </article>
        </div>

        <div className="admin-config-session__footer">
          <div>
            {sessionEditError && (
              <p className="admin-config-session__error">
                {sessionEditError}
              </p>
            )}
          </div>

          <div className="admin-config-session__actions">
            {sessionEditDraft
              ? (
                  <>
                    <button
                      type="button"
                      disabled={
                        sessionEditPending
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
                        sessionEditPending
                      }
                      onClick={() => {
                        void saveSessionEdit();
                      }}
                    >
                      {
                        sessionEditPending
                          ? "Salvataggio..."
                          : "Salva parametri"
                      }
                    </button>
                  </>
                )
              : (
                  <button
                    type="button"
                    onClick={
                      beginSessionEdit
                    }
                  >
                    Modifica parametri
                  </button>
                )}
          </div>
        </div>
      </section>

      <section className="admin-config__panel">
        <div className="admin-config__section-heading">
          <div>
            <p className="admin-config__eyebrow">
              Squadre e Presidenti
            </p>

            <h2>
              Girotavolo
            </h2>
          </div>

          <span>
            {
              sessionTeams.length
            } partecipanti
          </span>
        </div>

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
                  className="admin-config-team"
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

                            {owners.map(
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

                            {owners.map(
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
                          Modifica
                        </button>
                      </div>
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

      <section className="admin-config__initial-rosters">
        <div className="admin-config__section-heading">
          <div>
            <span>
              Rose iniziali FMS
            </span>

            <strong>
              Confermati della sessione
              {" "}
              {session.season}
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

      <section className="admin-config__player-archive">
        <div className="admin-config__section-heading">
          <div>
            <span>
              Archivio giocatori FMS
            </span>

            <strong>
              Archivio della sessione
              {" "}
              {session.season}
            </strong>
          </div>
        </div>

        <div className="admin-config__player-archive-summary">
          <strong>
            {players.length} giocatori caricati
          </strong>

          <div className="admin-config__player-role-counts">
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

      <section className="admin-config__next">
        <span>
          Prossimo checkpoint
        </span>

        <strong>
          Modifica squadre, Presidenti e ordine del girotavolo
        </strong>
      </section>
    </main>
  );
}
