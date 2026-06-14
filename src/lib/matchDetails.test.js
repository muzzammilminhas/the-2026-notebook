import { describe, expect, it } from 'vitest'
import { normalizeMatchDetails, normalizeTeamStats } from './matchDetails'

describe('match details', () => {
  it('normalizes key team statistics', () => {
    const stats = normalizeTeamStats(
      {
        home: [
          ['Possession', 0.574],
          ['XG', 1.784],
          ['Corners', 5],
        ],
        away: [
          ['Possession', 0.356],
          ['XG', 0.101],
          ['Corners', 2],
        ],
      },
      'home',
      'away',
    )

    expect(stats).toEqual([
      { key: 'Possession', label: 'Possession', home: '57%', away: '36%' },
      { key: 'XG', label: 'Expected goals', home: '1.78', away: '0.10' },
      { key: 'Corners', label: 'Corners', home: '5', away: '2' },
    ])
  })

  it('builds events and lineups from the FIFA live payload', () => {
    const details = normalizeMatchDetails({
      IdMatch: '42',
      MatchStatus: 0,
      MatchTime: "90'",
      HomeTeam: {
        IdTeam: 'home',
        TeamName: [{ Locale: 'en-GB', Description: 'Home' }],
        Score: 2,
        Players: [
          {
            IdPlayer: '7',
            ShirtNumber: 9,
            Status: 1,
            Captain: true,
            ShortName: [{ Description: 'Scorer' }],
          },
        ],
        Goals: [{ IdPlayer: '7', Minute: "12'", Type: 2 }],
      },
      AwayTeam: {
        IdTeam: 'away',
        TeamName: [{ Description: 'Away' }],
        Score: 0,
        Players: [],
      },
      Officials: [],
      Properties: { IdIFES: '123' },
    })

    expect(details.home.starters[0]).toMatchObject({
      name: 'Scorer',
      captain: true,
    })
    expect(details.events[0]).toMatchObject({
      minute: "12'",
      type: 'Goal',
      label: 'Scorer',
    })
    expect(details.ifesId).toBe('123')
  })
})

