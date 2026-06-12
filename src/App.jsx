import { useMemo, useState } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
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
  summarizeImpacts,
} from './lib/tournamentEngine'

function App() {
  const backend = useWorldCupBackend()
  const [mode, setMode] = useState('whatif')
  const [view, setView] = useState('groups')
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [scenarioPicks, setScenarioPicks] = useState({})
  const [notice, setNotice] = useState('')

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
            ...scenarioPicks,
            ...backend.actualPicks,
          },
    [
      backend.actualPicks,
      backend.knockoutPicks,
      mode,
      scenarioPicks,
    ],
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
    const match = backend.matchByNumber[matchId]
    const locked =
      match &&
      (match.status !== 'scheduled' ||
        (match.kickoff_at && new Date(match.kickoff_at) <= new Date()))
    if (locked) {
      showNotice('Prediction locked: this match has started.')
      return
    }

    setScenarioPicks((current) => ({ ...current, [matchId]: teamId }))
    try {
      await backend.saveKnockoutPrediction(matchId, teamId)
      showNotice('Knockout pick saved')
    } catch (error) {
      showNotice(error.message || 'Knockout pick could not be saved.')
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
        onNicknameChange={async (nickname) => {
          try {
            await backend.updateNickname(nickname)
            showNotice('Nickname updated')
          } catch (error) {
            showNotice(error.message)
          }
        }}
        profile={backend.profile}
        scoreSummary={backend.scoreSummary}
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
    </div>
  )
}

export default App
