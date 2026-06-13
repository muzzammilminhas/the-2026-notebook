import { FIXTURES } from '../data/tournament'

const GROUP_FIXTURES = Object.values(FIXTURES).flat()

export function fixtureDateKey(value) {
  if (!value) return 'pending'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'pending'

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildFixtureSchedule(matchMeta = {}) {
  return GROUP_FIXTURES.map((fixture) => {
    const match = matchMeta[fixture.id] ?? null
    return {
      ...fixture,
      match,
      dateKey: fixtureDateKey(match?.kickoff_at),
    }
  }).sort((left, right) => {
    const leftTime = left.match?.kickoff_at
      ? new Date(left.match.kickoff_at).getTime()
      : Number.POSITIVE_INFINITY
    const rightTime = right.match?.kickoff_at
      ? new Date(right.match.kickoff_at).getTime()
      : Number.POSITIVE_INFINITY

    return (
      leftTime - rightTime ||
      (left.match?.match_number ?? 999) - (right.match?.match_number ?? 999)
    )
  })
}

export function filterFixtureSchedule(fixtures, filters) {
  return fixtures.filter((fixture) => {
    if (filters.group && fixture.groupId !== filters.group) return false
    if (
      filters.team &&
      fixture.homeId !== filters.team &&
      fixture.awayId !== filters.team
    ) {
      return false
    }
    if (filters.date && fixture.dateKey !== filters.date) return false
    return true
  })
}

export function groupFixturesByDate(fixtures) {
  return fixtures.reduce((sections, fixture) => {
    const current = sections.at(-1)
    if (current?.dateKey === fixture.dateKey) {
      current.fixtures.push(fixture)
      return sections
    }
    sections.push({ dateKey: fixture.dateKey, fixtures: [fixture] })
    return sections
  }, [])
}
