import { createClient } from 'npm:@supabase/supabase-js@2.108.1'

const FIFA_URL =
  'https://api.fifa.com/api/v3/calendar/matches' +
  '?from=2026-06-10T00%3A00%3A00Z' +
  '&to=2026-07-20T23%3A59%3A59Z' +
  '&language=en&count=500&idCompetition=17&idSeason=285023'

type TeamRow = {
  id: string
  name: string
  aliases: string[]
}

type MatchRow = {
  id: string
  match_number: number
  stage: string
  group_id: string | null
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
  status: string
  source_fixture_id: string
  winner_team_id: string | null
  verified: boolean
}

type FifaTeam = {
  IdTeam?: string
  TeamName?: Array<{ Description?: string }>
  ShortClubName?: string
  Score?: number
}

type FifaMatch = {
  IdMatch: string
  MatchNumber: number
  MatchStatus: number
  MatchTime?: string
  Date: string
  ResultType?: number
  Winner?: string
  HomeTeamScore?: number
  AwayTeamScore?: number
  HomeTeamPenaltyScore?: number
  AwayTeamPenaltyScore?: number
  Home: FifaTeam | null
  Away: FifaTeam | null
}

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

function fifaName(team: FifaTeam | null) {
  if (!team) return ''
  return team.TeamName?.[0]?.Description ?? team.ShortClubName ?? ''
}

function statusFromFifa(value: number) {
  if (value === 0) return 'finished'
  if (value === 3) return 'live'
  if (value === 4) return 'postponed'
  if (value === 5) return 'cancelled'
  return 'scheduled'
}

function integerOrNull(value: unknown) {
  return Number.isInteger(value) ? Number(value) : null
}

function resolveWinner(
  match: FifaMatch,
  homeTeamId: string | null,
  awayTeamId: string | null,
) {
  if (match.MatchStatus !== 0) return null
  if (match.Winner && match.Winner === match.Home?.IdTeam) return homeTeamId
  if (match.Winner && match.Winner === match.Away?.IdTeam) return awayTeamId

  const home = integerOrNull(match.HomeTeamScore ?? match.Home?.Score)
  const away = integerOrNull(match.AwayTeamScore ?? match.Away?.Score)
  if (home !== null && away !== null && home !== away) {
    return home > away ? homeTeamId : awayTeamId
  }

  const homePens = integerOrNull(match.HomeTeamPenaltyScore)
  const awayPens = integerOrNull(match.AwayTeamPenaltyScore)
  if (homePens !== null && awayPens !== null && homePens !== awayPens) {
    return homePens > awayPens ? homeTeamId : awayTeamId
  }
  return null
}

Deno.serve(async (request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const secretKeys = JSON.parse(
    Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}',
  ) as Record<string, string>
  const apiKey = request.headers.get('apikey')
  if (!apiKey || !Object.values(secretKeys).includes(apiKey)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!supabaseUrl || !serviceRole) {
    return Response.json(
      { error: 'Supabase service environment is unavailable.' },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const recentThreshold = new Date(Date.now() - 45_000).toISOString()
  const { data: recentRun } = await supabase
    .from('result_sync_runs')
    .select('id,started_at')
    .gte('started_at', recentThreshold)
    .in('status', ['running', 'success'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentRun) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: 'A recent sync already ran.',
    })
  }

  const { data: run, error: runError } = await supabase
    .from('result_sync_runs')
    .insert({ provider: 'fifa', status: 'running' })
    .select('id')
    .single()

  if (runError) {
    return Response.json({ error: runError.message }, { status: 500 })
  }

  try {
    const response = await fetch(FIFA_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'the-2026-notebook/1.0',
      },
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) {
      throw new Error(`FIFA returned HTTP ${response.status}`)
    }

    const payload = await response.json()
    const fifaMatches = (payload.Results ?? []) as FifaMatch[]
    if (fifaMatches.length !== 104) {
      throw new Error(`Expected 104 FIFA fixtures, received ${fifaMatches.length}`)
    }

    const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] =
      await Promise.all([
        supabase.from('teams').select('id,name,aliases'),
        supabase
          .from('matches')
          .select(
            'id,match_number,stage,group_id,home_team_id,away_team_id,' +
              'home_score,away_score,status,source_fixture_id,' +
              'winner_team_id,verified',
          ),
      ])
    if (teamsError) throw teamsError
    if (matchesError) throw matchesError

    const teamLookup = new Map<string, TeamRow>()
    for (const team of teams as TeamRow[]) {
      for (const alias of [team.name, ...(team.aliases ?? [])]) {
        teamLookup.set(normalize(alias), team)
      }
    }
    const matchLookup = new Map(
      (matches as MatchRow[]).map((match) => [
        String(match.source_fixture_id),
        match,
      ]),
    )

    const updates = []
    const corrections = []
    for (const fifaMatch of fifaMatches) {
      const existing = matchLookup.get(String(fifaMatch.IdMatch))
      if (!existing) {
        throw new Error(`Unknown FIFA fixture ${fifaMatch.IdMatch}`)
      }

      const homeName = fifaName(fifaMatch.Home)
      const awayName = fifaName(fifaMatch.Away)
      const homeTeam = homeName
        ? teamLookup.get(normalize(homeName)) ?? null
        : null
      const awayTeam = awayName
        ? teamLookup.get(normalize(awayName)) ?? null
        : null
      const homeTeamId = homeTeam?.id ?? existing.home_team_id
      const awayTeamId = awayTeam?.id ?? existing.away_team_id
      const status = statusFromFifa(Number(fifaMatch.MatchStatus))
      const homeScore =
        status === 'scheduled'
          ? null
          : integerOrNull(
              fifaMatch.HomeTeamScore ?? fifaMatch.Home?.Score,
            )
      const awayScore =
        status === 'scheduled'
          ? null
          : integerOrNull(
              fifaMatch.AwayTeamScore ?? fifaMatch.Away?.Score,
            )
      const winnerTeamId = resolveWinner(
        fifaMatch,
        homeTeamId,
        awayTeamId,
      )
      const verified = status === 'finished'

      if (
        existing.verified &&
        verified &&
        (existing.home_score !== homeScore ||
          existing.away_score !== awayScore ||
          existing.winner_team_id !== winnerTeamId)
      ) {
        corrections.push({
          match_id: existing.id,
          previous_value: {
            home_score: existing.home_score,
            away_score: existing.away_score,
            winner_team_id: existing.winner_team_id,
          },
          corrected_value: {
            home_score: homeScore,
            away_score: awayScore,
            winner_team_id: winnerTeamId,
          },
          reason: 'FIFA official feed correction',
        })
      }

      updates.push({
        id: existing.id,
        match_number: existing.match_number,
        stage: existing.stage,
        group_id: existing.group_id,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        kickoff_at: fifaMatch.Date,
        status,
        home_score: homeScore,
        away_score: awayScore,
        winner_team_id: winnerTeamId,
        source: 'fifa',
        source_fixture_id: String(fifaMatch.IdMatch),
        source_payload: {
          matchStatus: fifaMatch.MatchStatus,
          matchTime: fifaMatch.MatchTime ?? null,
          resultType: fifaMatch.ResultType ?? null,
          home: fifaName(fifaMatch.Home),
          away: fifaName(fifaMatch.Away),
          homePenaltyScore: fifaMatch.HomeTeamPenaltyScore ?? null,
          awayPenaltyScore: fifaMatch.AwayTeamPenaltyScore ?? null,
        },
        verified,
        verification_note: verified
          ? 'Verified by FIFA official competition feed'
          : status === 'live'
            ? 'Live score from FIFA official competition feed'
            : null,
        synced_at: new Date().toISOString(),
      })
    }

    if (corrections.length) {
      const { error } = await supabase
        .from('result_corrections')
        .insert(corrections)
      if (error) throw error
    }

    const { error: upsertError } = await supabase
      .from('matches')
      .upsert(updates, { onConflict: 'id' })
    if (upsertError) throw upsertError

    await supabase
      .from('result_sync_runs')
      .update({
        status: 'success',
        fixtures_received: fifaMatches.length,
        fixtures_updated: updates.length,
        details: {
          corrections: corrections.length,
          officialSource: FIFA_URL,
        },
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id)

    return Response.json({
      ok: true,
      received: fifaMatches.length,
      updated: updates.length,
      corrections: corrections.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await supabase
      .from('result_sync_runs')
      .update({
        status: 'failed',
        error_message: message.slice(0, 1000),
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id)

    return Response.json({ error: message }, { status: 502 })
  }
})
