import { useMemo, useState } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { AuthDialog } from './components/AuthDialog'
import { GroupLab } from './components/GroupLab'
import { GroupNav } from './components/GroupNav'
import { KnockoutBoard } from './components/KnockoutBoard'
import { Leaderboard } from './components/Leaderboard'
import {
  buildPredictionScores,
  useWorldCupBackend,
} from './hooks/useWorldCupBackend'
import {
  buildKnockout,
  calculateTournament,
  getDependentMatchIds,
  summarizeImpacts,
} from './lib/tournamentEngine'

function App() {
  const backend = useWorldCupBackend()
  const [mode, setMode] = useState('whatif')
  const [view, setView] = useState('groups')
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [notice, setNotice] = useState('')
  const [authOpen, setAuthOpen] = useState(false)

  const predictionScores = useMemo(
    () =>
      buildPredictionScores(
        backend.actualScores,
        backend.predictions,
        backend.matchMeta,
      ),
    [backend.actualScores, backend.matchMeta, backend.predictions],
  )
  const effectiveScores =
    mode === 'actual' ? backend.actualScores : predictionScores
  const effectivePicks = useMemo(
    () =>
      mode === 'actual'
        ? backend.actualPicks
        : {
            ...backend.knockoutPicks,
            ...backend.actualPicks,
          },
    [backend.actualPicks, backend.knockoutPicks, mode],
  )

  const actualTournament = useMemo(
    () => calculateTournament(backend.actualScores),
    [backend.actualScores],
  )
  const tournament = useMemo(
    () => calculateTournament(effectiveScores),
    [effectiveScores],
  )
  const knockout = useMemo(
    () => buildKnockout(tournament, effectivePicks),
    [effectivePicks, tournament],
  )
  const impacts = useMemo(
    () =>
      mode === 'whatif'
        ? summarizeImpacts(actualTournament, tournament)
        : [],
    [actualTournament, mode, tournament],
  )

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
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
    if (mode === 'actual') return
    if (!backend.user) {
      setAuthOpen(true)
      return
    }
    if (!tournament.isGroupStageComplete) {
      showNotice(
        `Complete all group predictions first (${tournament.completeMatches}/72).`,
      )
      return
    }
    const bracketMatch = knockout.rounds
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
  const syncText = backend.error
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
        mode={mode}
        onModeChange={setMode}
        onProfileChange={async (profile) => {
          try {
            await backend.updateProfile(profile)
            showNotice('Profile updated')
          } catch (error) {
            showNotice(error.message)
          }
        }}
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
        user={backend.user}
      />

      <div className="workspace">
        <GroupNav
          selectedGroup={selectedGroup}
          onSelectGroup={(groupId) => {
            setSelectedGroup(groupId)
            setView('groups')
          }}
          view={view}
          onViewChange={setView}
          tournament={tournament}
        />

        <main className="paper" aria-live="polite">
          <div className="paper-meta">
            <span>{completedCount}/72 official group results</span>
            <span className={backend.error ? 'feed-error' : ''}>
              {syncText}
            </span>
          </div>

          {view === 'groups' ? (
            <GroupLab
              actualScores={backend.actualScores}
              actualTournament={actualTournament}
              groupId={selectedGroup}
              impacts={impacts}
              isWhatIf={mode === 'whatif'}
              matchMeta={backend.matchMeta}
              onScoreChange={updatePrediction}
              predictions={backend.predictions}
              savingMatches={backend.savingMatches}
              scores={effectiveScores}
              tournament={tournament}
            />
          ) : null}

          {view === 'knockout' ? (
            <KnockoutBoard
              isWhatIf={mode === 'whatif'}
              knockout={knockout}
              matchByNumber={backend.matchByNumber}
              onPickWinner={pickWinner}
              onReset={resetKnockoutPicks}
              predictions={backend.knockoutPredictions}
              tournament={tournament}
            />
          ) : null}

          {view === 'leaderboard' ? (
            <Leaderboard
              currentUserId={backend.user?.id}
              loading={backend.loading}
              rows={backend.leaderboard}
            />
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
    </div>
  )
}

export default App
