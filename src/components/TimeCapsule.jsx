import { getMatchHighlight } from '../data/matchHighlights'
import { TEAMS } from '../data/tournament'
import { TeamName } from './TeamName'

function ordinal(value) {
  if (!value) return '-'
  const suffix =
    value % 10 === 1 && value % 100 !== 11
      ? 'st'
      : value % 10 === 2 && value % 100 !== 12
        ? 'nd'
        : value % 10 === 3 && value % 100 !== 13
          ? 'rd'
          : 'th'
  return `${value}${suffix}`
}

function topBy(rows, field) {
  return [...rows].sort((left, right) => {
    return (
      (right[field] ?? 0) - (left[field] ?? 0) ||
      (right.points ?? 0) - (left.points ?? 0)
    )
  })[0]
}

function CapsuleMetric({ label, value, note }) {
  return (
    <article className="capsule-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  )
}

function AwardCard({ label, row, metric, emptyText }) {
  return (
    <article className="award-card">
      <span>{label}</span>
      {row ? (
        <>
          <strong>{row.nickname}</strong>
          <small>{metric}</small>
        </>
      ) : (
        <>
          <strong>Coming after final</strong>
          <small>{emptyText}</small>
        </>
      )}
    </article>
  )
}

export function TimeCapsule({
  championId,
  currentUserId,
  fixtures,
  leaderboard,
  profile,
  scoreSummary,
}) {
  const currentRank =
    leaderboard.findIndex((row) => row.user_id === currentUserId) + 1
  const currentRow = currentRank ? leaderboard[currentRank - 1] : null
  const champion = championId ? TEAMS[championId] : null
  const finishedMatches = fixtures.filter(
    (fixture) => fixture.match?.status === 'finished',
  )
  const highlightCount = fixtures.filter((fixture) =>
    getMatchHighlight(fixture.match),
  ).length
  const beatPercent =
    currentRank && leaderboard.length > 1
      ? Math.round(
          ((leaderboard.length - currentRank) / (leaderboard.length - 1)) * 100,
        )
      : null
  const exactLeader = topBy(leaderboard, 'exact_scores')
  const knockoutLeader = topBy(leaderboard, 'correct_knockout')
  const championLeader = leaderboard[0]

  return (
    <div className="capsule-view">
      <section className="page-heading capsule-heading">
        <div>
          <span className="hand-note">Final LinkedIn version</span>
          <h2>World Cup time capsule</h2>
          <p>
            This is the post-final home for the app: report cards, Hall of
            Fame, match highlights, and the community prediction story.
          </p>
        </div>
      </section>

      <section className="capsule-hero-grid">
        <article className="report-card">
          <span>My prediction report card</span>
          <h3>{profile?.nickname ?? 'Sign in to reveal your card'}</h3>
          <div className="report-score">
            <strong>{currentRow?.points ?? scoreSummary.points}</strong>
            <small>final points</small>
          </div>
          <div className="report-lines">
            <span>
              Rank <strong>{currentRank ? ordinal(currentRank) : '-'}</strong>
            </span>
            <span>
              Exact scores <strong>{scoreSummary.exact}</strong>
            </span>
            <span>
              Knockout hits <strong>{scoreSummary.knockoutCorrect}</strong>
            </span>
            <span>
              Beat{' '}
              <strong>
                {beatPercent == null ? '-' : `${beatPercent}%`}
              </strong>
            </span>
          </div>
        </article>

        <article className="champion-memory">
          <span>Champion page</span>
          <strong>
            {champion ? <TeamName team={champion} /> : 'Still unwritten'}
          </strong>
          <small>
            The final archive hero will lock here after the verified champion
            is known.
          </small>
        </article>
      </section>

      <section className="capsule-metrics">
        <CapsuleMetric
          label="Matches archived"
          note="full tournament library"
          value={`${finishedMatches.length}/${fixtures.length}`}
        />
        <CapsuleMetric
          label="Highlight slots"
          note="YouTube embeds ready to fill"
          value={highlightCount}
        />
        <CapsuleMetric
          label="Leaderboard entries"
          note="Hall of Fame source"
          value={leaderboard.length}
        />
        <CapsuleMetric
          label="Post-final mode"
          note="ready for final switch"
          value="Built"
        />
      </section>

      <section className="capsule-grid">
        <article className="capsule-panel">
          <header>
            <span>Hall of Fame</span>
            <h3>Final awards board</h3>
          </header>
          <div className="award-grid">
            <AwardCard
              emptyText="Top points winner appears here."
              label="Notebook Champion"
              metric={`${championLeader?.points ?? 0} points`}
              row={championLeader}
            />
            <AwardCard
              emptyText="Most exact-score player appears here."
              label="Oracle"
              metric={`${exactLeader?.exact_scores ?? 0} exact scores`}
              row={exactLeader}
            />
            <AwardCard
              emptyText="Best knockout predictor appears here."
              label="Knockout King"
              metric={`${knockoutLeader?.correct_knockout ?? 0} knockout hits`}
              row={knockoutLeader}
            />
          </div>
        </article>

        <article className="capsule-panel">
          <header>
            <span>Community story</span>
            <h3>Insights to reveal after the final</h3>
          </header>
          <div className="story-list">
            <span>Most predicted champion</span>
            <span>Match the community got most wrong</span>
            <span>Biggest upset against the crowd</span>
            <span>Most predictable exact score</span>
          </div>
        </article>

        <article className="capsule-panel linkedin-panel">
          <header>
            <span>LinkedIn angle</span>
            <h3>From notebook to tournament archive</h3>
          </header>
          <p>
            Started as a prediction notebook. Ended as a live tournament
            experience with scoring, brackets, report cards, highlights, and a
            final community time capsule.
          </p>
        </article>
      </section>
    </div>
  )
}
