import { useState } from 'react'
import { GROUP_IDS, TEAMS } from '../data/tournament'

const SECTIONS = [
  { id: 'knockout', label: 'Knockout' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'groups', label: 'Group archive' },
  { id: 'standings', label: 'Standings' },
]

export function AppHeader({
  section,
  onSectionChange,
  profile,
  onProfileChange,
  onSignIn,
  onSignOut,
  scoreSummary,
  backendStatus,
  user,
  isAdmin,
}) {
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [favoriteTeamId, setFavoriteTeamId] = useState(
    profile?.favorite_team_id ?? '',
  )
  const favoriteTeam = profile?.favorite_team_id
    ? TEAMS[profile.favorite_team_id]
    : null

  async function submitProfile(event) {
    event.preventDefault()
    await onProfileChange({ nickname, favoriteTeamId })
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

      <nav className="mode-switch primary-nav" aria-label="Notebook sections">
        {[...SECTIONS, ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : [])].map((item) => (
          <button
            aria-current={section === item.id ? 'page' : undefined}
            className={section === item.id ? 'active' : ''}
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="header-account">
        <div className="header-score">
          <strong>{scoreSummary.points}</strong>
          <span>prediction points</span>
          <small>
            {scoreSummary.exact} exact · {scoreSummary.correct} outcomes ·{' '}
            {scoreSummary.knockoutCorrect} knockout
          </small>
        </div>

        {!user ? (
          <button className="profile-button sign-in-button" onClick={onSignIn} type="button">
            <span className="status-dot" />
            <span>
              <small>Save your predictions</small>
              <strong>Sign in or create account</strong>
            </span>
          </button>
        ) : editing ? (
          <form className="nickname-form" onSubmit={submitProfile}>
            <input
              aria-label="Leaderboard nickname"
              autoFocus
              maxLength="24"
              minLength="3"
              onChange={(event) => setNickname(event.target.value)}
              value={nickname}
            />
            <select
              aria-label="Favourite team"
              onChange={(event) => setFavoriteTeamId(event.target.value)}
              value={favoriteTeamId}
            >
              <option value="">No favourite</option>
              {GROUP_IDS.map((groupId) => (
                <optgroup key={groupId} label={`Group ${groupId}`}>
                  {Object.values(TEAMS)
                    .filter((team) => team.groupId === groupId)
                    .map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <button type="submit">Save</button>
            <button
              className="cancel-profile-button"
              onClick={() => setEditing(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="sign-out-button"
              onClick={async () => {
                setEditing(false)
                await onSignOut()
              }}
              type="button"
            >
              Sign out
            </button>
          </form>
        ) : (
          <button
            className="profile-button"
            onClick={() => {
              setNickname(profile?.nickname ?? '')
              setFavoriteTeamId(profile?.favorite_team_id ?? '')
              setEditing(true)
            }}
            type="button"
          >
            <span className={`status-dot ${backendStatus}`} />
            <span>
              <small>Playing as</small>
              <strong>{profile?.nickname ?? 'Connecting...'}</strong>
              <em>
                {favoriteTeam
                  ? `Favourite: ${favoriteTeam.name}`
                  : 'Choose your favourite team'}
              </em>
            </span>
          </button>
        )}
      </div>
    </header>
  )
}
