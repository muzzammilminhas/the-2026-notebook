import { TEAMS } from '../data/tournament'
import { getMatchHighlight } from '../data/matchHighlights'
import { TeamName } from './TeamName'

function matchTitle(fixture) {
  const home = fixture.homeId ? TEAMS[fixture.homeId]?.name : 'To be decided'
  const away = fixture.awayId ? TEAMS[fixture.awayId]?.name : 'To be decided'
  return `${home ?? 'Home'} vs ${away ?? 'Away'}`
}

function formatStage(fixture) {
  if (fixture.stage === 'group') return `Group ${fixture.groupId}`
  return fixture.roundLabel ?? 'Knockout'
}

export function HighlightsDialog({ fixture, onClose }) {
  const highlight = getMatchHighlight(fixture.match)
  const homeTeam = fixture.homeId ? TEAMS[fixture.homeId] : null
  const awayTeam = fixture.awayId ? TEAMS[fixture.awayId] : null

  return (
    <div className="highlights-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="highlights-title"
        aria-modal="true"
        className="highlights-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Close highlights"
          className="match-details-close"
          onClick={onClose}
          type="button"
        >
          x
        </button>

        <header className="highlights-hero">
          <span>
            M{fixture.match?.match_number ?? fixture.id} - {formatStage(fixture)}
          </span>
          <h2 id="highlights-title">{matchTitle(fixture)}</h2>
          <div className="highlight-teams">
            <strong>
              {homeTeam ? <TeamName team={homeTeam} /> : 'To be decided'}
            </strong>
            <b>{fixture.match?.home_score ?? '-'}</b>
            <i>:</i>
            <b>{fixture.match?.away_score ?? '-'}</b>
            <strong>
              {awayTeam ? <TeamName team={awayTeam} /> : 'To be decided'}
            </strong>
          </div>
        </header>

        {highlight?.thumbnailUrl ? (
          <a
            className="highlight-video"
            href={highlight.youtubeUrl}
            rel="noreferrer"
            target="_blank"
          >
            <img alt="" loading="lazy" src={highlight.thumbnailUrl} />
            <span className="highlight-video-action">
              <i aria-hidden="true" />
              <span>
                <small>Official FIFA highlights</small>
                <strong>Watch on YouTube</strong>
              </span>
            </span>
          </a>
        ) : (
          <div className="highlight-coming-soon">
            <strong>Highlights coming soon</strong>
            <span>
              Official match highlights will appear here when they are
              available.
            </span>
          </div>
        )}

        <footer className="highlights-footer">
          <span>{highlight?.source ?? 'Official highlights pending'}</span>
          {highlight?.youtubeUrl ? (
            <a href={highlight.youtubeUrl} rel="noreferrer" target="_blank">
              Open on YouTube
            </a>
          ) : null}
        </footer>
      </section>
    </div>
  )
}
