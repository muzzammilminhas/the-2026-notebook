import { describe, expect, it } from 'vitest'
import { FIXTURES } from '../data/tournament'
import {
  buildKnockout,
  calculateTournament,
  getDependentMatchIds,
  rankGroup,
} from './tournamentEngine'

function setResult(scores, fixture, home, away) {
  scores[fixture.id] = { home, away }
}

function completeGroupStage() {
  const scores = {}
  Object.values(FIXTURES)
    .flat()
    .forEach((fixture, index) => {
      setResult(scores, fixture, index % 3 === 0 ? 2 : 1, index % 4 === 0 ? 0 : 1)
    })
  return scores
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

  it('keeps the knockout bracket empty while the group notebook is incomplete', () => {
    const tournament = calculateTournament({})
    const knockout = buildKnockout(tournament, { 73: 'A2' })

    expect(tournament.thirdPlace.filter((row) => row.qualifies)).toHaveLength(8)
    expect(knockout.thirdRoute).toBeNull()
    expect(knockout.rounds[0].matches).toHaveLength(16)
    expect(
      knockout.rounds[0].matches.every(
        (match) =>
          match.participants.every((participant) => participant === null) &&
          !match.participantsReady,
      ),
    ).toBe(true)
    expect(knockout.championId).toBeNull()
  })

  it('resolves the official route after all group scores are complete', () => {
    const tournament = calculateTournament(completeGroupStage())
    const firstPass = buildKnockout(tournament, {})

    expect(tournament.isGroupStageComplete).toBe(true)
    expect(firstPass.thirdRoute).toBeTruthy()
    expect(
      firstPass.rounds[0].matches.every(
        (match) => match.participantsReady,
      ),
    ).toBe(true)
  })

  it('does not advance a team when the next opponent is still unknown', () => {
    const tournament = calculateTournament(completeGroupStage())
    const firstPass = buildKnockout(tournament, {})
    const match73 = firstPass.rounds[0].matches.find((match) => match.id === 73)
    const pickedTeam = match73.participants[0]
    const secondPass = buildKnockout(tournament, {
      73: pickedTeam,
      89: pickedTeam,
      97: pickedTeam,
      101: pickedTeam,
      104: pickedTeam,
    })
    const match89 = secondPass.rounds[1].matches.find((match) => match.id === 89)

    expect(match89.participants[0]).toBe(pickedTeam)
    expect(match89.participants[1]).toBeNull()
    expect(match89.participantsReady).toBe(false)
    expect(match89.winnerId).toBeNull()
    expect(secondPass.championId).toBeNull()
  })

  it('advances a winner only after both opponents are known', () => {
    const tournament = calculateTournament(completeGroupStage())
    const firstPass = buildKnockout(tournament, {})
    const match73 = firstPass.rounds[0].matches.find((match) => match.id === 73)
    const match75 = firstPass.rounds[0].matches.find((match) => match.id === 75)
    const winner73 = match73.participants[0]
    const winner75 = match75.participants[1]
    const withRoundOf32 = buildKnockout(tournament, {
      73: winner73,
      75: winner75,
    })
    const match89 = withRoundOf32.rounds[1].matches.find(
      (match) => match.id === 89,
    )
    const withRoundOf16 = buildKnockout(tournament, {
      73: winner73,
      75: winner75,
      89: winner73,
    })

    expect(match89.participants).toEqual([winner73, winner75])
    expect(match89.participantsReady).toBe(true)
    expect(withRoundOf16.resolvedPicks[89]).toBe(winner73)
  })

  it('returns every downstream match that must be cleared after an undo', () => {
    expect(getDependentMatchIds(73)).toEqual([89, 97, 101, 104])
    expect(getDependentMatchIds(75)).toEqual([89, 97, 101, 104])
    expect(getDependentMatchIds(104)).toEqual([])
  })
})
