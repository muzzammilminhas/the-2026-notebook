import { useEffect, useState } from 'react'
import { TEAMS } from '../data/tournament'
import {
  fetchMatchDetails,
  fifaMatchCentreUrl,
} from '../lib/matchDetails'
import { supabase } from '../lib/supabase'
import { TeamName } from './TeamName'

const STANDARD_TABS = [
  ['overview', 'Overview'],
  ['events', 'Events'],
  ['stats', 'Stats'],
  ['lineups', 'Lineups'],
  ['community', 'Community'],
]
const FINAL_TABS = [
  ['overview', 'Match'],
  ['events', 'Timeline'],
  ['stats', 'Statistics'],
  ['lineups', 'Lineups'],
  ['community', 'Community'],
]
const COMMUNITY_ONLY_TABS = [['community', 'Community']]

function formatDate(value) {
  if (!value) return 'Schedule pending'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value))
}

function statusLabel(match, details) {
  const status = details?.status ?? match.status
  if (status === 'live') {
    return details?.matchTime && details.matchTime !== "0'"
      ? details.matchTime
      : 'Live'
  }
  if (status === 'finished') return 'Full time'
  if (status !== 'scheduled') return status
  return 'Upcoming'
}

function Weather({ weather }) {
  const parts = []
  if (weather?.type) parts.push(weather.type)
  if (weather?.temperature != null) parts.push(`${weather.temperature} C`)
  if (weather?.humidity != null) parts.push(`${weather.humidity}% humidity`)
  if (weather?.windSpeed != null) parts.push(`${weather.windSpeed} wind`)
  return parts.length ? parts.join(' - ') : 'Not published by FIFA yet'
}

function InfoItem({ label, children }) {
  return (
    <div className="match-info-item">
      <span>{label}</span>
      <strong>{children || 'Not published yet'}</strong>
    </div>
  )
}

function shortPlayerName(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.at(-1) || name
}

function LineupPitch({ team }) {
  const rows = [
    team.starters.filter((player) => player.position === 3),
    team.starters.filter((player) => player.position === 2),
    team.starters.filter((player) => player.position === 1),
    team.starters.filter((player) => player.position === 0),
  ].filter((row) => row.length)

  if (!rows.length) return null

  return (
    <div className="lineup-pitch" aria-label={`${team.name} formation`}>
      <i className="pitch-halfway" aria-hidden="true" />
      <i className="pitch-centre" aria-hidden="true" />
      <i className="pitch-box pitch-box-top" aria-hidden="true" />
      <i className="pitch-box pitch-box-bottom" aria-hidden="true" />
      <div className="lineup-pitch-rows">
        {rows.map((row, rowIndex) => (
          <div className="lineup-pitch-row" key={`${rowIndex}-${row.length}`}>
            {row.map((player) => (
              <span key={player.id} title={player.name}>
                <b>{player.number ?? '-'}</b>
                <small>{shortPlayerName(player.name)}</small>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamLineup({ notebookTeam, team }) {
  return (
    <section className="lineup-team">
      <header>
        <div>
          <span>{team.abbreviation}</span>
          <h4>
            {notebookTeam ? <TeamName team={notebookTeam} /> : team.name}
          </h4>
        </div>
        <strong>{team.formation || 'Formation pending'}</strong>
      </header>
      {team.coach ? <p>Coach: {team.coach}</p> : null}
      <LineupPitch team={team} />
      <h5>Starting XI</h5>
      <div className="lineup-list">
        {team.starters.length ? (
          team.starters.map((player) => (
            <span key={player.id}>
              <b>{player.number ?? '-'}</b>
              {player.name}
              {player.captain ? ' (C)' : ''}
            </span>
          ))
        ) : (
          <em>Starting lineup has not been published.</em>
        )}
      </div>
      {team.substitutes.length ? (
        <>
          <h5>Substitutes</h5>
          <div className="lineup-list substitutes">
            {team.substitutes.map((player) => (
              <span key={player.id}>
                <b>{player.number ?? '-'}</b>
                {player.name}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

function PendingPanel({ children, title }) {
  return (
    <div className="match-data-pending">
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  )
}

function statShare(stat) {
  const home = Number(stat.rawHome)
  const away = Number(stat.rawAway)
  const total = home + away
  if (!Number.isFinite(total) || total <= 0) return 50
  return Math.round((home / total) * 100)
}

function predictionGrade(row) {
  if (row.result_grade === 'exact') return `Exact - +${row.points}`
  if (row.result_grade === 'outcome') return `Outcome - +${row.points}`
  if (row.result_grade === 'correct') return `Correct - +${row.points}`
  if (row.result_grade === 'wrong') return 'Wrong - +0'
  return 'Result pending'
}

function CommunityPredictions({
  currentUserId,
  error,
  fixture,
  loading,
  match,
  rows,
  scores,
}) {
  const started =
    match.status !== 'scheduled'
    || (match.kickoff_at && new Date(match.kickoff_at) <= new Date())

  if (!started) {
    return (
      <div className="community-locked">
        <strong>Predictions unlock at kickoff</strong>
        <span>
          Everyone's picks stay private until this match starts.
        </span>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="community-locked">
        <strong>Opening the community notebook...</strong>
      </div>
    )
  }
  if (error) {
    return (
      <div className="match-details-error">
        <strong>Community picks unavailable</strong>
        <span>{error}</span>
      </div>
    )
  }
  if (!scores.length && !rows.length) {
    return (
      <div className="community-locked">
        <strong>No locked predictions for this match</strong>
        <span>The first submitted pick will appear here after kickoff.</span>
      </div>
    )
  }

  const total = scores.length
    ? scores.reduce((sum, score) => sum + score.picks, 0)
    : rows.length
  const outcomes = scores.length
    ? scores.reduce(
        (summary, score) => {
          const key =
            score.predicted_home > score.predicted_away
              ? 'home'
              : score.predicted_home < score.predicted_away
                ? 'away'
                : 'draw'
          summary[key] += score.picks
          return summary
        },
        { home: 0, draw: 0, away: 0 },
      )
    : rows.reduce(
        (summary, row) => {
          if (row.predicted_winner_team_id === fixture.homeId) summary.home += 1
          else if (row.predicted_winner_team_id === fixture.awayId) {
            summary.away += 1
          }
          return summary
        },
        { home: 0, draw: 0, away: 0 },
      )
  const popularScores = [...scores]
    .sort(
      (left, right) =>
        right.picks - left.picks
        || left.predicted_home - right.predicted_home
        || left.predicted_away - right.predicted_away,
    )
    .slice(0, 3)
  const percentage = (value) => Math.round((value / total) * 100)
  const homeLabel = fixture.homeId ? TEAMS[fixture.homeId].name : 'Home'
  const awayLabel = fixture.awayId ? TEAMS[fixture.awayId].name : 'Away'

  return (
    <div className="community-predictions">
      <section className="community-summary">
        <header>
          <div>
            <span>Community verdict</span>
            <strong>{total} locked {total === 1 ? 'pick' : 'picks'}</strong>
          </div>
          <small>Visible only after kickoff</small>
        </header>
        <div className="community-outcomes">
          {[
            ['home', homeLabel],
            ['draw', 'Draw'],
            ['away', awayLabel],
          ].map(([key, label]) => (
            <div key={key}>
              <strong>{percentage(outcomes[key])}%</strong>
              <span>{label}</span>
              <i style={{ width: `${percentage(outcomes[key])}%` }} />
            </div>
          ))}
        </div>
        {popularScores.length ? (
          <div className="popular-scorelines">
            <span>Popular scorelines</span>
            {popularScores.map((score) => (
              <strong key={`${score.predicted_home}-${score.predicted_away}`}>
                {score.predicted_home}-{score.predicted_away}
                <small>{score.picks}</small>
              </strong>
            ))}
          </div>
        ) : null}
      </section>

      <section className="community-pick-list">
        <header>
          <strong>Prediction sheets</strong>
          <span>Up to 50 players</span>
        </header>
        {rows.map((row) => (
          <article
            className={row.user_id === currentUserId ? 'current-user' : ''}
            key={row.user_id}
          >
            <div className="community-avatar">
              {row.nickname.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>
                {row.nickname}
                {row.user_id === currentUserId ? ' (You)' : ''}
              </strong>
              <span>
                {row.favorite_team_name
                  ? `Supports ${row.favorite_team_name}`
                  : 'Neutral supporter'}
              </span>
            </div>
            <b>
              {row.predicted_home != null && row.predicted_away != null
                ? `${row.predicted_home} : ${row.predicted_away}`
                : TEAMS[row.predicted_winner_team_id]?.name ?? 'Winner pick'}
            </b>
            <small className={row.result_grade ?? 'pending'}>
              {predictionGrade(row)}
            </small>
          </article>
        ))}
      </section>
    </div>
  )
}

export function MatchDetailsDialog({
  currentUserId,
  fixture,
  match,
  onClose,
}) {
  const finalExperience = Number(match.match_number) === 104
  const communityOnly = fixture.stage !== 'group' && !finalExperience
  const tabs = communityOnly
    ? COMMUNITY_ONLY_TABS
    : finalExperience
      ? FINAL_TABS
      : STANDARD_TABS
  const [activeTab, setActiveTab] = useState(
    communityOnly ? 'community' : 'overview',
  )
  const [details, setDetails] = useState(null)
  const [detailsUpdatedAt, setDetailsUpdatedAt] = useState(null)
  const [error, setError] = useState('')
  const [eventsFilter, setEventsFilter] = useState('key')
  const [community, setCommunity] = useState({
    rows: [],
    scores: [],
    loading: false,
    error: '',
    loaded: false,
  })

  useEffect(() => {
    let cancelled = false
    let refreshTimer = null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)

    async function loadDetails(force = false) {
      try {
        const result = await fetchMatchDetails(match, force)
        if (!cancelled) {
          setDetails(result)
          setDetailsUpdatedAt(new Date())
          setError('')
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message
              || 'FIFA match details are temporarily unavailable.',
          )
        }
      }
    }

    loadDetails()
    if (
      match.status === 'live'
      || (finalExperience && match.status !== 'finished')
    ) {
      refreshTimer = window.setInterval(() => loadDetails(true), 45_000)
    }

    return () => {
      cancelled = true
      if (refreshTimer) window.clearInterval(refreshTimer)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [finalExperience, match, onClose])

  useEffect(() => {
    if (activeTab !== 'community' || community.loaded) return
    let cancelled = false

    async function loadCommunity() {
      setCommunity((current) => ({
        ...current,
        loading: true,
        error: '',
      }))
      const rowsQuery = communityOnly
        ? supabase
          .from('community_knockout_predictions')
          .select('*')
          .eq('match_number', match.match_number)
          .order('submitted_at', { ascending: true })
          .limit(50)
        : supabase
          .from('community_match_predictions')
          .select('*')
          .eq('match_id', match.id)
          .order('submitted_at', { ascending: true })
          .limit(50)
      const scoresQuery = communityOnly
        ? supabase
          .from('community_knockout_prediction_scores')
          .select('*')
          .eq('match_number', match.match_number)
        : supabase
          .from('community_prediction_scores')
          .select('*')
          .eq('match_id', match.id)
      const [rowsResult, scoresResult] = await Promise.all([
        rowsQuery,
        scoresQuery,
      ])
      if (cancelled) return
      const requestError = rowsResult.error ?? scoresResult.error
      setCommunity({
        rows: rowsResult.data ?? [],
        scores: scoresResult.data ?? [],
        loading: false,
        error: requestError?.message ?? '',
        loaded: !requestError,
      })
    }

    loadCommunity()
    return () => {
      cancelled = true
    }
  }, [activeTab, community.loaded, communityOnly, match.id, match.match_number])

  const homeTeamId = finalExperience
    ? match.home_team_id
    : fixture.homeId ?? match.home_team_id
  const awayTeamId = finalExperience
    ? match.away_team_id
    : fixture.awayId ?? match.away_team_id
  const communityFixture = finalExperience
    ? { ...fixture, homeId: homeTeamId, awayId: awayTeamId }
    : fixture
  const homeTeam = TEAMS[homeTeamId]
  const awayTeam = TEAMS[awayTeamId]
  const homeName = homeTeam?.name ?? details?.home.name ?? 'TBD'
  const awayName = awayTeam?.name ?? details?.away.name ?? 'TBD'
  const homeScore = details?.home.score ?? match.home_score
  const awayScore = details?.away.score ?? match.away_score
  const source = match.source_payload ?? {}
  const stadium = details?.stadium ?? source.stadium
  const city = details?.city ?? source.city
  const visibleEvents = details?.events.filter(
    (event) => !finalExperience || eventsFilter === 'all' || event.keyEvent,
  ) ?? []
  const statCategories = details?.stats.reduce((categories, stat) => {
    const category = stat.category ?? 'Match statistics'
    if (!categories.has(category)) categories.set(category, [])
    categories.get(category).push(stat)
    return categories
  }, new Map()) ?? new Map()

  return (
    <div className="match-details-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="match-details-title"
        aria-modal="true"
        className={`match-details-dialog ${
          finalExperience ? 'final-match-centre' : ''
        }`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Close match details"
          className="match-details-close"
          onClick={onClose}
          type="button"
        >
          x
        </button>

        <header className="match-details-hero">
          {finalExperience ? (
            <span className="final-centre-label">FIFA World Cup 2026 Final</span>
          ) : null}
          <div className="match-details-kicker">
            <span>
              M{match.match_number} -{' '}
              {fixture.stage === 'group' ? `Group ${fixture.groupId}` : fixture.roundLabel}
            </span>
            <strong className={match.status === 'live' ? 'live' : ''}>
              {statusLabel(match, details)}
            </strong>
          </div>
          <div className="match-details-score">
            <strong>
              {homeTeam ? (
                <TeamName align="end" team={homeTeam} />
              ) : homeName}
            </strong>
            <span>{homeScore ?? '-'}</span>
            <i>:</i>
            <span>{awayScore ?? '-'}</span>
            <strong>
              {awayTeam ? <TeamName team={awayTeam} /> : awayName}
            </strong>
          </div>
          <p id="match-details-title">
            {stadium ? `${stadium}${city ? `, ${city}` : ''}` : formatDate(match.kickoff_at)}
          </p>
        </header>

        <nav
          aria-label="Match detail sections"
          className={`match-details-tabs ${communityOnly ? 'community-only' : ''}`}
        >
          {tabs.map(([id, label]) => (
            <button
              className={activeTab === id ? 'active' : ''}
              disabled={
                !finalExperience
                && (
                  (id === 'events' && !details?.events.length)
                  || (id === 'stats' && !details?.stats.length)
                  || (id === 'lineups'
                    && !details?.home.starters.length
                    && !details?.away.starters.length)
                )
              }
              key={id}
              onClick={() => setActiveTab(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="match-details-content">
          {!details && !error ? (
            <div className="match-details-loading">
              <strong>Opening FIFA match data...</strong>
              <span>Venue appears first; live data follows.</span>
            </div>
          ) : null}

          {error ? (
            <div className="match-details-error">
              <strong>Detailed feed unavailable</strong>
              <span>{error}</span>
            </div>
          ) : null}

          {activeTab === 'overview' ? (
            <div className="match-overview">
              {finalExperience ? (
                <section className="final-feed-status" aria-label="FIFA feed status">
                  <div className={details ? 'ready' : ''}>
                    <span>Match feed</span>
                    <strong>{details ? 'Connected' : 'Connecting'}</strong>
                  </div>
                  <div className={details?.home.starters.length ? 'ready' : ''}>
                    <span>Starting XIs</span>
                    <strong>
                      {details?.home.starters.length ? 'Published' : 'Awaiting teams'}
                    </strong>
                  </div>
                  <div className={details?.stats.length ? 'ready' : ''}>
                    <span>Live statistics</span>
                    <strong>{details?.stats.length ? 'Available' : 'Starts at kickoff'}</strong>
                  </div>
                  <div className={details?.events.length ? 'ready' : ''}>
                    <span>Action timeline</span>
                    <strong>{details?.events.length ? 'Live' : 'Starts at kickoff'}</strong>
                  </div>
                </section>
              ) : null}

              <div className="match-overview-grid">
                <InfoItem label="Kickoff">{formatDate(match.kickoff_at)}</InfoItem>
                <InfoItem label="Venue">
                  {stadium ? `${stadium}${city ? `, ${city}` : ''}` : null}
                </InfoItem>
                <InfoItem label="Weather">
                  <Weather weather={details?.weather ?? source.weather} />
                </InfoItem>
                <InfoItem label="Referee">
                  {details?.referee ?? source.referee}
                </InfoItem>
                <InfoItem label="Attendance">
                  {details?.attendance?.toLocaleString() ?? source.attendance}
                </InfoItem>
                <InfoItem label="Match status">
                  {statusLabel(match, details)}
                </InfoItem>
                {finalExperience ? (
                  <>
                    <InfoItem label="Stage">{details?.stageName ?? 'Final'}</InfoItem>
                    <InfoItem label="FIFA feed refreshed">
                      {detailsUpdatedAt
                        ? new Intl.DateTimeFormat(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                          }).format(detailsUpdatedAt)
                        : null}
                    </InfoItem>
                  </>
                ) : null}
              </div>

              {finalExperience && details?.officials.length ? (
                <section className="match-officials">
                  <header>
                    <span>Match officials</span>
                    <strong>{details.officials.length} appointed</strong>
                  </header>
                  <div>
                    {details.officials.map((official) => (
                      <article key={official.id}>
                        <span>{official.role}</span>
                        <strong>{official.name}</strong>
                        <small>{official.countryId}</small>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'events' && details ? (
            details.events.length ? (
              <div className="match-timeline">
                {finalExperience ? (
                  <header className="timeline-controls">
                    <div>
                      <span>Live action feed</span>
                      <strong>{details.events.length} events from FIFA</strong>
                    </div>
                    <div aria-label="Timeline filter">
                      <button
                        className={eventsFilter === 'key' ? 'active' : ''}
                        onClick={() => setEventsFilter('key')}
                        type="button"
                      >
                        Key moments
                      </button>
                      <button
                        className={eventsFilter === 'all' ? 'active' : ''}
                        onClick={() => setEventsFilter('all')}
                        type="button"
                      >
                        All action
                      </button>
                    </div>
                  </header>
                ) : null}
                <div className="match-events">
                  {visibleEvents.map((event) => (
                    <div
                      className={`match-event ${event.side} ${event.keyEvent ? 'key-event' : ''}`}
                      key={event.id}
                    >
                      <time>{event.minute || '-'}</time>
                      <span>
                        <strong>{event.type}</strong>
                        {event.label}
                      </span>
                      <small>
                        {event.homeScore != null && event.awayScore != null
                          ? `${event.homeScore} : ${event.awayScore}`
                          : event.teamName}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <PendingPanel title="Timeline opens at kickoff">
                FIFA will publish every match event here as the final unfolds.
              </PendingPanel>
            )
          ) : null}

          {activeTab === 'stats' && details ? (
            details.stats.length ? (
              <div className="match-stats">
                <header>
                  <strong>{details.home.abbreviation}</strong>
                  <span>Official team statistics</span>
                  <strong>{details.away.abbreviation}</strong>
                </header>
                {[...statCategories.entries()].map(([category, stats]) => (
                  <section className="match-stat-group" key={category}>
                    <h4>{category}</h4>
                    {stats.map((stat) => {
                      const homeShare = statShare(stat)
                      return (
                        <div className="match-stat-row" key={stat.key}>
                          <strong>{stat.home ?? '-'}</strong>
                          <span>
                            <b>{stat.label}</b>
                            <i>
                              <em style={{ width: `${homeShare}%` }} />
                            </i>
                          </span>
                          <strong>{stat.away ?? '-'}</strong>
                        </div>
                      )
                    })}
                  </section>
                ))}
              </div>
            ) : (
              <PendingPanel title="Statistics begin at kickoff">
                Possession, xG, attempts, passing, defending, discipline and
                physical data will populate from FIFA's live feed.
              </PendingPanel>
            )
          ) : null}

          {activeTab === 'lineups' && details ? (
            details.home.starters.length || details.away.starters.length ? (
              <div className="match-lineups">
                <TeamLineup notebookTeam={homeTeam} team={details.home} />
                <TeamLineup notebookTeam={awayTeam} team={details.away} />
              </div>
            ) : (
              <PendingPanel title="Starting XIs not announced yet">
                Formations, coaches, starters and substitutes will appear here
                as soon as FIFA publishes the official team sheets.
              </PendingPanel>
            )
          ) : null}

          {activeTab === 'community' ? (
            <CommunityPredictions
              currentUserId={currentUserId}
              error={community.error}
              fixture={communityFixture}
              loading={community.loading}
              match={match}
              rows={community.rows}
              scores={community.scores}
            />
          ) : null}
        </div>

        <footer className="match-details-footer">
          <span>
            Official FIFA data
            {finalExperience ? ' - automatically refreshed every 45 seconds' : ' - refreshed when this match is opened'}
          </span>
          <a href={fifaMatchCentreUrl(match, details)} rel="noreferrer" target="_blank">
            Open FIFA match centre
          </a>
        </footer>
      </section>
    </div>
  )
}
