import { describe, expect, it } from 'vitest'
import { FIXTURES } from '../data/tournament'
import {
  buildKnockout,
  calculateTournament,
  rankGroup,
} from './tournamentEngine'

function setResult(scores, fixture, home, away) {
  scores[fixture.id] = { home, away }
}

describe('tournament engine', () => {
  it('keeps draw order before results are entered', () => {
    expect(rankGroup('A', {}).map((row) => row.name)).toEqual([
      'Mexico',
      'South Africa',
      'Korea Republic',
      'Czechia',
    ])
  })

  it('awards points and sorts a completed group', () => {
    const scores = {}
    const fixtures = FIXTURES.A
    setResult(scores, fixtures[0], 2, 0)
    setResult(scores, fixtures[1], 1, 1)
    setResult(scores, fixtures[2], 1, 0)
    setResult(scores, fixtures[3], 0, 2)
    setResult(scores, fixtures[4], 0, 1)
    setResult(scores, fixtures[5], 2, 2)

    const table = rankGroup('A', scores)
    expect(table[0]).toMatchObject({ name: 'Mexico', points: 9, gd: 4 })
    expect(table.every((row) => row.played === 3)).toBe(true)
  })

  it('selects eight third-placed teams and resolves an official Annex C route', () => {
    const tournament = calculateTournament({})
    const knockout = buildKnockout(tournament, {})

    expect(tournament.thirdPlace.filter((row) => row.qualifies)).toHaveLength(8)
    expect(knockout.thirdRoute).toBeTruthy()
    expect(knockout.rounds[0].matches).toHaveLength(16)
    expect(knockout.rounds[0].matches.every((match) =>
      match.participants.every(Boolean),
    )).toBe(true)
  })

  it('moves selected winners through the knockout tree', () => {
    const tournament = calculateTournament({})
    const firstPass = buildKnockout(tournament, {})
    const match73 = firstPass.rounds[0].matches.find((match) => match.id === 73)
    const pickedTeam = match73.participants[0]
    const secondPass = buildKnockout(tournament, { 73: pickedTeam })
    const match89 = secondPass.rounds[1].matches.find((match) => match.id === 89)

    expect(match89.participants[0]).toBe(pickedTeam)
  })
})
