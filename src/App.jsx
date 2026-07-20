import { useMemo, useState } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { AdminStatus } from './components/AdminStatus'
import { AuthDialog } from './components/AuthDialog'
import { FixtureFeed } from './components/FixtureFeed'
import { FixtureFilters } from './components/FixtureFilters'
import { FinalShowdown } from './components/FinalShowdown'
import { HighlightsArchive } from './components/HighlightsArchive'
import { HighlightsDialog } from './components/HighlightsDialog'
import { KnockoutFixtureFeed } from './components/KnockoutFixtureFeed'
import { KnockoutBoard } from './components/KnockoutBoard'
import { Leaderboard } from './components/Leaderboard'
import { MatchDetailsDialog } from './components/MatchDetailsDialog'
import { ScenarioStandingsPanel } from './components/ScenarioStandingsPanel'
import { TimeCapsule } from './components/TimeCapsule'
import { TournamentStandings } from './components/TournamentStandings'
import { getMatchHighlight } from './data/matchHighlights'
import { TEAMS } from './data/tournament'
import {
  buildPredictionScores,
  useWorldCupBackend,
} from './hooks/useWorldCupBackend'
import {
  buildFixtureSchedule,
  fixtureDateKey,
  filterFixtureSchedule,
} from './lib/fixtureSchedule'
import {
  buildKnockout,
  calculateTournament,
  getDependentMatchIds,
  summarizeImpacts,
} from './lib/tournamentEngine'

function App() {
  const backend = useWorldCupBackend()
  const [section, setSection] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    if (['actual', 'whatif'].includes(hash)) return 'groups'
    return [
      'knockout',
      'highlights',
      'capsule',
      'bracket',
      'leaderboard',
      'groups',
      'standings',
      'admin',
    ].includes(hash)
      ? hash
      : 'knockout'
  })
  const [groupArchiveMode, setGroupArchiveMode] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    return hash === 'whatif' ? 'whatif' : 'actual'
  })
  const [knockoutMode, setKnockoutMode] = useState('official')
  const [knockoutMatchTab, setKnockoutMatchTab] = useState('completed')
  const [scenarioGroup, setScenarioGroup] = useState('A')
  const [fixtureFilters, setFixtureFilters] = useState({
    team: '',
    group: '',
    date: '',
  })
  const [notice, setNotice] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState(null)
  const [selectedHighlight, setSelectedHighlight] = useState(null)

  const predictionScores = useMemo(
    () =>
      buildPredictionScores(
        backend.actualScores,
        backend.predictions,
        backend.matchMeta,
      ),
    [backend.actualScores, backend.matchMeta, backend.predictions],
  )
  const scenarioPicks = useMemo(
    () => ({
      ...backend.knockoutPicks,
      ...backend.actualPicks,
    }),
    [backend.actualPicks, backend.knockoutPicks],
  )
  const actualTournament = useMemo(
    () => calculateTournament(backend.actualScores),
    [backend.actualScores],
  )
  const scenarioTournament = useMemo(
    () => calculateTournament(predictionScores),
    [predictionScores],
  )
  const officialKnockout = useMemo(
    () => buildKnockout(actualTournament, backend.actualPicks),
    [actualTournament, backend.actualPicks],
  )
  const scenarioKnockout = useMemo(
    () => buildKnockout(scenarioTournament, scenarioPicks),
    [scenarioPicks, scenarioTournament],
  )
  const impacts = useMemo(
    () => summarizeImpacts(actualTournament, scenarioTournament),
    [actualTournament, scenarioTournament],
  )
  const fixtureSchedule = useMemo(
    () => buildFixtureSchedule(backend.matchMeta),
    [backend.matchMeta],
  )
  const filteredFixtures = useMemo(
    () => filterFixtureSchedule(fixtureSchedule, fixtureFilters),
    [fixtureFilters, fixtureSchedule],
  )
  const fixtureDates = useMemo(
    () => [...new Set(fixtureSchedule.map((fixture) => fixture.dateKey))],
    [fixtureSchedule],
  )
  const activeKnockout =
    knockoutMode === 'whatif' ? scenarioKnockout : officialKnockout
  const officialKnockoutFixtures = useMemo(
    () =>
      officialKnockout.rounds
        .flatMap((round) =>
          round.matches.map((match) => {
            const officialMatch = backend.matchByNumber[match.id]
            return {
              id: match.id,
              stage: officialMatch?.stage ?? round.id,
              roundLabel: round.label,
              match: officialMatch,
              homeId: officialMatch?.home_team_id ?? match.participants[0],
              awayId: officialMatch?.away_team_id ?? match.participants[1],
              participantsReady: match.participantsReady,
              dateKey: fixtureDateKey(officialMatch?.kickoff_at),
            }
          }),
        )
        .sort((left, right) => {
          const leftTime = left.match?.kickoff_at
            ? new Date(left.match.kickoff_at).getTime()
            : Number.POSITIVE_INFINITY
          const rightTime = right.match?.kickoff_at
            ? new Date(right.match.kickoff_at).getTime()
            : Number.POSITIVE_INFINITY
          return leftTime - rightTime || left.id - right.id
        }),
    [backend.matchByNumber, officialKnockout],
  )
  const knockoutFixtures = useMemo(
    () =>
      activeKnockout.rounds
        .flatMap((round) =>
          round.matches.map((match) => {
            const officialMatch = backend.matchByNumber[match.id]
            const useOfficialParticipants = knockoutMode === 'official'
            return {
              id: match.id,
              stage: officialMatch?.stage ?? round.id,
              roundLabel: round.label,
              match: officialMatch,
              homeId:
                useOfficialParticipants && officialMatch?.home_team_id
                  ? officialMatch.home_team_id
                  : match.participants[0],
              awayId:
                useOfficialParticipants && officialMatch?.away_team_id
                  ? officialMatch.away_team_id
                  : match.participants[1],
              participantsReady: match.participantsReady,
              dateKey: fixtureDateKey(officialMatch?.kickoff_at),
            }
          }),
        )
        .sort((left, right) => {
          const leftTime = left.match?.kickoff_at
            ? new Date(left.match.kickoff_at).getTime()
            : Number.POSITIVE_INFINITY
          const rightTime = right.match?.kickoff_at
            ? new Date(right.match.kickoff_at).getTime()
            : Number.POSITIVE_INFINITY
          return leftTime - rightTime || left.id - right.id
        }),
    [activeKnockout, backend.matchByNumber, knockoutMode],
  )
  const completedKnockoutFixtures = useMemo(
    () =>
      knockoutFixtures.filter(
        (fixture) => fixture.match?.status === 'finished',
      ),
    [knockoutFixtures],
  )
  const upcomingKnockoutFixtures = useMemo(
    () =>
      knockoutFixtures.filter(
        (fixture) => fixture.match?.status !== 'finished',
      ),
    [knockoutFixtures],
  )
  const visibleKnockoutFixtures =
    knockoutMatchTab === 'completed'
      ? completedKnockoutFixtures
      : upcomingKnockoutFixtures
  const finalFixture = officialKnockoutFixtures.find(
    (fixture) => fixture.roundLabel === 'Final',
  )
  const thirdPlaceFixture = officialKnockoutFixtures.find(
    (fixture) => fixture.roundLabel === 'Third place',
  )
  const liveKnockoutCount = knockoutFixtures.filter(
    (fixture) => fixture.match?.status === 'live',
  ).length
  const pickedKnockoutCount = Object.values(backend.knockoutPredictions).filter(
    (prediction) =>
      Number.isInteger(prediction.home) && Number.isInteger(prediction.away),
  ).length
  const finalPrediction = backend.knockoutPredictions[104]
  const archiveFixtures = useMemo(
    () => [
      ...fixtureSchedule.map((fixture) => ({
        ...fixture,
        roundLabel: `Group ${fixture.groupId}`,
        stage: 'group',
      })),
      ...officialKnockoutFixtures,
    ],
    [fixtureSchedule, officialKnockoutFixtures],
  )
  const tournamentComplete = Boolean(
    finalFixture?.match?.status === 'finished'
      && finalFixture.match.verified
      && finalFixture.match.winner_team_id,
  )
  const champion = tournamentComplete
    ? TEAMS[finalFixture.match.winner_team_id]
    : null
  const readyHighlightCount = archiveFixtures.filter((fixture) =>
    getMatchHighlight(fixture.match),
  ).length
  const finalPickResult = !backend.user
    ? 'Sign in'
    : !finalPrediction
      ? 'No pick'
      : finalPrediction.grade === 'wrong'
        ? 'Missed'
        : `+${finalPrediction.points ?? 0}`

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  function changeSection(nextSection) {
    setSection(nextSection)
    window.history.replaceState(null, '', `#${nextSection}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function focusKnockoutFixture(fixture) {
    if (Number(fixture.match?.match_number) === 104) {
      setSelectedFixture(fixture)
      return
    }
    setKnockoutMatchTab(
      fixture.match?.status === 'finished' ? 'completed' : 'upcoming',
    )
    window.setTimeout(() => {
      document
        .getElementById(`match-${fixture.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 0)
  }

  async function updatePrediction(fixtureId, side, value) {
    if (!backend.user) {
      setAuthOpen(true)
      return
    }
    const match = backend.matchMeta[fixtureId]
    const started =
      match &&
      (match.status !== 'scheduled' ||
        (match.kickoff_at && new Date(match.kickoff_at) <= new Date()))
    if (started) {
      showNotice('Prediction locked: this match has started.')
      return
    }

    const current = backend.predictions[fixtureId] ?? {}
    const nextScore = { ...current, [side]: value }

    try {
      const result = await backend.savePrediction(fixtureId, nextScore)
      if (result.persisted) showNotice('Prediction saved')
    } catch (error) {
      showNotice(error.message || 'Prediction could not be saved.')
    }
  }

  async function pickWinner(matchId, teamId) {
    if (knockoutMode !== 'whatif') return
    if (!backend.user) {
      setAuthOpen(true)
      return
    }
    if (!scenarioTournament.isGroupStageComplete) {
      showNotice(
        `Complete all group predictions first (${scenarioTournament.completeMatches}/72).`,
      )
      return
    }
    const bracketMatch = scenarioKnockout.rounds
      .flatMap((round) => round.matches)
      .find((match) => match.id === matchId)
    if (!bracketMatch?.participantsReady) {
      showNotice('Choose both previous match winners before this round.')
      return
    }
    if (!bracketMatch.participants.includes(teamId)) {
      showNotice('That team is not in this matchup.')
      return
    }
    const match = backend.matchByNumber[matchId]
    const locked =
      !match ||
      match.status !== 'scheduled' ||
      (match.kickoff_at && new Date(match.kickoff_at) <= new Date())
    if (locked) {
      showNotice('Prediction locked: this match has started.')
      return
    }

    const dependentMatchIds = getDependentMatchIds(matchId)
    const isUndo = backend.knockoutPicks[matchId] === teamId
    try {
      if (isUndo) {
        await backend.clearKnockoutPredictions([
          matchId,
          ...dependentMatchIds,
        ])
        showNotice('Pick removed and later rounds cleared')
        return
      }
      await backend.clearKnockoutPredictions(dependentMatchIds)
      await backend.saveKnockoutPrediction(matchId, teamId)
      showNotice(
        dependentMatchIds.some((id) => backend.knockoutPicks[id])
          ? 'Pick changed and later rounds cleared'
          : 'Knockout pick saved',
      )
    } catch (error) {
      showNotice(error.message || 'Knockout pick could not be saved.')
    }
  }

  async function updateKnockoutScore(fixture, side, value) {
    if (knockoutMode !== 'whatif') return
    if (!backend.user) {
      setAuthOpen(true)
      return
    }
    if (!fixture.participantsReady) {
      showNotice('Both teams must be known before you can predict this match.')
      return
    }
    const match = backend.matchByNumber[fixture.id]
    const locked =
      !match ||
      match.status !== 'scheduled' ||
      (match.kickoff_at && new Date(match.kickoff_at) <= new Date())
    if (locked) {
      showNotice('Prediction locked: this match has started.')
      return
    }

    const current = backend.knockoutPredictions[fixture.id] ?? {}
    const nextScore = { ...current, [side]: value }
    const complete =
      Number.isInteger(nextScore.home) && Number.isInteger(nextScore.away)
    const winnerId = complete
      ? nextScore.home > nextScore.away
        ? fixture.homeId
        : nextScore.away > nextScore.home
          ? fixture.awayId
          : current.teamId
      : null

    if (complete && !winnerId) {
      await backend.saveKnockoutPrediction(fixture.id, null, nextScore)
      showNotice('Choose who advances on penalties.')
      return
    }

    const dependentMatchIds = getDependentMatchIds(fixture.id)
    try {
      if (winnerId) await backend.clearKnockoutPredictions(dependentMatchIds)
      const result = await backend.saveKnockoutPrediction(
        fixture.id,
        winnerId,
        nextScore,
      )
      if (result.persisted) showNotice('Knockout score saved')
    } catch (error) {
      showNotice(error.message || 'Knockout score could not be saved.')
    }
  }

  async function updateKnockoutWinner(fixture, teamId) {
    if (knockoutMode !== 'whatif') return
    if (!backend.user) {
      setAuthOpen(true)
      return
    }
    const match = backend.matchByNumber[fixture.id]
    const locked =
      !match ||
      match.status !== 'scheduled' ||
      (match.kickoff_at && new Date(match.kickoff_at) <= new Date())
    if (locked) {
      showNotice('Prediction locked: this match has started.')
      return
    }
    const current = backend.knockoutPredictions[fixture.id] ?? {}
    if (
      !Number.isInteger(current.home) ||
      !Number.isInteger(current.away) ||
      current.home !== current.away
    ) {
      showNotice('Penalty winner is only needed for tied score predictions.')
      return
    }
    if (![fixture.homeId, fixture.awayId].includes(teamId)) {
      showNotice('That team is not in this matchup.')
      return
    }
    try {
      await backend.clearKnockoutPredictions(getDependentMatchIds(fixture.id))
      const result = await backend.saveKnockoutPrediction(fixture.id, teamId, {
        home: current.home,
        away: current.away,
      })
      if (result.persisted) showNotice('Penalty winner saved')
    } catch (error) {
      showNotice(error.message || 'Penalty winner could not be saved.')
    }
  }

  async function resetKnockoutPicks() {
    const resettableIds = Object.entries(backend.knockoutPredictions)
      .filter(([, prediction]) => !prediction.scoredAt)
      .map(([matchId]) => Number(matchId))
    if (!resettableIds.length) {
      showNotice('There are no unlocked knockout picks to reset.')
      return
    }
    try {
      await backend.clearKnockoutPredictions(resettableIds)
      showNotice('All unlocked knockout picks reset')
    } catch (error) {
      showNotice(error.message || 'Knockout picks could not be reset.')
    }
  }

  const completedCount = Object.values(backend.matchMeta).filter(
    (match) => match.stage === 'group' && match.status === 'finished',
  ).length
  const verifiedCount = Object.values(backend.matchMeta).filter(
    (match) => match.status === 'finished' && match.verified,
  ).length
  const syncText = backend.archiveFallback
    ? 'Permanent archive'
    : backend.error
    ? 'Live feed unavailable'
    : backend.lastUpdated
      ? `Checked ${backend.lastUpdated.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : 'Connecting to live feed'

  return (
    <div className="app-shell">
      <AppHeader
        backendStatus={backend.error ? 'error' : 'online'}
        isAdmin={backend.isAdmin}
        onProfileChange={async (profile) => {
          try {
            await backend.updateProfile(profile)
            showNotice('Profile updated')
          } catch (error) {
            showNotice(error.message)
          }
        }}
        onSectionChange={changeSection}
        onSignIn={() => setAuthOpen(true)}
        onSignOut={async () => {
          try {
            await backend.signOut()
            showNotice('Signed out')
          } catch (error) {
            showNotice(error.message || 'Could not sign out.')
          }
        }}
        profile={backend.profile}
        scoreSummary={backend.scoreSummary}
        section={section}
        tournamentComplete={tournamentComplete}
        user={backend.user}
      />

      <div className="workspace">
        <main className="paper" aria-live="polite">
          <div className="paper-meta">
            <span>
              {tournamentComplete
                ? `${verifiedCount}/104 verified tournament results`
                : `${completedCount}/72 official group results`}
            </span>
            <span className={backend.error ? 'feed-error' : ''}>
              {syncText}
            </span>
          </div>

          {section === 'groups' ? (
            <div className={`fixture-page ${groupArchiveMode}`}>
              <section className="page-heading fixture-page-heading">
                <div>
                  <span className="hand-note">Archived group stage</span>
                  <h2>
                    {groupArchiveMode === 'actual'
                      ? 'Fixtures & results'
                      : 'What If fixtures'}
                  </h2>
                  <p>
                    The group stage is finished, but the full notebook stays
                    here for anyone who wants to revisit results and old picks.
                  </p>
                </div>
                <div className="knockout-mode-switch archived-mode-switch">
                  <button
                    className={groupArchiveMode === 'actual' ? 'active' : ''}
                    onClick={() => setGroupArchiveMode('actual')}
                    type="button"
                  >
                    Official archive
                  </button>
                  <button
                    className={groupArchiveMode === 'whatif' ? 'active' : ''}
                    onClick={() => setGroupArchiveMode('whatif')}
                    type="button"
                  >
                    My old picks
                  </button>
                </div>
              </section>

              <FixtureFilters
                  dates={fixtureDates}
                  filters={fixtureFilters}
                onChange={setFixtureFilters}
                totalCount={fixtureSchedule.length}
                  visibleCount={filteredFixtures.length}
                />

              <div
                className={`fixture-page-layout ${
                  groupArchiveMode === 'whatif' ? 'with-scenario' : ''
                }`}
              >
                <FixtureFeed
                  actualScores={backend.actualScores}
                  fixtures={filteredFixtures}
                  mode={groupArchiveMode}
                  onOpenDetails={setSelectedFixture}
                  onOpenHighlights={setSelectedHighlight}
                  onScoreChange={updatePrediction}
                  predictions={backend.predictions}
                  savingMatches={backend.savingMatches}
                />

                {groupArchiveMode === 'whatif' ? (
                  <ScenarioStandingsPanel
                    actualTournament={actualTournament}
                    impacts={impacts}
                    onSelectGroup={setScenarioGroup}
                    scores={predictionScores}
                    selectedGroup={scenarioGroup}
                    tournament={scenarioTournament}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {section === 'standings' ? (
            <TournamentStandings tournament={actualTournament} />
          ) : null}

          {section === 'highlights' ? (
            <HighlightsArchive
              fixtures={archiveFixtures}
              onOpenHighlights={setSelectedHighlight}
            />
          ) : null}

          {section === 'capsule' ? (
            <TimeCapsule
              championId={officialKnockout.championId}
              currentUserId={backend.user?.id}
              fixtures={archiveFixtures}
              leaderboard={backend.leaderboard}
              profile={backend.profile}
              scoreSummary={backend.scoreSummary}
            />
          ) : null}

          {section === 'knockout' ? (
            <div className="knockout-page">
              <FinalShowdown
                finalFixture={finalFixture}
                mode={knockoutMode}
                onModeChange={setKnockoutMode}
                onOpenHighlights={setSelectedHighlight}
                onOpenMatch={focusKnockoutFixture}
                thirdPlaceFixture={thirdPlaceFixture}
              />

              <section
                className="knockout-command-strip"
                aria-label={
                  tournamentComplete
                    ? 'Completed tournament snapshot'
                    : 'Final countdown snapshot'
                }
              >
                {tournamentComplete ? (
                  <>
                    <article className="command-card command-card-primary">
                      <span>World champions</span>
                      <strong>{champion?.name ?? 'Spain'}</strong>
                      <small>the second star belongs to La Roja</small>
                    </article>
                    <article className="command-card">
                      <span>Final</span>
                      <strong>1-0</strong>
                      <small>Ferran Torres, 106 minutes</small>
                    </article>
                    <article className="command-card">
                      <span>Verified results</span>
                      <strong>{verifiedCount}</strong>
                      <small>every match sealed by the FIFA feed</small>
                    </article>
                    <article className="command-card">
                      <span>Highlights</span>
                      <strong>{readyHighlightCount}</strong>
                      <small>complete tapmad tournament archive</small>
                    </article>
                    <article className="command-card command-card-accent">
                      <span>My final call</span>
                      <strong>{finalPickResult}</strong>
                      <small>{pickedKnockoutCount} knockout scorelines overall</small>
                    </article>
                  </>
                ) : (
                  <>
                    <article className="command-card command-card-primary">
                      <span>Now watching</span>
                      <strong>The final</strong>
                      <small>Spain, Argentina and one last page to write</small>
                    </article>
                    <article className="command-card">
                      <span>Match</span>
                      <strong>104</strong>
                      <small>Spain vs Argentina for the trophy</small>
                    </article>
                    <article className="command-card">
                      <span>Matches left</span>
                      <strong>{upcomingKnockoutFixtures.length}</strong>
                      <small>the biggest one</small>
                    </article>
                    <article className="command-card">
                      <span>Live pulse</span>
                      <strong>{liveKnockoutCount}</strong>
                      <small>Match Centre follows every moment</small>
                    </article>
                    <article className="command-card command-card-accent">
                      <span>My final pick</span>
                      <strong>Open</strong>
                      <small>{pickedKnockoutCount} knockout scorelines overall</small>
                    </article>
                  </>
                )}
              </section>

              <section className="knockout-feed-section">
                <div className="section-title compact">
                  <div>
                    <span className="section-number">01</span>
                    <h3>Match notebook</h3>
                  </div>
                  <p>Completed matches move out of the active list.</p>
                </div>

                <div
                  className="knockout-mode-switch knockout-match-tabs"
                  aria-label="Knockout match list"
                >
                  <button
                    className={knockoutMatchTab === 'upcoming' ? 'active' : ''}
                    onClick={() => setKnockoutMatchTab('upcoming')}
                    type="button"
                  >
                    Upcoming ({upcomingKnockoutFixtures.length})
                  </button>
                  <button
                    className={
                      knockoutMatchTab === 'completed' ? 'active' : ''
                    }
                    onClick={() => setKnockoutMatchTab('completed')}
                    type="button"
                  >
                    Completed ({completedKnockoutFixtures.length})
                  </button>
                </div>

              <KnockoutFixtureFeed
                fixtures={visibleKnockoutFixtures}
                mode={knockoutMode}
                onOpenDetails={setSelectedFixture}
                onOpenHighlights={setSelectedHighlight}
                onScoreChange={updateKnockoutScore}
                onWinnerChange={updateKnockoutWinner}
                predictions={
                  knockoutMode === 'whatif'
                    ? backend.knockoutPredictions
                    : {}
                }
              />
              </section>
            </div>
          ) : null}

          {section === 'bracket' ? (
            <div className="knockout-page">
              <section className="page-heading fixture-page-heading">
                <div>
                  <span className="hand-note">Knockout path</span>
                  <h2>Bracket</h2>
                  <p>
                    Actual and simulation brackets live here, including the
                    third-place match. What If follows your score predictions
                    from the Knockout match notebook.
                  </p>
                </div>
              </section>

              <div className="knockout-mode-switch" aria-label="Bracket mode">
                <button
                  className={knockoutMode === 'official' ? 'active' : ''}
                  onClick={() => setKnockoutMode('official')}
                  type="button"
                >
                  Actual bracket
                </button>
                <button
                  className={knockoutMode === 'whatif' ? 'active' : ''}
                  onClick={() => setKnockoutMode('whatif')}
                  type="button"
                >
                  What If bracket
                </button>
              </div>

              <section className="knockout-bracket-section">
                <KnockoutBoard
                  isWhatIf={knockoutMode === 'whatif'}
                  knockout={activeKnockout}
                  matchByNumber={backend.matchByNumber}
                  onPickWinner={pickWinner}
                  onReset={resetKnockoutPicks}
                  predictions={
                    knockoutMode === 'whatif'
                      ? backend.knockoutPredictions
                      : {}
                  }
                  tournament={
                    knockoutMode === 'whatif'
                      ? scenarioTournament
                      : actualTournament
                  }
                />
              </section>
            </div>
          ) : null}

          {section === 'leaderboard' ? (
            <Leaderboard
              currentUserId={backend.user?.id}
              loading={backend.loading}
              rows={backend.leaderboard}
            />
          ) : null}

          {section === 'admin' ? (
            <AdminStatus isAdmin={backend.isAdmin} loading={backend.loading} />
          ) : null}
        </main>
      </div>

      {backend.loading ? (
        <div className="connection-banner">Opening your notebook...</div>
      ) : null}
      {notice ? <div className="toast">{notice}</div> : null}
      {authOpen ? (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          onSignIn={backend.signIn}
          onSignUp={backend.signUp}
        />
      ) : null}
      {selectedFixture?.match ? (
        <MatchDetailsDialog
          currentUserId={backend.user?.id}
          fixture={selectedFixture}
          match={selectedFixture.match}
          onClose={() => setSelectedFixture(null)}
        />
      ) : null}
      {selectedHighlight ? (
        <HighlightsDialog
          fixture={selectedHighlight}
          onClose={() => setSelectedHighlight(null)}
        />
      ) : null}
    </div>
  )
}

export default App
