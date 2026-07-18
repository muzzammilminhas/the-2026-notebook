import { describe, expect, it } from 'vitest'
import {
  fifaClockLabel,
  fifaMatchCentreUrl,
  normalizeMatchDetails,
  normalizeTeamStats,
} from './matchDetails'

describe('match details', () => {
  it('uses FIFA minutes and half-time period labels', () => {
    expect(fifaClockLabel({ MatchTime: "31'", Period: 3 })).toBe("31'")
    expect(fifaClockLabel({ MatchTime: '', Period: 4 })).toBe('HT')
    expect(fifaClockLabel({ MatchTime: "0'", Period: 3 })).toBeNull()
  })

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
      expect.objectContaining({
        key: 'Possession',
        category: 'Match control',
        home: '57%',
        away: '36%',
      }),
      expect.objectContaining({
        key: 'XG',
        category: 'Match control',
        home: '1.78',
        away: '0.10',
      }),
      expect.objectContaining({
        key: 'Corners',
        category: 'Attacking',
        home: '5',
        away: '2',
      }),
    ])
  })

  it('builds lineups, officials and the full FIFA timeline', () => {
    const details = normalizeMatchDetails(
      {
        IdMatch: '42',
        IdCompetition: '17',
        IdSeason: '285023',
        IdStage: '289292',
        StageName: [{ Description: 'Final' }],
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
              Position: 3,
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
        Officials: [
          {
            OfficialId: '9',
            OfficialType: 1,
            NameShort: [{ Description: 'Referee Name' }],
            TypeLocalized: [{ Description: 'Referee' }],
          },
        ],
        Properties: { IdIFES: '123' },
      },
      null,
      {
        Event: [
          {
            EventId: 'event-1',
            IdTeam: 'home',
            MatchMinute: "12'",
            TypeLocalized: [{ Description: 'Goal' }],
            EventDescription: [{ Description: 'Scorer finds the net.' }],
            HomeGoals: 1,
            AwayGoals: 0,
          },
        ],
      },
    )

    expect(details.home.starters[0]).toMatchObject({
      name: 'Scorer',
      captain: true,
      position: 3,
    })
    expect(details.events[0]).toMatchObject({
      minute: "12'",
      type: 'Goal',
      label: 'Scorer finds the net.',
      keyEvent: true,
    })
    expect(details.referee).toBe('Referee Name')
    expect(details.stageName).toBe('Final')
    expect(details.ifesId).toBe('123')
  })

  it('uses live FIFA identifiers for the match-centre link', () => {
    expect(
      fifaMatchCentreUrl(
        { source_fixture_id: '400021543' },
        { competitionId: '17', seasonId: '285023', stageId: '289292' },
      ),
    ).toBe(
      'https://www.fifa.com/en/match-centre/match/17/285023/289292/400021543',
    )
  })
})
