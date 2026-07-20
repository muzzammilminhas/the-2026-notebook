import { useEffect, useState } from 'react'
import { getMatchHighlight } from '../data/matchHighlights'
import { TEAMS } from '../data/tournament'
import { supabase } from '../lib/supabase'
import { loadTournamentArchive } from '../lib/tournamentArchive'
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
          <strong>Awaiting the final</strong>
          <small>{emptyText}</small>
        </>
      )}
    </article>
  )
}

function matchGoals(fixture) {
  const home = fixture?.match?.home_score
  const away = fixture?.match?.away_score
  return Number.isInteger(home) && Number.isInteger(away) ? home + away : 0
}

function winningMargin(fixture) {
  const home = fixture?.match?.home_score
  const away = fixture?.match?.away_score
  return Number.isInteger(home) && Number.isInteger(away)
    ? Math.abs(home - away)
    : 0
}

function fixtureScore(fixture) {
  return `${fixture.match?.home_score ?? '-'}-${fixture.match?.away_score ?? '-'}`
}

function MomentRow({ fixture, label, note }) {
  const homeTeam = fixture?.homeId ? TEAMS[fixture.homeId] : null
  const awayTeam = fixture?.awayId ? TEAMS[fixture.awayId] : null

  return (
    <article>
      <span>{label}</span>
      <strong>
        {homeTeam ? <TeamName team={homeTeam} /> : 'Not available'}
        {fixture ? <b>{fixtureScore(fixture)}</b> : null}
        {awayTeam ? <TeamName team={awayTeam} /> : null}
      </strong>
      <small>{note}</small>
    </article>
  )
}

function PodiumTeam({ place, team, note }) {
  return (
    <article className={`tournament-podium-team rank-${place}`}>
      <span>{ordinal(place)}</span>
      <strong>{team ? <TeamName team={team} /> : 'Not available'}</strong>
      <small>{note}</small>
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
  const [finalPicks, setFinalPicks] = useState([])
  const currentRank =
    leaderboard.findIndex((row) => row.user_id === currentUserId) + 1
  const currentRow = currentRank ? leaderboard[currentRank - 1] : null
  const champion = championId ? TEAMS[championId] : null
  const finishedMatches = fixtures.filter(
    (fixture) => fixture.match?.status === 'finished',
  )
  const finalFixture = fixtures.find(
    (fixture) => fixture.match?.match_number === 104,
  )
  const tournamentComplete = Boolean(
    champion &&
      finalFixture?.match?.status === 'finished' &&
      finalFixture.match.verified,
  )
  const finalFinished = finalFixture?.match?.status === 'finished'
  const finalHome = finalFixture?.homeId ? TEAMS[finalFixture.homeId] : null
  const finalAway = finalFixture?.awayId ? TEAMS[finalFixture.awayId] : null
  const runnerUp = finalFixture?.match?.winner_team_id === finalFixture?.homeId
    ? finalAway
    : finalHome
  const thirdPlaceFixture = fixtures.find(
    (fixture) => fixture.match?.match_number === 103,
  )
  const thirdPlaceTeam = thirdPlaceFixture?.match?.winner_team_id
    ? TEAMS[thirdPlaceFixture.match.winner_team_id]
    : null
  const remainingMatches = fixtures.length - finishedMatches.length
  const highlightCount = fixtures.filter((fixture) =>
    getMatchHighlight(fixture.match),
  ).length
  const totalGoals = finishedMatches.reduce(
    (sum, fixture) => sum + matchGoals(fixture),
    0,
  )
  const highestScoringMatch = [...finishedMatches].sort(
    (left, right) => matchGoals(right) - matchGoals(left),
  )[0]
  const biggestWin = [...finishedMatches].sort(
    (left, right) => winningMargin(right) - winningMargin(left),
  )[0]
  const beatPercent =
    currentRank && leaderboard.length > 1
      ? Math.round(
          ((leaderboard.length - currentRank) / (leaderboard.length - 1)) * 100,
        )
      : null
  const exactLeader = topBy(leaderboard, 'exact_scores')
  const knockoutLeader = topBy(leaderboard, 'correct_knockout')
  const championLeader = leaderboard[0]
  const championPicks = finalPicks.filter(
    (pick) => pick.predicted_winner_team_id === championId,
  )
  const runnerUpPicks = finalPicks.filter(
    (pick) => pick.predicted_winner_team_id === runnerUp?.id,
  )
  const championPickPercent = finalPicks.length
    ? Math.round((championPicks.length / finalPicks.length) * 100)
    : 0
  const popularFinalScore = Object.entries(
    finalPicks.reduce((scores, pick) => {
      const score = `${pick.predicted_home}-${pick.predicted_away}`
      scores[score] = (scores[score] ?? 0) + 1
      return scores
    }, {}),
  ).sort((left, right) => right[1] - left[1])[0]?.[0]

  useEffect(() => {
    if (!tournamentComplete) return undefined
    let cancelled = false

    async function loadFinalPicks() {
      const { data, error } = await supabase
        .from('community_knockout_predictions')
        .select('*')
        .eq('match_number', 104)
        .order('submitted_at', { ascending: true })
      if (!error && data?.length) {
        if (!cancelled) setFinalPicks(data)
        return
      }
      try {
        const archive = await loadTournamentArchive()
        if (!cancelled) setFinalPicks(archive.finalCommunityPicks ?? [])
      } catch {
        if (!cancelled) setFinalPicks([])
      }
    }

    loadFinalPicks()
    return () => {
      cancelled = true
    }
  }, [tournamentComplete])

  return (
    <div className="capsule-view">
      <section className="page-heading capsule-heading">
        <div>
          <span className="hand-note">Tournament archive</span>
          <h2>World Cup time capsule</h2>
          <p>
            Revisit the tournament through prediction report cards, the Hall of
            Fame, match highlights, and tournament records.
          </p>
        </div>
      </section>

      <section className="capsule-hero-grid">
        <article className="report-card">
          <span>My prediction report card</span>
          <h3>{profile?.nickname ?? 'Sign in to reveal your card'}</h3>
          <div className="report-score">
            <strong>{currentRow?.points ?? scoreSummary.points}</strong>
            <small>{tournamentComplete ? 'final points' : 'current points'}</small>
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
          <span>{tournamentComplete ? 'World champion' : 'Final pairing'}</span>
          <strong>
            {champion ? (
              <TeamName team={champion} />
            ) : finalHome && finalAway ? (
              <span className="capsule-final-pairing">
                <TeamName team={finalHome} />
                <b>vs</b>
                <TeamName team={finalAway} />
              </span>
            ) : (
              'Still unwritten'
            )}
          </strong>
          {tournamentComplete ? (
            <b>
              {finalFixture.match.home_score}-{finalFixture.match.away_score}
              <em>after extra time</em>
            </b>
          ) : null}
          <small>
            {tournamentComplete
              ? "Ferran Torres wrote the winning goal in the 106th minute. Spain's second star is official."
              : 'The champion memory locks here after the final whistle.'}
          </small>
        </article>
      </section>

      {tournamentComplete ? (
        <section className="tournament-podium" aria-label="Tournament podium">
          <PodiumTeam
            note="World champions"
            place={1}
            team={champion}
          />
          <PodiumTeam note="Runners-up" place={2} team={runnerUp} />
          <PodiumTeam note="Bronze medal" place={3} team={thirdPlaceTeam} />
        </section>
      ) : null}

      <section className="capsule-metrics">
        <CapsuleMetric
          label="Matches archived"
          note="full tournament library"
          value={`${finishedMatches.length}/${fixtures.length}`}
        />
        <CapsuleMetric
          label="Highlights"
          note="complete tapmad archive"
          value={`${highlightCount}/${fixtures.length}`}
        />
        <CapsuleMetric
          label="Leaderboard entries"
          note="players in the standings"
          value={leaderboard.length}
        />
        <CapsuleMetric
          label="Tournament state"
          note={
            tournamentComplete
              ? 'all results verified'
              : finalFinished
                ? 'final result awaiting verification'
              : `${remainingMatches} ${remainingMatches === 1 ? 'match' : 'matches'} remain`
          }
          value={
            tournamentComplete
              ? 'Complete'
              : finalFinished
                ? 'Checking'
                : 'Final countdown'
          }
        />
      </section>

      <section className="capsule-grid">
        <article className="capsule-panel">
          <header>
            <span>Hall of Fame</span>
            <h3>{tournamentComplete ? 'Final awards board' : 'Awards race'}</h3>
          </header>
          <div className="award-grid">
            <AwardCard
              emptyText="The points leader will be crowned here."
              label={tournamentComplete ? 'Notebook Champion' : 'Points leader'}
              metric={`${championLeader?.points ?? 0} points`}
              row={championLeader}
            />
            <AwardCard
              emptyText="The sharpest score predictor will be crowned here."
              label={tournamentComplete ? 'Oracle' : 'Exact score leader'}
              metric={`${exactLeader?.exact_scores ?? 0} exact scores`}
              row={exactLeader}
            />
            <AwardCard
              emptyText="The best knockout predictor will be crowned here."
              label={tournamentComplete ? 'Knockout King' : 'Knockout leader'}
              metric={`${knockoutLeader?.correct_knockout ?? 0} knockout hits`}
              row={knockoutLeader}
            />
          </div>
        </article>

        <article className="capsule-panel">
          <header>
            <span>Tournament story</span>
            <h3>The numbers worth remembering</h3>
          </header>
          <div className="story-list">
            <MomentRow
              fixture={highestScoringMatch}
              label="Highest-scoring match"
              note={`${matchGoals(highestScoringMatch)} goals in one game`}
            />
            <MomentRow
              fixture={biggestWin}
              label="Biggest winning margin"
              note={`${winningMargin(biggestWin)} goals between the teams`}
            />
            <article className="story-total">
              <span>Goals recorded</span>
              <strong>{totalGoals}</strong>
              <small>across {finishedMatches.length} finished matches</small>
            </article>
            <article className="story-total">
              <span>Official videos</span>
              <strong>{highlightCount}</strong>
              <small>highlights ready to replay</small>
            </article>
          </div>
        </article>

        <article className="capsule-panel community-panel">
          <header>
            <span>Community final call</span>
            <h3>
              {finalPicks.length
                ? `${championPicks.length} of ${finalPicks.length} backed the champions`
                : 'The final vote is loading'}
            </h3>
          </header>
          <div className="community-final-story">
            <div className="community-final-vote">
              <span>
                <TeamName team={champion} />
                <strong>{championPicks.length}</strong>
              </span>
              <i>
                <b style={{ width: `${championPickPercent}%` }} />
              </i>
              <span>
                <TeamName team={runnerUp} />
                <strong>{runnerUpPicks.length}</strong>
              </span>
            </div>
            <div>
              <span>Community favourite</span>
              <strong>
                {runnerUpPicks.length > championPicks.length
                  ? runnerUp?.name
                  : champion?.name ?? '-'}
              </strong>
              <small>The majority call did not win the trophy.</small>
            </div>
            <div>
              <span>Popular prediction</span>
              <strong>{popularFinalScore ?? '-'}</strong>
              <small>The final stayed goalless for 105 minutes.</small>
            </div>
            <div>
              <span>Correct final calls</span>
              <strong>{championPicks.length}</strong>
              <small>
                {championPicks.length
                  ? championPicks.map((pick) => pick.nickname).join(' and ')
                  : 'No correct picks recorded'}
              </small>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
