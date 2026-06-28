import { groupFixturesByDate } from '../lib/fixtureSchedule'
import { isScoreComplete } from '../lib/tournamentEngine'
import { TEAMS } from '../data/tournament'
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
    <span
      aria-label={label}
      className={`score-display ${value == null ? 'empty' : ''}`}
    >
      {value ?? '-'}
    </span>
  )
}

function formatKickoff(value) {
  if (!value) return 'Schedule pending'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDay(dateKey) {
  if (dateKey === 'pending') return 'Schedule pending'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`))
}

function matchStatus(match) {
  if (!match) return { label: 'Feed pending', className: 'pending' }
  if (match.status === 'live') return { label: 'Live', className: 'live' }
  if (match.status === 'finished') {
    return {
      label: match.verified ? 'Final - verified' : 'Final - checking',
      className: match.verified ? 'verified' : 'pending',
    }
  }
  if (match.status !== 'scheduled') {
    return { label: match.status, className: 'pending' }
  }
  if (match.kickoff_at && new Date(match.kickoff_at) <= new Date()) {
    return { label: 'Awaiting live update', className: 'pending' }
  }
  return { label: formatKickoff(match.kickoff_at), className: 'scheduled' }
}

function predictionResult(prediction) {
  if (!prediction?.scoredAt) return null
  if (prediction.grade === 'exact') return `Exact score - +${prediction.points}`
  if (prediction.grade === 'correct') {
    return `Correct winner - +${prediction.points}`
  }
  return 'Wrong - +0'
}

function TeamLabel({ teamId, align }) {
  if (!teamId) {
    return <span className="team-slot-placeholder">To be decided</span>
  }
  return <TeamName align={align} team={TEAMS[teamId]} />
}

export function KnockoutFixtureFeed({
  fixtures,
  mode,
  onOpenDetails,
  onScoreChange,
  onWinnerChange,
  predictions,
}) {
  const sections = groupFixturesByDate(fixtures)
  const isWhatIf = mode === 'whatif'

  if (!fixtures.length) {
    return (
      <div className="fixture-empty">
        <strong>No knockout matches are ready yet.</strong>
        <span>The bracket will unlock once group results are complete.</span>
      </div>
    )
  }

  return (
    <div className="fixture-feed knockout-fixture-feed">
      {sections.map((section) => (
        <section className="fixture-day" key={section.dateKey}>
          <header>
            <h3>{formatDay(section.dateKey)}</h3>
            <span>
              {section.fixtures.length}{' '}
              {section.fixtures.length === 1 ? 'match' : 'matches'}
            </span>
          </header>

          <div className="fixture-day-list">
            {section.fixtures.map((fixture) => {
              const match = fixture.match
              const status = matchStatus(match)
              const prediction = predictions[fixture.id] ?? {}
              const official = {
                home: match?.home_score,
                away: match?.away_score,
              }
              const locked =
                !match ||
                match.status !== 'scheduled' ||
                (match.kickoff_at && new Date(match.kickoff_at) <= new Date())
              const editable =
                isWhatIf &&
                !locked &&
                fixture.homeId &&
                fixture.awayId &&
                fixture.participantsReady
              const shownScore = editable ? prediction : official
              const resultLabel = predictionResult(prediction)
              const needsPenaltyWinner =
                editable && isScoreComplete(prediction) && prediction.home === prediction.away
              const predictionComplete = isScoreComplete(prediction)
              const openDetails = (event) => {
                if (
                  event?.target?.closest?.(
                    'button, input, select, textarea, a',
                  )
                ) {
                  return
                }
                onOpenDetails(fixture)
              }

              return (
                <article
                  className={`fixture-card knockout-fixture-card ${
                    isScoreComplete(shownScore) ? 'complete' : ''
                  } ${locked ? 'locked' : ''} ${
                    needsPenaltyWinner ? 'needs-penalty-winner' : ''
                  }`}
                  key={fixture.id}
                  onClick={openDetails}
                >
                  <div className="fixture-identity">
                    <strong>M{match?.match_number ?? fixture.id}</strong>
                    <span>{fixture.roundLabel}</span>
                  </div>

                  <div className="fixture-matchup">
                    <strong className="home-team">
                      <TeamLabel align="end" teamId={fixture.homeId} />
                    </strong>
                    {editable ? (
                      <ScoreInput
                        label={`${TEAMS[fixture.homeId].name} prediction`}
                        onChange={(value) =>
                          onScoreChange(fixture, 'home', value)
                        }
                        value={prediction.home}
                      />
                    ) : (
                      <ScoreDisplay
                        label="Official home score"
                        value={official.home}
                      />
                    )}
                    <span className="versus">:</span>
                    {editable ? (
                      <ScoreInput
                        label={`${TEAMS[fixture.awayId].name} prediction`}
                        onChange={(value) =>
                          onScoreChange(fixture, 'away', value)
                        }
                        value={prediction.away}
                      />
                    ) : (
                      <ScoreDisplay
                        label="Official away score"
                        value={official.away}
                      />
                    )}
                    <strong className="away-team">
                      <TeamLabel teamId={fixture.awayId} />
                    </strong>
                  </div>

                  {needsPenaltyWinner ? (
                    <div className="penalty-winner-picker">
                      <span>Advances on penalties</span>
                      <div>
                        {[fixture.homeId, fixture.awayId].map((teamId) => (
                          <button
                            className={
                              prediction.teamId === teamId ? 'active' : ''
                            }
                            key={teamId}
                            onClick={() => onWinnerChange(fixture, teamId)}
                            type="button"
                          >
                            <TeamName team={TEAMS[teamId]} />
                          </button>
                        ))}
                      </div>
                      {predictionComplete && !prediction.teamId ? (
                        <small>Select who goes through.</small>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="fixture-state">
                    <span className={`match-status ${status.className}`}>
                      {status.label}
                    </span>
                    {isWhatIf && locked && isScoreComplete(prediction) ? (
                      <small>
                        Pick {prediction.home}-{prediction.away}
                        <strong className={prediction.grade ?? 'pending'}>
                          {resultLabel ?? 'Awaiting verified result'}
                        </strong>
                      </small>
                    ) : null}
                    <button
                      aria-label={`Open match ${fixture.id} community predictions`}
                      className="fixture-details-button"
                      onClick={() => onOpenDetails(fixture)}
                      type="button"
                    >
                      Community
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
