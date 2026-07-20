import { TEAMS } from './tournament'

const TAPMAD_VIDEO_IDS = {
  1: 'Gg9bkcHBurg',
  2: '9VWzTri0mho',
  3: 'jWodHwcZWsg',
  4: 'dV4CVfySiy0',
  5: 'g5JONS3ngms',
  6: 'lwCKjEM0EGg',
  7: 'inWwr7XhS-I',
  8: '5KewYogxkXo',
  9: 'eC7TtzHX8dk',
  10: 'a51a9qDApEw',
  11: 'KXuf5pezkLA',
  12: 'Z1Yr0OgUfKI',
  13: 'Q7oax7IniSc',
  14: 'lmKefVvXPbM',
  15: 'fWDYdKbree4',
  16: 'bnILQSKAvBc',
  17: 'tKA5wDV6SiY',
  18: 'Vx-oSDYEm8M',
  19: 'mn8MwFb8WOk',
  20: 'MolUQa1DWCY',
  21: 'l7VZIXCMhRA',
  22: 'LHQajhdJiIk',
  23: 'XU5vwLWFkvE',
  24: 'DzF90Cs8ilU',
  25: 'g_3MsHLoK2g',
  26: '_NXQ3kSLH6w',
  27: 'ugs0OOuFO5g',
  28: '_46-905M5Ig',
  29: 'k8D-aOUrsQU',
  30: 'v9ISm8K623s',
  31: '0DYrl8m7jTs',
  32: 'cCpxnVbcmkg',
  33: 'Nb8Td789R-c',
  34: 'GlyD82yA1zk',
  35: 'HwES23Y7Uzo',
  36: 'Y-z3Rdlb7Pc',
  37: '1zkhpOS1KnU',
  38: 'vjQOYKjhrXg',
  39: 'OqcUIk17WTo',
  40: 'DeZoRod7ppY',
  41: 'TtZ5W4_NZ6E',
  42: '8zFVHjKA2Rw',
  43: 'Wb130YHCCa0',
  44: 'ZqEo9Ifbx34',
  45: '_3ruRWXCxVc',
  46: 'ae0H65HWLPM',
  47: 'TO4Gv54frgU',
  48: 'ajMw8BPZWMs',
  49: '3bf1HqRbO9o',
  50: 'RJo4AzB93IU',
  51: 'z1IWGvvVL4U',
  52: 'WuhTBFKPk00',
  53: 'uSl2YZr0bcw',
  54: 'pqWmbZk7xIg',
  55: '1taGN__N2TQ',
  56: 'oNwgRFd6aqs',
  57: 'QwKB3JvJqNI',
  58: '85OAOIDwpWI',
  59: 'htjkH8kk7o4',
  60: 'VxNAVcCwqRk',
  61: 'qtIFwnrSDGM',
  62: 'svm4-A0J050',
  63: 'GZwFzBKDkIk',
  64: '0xPbMJ76OGo',
  65: '-qj9o1fCt-o',
  66: 'w4jgG2CXGY4',
  67: 'jhSTAI98KgM',
  68: '8W1PzvCHG_E',
  69: 'T0ggMsAWiwA',
  70: 'VXpA80Zd5G0',
  71: '7DRwPZapOcQ',
  72: 'if_G-zJxIHA',
  73: 'SCzmNB4Fv5o',
  74: 'AEoL6CczaWs',
  75: 'qeE9-cygsyo',
  76: '08_bTACp-1c',
  77: 'Bf_ZY4p6QCU',
  78: 'w3m48sOWD0o',
  79: 'xNuLx9jD8Rw',
  80: 'jOOVm49oRGk',
  81: 'DY8wFy1pVz0',
  82: '-q5x18RqLY0',
  83: 'weSYcsZdSbo',
  84: 'yoFWVOia1HQ',
  85: '9ZkDPCYcQUA',
  86: 'BELJczS4RBo',
  87: '3IkpRRb6INQ',
  88: 'qZtBUUjnaO4',
  89: 'Wd7q4t_cp44',
  90: 'ej2xLJL866g',
  91: 'XxGvTjpP09c',
  92: 'oyOmgy6zmeM',
  93: 'OT3rAWUqOjU',
  94: 'NgNx8ZCmM68',
  95: 'e-xRrXe2N8o',
  96: 'kAQ5EPKgIXU',
  97: '5Qjv7k-h-qY',
  98: '0eaBK_NcoQs',
  99: 'PP4D-JCcmsE',
  100: 'Yu0kXb_To7Y',
  101: 'Ho_u5uaCH40',
  102: '6YDVSJMuq78',
  103: 'VoZG0cWoNh0',
  104: 'Vb-48HGNIwg',
}

const SHORT_HIGHLIGHT_MATCHES = new Set([51])

export const MATCH_HIGHLIGHTS = Object.fromEntries(
  Object.entries(TAPMAD_VIDEO_IDS).map(([matchNumber, videoId]) => [
    matchNumber,
    {
      format: SHORT_HIGHLIGHT_MATCHES.has(Number(matchNumber))
        ? 'Short highlights'
        : 'Full highlights',
      source: 'tapmad',
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    },
  ]),
)

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

function matchTitle(match, matchNumber, format) {
  const homeName = TEAMS[match?.home_team_id]?.name
  const awayName = TEAMS[match?.away_team_id]?.name
  if (homeName && awayName) return `${homeName} vs ${awayName} | ${format}`
  return `Match ${matchNumber} | ${format}`
}

export function getMatchHighlight(match) {
  const key = String(match?.match_number ?? '')
  const highlight = MATCH_HIGHLIGHTS[key]
  if (!highlight?.youtubeUrl) return null
  const videoId = youtubeVideoId(highlight.youtubeUrl)

  return {
    format: highlight.format ?? 'Match highlights',
    source: highlight.source ?? 'Match highlights',
    title:
      highlight.title
      ?? matchTitle(match, key, highlight.format ?? 'Match highlights'),
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
