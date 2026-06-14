import { useEffect, useState } from 'react'
import { TEAMS } from '../data/tournament'
import {
  fetchMatchDetails,
  fifaMatchCentreUrl,
} from '../lib/matchDetails'

const TABS = [
  ['overview', 'Overview'],
  ['events', 'Events'],
  ['stats', 'Stats'],
  ['lineups', 'Lineups'],
]

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

export function MatchDetailsDialog({ fixture, match, onClose }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')

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

  const homeName = details?.home.name ?? TEAMS[fixture.homeId].name
  const awayName = details?.away.name ?? TEAMS[fixture.awayId].name
  const homeScore = details?.home.score ?? match.home_score
  const awayScore = details?.away.score ?? match.away_score
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
            <span>M{match.match_number} - Group {fixture.groupId}</span>
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

        <nav aria-label="Match detail sections" className="match-details-tabs">
          {TABS.map(([id, label]) => (
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
