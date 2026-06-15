const detailsCache = new Map()

const KEY_STATS = [
  ['Possession', 'Possession', 'percent'],
  ['XG', 'Expected goals', 'decimal'],
  ['AttemptAtGoal', 'Attempts', 'number'],
  ['AttemptAtGoalOnTarget', 'On target', 'number'],
  ['Passes', 'Passes', 'number'],
  ['PassesCompleted', 'Passes completed', 'number'],
  ['Corners', 'Corners', 'number'],
  ['FoulsAgainst', 'Fouls', 'number'],
  ['Offsides', 'Offsides', 'number'],
  ['YellowCards', 'Yellow cards', 'number'],
  ['RedCards', 'Red cards', 'number'],
]

export function fifaClockLabel(match) {
  const matchTime = String(match?.MatchTime ?? '').trim()
  if (matchTime && matchTime !== "0'") return matchTime
  if (match?.Period === 4) return 'HT'
  if (match?.Period === 8) return 'ET HT'
  return null
}

function localized(value, fallback = '') {
  return value?.find((entry) => entry.Locale === 'en-GB')?.Description
    ?? value?.[0]?.Description
    ?? fallback
}

function minuteValue(value) {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number(match[0]) : 0
}

function playerNameLookup(team) {
  return new Map(
    (team?.Players ?? []).map((player) => [
      String(player.IdPlayer),
      localized(player.ShortName, localized(player.PlayerName, 'Unknown player')),
    ]),
  )
}

function buildEvents(team, side) {
  const players = playerNameLookup(team)
  const teamName = localized(team?.TeamName)
  const events = []

  for (const goal of team?.Goals ?? []) {
    events.push({
      minute: goal.Minute,
      sortMinute: minuteValue(goal.Minute),
      side,
      teamName,
      type: goal.Type === 1 ? 'Own goal' : 'Goal',
      label: players.get(String(goal.IdPlayer)) ?? 'Goal',
    })
  }

  for (const booking of team?.Bookings ?? []) {
    events.push({
      minute: booking.Minute,
      sortMinute: minuteValue(booking.Minute),
      side,
      teamName,
      type: booking.Card === 2 ? 'Red card' : 'Yellow card',
      label: players.get(String(booking.IdPlayer)) ?? 'Booking',
    })
  }

  for (const substitution of team?.Substitutions ?? []) {
    events.push({
      minute: substitution.Minute,
      sortMinute: minuteValue(substitution.Minute),
      side,
      teamName,
      type: 'Substitution',
      label: `${localized(substitution.PlayerOnName, 'Player on')} for ${localized(
        substitution.PlayerOffName,
        'player off',
      )}`,
    })
  }

  return events
}

function normalizeTeam(team) {
  const players = team?.Players ?? []
  return {
    id: String(team?.IdTeam ?? ''),
    name: localized(team?.TeamName, team?.ShortClubName ?? ''),
    abbreviation: team?.Abbreviation ?? '',
    score: Number.isInteger(team?.Score) ? team.Score : null,
    formation: team?.Tactics ?? null,
    coach: localized(
      team?.Coaches?.find((coach) => coach.Role === 0)?.Alias,
      localized(team?.Coaches?.find((coach) => coach.Role === 0)?.Name),
    ),
    starters: players
      .filter((player) => player.Status === 1)
      .map((player) => ({
        id: String(player.IdPlayer),
        name: localized(player.ShortName, localized(player.PlayerName)),
        number: player.ShirtNumber,
        captain: Boolean(player.Captain),
      })),
    substitutes: players
      .filter((player) => player.Status === 2)
      .map((player) => ({
        id: String(player.IdPlayer),
        name: localized(player.ShortName, localized(player.PlayerName)),
        number: player.ShirtNumber,
      })),
  }
}

function statsMap(rows = []) {
  return new Map(rows.map(([key, value]) => [key, value]))
}

function formatStat(value, format) {
  if (value == null) return null
  if (format === 'percent') return `${Math.round(Number(value) * 100)}%`
  if (format === 'decimal') return Number(value).toFixed(2)
  return String(Math.round(Number(value)))
}

export function normalizeTeamStats(rawStats, homeTeamId, awayTeamId) {
  const home = statsMap(rawStats?.[homeTeamId])
  const away = statsMap(rawStats?.[awayTeamId])

  return KEY_STATS.map(([key, label, format]) => ({
    key,
    label,
    home: formatStat(home.get(key), format),
    away: formatStat(away.get(key), format),
  })).filter((stat) => stat.home !== null || stat.away !== null)
}

export function normalizeMatchDetails(live, rawStats = null) {
  const home = normalizeTeam(live.HomeTeam)
  const away = normalizeTeam(live.AwayTeam)
  const referee = live.Officials?.find((official) => official.OfficialType === 1)

  return {
    id: String(live.IdMatch),
    status: live.MatchStatus,
    matchTime: fifaClockLabel(live),
    period: live.Period,
    date: live.Date,
    localDate: live.LocalDate,
    attendance: live.Attendance ? Number(live.Attendance) : null,
    stadium: localized(live.Stadium?.Name),
    city: localized(live.Stadium?.CityName),
    referee: localized(referee?.NameShort, localized(referee?.Name)),
    weather: {
      temperature: live.Weather?.Temperature ?? null,
      humidity: live.Weather?.Humidity ?? null,
      windSpeed: live.Weather?.WindSpeed ?? null,
      type: localized(live.Weather?.TypeLocalized),
    },
    home,
    away,
    events: [
      ...buildEvents(live.HomeTeam, 'home'),
      ...buildEvents(live.AwayTeam, 'away'),
    ].sort((left, right) => left.sortMinute - right.sortMinute),
    stats: normalizeTeamStats(rawStats, home.id, away.id),
    ifesId: live.Properties?.IdIFES ? String(live.Properties.IdIFES) : null,
  }
}

async function fetchJson(url, optional = false) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    if (optional) return null
    throw new Error(`FIFA returned HTTP ${response.status}`)
  }
  return response.json()
}

export function fifaMatchCentreUrl(match) {
  const source = match?.source_payload ?? {}
  const competitionId = source.competitionId ?? '17'
  const seasonId = source.seasonId ?? '285023'
  const stageId = source.stageId ?? '289273'
  return `https://www.fifa.com/en/match-centre/match/${competitionId}/${seasonId}/${stageId}/${match.source_fixture_id}`
}

export async function fetchMatchDetails(match, force = false) {
  const fixtureId = String(match?.source_fixture_id ?? '')
  if (!/^\d+$/.test(fixtureId)) {
    throw new Error('This fixture does not have a FIFA match identifier.')
  }
  const cached = detailsCache.get(fixtureId)
  const cacheLifetime =
    match.status === 'finished' ? Number.POSITIVE_INFINITY : 45_000
  if (
    !force
    && cached
    && Date.now() - cached.createdAt < cacheLifetime
  ) {
    return cached.request
  }

  const request = (async () => {
    const live = await fetchJson(
      `https://api.fifa.com/api/v3/live/football/${fixtureId}?language=en`,
    )
    const ifesId = live.Properties?.IdIFES
    const rawStats = ifesId
      ? await fetchJson(
          `https://fdh-api.fifa.com/v1/stats/match/${ifesId}/teams.json`,
          true,
        )
      : null
    return normalizeMatchDetails(live, rawStats)
  })()

  detailsCache.set(fixtureId, { createdAt: Date.now(), request })
  try {
    return await request
  } catch (error) {
    detailsCache.delete(fixtureId)
    throw error
  }
}
