// Add official FIFA or broadcaster YouTube links here as matches finish.
// Key each entry by FIFA match_number so the archive stays stable.
export const MATCH_HIGHLIGHTS = {
  // 104: {
  //   youtubeUrl: 'https://www.youtube.com/watch?v=...',
  //   title: 'Final highlights',
  //   source: 'FIFA',
  // },
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

  return {
    source: highlight.source ?? 'Official highlights',
    title: highlight.title ?? `Match ${key} highlights`,
    youtubeUrl: highlight.youtubeUrl,
    embedUrl: youtubeEmbedUrl(highlight.youtubeUrl),
  }
}

export function highlightStatus(match) {
  if (getMatchHighlight(match)) return 'ready'
  if (match?.status === 'finished') return 'coming-soon'
  return 'pending'
}
