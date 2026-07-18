import { describe, expect, it } from 'vitest'
import {
  MATCH_HIGHLIGHTS,
  getMatchHighlight,
  youtubeVideoId,
} from './matchHighlights'

describe('match highlights archive', () => {
  it('includes the quarterfinals and semifinals', () => {
    expect(Object.keys(MATCH_HIGHLIGHTS).map(Number)).toEqual([
      97, 98, 99, 100, 101, 102,
    ])
  })

  it('builds privacy-enhanced YouTube embeds', () => {
    const highlight = getMatchHighlight({ match_number: 101 })

    expect(highlight.source).toBe('FIFA')
    expect(highlight.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/_cV8QcKp3GU',
    )
    expect(highlight.thumbnailUrl).toBe(
      'https://i.ytimg.com/vi/_cV8QcKp3GU/hqdefault.jpg',
    )
  })

  it('parses supported YouTube URL shapes', () => {
    expect(youtubeVideoId('https://youtu.be/Lfo49ZbV4WU')).toBe('Lfo49ZbV4WU')
    expect(youtubeVideoId('https://www.youtube.com/shorts/oB2mK8eJli4')).toBe(
      'oB2mK8eJli4',
    )
  })
})
