import { GROUP_IDS, TEAMS } from '../data/tournament'

function dateLabel(dateKey) {
  if (dateKey === 'pending') return 'Schedule pending'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`))
}

export function FixtureFilters({
  dates,
  filters,
  onChange,
  totalCount,
  visibleCount,
}) {
  const teams = Object.values(TEAMS).toSorted((left, right) =>
    left.name.localeCompare(right.name),
  )
  const active = Boolean(filters.group || filters.team || filters.date)

  function update(key, value) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <section className="fixture-filter-bar" aria-label="Fixture filters">
      <div className="filter-summary">
        <strong>Filter fixtures</strong>
        <span>
          {visibleCount} of {totalCount}
        </span>
      </div>

      <label>
        <span>Team</span>
        <select
          aria-label="Team filter"
          onChange={(event) => update('team', event.target.value)}
          value={filters.team}
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Group</span>
        <select
          aria-label="Group filter"
          onChange={(event) => update('group', event.target.value)}
          value={filters.group}
        >
          <option value="">All groups</option>
          {GROUP_IDS.map((groupId) => (
            <option key={groupId} value={groupId}>
              Group {groupId}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Date</span>
        <select
          aria-label="Date filter"
          onChange={(event) => update('date', event.target.value)}
          value={filters.date}
        >
          <option value="">All dates</option>
          {dates.map((dateKey) => (
            <option key={dateKey} value={dateKey}>
              {dateLabel(dateKey)}
            </option>
          ))}
        </select>
      </label>

      <button
        className="clear-filter-button"
        disabled={!active}
        onClick={() => onChange({ team: '', group: '', date: '' })}
        type="button"
      >
        Clear
      </button>
    </section>
  )
}
