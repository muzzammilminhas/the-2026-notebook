import { useMemo, useState } from 'react'
import { getMatchHighlight, highlightStatus } from '../data/matchHighlights'
import { TEAMS } from '../data/tournament'
import { TeamName } from './TeamName'

const FILTERS = [
  ['all', 'All matches'],
  ['ready', 'Highlights ready'],
  ['finished', 'Finished'],
  ['knockout', 'Knockout'],
  ['group', 'Groups'],
]

function formatDate(value) {
  if (!value) return 'Schedule pending'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function scoreText(match) {
  if (match?.home_score == null || match?.away_score == null) return '- : -'
  return `${match.home_score} : ${match.away_score}`
}

function stageLabel(fixture) {
  if (fixture.stage === 'group') return `Group ${fixture.groupId}`
  return fixture.roundLabel ?? 'Knockout'
}

function searchableText(fixture) {
  return [
    stageLabel(fixture),
    fixture.match?.match_number,
    fixture.homeId ? TEAMS[fixture.homeId]?.name : '',
    fixture.awayId ? TEAMS[fixture.awayId]?.name : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function HighlightCard({ fixture, onOpenHighlights }) {
  const status = highlightStatus(fixture.match)
  const highlight = getMatchHighlight(fixture.match)
  const homeTeam = fixture.homeId ? TEAMS[fixture.homeId] : null
  const awayTeam = fixture.awayId ? TEAMS[fixture.awayId] : null

  return (
    <article className={`highlight-card ${status}`}>
      <div className="highlight-card-meta">
        <span>M{fixture.match?.match_number ?? fixture.id}</span>
        <strong>{stageLabel(fixture)}</strong>
        <small>{formatDate(fixture.match?.kickoff_at)}</small>
      </div>

      <div className="highlight-card-main">
        <strong>
          {homeTeam ? <TeamName team={homeTeam} /> : 'To be decided'}
        </strong>
        <b>{scoreText(fixture.match)}</b>
        <strong>
          {awayTeam ? <TeamName team={awayTeam} /> : 'To be decided'}
        </strong>
      </div>

      <div className="highlight-card-action">
        <span>
          {status === 'ready'
            ? highlight.source
            : status === 'coming-soon'
              ? 'Highlights coming soon'
              : 'Match not finished'}
        </span>
        <button onClick={() => onOpenHighlights(fixture)} type="button">
          {status === 'ready' ? 'Watch highlights' : 'Preview slot'}
        </button>
      </div>
    </article>
  )
}

export function HighlightsArchive({ fixtures, onOpenHighlights }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const stats = useMemo(() => {
    const ready = fixtures.filter((fixture) => getMatchHighlight(fixture.match))
    const finished = fixtures.filter(
      (fixture) => fixture.match?.status === 'finished',
    )
    return {
      ready: ready.length,
      finished: finished.length,
      total: fixtures.length,
    }
  }, [fixtures])

  const visibleFixtures = useMemo(() => {
    const search = query.trim().toLowerCase()
    return fixtures.filter((fixture) => {
      if (filter === 'ready' && !getMatchHighlight(fixture.match)) return false
      if (filter === 'finished' && fixture.match?.status !== 'finished') {
        return false
      }
      if (filter === 'knockout' && fixture.stage === 'group') return false
      if (filter === 'group' && fixture.stage !== 'group') return false
      if (search && !searchableText(fixture).includes(search)) return false
      return true
    })
  }, [filter, fixtures, query])

  return (
    <div className="archive-view">
      <section className="page-heading archive-heading">
        <div>
          <span className="hand-note">Post-tournament library</span>
          <h2>Highlights archive</h2>
          <p>
            Every match now has a video slot. Official YouTube links can be
            added as matches finish, then the archive becomes a full tournament
            watch-back library.
          </p>
        </div>
      </section>

      <section className="archive-stats">
        <article>
          <span>Matches tracked</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Finished</span>
          <strong>{stats.finished}</strong>
        </article>
        <article>
          <span>Highlights ready</span>
          <strong>{stats.ready}</strong>
        </article>
      </section>

      <section className="archive-controls">
        <div className="archive-filter-pills" aria-label="Highlights filters">
          {FILTERS.map(([id, label]) => (
            <button
              className={filter === id ? 'active' : ''}
              key={id}
              onClick={() => setFilter(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          <span>Search</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Team, round, match number"
            value={query}
          />
        </label>
      </section>

      <section className="highlight-grid">
        {visibleFixtures.map((fixture) => (
          <HighlightCard
            fixture={fixture}
            key={`${fixture.stage}-${fixture.id}`}
            onOpenHighlights={onOpenHighlights}
          />
        ))}
      </section>

      {!visibleFixtures.length ? (
        <div className="fixture-empty">
          <strong>No matches found.</strong>
          <span>Clear the search or switch filters.</span>
        </div>
      ) : null}
    </div>
  )
}
