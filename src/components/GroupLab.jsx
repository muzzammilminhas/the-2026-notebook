import { FIXTURES, GROUPS, TEAMS } from '../data/tournament'
import { compareGroup, isScoreComplete } from '../lib/tournamentEngine'
import { TeamName } from './TeamName'

function ScoreInput({ value, label, onChange, disabled }) {
  function apply(rawValue) {
    if (rawValue === '') {
      onChange(null)
      return
    }
    const parsed = Number(rawValue)
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 20) {
      onChange(parsed)
    }
  }

  return (
    <div className="score-control">
      <button
        aria-label={`Decrease ${label}`}
        disabled={disabled}
        onClick={() => onChange(Math.max(0, (value ?? 0) - 1))}
        type="button"
      >
        -
      </button>
      <input
        aria-label={label}
        disabled={disabled}
        inputMode="numeric"
        max="20"
        min="0"
        onChange={(event) => apply(event.target.value)}
        value={value ?? ''}
      />
      <button
        aria-label={`Increase ${label}`}
        disabled={disabled}
        onClick={() => onChange(Math.min(20, (value ?? 0) + 1))}
        type="button"
      >
        +
      </button>
    </div>
  )
}

function ScoreDisplay({ value, label }) {
  return (
    <span className={`score-display ${value == null ? 'empty' : ''}`} aria-label={label}>
      {value ?? '-'}
    </span>
  )
}

function Movement({ value }) {
  if (!value) return <span className="movement neutral">-</span>
  return (
    <span className={`movement ${value > 0 ? 'up' : 'down'}`}>
      {value > 0 ? '↑' : '↓'}
      {Math.abs(value)}
    </span>
  )
}

function formatKickoff(value) {
  if (!value) return 'Schedule pending'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function matchStatus(match) {
  if (!match) return { label: 'Feed pending', className: 'pending' }
  if (match.status === 'live') return { label: 'Live', className: 'live' }
  if (match.status === 'finished') {
    return {
      label: match.verified ? 'Final · verified' : 'Final · checking',
      className: match.verified ? 'verified' : 'pending',
    }
  }
  if (match.status !== 'scheduled') {
    return { label: match.status, className: 'pending' }
  }
  return { label: formatKickoff(match.kickoff_at), className: 'scheduled' }
}

function predictionResult(prediction) {
  if (!prediction?.scoredAt) return null
  if (prediction.grade === 'exact') return 'Exact score · +3'
  if (prediction.grade === 'outcome') return 'Correct outcome · +1'
  return 'Wrong · +0'
}

export function GroupLab({
  actualScores,
  groupId,
  scores,
  tournament,
  actualTournament,
  isWhatIf,
  impacts,
  onScoreChange,
  matchMeta,
  predictions,
  savingMatches,
}) {
  const fixtures = FIXTURES[groupId]
  const rows = isWhatIf
    ? compareGroup(actualTournament.groups[groupId], tournament.groups[groupId])
    : tournament.groups[groupId]

  return (
    <div className="group-lab">
      <section className="group-heading">
        <div>
          <span className="hand-note">
            {isWhatIf ? 'Prediction page' : 'Official page'}
          </span>
          <h2>Group {groupId}</h2>
          <p>{GROUPS[groupId].join(' · ')}</p>
        </div>
        <div className="qualification-key">
          <span><i className="key-dot qualified" /> Top two</span>
          <span><i className="key-dot third" /> Third-place race</span>
        </div>
      </section>

      <div className="group-grid">
        <section className="notebook-section matches-section">
          <div className="section-title">
            <div>
              <span className="section-number">01</span>
              <h3>{isWhatIf ? 'Predictions' : 'Official matches'}</h3>
            </div>
            <p>
              {isWhatIf
                ? 'Future scores save automatically. Kickoff locks the entry.'
                : 'Read-only scores from FIFA.'}
            </p>
          </div>

          <div className="match-list">
            {fixtures.map((fixture) => {
              const match = matchMeta[fixture.id]
              const status = matchStatus(match)
              const official = actualScores[fixture.id] ?? {}
              const prediction = predictions[fixture.id] ?? {}
              const shownScore = scores[fixture.id] ?? {}
              const locked =
                !match ||
                match.status !== 'scheduled' ||
                (match.kickoff_at &&
                  new Date(match.kickoff_at) <= new Date())
              const editable = isWhatIf && !locked
              const complete = isScoreComplete(shownScore)
              const resultLabel = predictionResult(prediction)

              return (
                <article
                  className={`match-card ${complete ? 'complete' : ''} ${
                    locked ? 'locked' : ''
                  }`}
                  key={fixture.id}
                >
                  <div className="match-row">
                    <span className="matchday">M{match?.match_number ?? '?'}</span>
                    <strong className="home-team">
                      <TeamName align="end" team={TEAMS[fixture.homeId]} />
                    </strong>
                    {editable ? (
                      <ScoreInput
                        label={`${TEAMS[fixture.homeId].name} prediction`}
                        onChange={(value) =>
                          onScoreChange(fixture.id, 'home', value)
                        }
                        value={prediction.home}
                      />
                    ) : (
                      <ScoreDisplay
                        label={`${TEAMS[fixture.homeId].name} official score`}
                        value={official.home}
                      />
                    )}
                    <span className="versus">:</span>
                    {editable ? (
                      <ScoreInput
                        label={`${TEAMS[fixture.awayId].name} prediction`}
                        onChange={(value) =>
                          onScoreChange(fixture.id, 'away', value)
                        }
                        value={prediction.away}
                      />
                    ) : (
                      <ScoreDisplay
                        label={`${TEAMS[fixture.awayId].name} official score`}
                        value={official.away}
                      />
                    )}
                    <strong className="away-team">
                      <TeamName team={TEAMS[fixture.awayId]} />
                    </strong>
                    <span className={`match-status ${status.className}`}>
                      {savingMatches[fixture.id] ? 'Saving...' : status.label}
                    </span>
                  </div>

                  {isWhatIf && locked && isScoreComplete(prediction) ? (
                    <div className="prediction-review">
                      <span>
                        Your pick: {prediction.home}-{prediction.away}
                      </span>
                      <strong className={prediction.grade ?? 'pending'}>
                        {resultLabel ?? 'Awaiting verified final result'}
                      </strong>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>

        <section className="notebook-section standings-section">
          <div className="section-title">
            <div>
              <span className="section-number">02</span>
              <h3>{isWhatIf ? 'Scenario standings' : 'Live standings'}</h3>
            </div>
            <p>Core FIFA tie-breaks are applied.</p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>GD</th>
                  <th>Pts</th>
                  {isWhatIf ? <th>Move</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    className={
                      row.position <= 2
                        ? 'qualified-row'
                        : row.position === 3
                          ? 'third-row'
                          : 'out-row'
                    }
                    key={row.teamId}
                  >
                    <td><span className="position">{row.position}</span></td>
                    <td>
                      <strong>
                        <TeamName flagCode={row.flagCode} name={row.name} />
                      </strong>
                      <small>
                        {row.won}W {row.drawn}D {row.lost}L
                      </small>
                    </td>
                    <td>{row.played}</td>
                    <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                    <td><strong>{row.points}</strong></td>
                    {isWhatIf ? <td><Movement value={row.movement} /></td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="third-place-section">
        <div className="section-title compact">
          <div>
            <span className="section-number">03</span>
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
                G{row.groupId} · {row.points} pts · {row.gd >= 0 ? '+' : ''}
                {row.gd}
              </small>
            </div>
          ))}
        </div>
      </section>

      {isWhatIf ? (
        <section className="impact-note">
          <span className="scribble">Scenario impact</span>
          {impacts.length ? (
            <ul>
              {impacts.map((impact) => (
                <li key={`${impact.teamId}-${impact.text}`}>{impact.text}</li>
              ))}
            </ul>
          ) : (
            <p>Write future scores to reveal what moves.</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
