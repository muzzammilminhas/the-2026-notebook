import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const archive = JSON.parse(
  await readFile(
    new URL('../../public/tournament-archive.json', import.meta.url),
    'utf8',
  ),
)

describe('permanent tournament archive', () => {
  it('contains every verified tournament result in match order', () => {
    expect(archive.schemaVersion).toBe(1)
    expect(archive.matches).toHaveLength(104)
    expect(archive.matches.map((match) => match.match_number)).toEqual(
      Array.from({ length: 104 }, (_, index) => index + 1),
    )
    expect(
      archive.matches.every(
        (match) => match.status === 'finished' && match.verified,
      ),
    ).toBe(true)
  })

  it('preserves the final result and its complete Match Centre payload', () => {
    const final = archive.matches.find((match) => match.match_number === 104)
    const details = archive.matchDetails[String(final.source_fixture_id)]

    expect(final).toMatchObject({
      home_team_id: 'H1',
      away_team_id: 'J1',
      home_score: 1,
      away_score: 0,
      winner_team_id: 'H1',
    })
    expect(details.status).toBe('finished')
    expect(details.events).toHaveLength(128)
    expect(details.stats).toHaveLength(22)
    expect(details.home.starters).toHaveLength(11)
    expect(details.away.starters).toHaveLength(11)
  })

  it('preserves the finalized public leaderboard', () => {
    expect(archive.leaderboard).toHaveLength(13)
    expect(archive.leaderboard[0]).toMatchObject({
      nickname: 'Ubaid',
      points: 102,
    })
    expect(archive.finalCommunityPicks).toHaveLength(5)
  })
})
