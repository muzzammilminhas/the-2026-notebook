import { useEffect, useState } from 'react'
import { TEAMS } from '../data/tournament'
import {
  fetchMatchDetails,
  fifaMatchCentreUrl,
} from '../lib/matchDetails'
import { supabase } from '../lib/supabase'

const TABS = [
  ['overview', 'Overview'],
  ['events', 'Events'],
  ['stats', 'Stats'],
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
  if (match.status === 'live') {
    return details?.matchTime && details.matchTime !== "0'"
      ? details.matchTime
      : 'Live'
  }
  if (match.status === 'finished') return 'Full time'
  if (match.status !== 'scheduled') return match.status
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

function TeamLineup({ team }) {
  return (
    <section className="lineup-team">
      <header>
        <div>
          <span>{team.abbreviation}</span>
          <h4>{team.name}</h4>
        </div>
        <strong>{team.formation || 'Formation pending'}</strong>
      </header>
      {team.coach ? <p>Coach: {team.coach}</p> : null}
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
  const communityOnly = fixture.stage !== 'group'
  const [activeTab, setActiveTab] = useState(
    communityOnly ? 'community' : 'overview',
  )
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
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
    if (match.status === 'live') {
      refreshTimer = window.setInterval(() => loadDetails(true), 60_000)
    }

    return () => {
      cancelled = true
      if (refreshTimer) window.clearInterval(refreshTimer)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [match, onClose])

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

  const homeTeamId = fixture.homeId ?? match.home_team_id
  const awayTeamId = fixture.awayId ?? match.away_team_id
  const homeName = TEAMS[homeTeamId]?.name ?? details?.home.name ?? 'TBD'
  const awayName = TEAMS[awayTeamId]?.name ?? details?.away.name ?? 'TBD'
  const homeScore = match.home_score ?? details?.home.score
  const awayScore = match.away_score ?? details?.away.score
  const source = match.source_payload ?? {}
  const stadium = details?.stadium ?? source.stadium
  const city = details?.city ?? source.city

  return (
    <div className="match-details-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="match-details-title"
        aria-modal="true"
        className="match-details-dialog"
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
            <strong>{homeName}</strong>
            <span>{homeScore ?? '-'}</span>
            <i>:</i>
            <span>{awayScore ?? '-'}</span>
            <strong>{awayName}</strong>
          </div>
          <p id="match-details-title">
            {stadium ? `${stadium}${city ? `, ${city}` : ''}` : formatDate(match.kickoff_at)}
          </p>
        </header>

        <nav
          aria-label="Match detail sections"
          className={`match-details-tabs ${communityOnly ? 'community-only' : ''}`}
        >
          {(communityOnly ? COMMUNITY_ONLY_TABS : TABS).map(([id, label]) => (
            <button
              className={activeTab === id ? 'active' : ''}
              disabled={
                (id === 'events' && !details?.events.length)
                || (id === 'stats' && !details?.stats.length)
                || (id === 'lineups'
                  && !details?.home.starters.length
                  && !details?.away.starters.length)
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
            </div>
          ) : null}

          {activeTab === 'events' && details ? (
            <div className="match-events">
              {details.events.map((event, index) => (
                <div className={`match-event ${event.side}`} key={`${event.type}-${event.minute}-${index}`}>
                  <time>{event.minute}</time>
                  <span>
                    <strong>{event.type}</strong>
                    {event.label}
                  </span>
                  <small>{event.teamName}</small>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === 'stats' && details ? (
            <div className="match-stats">
              <header>
                <strong>{details.home.abbreviation}</strong>
                <span>Team statistics</span>
                <strong>{details.away.abbreviation}</strong>
              </header>
              {details.stats.map((stat) => (
                <div className="match-stat-row" key={stat.key}>
                  <strong>{stat.home ?? '-'}</strong>
                  <span>{stat.label}</span>
                  <strong>{stat.away ?? '-'}</strong>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === 'lineups' && details ? (
            <div className="match-lineups">
              <TeamLineup team={details.home} />
              <TeamLineup team={details.away} />
            </div>
          ) : null}

          {activeTab === 'community' ? (
            <CommunityPredictions
              currentUserId={currentUserId}
              error={community.error}
              fixture={fixture}
              loading={community.loading}
              match={match}
              rows={community.rows}
              scores={community.scores}
            />
          ) : null}
        </div>

        <footer className="match-details-footer">
          <span>Official FIFA data - refreshed when this match is opened</span>
          <a href={fifaMatchCentreUrl(match)} rel="noreferrer" target="_blank">
            Open FIFA match centre
          </a>
        </footer>
      </section>
    </div>
  )
}
