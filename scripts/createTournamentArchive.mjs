import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeMatchDetails } from '../src/lib/matchDetails.js'

const SUPABASE_URL = 'https://hujcjffajinxzbneaqrt.supabase.co'
const SUPABASE_KEY = 'sb_publishable_W_sBOqCwg7spoWpkhwkO-g__rTSToxI'
const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/tournament-archive.json',
)

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    if (options.optional) return null
    throw new Error(`${url} returned HTTP ${response.status}`)
  }
  return response.json()
}

async function fetchSupabase(path) {
  return fetchJson(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
}

async function main() {
  const matches = await fetchSupabase(
    'matches?select=*&order=match_number.asc',
  )
  if (matches.length !== 104) {
    throw new Error(`Expected 104 matches, received ${matches.length}.`)
  }
  if (matches.some((match) => match.status !== 'finished' || !match.verified)) {
    throw new Error('Every match must be finished and verified before archiving.')
  }

  const [leaderboard, finalCommunityPicks] = await Promise.all([
    fetchSupabase(
      'public_leaderboard?select=*&order=points.desc,exact_scores.desc,correct_knockout.desc,updated_at.asc&limit=100',
    ),
    fetchSupabase(
      'community_knockout_predictions?select=*&match_number=eq.104&order=submitted_at.asc',
    ),
  ])
  const finalMatch = matches.find((match) => match.match_number === 104)
  if (!finalMatch?.source_fixture_id) {
    throw new Error('The final does not have a FIFA fixture identifier.')
  }

  const fixtureId = String(finalMatch.source_fixture_id)
  const live = await fetchJson(
    `https://api.fifa.com/api/v3/live/football/${fixtureId}?language=en`,
  )
  const ifesId = live.Properties?.IdIFES
  const [rawStats, timeline] = await Promise.all([
    ifesId
      ? fetchJson(
          `https://fdh-api.fifa.com/v1/stats/match/${ifesId}/teams.json`,
          { optional: true },
        )
      : null,
    fetchJson(
      `https://api.fifa.com/api/v3/timelines/${fixtureId}?language=en`,
      { optional: true },
    ),
  ])
  const finalDetails = normalizeMatchDetails(live, rawStats, timeline)
  if (finalDetails.events.length < 100 || finalDetails.stats.length < 10) {
    throw new Error('The final detail payload is incomplete; archive not written.')
  }

  const archive = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    matches,
    leaderboard,
    finalCommunityPicks,
    matchDetails: {
      [fixtureId]: finalDetails,
    },
  }
  await mkdir(dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, `${JSON.stringify(archive, null, 2)}\n`, 'utf8')
  console.log(
    `Archived ${matches.length} matches, ${leaderboard.length} leaderboard entries, `
      + `${finalCommunityPicks.length} final picks, ${finalDetails.events.length} final events, `
      + `and ${finalDetails.stats.length} stat rows.`,
  )
}

await main()
