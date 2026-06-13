export function StandingsTable({ rows, showMovement = false, compact = false }) {
  return (
    <div className={`table-wrap standings-table ${compact ? 'compact' : ''}`}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>GD</th>
            <th>Pts</th>
            {showMovement ? <th>Move</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={
                row.position <= 2
                  ? 'qualified-row'
                  : row.position === 3
                    ? 'third-row'
                    : 'out-row'
              }
              key={row.teamId}
            >
              <td>
                <span className="position">{row.position}</span>
              </td>
              <td>
                <strong>{row.name}</strong>
                <small>
                  {row.won}W {row.drawn}D {row.lost}L
                </small>
              </td>
              <td>{row.played}</td>
              <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
              <td>
                <strong>{row.points}</strong>
              </td>
              {showMovement ? (
                <td>
                  <span
                    className={`movement ${
                      row.movement > 0
                        ? 'up'
                        : row.movement < 0
                          ? 'down'
                          : 'neutral'
                    }`}
                  >
                    {row.movement > 0
                      ? `+${row.movement}`
                      : row.movement < 0
                        ? row.movement
                        : '-'}
                  </span>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
