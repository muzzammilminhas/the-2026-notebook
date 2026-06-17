import { GROUPS, GROUP_IDS } from '../data/tournament'
import { StandingsTable } from './StandingsTable'
import { TeamName } from './TeamName'

export function TournamentStandings({ tournament }) {
  return (
    <div className="tournament-standings">
      <section className="page-heading">
        <div>
          <span className="hand-note">Official tournament table</span>
          <h2>Standings</h2>
          <p>
            Every group in one place. Tables update only from verified match
            results.
          </p>
        </div>
        <div className="qualification-key">
          <span>
            <i className="key-dot qualified" /> Top two
          </span>
          <span>
            <i className="key-dot third" /> Third-place race
          </span>
        </div>
      </section>

      <div className="all-groups-grid">
        {GROUP_IDS.map((groupId) => (
          <section className="group-table-card" key={groupId}>
            <header>
              <div>
                <span>Group</span>
                <strong>{groupId}</strong>
              </div>
              <p>{GROUPS[groupId].join(' / ')}</p>
            </header>
            <StandingsTable compact rows={tournament.groups[groupId]} />
          </section>
        ))}
      </div>

      <section className="third-place-section tournament-third-place">
        <div className="section-title compact">
          <div>
            <span className="section-number">13</span>
            <h3>Best third-place line</h3>
          </div>
          <p>First eight advance; fair-play ties remain in group order.</p>
        </div>
        <div className="third-strip">
          {tournament.thirdPlace.map((row) => (
            <div
              className={`third-team ${row.qualifies ? 'inside' : 'outside'}`}
              key={row.teamId}
            >
              <span>{row.thirdRank}</span>
              <strong>
                <TeamName flagCode={row.flagCode} name={row.name} />
              </strong>
              <small>
                G{row.groupId} - {row.points} pts - {row.gd >= 0 ? '+' : ''}
                {row.gd}
              </small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
