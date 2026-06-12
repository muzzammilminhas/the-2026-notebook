function Avatar({ seed, name }) {
  const initials = name
    .split(/\s|-/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const hue =
    [...(seed || name)].reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    ) % 360

  return (
    <span className="leader-avatar" style={{ '--avatar-hue': hue }}>
      {initials}
    </span>
  )
}

export function Leaderboard({ rows, currentUserId, loading }) {
  return (
    <div className="leaderboard-view">
      <section className="group-heading leaderboard-heading">
        <div>
          <span className="hand-note">Culture table</span>
          <h2>Leaderboard</h2>
          <p>
            Exact score = 3. Correct outcome = 1. Knockout winner = 2.
          </p>
        </div>
        <div className="score-rules">
          <span><strong>3</strong> exact</span>
          <span><strong>1</strong> outcome</span>
          <span><strong>2</strong> knockout</span>
          <span><strong>0</strong> wrong</span>
        </div>
      </section>

      <section className="leaderboard-paper">
        <div className="leaderboard-labels">
          <span>Rank</span>
          <span>Player</span>
          <span>Exact</span>
          <span>Correct</span>
          <span>KO</span>
          <span>Points</span>
        </div>
        {loading ? <p className="empty-board">Loading the table...</p> : null}
        {!loading && !rows.length ? (
          <p className="empty-board">
            The leaderboard is waiting for its first prediction.
          </p>
        ) : null}
        {rows.map((row, index) => (
          <article
            className={`leader-row ${
              row.user_id === currentUserId ? 'is-me' : ''
            }`}
            key={row.user_id}
          >
            <span className="leader-rank">{index + 1}</span>
            <span className="leader-person">
              <Avatar name={row.nickname} seed={row.avatar_seed} />
              <span className="leader-identity">
                <strong>{row.nickname}</strong>
                {row.favorite_team_name ? (
                  <small>Favourite: {row.favorite_team_name}</small>
                ) : null}
              </span>
              {row.user_id === currentUserId ? <small>You</small> : null}
            </span>
            <span>{row.exact_scores}</span>
            <span>{row.correct_outcomes}</span>
            <span>{row.correct_knockout}</span>
            <strong className="leader-points">{row.points}</strong>
          </article>
        ))}
      </section>
    </div>
  )
}
