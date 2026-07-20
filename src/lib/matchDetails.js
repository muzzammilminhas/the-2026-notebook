import { loadArchivedMatchDetails } from './tournamentArchive.js'

const detailsCache = new Map()

const KEY_STATS = [
  ['Possession', 'Possession', 'percent', 'Match control'],
  ['XG', 'Expected goals', 'decimal', 'Match control'],
  ['AttemptAtGoal', 'Attempts', 'number', 'Attacking'],
  ['AttemptAtGoalOnTarget', 'On target', 'number', 'Attacking'],
  ['AttemptAtGoalBlocked', 'Blocked', 'number', 'Attacking'],
  ['AttemptAtGoalInsideThePenaltyArea', 'Inside the box', 'number', 'Attacking'],
  ['AttemptAtGoalOutsideThePenaltyArea', 'Outside the box', 'number', 'Attacking'],
  ['Corners', 'Corners', 'number', 'Attacking'],
  ['Passes', 'Passes', 'number', 'Distribution'],
  ['PassesCompleted', 'Passes completed', 'number', 'Distribution'],
  ['Crosses', 'Crosses', 'number', 'Distribution'],
  ['CrossesCompleted', 'Crosses completed', 'number', 'Distribution'],
  ['CompletedBallProgressions', 'Ball progressions', 'number', 'Distribution'],
  ['GoalkeeperSaves', 'Goalkeeper saves', 'number', 'Defending'],
  ['ForcedTurnovers', 'Forced turnovers', 'number', 'Defending'],
  ['FoulsAgainst', 'Fouls', 'number', 'Discipline'],
  ['Offsides', 'Offsides', 'number', 'Discipline'],
  ['YellowCards', 'Yellow cards', 'number', 'Discipline'],
  ['RedCards', 'Red cards', 'number', 'Discipline'],
  ['TotalDistance', 'Distance covered', 'kilometres', 'Physical'],
  ['TopSpeed', 'Top speed', 'speed', 'Physical'],
  ['Sprints', 'Sprints', 'number', 'Physical'],
]

const KEY_EVENT_TYPES = [
  'goal',
  'card',
  'substitution',
  'start time',
  'end time',
  'match end',
  'penalty',
  'var',
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
  const match = String(value ?? '').match(/(\d+)(?:'\+(\d+))?/)
  if (!match) return 0
  return Number(match[1]) + Number(match[2] ?? 0)
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
  const normalizePlayer = (player) => ({
    id: String(player.IdPlayer),
    name: localized(player.ShortName, localized(player.PlayerName)),
    number: player.ShirtNumber,
    captain: Boolean(player.Captain),
    position: Number.isInteger(player.Position) ? player.Position : null,
    picture: player.PlayerPicture ?? null,
  })

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
      .map(normalizePlayer),
    substitutes: players
      .filter((player) => player.Status === 2)
      .map(normalizePlayer),
  }
}

function statsMap(rows = []) {
  return new Map(rows.map(([key, value]) => [key, value]))
}

function formatStat(value, format) {
  if (value == null) return null
  if (format === 'percent') return `${Math.round(Number(value) * 100)}%`
  if (format === 'decimal') return Number(value).toFixed(2)
  if (format === 'kilometres') return `${(Number(value) / 1000).toFixed(1)} km`
  if (format === 'speed') return `${Number(value).toFixed(1)} km/h`
  return String(Math.round(Number(value)))
}

export function normalizeTeamStats(rawStats, homeTeamId, awayTeamId) {
  const home = statsMap(rawStats?.[homeTeamId])
  const away = statsMap(rawStats?.[awayTeamId])

  return KEY_STATS.map(([key, label, format, category]) => ({
    key,
    label,
    category,
    rawHome: home.get(key) ?? null,
    rawAway: away.get(key) ?? null,
    home: formatStat(home.get(key), format),
    away: formatStat(away.get(key), format),
  })).filter((stat) => stat.home !== null || stat.away !== null)
}

function normalizeOfficials(officials = []) {
  return officials.map((official) => ({
    id: String(official.OfficialId ?? official.OfficialType),
    name: localized(official.NameShort, localized(official.Name)),
    role: localized(official.TypeLocalized, 'Match official'),
    countryId: official.IdCountry ?? null,
  }))
}

function normalizeTimeline(timeline, home, away) {
  return (timeline?.Event ?? []).map((event, index) => {
    const type = localized(event.TypeLocalized, 'Match event')
    const teamId = String(event.IdTeam ?? '')
    const side = teamId === home.id
      ? 'home'
      : teamId === away.id
        ? 'away'
        : 'neutral'

    return {
      id: String(event.EventId ?? `${event.Type}-${event.MatchMinute}-${index}`),
      minute: event.MatchMinute ?? '',
      sortMinute: minuteValue(event.MatchMinute),
      side,
      teamName: side === 'home' ? home.name : side === 'away' ? away.name : '',
      type,
      label: localized(event.EventDescription, type),
      homeScore: Number.isInteger(event.HomeGoals) ? event.HomeGoals : null,
      awayScore: Number.isInteger(event.AwayGoals) ? event.AwayGoals : null,
      keyEvent: KEY_EVENT_TYPES.some((keyType) =>
        type.toLowerCase().includes(keyType),
      ),
    }
  })
}

function normalizeFifaStatus(value) {
  if (value === 0) return 'finished'
  if (value === 1) return 'scheduled'
  return 'live'
}

export function normalizeMatchDetails(live, rawStats = null, timeline = null) {
  const home = normalizeTeam(live.HomeTeam)
  const away = normalizeTeam(live.AwayTeam)
  const officials = normalizeOfficials(live.Officials)
  const referee = officials.find((official) => official.role === 'Referee')
  const timelineEvents = normalizeTimeline(timeline, home, away)

  return {
    id: String(live.IdMatch),
    status: normalizeFifaStatus(live.MatchStatus),
    matchTime: fifaClockLabel(live),
    period: live.Period,
    date: live.Date,
    localDate: live.LocalDate,
    competitionId: String(live.IdCompetition ?? ''),
    seasonId: String(live.IdSeason ?? ''),
    stageId: String(live.IdStage ?? ''),
    stageName: localized(live.StageName),
    attendance: live.Attendance ? Number(live.Attendance) : null,
    stadium: localized(live.Stadium?.Name),
    city: localized(live.Stadium?.CityName),
    referee: referee?.name ?? '',
    officials,
    weather: {
      temperature: live.Weather?.Temperature ?? null,
      humidity: live.Weather?.Humidity ?? null,
      windSpeed: live.Weather?.WindSpeed ?? null,
      type: localized(live.Weather?.TypeLocalized),
    },
    home,
    away,
    events: timelineEvents.length
      ? timelineEvents
      : [
          ...buildEvents(live.HomeTeam, 'home'),
          ...buildEvents(live.AwayTeam, 'away'),
        ]
          .sort((left, right) => left.sortMinute - right.sortMinute)
          .map((event, index) => ({
            ...event,
            id: `${event.type}-${event.minute}-${index}`,
            keyEvent: true,
            homeScore: null,
            awayScore: null,
          })),
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

export function fifaMatchCentreUrl(match, details = null) {
  const source = match?.source_payload ?? {}
  const competitionId = details?.competitionId || source.competitionId || '17'
  const seasonId = details?.seasonId || source.seasonId || '285023'
  const stageId = details?.stageId || source.stageId || '289273'
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
    try {
      const live = await fetchJson(
        `https://api.fifa.com/api/v3/live/football/${fixtureId}?language=en`,
      )
      const ifesId = live.Properties?.IdIFES
      const [rawStats, timeline] = await Promise.all([
        ifesId
          ? fetchJson(
              `https://fdh-api.fifa.com/v1/stats/match/${ifesId}/teams.json`,
              true,
            )
          : null,
        fetchJson(
          `https://api.fifa.com/api/v3/timelines/${fixtureId}?language=en`,
          true,
        ),
      ])
      return normalizeMatchDetails(live, rawStats, timeline)
    } catch (error) {
      const archived = await loadArchivedMatchDetails(fixtureId)
      if (archived) return archived
      throw error
    }
  })()

  detailsCache.set(fixtureId, { createdAt: Date.now(), request })
  try {
    return await request
  } catch (error) {
    detailsCache.delete(fixtureId)
    throw error
  }
}
