import { TEAMS } from '../data/tournament'
import { groupFixturesByDate } from '../lib/fixtureSchedule'
import { isScoreComplete } from '../lib/tournamentEngine'

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
  if (match.status === 'live') {
    const matchTime = match.source_payload?.matchTime
    return {
      label: matchTime && matchTime !== "0'" ? matchTime : 'Live',
      className: 'live',
    }
  }
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
  if (prediction.grade === 'exact') return 'Exact score - +3'
  if (prediction.grade === 'outcome') return 'Correct outcome - +1'
  return 'Wrong - +0'
}

export function FixtureFeed({
  actualScores,
  fixtures,
  mode,
  onOpenDetails,
  onScoreChange,
  predictions,
  savingMatches,
}) {
  const sections = groupFixturesByDate(fixtures)
  const isWhatIf = mode === 'whatif'

  if (!fixtures.length) {
    return (
      <div className="fixture-empty">
        <strong>No fixtures match these filters.</strong>
        <span>Clear a filter to bring the schedule back.</span>
      </div>
    )
  }

  return (
    <div className="fixture-feed">
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
              const official = actualScores[fixture.id] ?? {}
              const prediction = predictions[fixture.id] ?? {}
              const locked =
                !match ||
                match.status !== 'scheduled' ||
                (match.kickoff_at &&
                  new Date(match.kickoff_at) <= new Date())
              const editable = isWhatIf && !locked
              const shownScore = editable ? prediction : official
              const resultLabel = predictionResult(prediction)
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
                  className={`fixture-card ${
                    isScoreComplete(shownScore) ? 'complete' : ''
                  } ${locked ? 'locked' : ''}`}
                  key={fixture.id}
                  onClick={openDetails}
                >
                  <div className="fixture-identity">
                    <strong>M{match?.match_number ?? '?'}</strong>
                    <span>Group {fixture.groupId}</span>
                  </div>

                  <div className="fixture-matchup">
                    <strong className="home-team">
                      {TEAMS[fixture.homeId].name}
                    </strong>
                    {editable ? (
                      <ScoreInput
                        disabled={savingMatches[fixture.id]}
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
                        disabled={savingMatches[fixture.id]}
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
                      {TEAMS[fixture.awayId].name}
                    </strong>
                  </div>

                  <div className="fixture-state">
                    <span className={`match-status ${status.className}`}>
                      {savingMatches[fixture.id] ? 'Saving...' : status.label}
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
                      aria-label={`Open ${TEAMS[fixture.homeId].name} versus ${
                        TEAMS[fixture.awayId].name
                      } match details`}
                      className="fixture-details-button"
                      onClick={() => onOpenDetails(fixture)}
                      type="button"
                    >
                      Match details
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
