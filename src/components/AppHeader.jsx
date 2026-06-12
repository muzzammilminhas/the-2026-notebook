import { useState } from 'react'

export function AppHeader({
  mode,
  onModeChange,
  profile,
  onNicknameChange,
  scoreSummary,
  backendStatus,
}) {
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(profile?.nickname ?? '')

  async function submitNickname(event) {
    event.preventDefault()
    await onNicknameChange(nickname)
    setEditing(false)
  }

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">26</span>
        <div>
          <h1>The 2026 Notebook</h1>
          <p>Live results, predictions &amp; what-if paths</p>
        </div>
      </div>

      <div className="mode-switch" aria-label="Notebook mode">
        <button
          className={mode === 'actual' ? 'active' : ''}
          onClick={() => onModeChange('actual')}
          type="button"
        >
          Actual
        </button>
        <button
          className={mode === 'whatif' ? 'active' : ''}
          onClick={() => onModeChange('whatif')}
          type="button"
        >
          What if
        </button>
      </div>

      <div className="header-account">
        <div className="header-score">
          <strong>{scoreSummary.points}</strong>
          <span>prediction points</span>
          <small>
            {scoreSummary.exact} exact · {scoreSummary.correct} outcomes ·{' '}
            {scoreSummary.knockoutCorrect} knockout
          </small>
        </div>

        {editing ? (
          <form className="nickname-form" onSubmit={submitNickname}>
            <input
              aria-label="Leaderboard nickname"
              autoFocus
              maxLength="24"
              minLength="3"
              onChange={(event) => setNickname(event.target.value)}
              value={nickname}
            />
            <button type="submit">Save</button>
          </form>
        ) : (
          <button
            className="profile-button"
            onClick={() => {
              setNickname(profile?.nickname ?? '')
              setEditing(true)
            }}
            type="button"
          >
            <span className={`status-dot ${backendStatus}`} />
            <span>
              <small>Playing as</small>
              <strong>{profile?.nickname ?? 'Connecting...'}</strong>
            </span>
          </button>
        )}
      </div>
    </header>
  )
}
