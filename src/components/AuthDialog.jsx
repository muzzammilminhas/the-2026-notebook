import { useState } from 'react'
import { GROUP_IDS, TEAMS } from '../data/tournament'

export function AuthDialog({ onClose, onSignIn, onSignUp }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [favoriteTeamId, setFavoriteTeamId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      if (mode === 'signup') {
        const result = await onSignUp({
          email,
          password,
          nickname,
          favoriteTeamId,
        })
        if (!result.session) {
          setMessage('Account created. Check your email to confirm it, then sign in.')
          return
        }
      } else {
        await onSignIn({ email, password })
      }
      onClose()
    } catch (authError) {
      setError(authError.message || 'Authentication failed.')
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="auth-title"
        aria-modal="true"
        className="auth-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Close account dialog"
          className="auth-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <span className="auth-kicker">Your tournament notebook</span>
        <h2 id="auth-title">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p>
          Sign in on any device to keep the same predictions, points and
          leaderboard identity.
        </p>

        <div className="auth-tabs">
          <button
            className={mode === 'signin' ? 'active' : ''}
            onClick={() => switchMode('signin')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => switchMode('signup')}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' ? (
            <>
              <label>
                Leaderboard name
                <input
                  autoComplete="nickname"
                  maxLength="24"
                  minLength="3"
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Muzammil"
                  required
                  value={nickname}
                />
              </label>
              <label>
                Favourite team (optional)
                <select
                  onChange={(event) => setFavoriteTeamId(event.target.value)}
                  value={favoriteTeamId}
                >
                  <option value="">Choose later</option>
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
              </label>
            </>
          ) : null}

          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength="8"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <div className="auth-feedback error">{error}</div> : null}
          {message ? (
            <div className="auth-feedback success">{message}</div>
          ) : null}

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting
              ? 'Please wait...'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <small className="auth-note">
          No social login, no payment and no marketing email.
        </small>
      </section>
    </div>
  )
}
