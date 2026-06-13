import { describe, expect, it } from 'vitest'
import {
  buildFixtureSchedule,
  filterFixtureSchedule,
} from './fixtureSchedule'

describe('fixture schedule', () => {
  it('sorts group fixtures by kickoff instead of group order', () => {
    const schedule = buildFixtureSchedule({
      'A-1': {
        kickoff_at: '2026-06-12T18:00:00Z',
        match_number: 2,
      },
      'B-1': {
        kickoff_at: '2026-06-11T18:00:00Z',
        match_number: 1,
      },
    })

    expect(schedule[0].id).toBe('B-1')
    expect(schedule[1].id).toBe('A-1')
  })

  it('filters the chronological feed without changing the source list', () => {
    const schedule = buildFixtureSchedule({
      'A-1': {
        kickoff_at: '2026-06-11T18:00:00Z',
        match_number: 1,
      },
      'A-2': {
        kickoff_at: '2026-06-12T18:00:00Z',
        match_number: 2,
      },
    })
    const originalLength = schedule.length
    const filtered = filterFixtureSchedule(schedule, {
      group: 'A',
      team: 'A1',
      date: '',
    })

    expect(filtered.map((fixture) => fixture.id)).toEqual([
      'A-1',
      'A-3',
      'A-5',
    ])
    expect(schedule).toHaveLength(originalLength)
  })
})
