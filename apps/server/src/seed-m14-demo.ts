import {
  sqlite
} from "./db/client.js";

const SESSION_ID =
  "b253c317-97df-4ead-8e89-f862bd970e9a";

const DEMO_PREFIX =
  "m14-demo-";

type TeamRow = {
  id: string;
  name: string;
  short_name: string | null;
};

const teams =
  sqlite.prepare(`
    SELECT
      id,
      name,
      short_name
    FROM teams
    WHERE league_id = ?
    ORDER BY CASE name
      WHEN 'Atletico Milano' THEN 1
      WHEN 'Real Navigli' THEN 2
      WHEN 'Sporting Lambrate' THEN 3
      WHEN 'Dinamo Porta Romana' THEN 4
      WHEN 'FC Sant''Ambrogio' THEN 5
      WHEN 'Borgo United' THEN 6
      WHEN 'Scuderia Sempione' THEN 7
      WHEN 'Longobarda Fantasy Club' THEN 8
      ELSE 99
    END
  `).all(
    "league-sfl92-public-test"
  ) as TeamRow[];

if (teams.length !== 8) {
  throw new Error(
    `Attese 8 squadre SFL'92, trovate ${teams.length}`
  );
}

const session =
  sqlite.prepare(`
    SELECT id
    FROM auction_sessions
    WHERE id = ?
  `).get(SESSION_ID);

if (!session) {
  throw new Error(
    `Sessione ${SESSION_ID} non trovata`
  );
}

const existingDemo =
  sqlite.prepare(`
    SELECT COUNT(*) AS count
    FROM auction_session_teams
    WHERE id LIKE ?
  `).get(
    `${DEMO_PREFIX}%`
  ) as { count: number };

if (existingDemo.count > 0) {
  throw new Error(
    "Fixture M14 già presente. Seed interrotto."
  );
}

const remainingCredits = [
  247,
  186,
  221,
  154,
  268,
  199,
  132,
  239
];

const rosterPlayers = [
  ["P", "Sommer", "Inter", 18],
  ["D", "Bastoni", "Inter", 24],
  ["C", "Barella", "Inter", 31],
  ["A", "Leao", "Milan", 44],
  ["P", "Maignan", "Milan", 21],
  ["D", "Bremer", "Juventus", 29],
  ["C", "Pellegrini", "Roma", 17],
  ["A", "Lookman", "Atalanta", 51]
] as const;

const transaction =
  sqlite.transaction(() => {
    sqlite.prepare(`
      UPDATE auction_sessions
      SET
        initial_credits = 300,
        status = 'RUNNING',
        suspension_reason = NULL,
        state_version = state_version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(SESSION_ID);

    const insertSessionTeam =
      sqlite.prepare(`
        INSERT INTO auction_session_teams (
          id,
          auction_session_id,
          team_id,
          table_order,
          renewal_credits,
          remaining_credits
        )
        VALUES (?, ?, ?, ?, 0, ?)
      `);

    const insertPlayer =
      sqlite.prepare(`
        INSERT INTO players (
          id,
          auction_session_id,
          fms_code,
          name,
          normalized_name,
          real_team_name,
          role,
          availability_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

    const insertRosterEntry =
      sqlite.prepare(`
        INSERT INTO roster_entries (
          id,
          auction_session_team_id,
          player_id,
          acquisition_cost,
          contract_year,
          source
        )
        VALUES (?, ?, ?, ?, ?, 'INITIAL_ROSTER')
      `);

    teams.forEach(
      (team, index) => {
        const sessionTeamId =
          `${DEMO_PREFIX}session-team-${index + 1}`;

        const rosterPlayer =
          rosterPlayers[index];

        const remainingCredit =
          remainingCredits[index];

        if (
          !rosterPlayer ||
          remainingCredit === undefined
        ) {
          throw new Error(
            `Fixture incompleta per squadra ${index + 1}`
          );
        }

        insertSessionTeam.run(
          sessionTeamId,
          SESSION_ID,
          team.id,
          index + 1,
          remainingCredit
        );

        const [
          role,
          playerName,
          realTeamName,
          acquisitionCost
        ] = rosterPlayer;

        const playerId =
          `${DEMO_PREFIX}roster-player-${index + 1}`;

        insertPlayer.run(
          playerId,
          SESSION_ID,
          `M14R${String(index + 1).padStart(3, "0")}`,
          playerName,
          playerName.toLowerCase(),
          realTeamName,
          role,
          "ROSTERED"
        );

        insertRosterEntry.run(
          `${DEMO_PREFIX}roster-entry-${index + 1}`,
          sessionTeamId,
          playerId,
          acquisitionCost,
          1
        );
      }
    );

    const calledPlayerId =
      `${DEMO_PREFIX}called-player`;

    insertPlayer.run(
      calledPlayerId,
      SESSION_ID,
      "M14CALL001",
      "Lautaro Martinez",
      "lautaro martinez",
      "Inter",
      "A",
      "AVAILABLE"
    );

    const callId =
      `${DEMO_PREFIX}auction-call`;

    sqlite.prepare(`
      INSERT INTO auction_calls (
        id,
        auction_session_id,
        player_id,
        caller_auction_session_team_id,
        status,
        opening_bid,
        current_bid,
        current_leader_auction_session_team_id,
        current_turn_auction_session_team_id,
        provisional_winner_auction_session_team_id
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        'OPEN',
        1,
        47,
        ?,
        ?,
        NULL
      )
    `).run(
      callId,
      SESSION_ID,
      calledPlayerId,
      `${DEMO_PREFIX}session-team-1`,
      `${DEMO_PREFIX}session-team-4`,
      `${DEMO_PREFIX}session-team-6`
    );

    const insertCallTeam =
      sqlite.prepare(`
        INSERT INTO auction_call_teams (
          id,
          auction_call_id,
          auction_session_team_id,
          status,
          maximum_bid,
          exclusion_reason
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

    teams.forEach(
      (_team, index) => {
        const number =
          index + 1;

        const status =
          number === 2 || number === 5
            ? "PASSED"
            : "ACTIVE";

        const remainingCredit =
          remainingCredits[index];

        if (remainingCredit === undefined) {
          throw new Error(
            `Crediti demo mancanti per squadra ${number}`
          );
        }

        const maximumBid =
          Math.max(
            1,
            remainingCredit - 22
          );

        insertCallTeam.run(
          `${DEMO_PREFIX}call-team-${number}`,
          callId,
          `${DEMO_PREFIX}session-team-${number}`,
          status,
          maximumBid,
          null
        );
      }
    );
  });

try {
  transaction();

  console.log(
    "Fixture visuale M14 creata."
  );

  console.log(
    `Sessione: ${SESSION_ID}`
  );

  console.log(
    `Squadre collegate: ${teams.length}`
  );

  console.log(
    "Chiamata OPEN: Lautaro Martinez, 47 crediti"
  );
} finally {
  sqlite.close();
}
