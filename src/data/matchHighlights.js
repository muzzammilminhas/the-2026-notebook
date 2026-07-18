// Add official FIFA or broadcaster YouTube links here as matches finish.
// Key each entry by FIFA match_number so the archive stays stable.
export const MATCH_HIGHLIGHTS = {
  97: {
    youtubeUrl: 'https://www.youtube.com/watch?v=Lfo49ZbV4WU',
    title: 'France 2-0 Morocco | Quarterfinal highlights',
    source: 'FIFA',
  },
  98: {
    youtubeUrl: 'https://www.youtube.com/watch?v=VHoctq0AOg8',
    title: 'Spain 2-1 Belgium | Quarterfinal highlights',
    source: 'FIFA',
  },
  99: {
    youtubeUrl: 'https://www.youtube.com/watch?v=PnFUiq8m9os',
    title: 'Norway 1-2 England | Quarterfinal highlights',
    source: 'FIFA',
  },
  100: {
    youtubeUrl: 'https://www.youtube.com/watch?v=zZxxDbLxEi4',
    title: 'Argentina 3-1 Switzerland | Quarterfinal highlights',
    source: 'FIFA',
  },
  101: {
    youtubeUrl: 'https://www.youtube.com/watch?v=_cV8QcKp3GU',
    title: 'France 0-2 Spain | Semifinal highlights',
    source: 'FIFA',
  },
  102: {
    youtubeUrl: 'https://www.youtube.com/watch?v=oB2mK8eJli4',
    title: 'England 1-2 Argentina | Semifinal highlights',
    source: 'FIFA',
  },
}

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?v=([^&]+)/i,
  /youtube\.com\/embed\/([^?&/]+)/i,
  /youtu\.be\/([^?&/]+)/i,
  /youtube\.com\/shorts\/([^?&/]+)/i,
]

export function youtubeVideoId(url = '') {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = String(url).match(pattern)
    if (match?.[1]) return match[1]
  }
  return ''
}

export function youtubeEmbedUrl(url) {
  const videoId = youtubeVideoId(url)
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : ''
}

export function getMatchHighlight(match) {
  const key = String(match?.match_number ?? '')
  const highlight = MATCH_HIGHLIGHTS[key]
  if (!highlight?.youtubeUrl) return null
  const videoId = youtubeVideoId(highlight.youtubeUrl)

  return {
    source: highlight.source ?? 'Official highlights',
    title: highlight.title ?? `Match ${key} highlights`,
    youtubeUrl: highlight.youtubeUrl,
    embedUrl: youtubeEmbedUrl(highlight.youtubeUrl),
    thumbnailUrl: videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : '',
    videoId,
  }
}

export function highlightStatus(match) {
  if (getMatchHighlight(match)) return 'ready'
  if (match?.status === 'finished') return 'coming-soon'
  return 'pending'
}
