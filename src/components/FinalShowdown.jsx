import { useEffect, useState } from 'react'
import { TEAMS } from '../data/tournament'
import { TeamName } from './TeamName'

function formatKickoff(value) {
  if (!value) return 'Schedule pending'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function countdownLabel(value, status, now = Date.now()) {
  if (status === 'finished') return 'Final whistle'
  if (status === 'live') return 'Live now'
  if (!value) return 'Schedule pending'

  const remaining = new Date(value).getTime() - now
  if (remaining <= 0) return 'Starting soon'

  const totalMinutes = Math.ceil(remaining / 60_000)
  const days = Math.floor(totalMinutes / 1_440)
  const hours = Math.floor((totalMinutes % 1_440) / 60)
  const minutes = totalMinutes % 60

  if (days) return `${days}d ${hours}h to kickoff`
  if (hours) return `${hours}h ${minutes}m to kickoff`
  return `${minutes}m to kickoff`
}

function TeamSide({ align, label, teamId }) {
  const team = teamId ? TEAMS[teamId] : null

  return (
    <div className={`final-team final-team-${align}`}>
      <span>{label}</span>
      <strong>
        {team ? (
          <TeamName align={align === 'home' ? 'end' : 'start'} team={team} />
        ) : (
          'To be decided'
        )}
      </strong>
    </div>
  )
}

function FixtureButton({ fixture, mode, onOpenMatch }) {
  if (!fixture) return null
  const finished = fixture.match?.status === 'finished'
  const isFinal = Number(fixture.match?.match_number ?? fixture.id) === 104

  return (
    <button onClick={() => onOpenMatch(fixture)} type="button">
      {finished
        ? isFinal
          ? 'Relive final'
          : 'Relive match'
        : mode === 'whatif'
          ? 'Set scoreline'
          : isFinal
            ? 'Enter match centre'
            : 'Open match'}
    </button>
  )
}

export function FinalShowdown({
  finalFixture,
  mode,
  onModeChange,
  onOpenMatch,
  thirdPlaceFixture,
}) {
  const [, setClock] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const finalMatch = finalFixture?.match
  const thirdMatch = thirdPlaceFixture?.match
  const finalReady = Boolean(finalFixture?.homeId && finalFixture?.awayId)
  const thirdReady = Boolean(
    thirdPlaceFixture?.homeId && thirdPlaceFixture?.awayId,
  )

  return (
    <section className="final-showdown" aria-labelledby="final-showdown-title">
      <header className="final-showdown-topline">
        <div>
          <span>{mode === 'whatif' ? 'My tournament ending' : 'The last page'}</span>
          <strong>{finalReady ? 'Finalists confirmed' : 'Final path unfolding'}</strong>
        </div>
        <div className="final-mode-switch" aria-label="Knockout mode">
          <button
            className={mode === 'official' ? 'active' : ''}
            onClick={() => onModeChange('official')}
            type="button"
          >
            Official
          </button>
          <button
            className={mode === 'whatif' ? 'active' : ''}
            onClick={() => onModeChange('whatif')}
            type="button"
          >
            My What If
          </button>
        </div>
      </header>

      <div className="final-showdown-title">
        <span>Match 104</span>
        <h2 id="final-showdown-title">Final showdown</h2>
        <p>Two champions. One last prediction. One name left to write.</p>
      </div>

      <div className="final-matchup">
        <TeamSide align="home" label="European champions" teamId={finalFixture?.homeId} />
        <div className="final-versus">
          <span>For the trophy</span>
          <strong>VS</strong>
          <small>
            {countdownLabel(finalMatch?.kickoff_at, finalMatch?.status)}
          </small>
        </div>
        <TeamSide align="away" label="Defending champions" teamId={finalFixture?.awayId} />
      </div>

      <div className="final-showdown-action">
        <time dateTime={finalMatch?.kickoff_at}>
          {formatKickoff(finalMatch?.kickoff_at)}
        </time>
        <FixtureButton fixture={finalFixture} mode={mode} onOpenMatch={onOpenMatch} />
      </div>

      <div className="bronze-undercard">
        <div>
          <span>Match 103</span>
          <strong>Bronze final</strong>
          <small>{countdownLabel(thirdMatch?.kickoff_at, thirdMatch?.status)}</small>
        </div>
        <div className="bronze-teams">
          <strong>
            {thirdReady ? (
              <TeamName align="end" team={TEAMS[thirdPlaceFixture.homeId]} />
            ) : (
              'To be decided'
            )}
          </strong>
          <span>vs</span>
          <strong>
            {thirdReady ? (
              <TeamName team={TEAMS[thirdPlaceFixture.awayId]} />
            ) : (
              'To be decided'
            )}
          </strong>
        </div>
        <time dateTime={thirdMatch?.kickoff_at}>
          {formatKickoff(thirdMatch?.kickoff_at)}
        </time>
        <FixtureButton
          fixture={thirdPlaceFixture}
          mode={mode}
          onOpenMatch={onOpenMatch}
        />
      </div>
    </section>
  )
}
