import type {
  RealtimePublicDisplayTeam
} from "@fantaastaapp/contracts";

type RosterOverviewProps = {
  teams: RealtimePublicDisplayTeam[];
};

const rosterRoles = [
  "P",
  "D",
  "C",
  "A"
] as const;

export function RosterOverview({
  teams
}: RosterOverviewProps): React.JSX.Element {
  return (
    <section className="public-display__roster-overview">
      <div className="public-display__roster-overview-heading">
        <div>
          <p className="public-display__section-label">
            Situazione completa rose
          </p>

          <h2>
            Foglione elettronico
          </h2>
        </div>

        <span>
          24 slot per squadra
        </span>
      </div>

      <div className="public-display__roster-overview-grid">
        {teams.map((team) => (
          <article
            className="public-display__roster-column"
            key={team.auctionSessionTeamId}
          >
            <header className="public-display__roster-column-header">
              <div className="public-display__roster-column-brand">
                <div className="public-display__roster-column-logo">
                  {team.logoPath ? (
                    <img
                      src={team.logoPath}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : (
                    <span>
                      {
                        team.shortName ??
                        team.teamName
                          .slice(0, 3)
                          .toUpperCase()
                      }
                    </span>
                  )}
                </div>

                <div className="public-display__roster-column-identity">
                  <strong>
                    {team.teamName}
                  </strong>

                  {team.shortName && (
                    <span>
                      {team.shortName}
                    </span>
                  )}
                </div>
              </div>

              <div className="public-display__roster-column-economy">
                <span>
                  Cr{" "}
                  <strong>
                    {team.remainingCredits}
                  </strong>
                </span>

                <span>
                  Max{" "}
                  <strong>
                    {team.maximumBid ?? "—"}
                  </strong>
                </span>
              </div>
            </header>

            <div className="public-display__roster-column-roles">
              {rosterRoles.map((role) => {
                const roleData =
                  team.roster[role];

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

                return (
                  <div
                    className="public-display__roster-role-group"
                    data-role={role}
                    key={role}
                    style={{
                      flexGrow: roleData.limit
                    }}
                  >
                    <div
                      className="public-display__roster-role-slots"
                      style={{
                        gridTemplateRows:
                          `repeat(${roleData.limit}, minmax(0, 1fr))`
                      }}
                    >
                      {Array.from(
                        {
                          length:
                            roleData.limit
                        },
                        (_, slotIndex) => {
                          const entry =
                            entries[
                              slotIndex
                            ];

                          return (
                            <div
                              className={
                                `public-display__roster-slot ${
                                  entry
                                    ? "public-display__roster-slot--occupied"
                                    : "public-display__roster-slot--free"
                                }`
                              }
                              data-role={
                                role
                              }
                              key={
                                `${role}-${slotIndex}`
                              }
                            >
                              <span className="public-display__roster-slot-role">
                                {role}
                              </span>

                              {entry ? (
                                <>
                                  <div className="public-display__roster-slot-player">
                                    <strong>
                                      {
                                        entry.playerName
                                      }
                                    </strong>

                                    {
                                      entry.realTeamName &&
                                      (
                                        <span>
                                          {
                                            entry.realTeamName
                                          }
                                        </span>
                                      )
                                    }
                                  </div>

                                  <strong className="public-display__roster-slot-cost">
                                    {
                                      entry.acquisitionCost
                                    }
                                  </strong>
                                </>
                              ) : (
                                <span className="public-display__roster-slot-free-label">
                                  libero
                                </span>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
