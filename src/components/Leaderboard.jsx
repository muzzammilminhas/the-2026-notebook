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

function PodiumCard({ row, rank, currentUserId }) {
  const labels = ['Leader', 'Chasing', 'Third']

  return (
    <article
      className={`podium-card rank-${rank} ${
        row.user_id === currentUserId ? 'is-me' : ''
      }`}
    >
      <span className="podium-rank">#{rank}</span>
      <Avatar name={row.nickname} seed={row.avatar_seed} />
      <div>
        <small>{labels[rank - 1]}</small>
        <strong>{row.nickname}</strong>
        {row.favorite_team_name ? (
          <em>{row.favorite_team_name}</em>
        ) : (
          <em>No favourite team</em>
        )}
      </div>
      <span className="podium-points">{row.points}</span>
    </article>
  )
}

export function Leaderboard({ rows, currentUserId, loading }) {
  const podiumRows = rows.slice(0, 3)

  return (
    <div className="leaderboard-view">
      <section className="group-heading leaderboard-heading">
        <div>
          <span className="hand-note">Culture table</span>
          <h2>Leaderboard</h2>
          <p>
            Group exact = 3. Group outcome = 1. Knockout winner = 2,
            knockout exact = 4, champion bonus = 5.
          </p>
        </div>
        <div className="score-rules">
          <span><strong>3</strong> exact</span>
          <span><strong>1</strong> outcome</span>
          <span><strong>2</strong> knockout</span>
          <span><strong>4</strong> KO exact</span>
          <span><strong>+5</strong> champion</span>
          <span><strong>0</strong> wrong</span>
        </div>
      </section>

      {!loading && podiumRows.length ? (
        <section className="leader-podium" aria-label="Top leaderboard places">
          {podiumRows.map((row, index) => (
            <PodiumCard
              currentUserId={currentUserId}
              key={row.user_id}
              rank={index + 1}
              row={row}
            />
          ))}
        </section>
      ) : null}

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
            className={`leader-row rank-${index + 1} ${
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
