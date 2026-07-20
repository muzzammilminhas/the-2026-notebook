import { describe, expect, it } from 'vitest'
import {
  MATCH_HIGHLIGHTS,
  getMatchHighlight,
  youtubeVideoId,
} from './matchHighlights'

describe('match highlights archive', () => {
  it('includes a verified Tapmad highlight for all 104 matches', () => {
    const matchNumbers = Object.keys(MATCH_HIGHLIGHTS).map(Number)
    const missingFinishedMatches = Array.from(
      { length: 104 },
      (_, index) => index + 1,
    ).filter((matchNumber) => !matchNumbers.includes(matchNumber))

    expect(matchNumbers).toHaveLength(104)
    expect(missingFinishedMatches).toEqual([])
    expect(MATCH_HIGHLIGHTS[51].format).toBe('Short highlights')
    expect(MATCH_HIGHLIGHTS[103].youtubeUrl).toContain('VoZG0cWoNh0')
    expect(MATCH_HIGHLIGHTS[104].youtubeUrl).toContain('Vb-48HGNIwg')
  })

  it('builds Tapmad links, titles, thumbnails and privacy-enhanced embeds', () => {
    const highlight = getMatchHighlight({
      match_number: 101,
      home_team_id: 'I1',
      away_team_id: 'H1',
    })

    expect(highlight.source).toBe('tapmad')
    expect(highlight.format).toBe('Full highlights')
    expect(highlight.title).toBe('France vs Spain | Full highlights')
    expect(highlight.youtubeUrl).toBe(
      'https://www.youtube.com/watch?v=Ho_u5uaCH40',
    )
    expect(highlight.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/Ho_u5uaCH40',
    )
    expect(highlight.thumbnailUrl).toBe(
      'https://i.ytimg.com/vi/Ho_u5uaCH40/hqdefault.jpg',
    )
  })

  it('parses supported YouTube URL shapes', () => {
    expect(youtubeVideoId('https://youtu.be/Lfo49ZbV4WU')).toBe('Lfo49ZbV4WU')
    expect(youtubeVideoId('https://www.youtube.com/shorts/oB2mK8eJli4')).toBe(
      'oB2mK8eJli4',
    )
  })
})
