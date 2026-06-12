import { useCallback, useEffect, useMemo, useState } from 'react'
import { GROUP_IDS } from '../data/tournament'
import { isScoreComplete } from '../lib/tournamentEngine'
import { supabase } from '../lib/supabase'

const EMPTY_STATE = {
  user: null,
  profile: null,
  matches: [],
  predictions: {},
  knockoutPredictions: {},
  leaderboard: [],
  loading: true,
  error: null,
  lastUpdated: null,
}

function matchesToState(matches) {
  const actualScores = {}
  const matchMeta = {}
  const actualPicks = {}

  matches.forEach((match) => {
    matchMeta[match.id] = match
    if (
      match.stage === 'group' &&
      Number.isInteger(match.home_score) &&
      Number.isInteger(match.away_score)
    ) {
      actualScores[match.id] = {
        home: match.home_score,
        away: match.away_score,
      }
    }
    if (match.match_number && match.winner_team_id) {
      actualPicks[match.match_number] = match.winner_team_id
    }
  })

  return { actualScores, matchMeta, actualPicks }
}

export function useWorldCupBackend() {
  const [state, setState] = useState(EMPTY_STATE)
  const [savingMatches, setSavingMatches] = useState({})

  const refresh = useCallback(async () => {
    try {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession()

      let session = existingSession
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) throw error
        session = data.session
      }

      const user = session.user
      const [
        profileResult,
        matchesResult,
        predictionsResult,
        knockoutResult,
        leaderboardResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('matches')
          .select('*')
          .order('match_number', { ascending: true }),
        supabase.from('predictions').select('*').eq('user_id', user.id),
        supabase
          .from('knockout_predictions')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('public_leaderboard')
          .select('*')
          .order('points', { ascending: false })
          .order('exact_scores', { ascending: false })
          .order('correct_knockout', { ascending: false })
          .order('updated_at', { ascending: true })
          .limit(100),
      ])

      const firstError =
        profileResult.error ??
        matchesResult.error ??
        predictionsResult.error ??
        knockoutResult.error ??
        leaderboardResult.error
      if (firstError) throw firstError

      const predictions = Object.fromEntries(
        predictionsResult.data.map((prediction) => [
          prediction.match_id,
          {
            home: prediction.predicted_home,
            away: prediction.predicted_away,
            points: prediction.points,
            grade: prediction.result_grade,
            scoredAt: prediction.scored_at,
          },
        ]),
      )
      const knockoutPredictions = Object.fromEntries(
        knockoutResult.data.map((prediction) => [
          prediction.match_number,
          {
            teamId: prediction.predicted_winner_team_id,
            points: prediction.points,
            grade: prediction.result_grade,
            scoredAt: prediction.scored_at,
          },
        ]),
      )

      setState({
        user,
        profile: profileResult.data,
        matches: matchesResult.data,
        predictions,
        knockoutPredictions,
        leaderboard: leaderboardResult.data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      })
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || 'Could not connect to the live backend.',
      }))
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [refresh])

  const savePrediction = useCallback(
    async (matchId, score) => {
      if (!state.user) return { persisted: false }

      setState((current) => ({
        ...current,
        predictions: {
          ...current.predictions,
          [matchId]: {
            ...current.predictions[matchId],
            home: score.home,
            away: score.away,
            points: null,
            grade: null,
          },
        },
      }))
      if (!isScoreComplete(score)) return { persisted: false }

      setSavingMatches((current) => ({ ...current, [matchId]: true }))
      const { error } = await supabase.from('predictions').upsert(
        {
          user_id: state.user.id,
          match_id: matchId,
          predicted_home: score.home,
          predicted_away: score.away,
        },
        { onConflict: 'user_id,match_id' },
      )
      setSavingMatches((current) => ({ ...current, [matchId]: false }))

      if (error) {
        await refresh()
        throw error
      }
      return { persisted: true }
    },
    [refresh, state.user],
  )

  const saveKnockoutPrediction = useCallback(
    async (matchNumber, teamId) => {
      if (!state.user) return

      setState((current) => ({
        ...current,
        knockoutPredictions: {
          ...current.knockoutPredictions,
          [matchNumber]: {
            teamId,
            points: null,
            grade: null,
            scoredAt: null,
          },
        },
      }))

      const { error } = await supabase.from('knockout_predictions').upsert(
        {
          user_id: state.user.id,
          match_number: Number(matchNumber),
          predicted_winner_team_id: teamId,
        },
        { onConflict: 'user_id,match_number' },
      )
      if (error) {
        await refresh()
        throw error
      }
    },
    [refresh, state.user],
  )

  const updateNickname = useCallback(
    async (nickname) => {
      if (!state.user) return
      const cleaned = nickname.trim()
      if (cleaned.length < 3 || cleaned.length > 24) {
        throw new Error('Nickname must be 3 to 24 characters.')
      }
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: cleaned })
        .eq('id', state.user.id)
      if (error) throw error
      setState((current) => ({
        ...current,
        profile: { ...current.profile, nickname: cleaned },
      }))
      await refresh()
    },
    [refresh, state.user],
  )

  const derived = useMemo(() => matchesToState(state.matches), [state.matches])
  const knockoutPicks = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(state.knockoutPredictions).map(([matchNumber, value]) => [
          matchNumber,
          value.teamId,
        ]),
      ),
    [state.knockoutPredictions],
  )
  const matchByNumber = useMemo(
    () =>
      Object.fromEntries(
        state.matches
          .filter((match) => match.match_number)
          .map((match) => [match.match_number, match]),
      ),
    [state.matches],
  )
  const scoreSummary = useMemo(() => {
    const groupScored = Object.values(state.predictions).filter(
      (prediction) => prediction.scoredAt,
    )
    const knockoutScored = Object.values(state.knockoutPredictions).filter(
      (prediction) => prediction.scoredAt,
    )

    return {
      points:
        groupScored.reduce(
          (total, prediction) => total + (prediction.points ?? 0),
          0,
        ) +
        knockoutScored.reduce(
          (total, prediction) => total + (prediction.points ?? 0),
          0,
        ),
      exact: groupScored.filter((prediction) => prediction.grade === 'exact')
        .length,
      correct: groupScored.filter((prediction) =>
        ['exact', 'outcome'].includes(prediction.grade),
      ).length,
      knockoutCorrect: knockoutScored.filter(
        (prediction) => prediction.grade === 'correct',
      ).length,
      scored: groupScored.length + knockoutScored.length,
    }
  }, [state.knockoutPredictions, state.predictions])

  return {
    ...state,
    ...derived,
    scoreSummary,
    knockoutPicks,
    matchByNumber,
    savingMatches,
    refresh,
    savePrediction,
    saveKnockoutPrediction,
    updateNickname,
  }
}

export function buildPredictionScores(actualScores, predictions, matchMeta) {
  const scores = {}

  GROUP_IDS.forEach((groupId) => {
    for (let index = 1; index <= 6; index += 1) {
      const matchId = `${groupId}-${index}`
      const match = matchMeta[matchId]
      const actual = actualScores[matchId]
      const prediction = predictions[matchId]
      const hasStarted =
        match &&
        (match.status !== 'scheduled' ||
          (match.kickoff_at && new Date(match.kickoff_at) <= new Date()))

      if (hasStarted && actual) scores[matchId] = actual
      else if (prediction) scores[matchId] = prediction
    }
  })

  return scores
}
