import {
  FIXTURES,
  GROUP_IDS,
  GROUPS,
  KNOCKOUT_ROUNDS,
  TEAMS,
} from '../data/tournament'
import { THIRD_PLACE_ROUTES } from '../data/thirdPlaceRoutes'

export function isScoreComplete(score) {
  return (
    score &&
    Number.isInteger(score.home) &&
    score.home >= 0 &&
    Number.isInteger(score.away) &&
    score.away >= 0
  )
}

function emptyRow(teamId) {
  return {
    teamId,
    name: TEAMS[teamId].name,
    flagCode: TEAMS[teamId].flagCode,
    groupId: TEAMS[teamId].groupId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  }
}

function applyResult(rows, fixture, score) {
  if (!isScoreComplete(score)) return

  const home = rows.get(fixture.homeId)
  const away = rows.get(fixture.awayId)
  home.played += 1
  away.played += 1
  home.gf += score.home
  home.ga += score.away
  away.gf += score.away
  away.ga += score.home

  if (score.home > score.away) {
    home.won += 1
    away.lost += 1
    home.points += 3
  } else if (score.home < score.away) {
    away.won += 1
    home.lost += 1
    away.points += 3
  } else {
    home.drawn += 1
    away.drawn += 1
    home.points += 1
    away.points += 1
  }
}

function miniTable(teamIds, fixtures, scores) {
  const rows = new Map(teamIds.map((teamId) => [teamId, emptyRow(teamId)]))
  fixtures.forEach((fixture) => {
    if (rows.has(fixture.homeId) && rows.has(fixture.awayId)) {
      applyResult(rows, fixture, scores[fixture.id])
    }
  })
  return rows
}

function byCoreMetrics(a, b) {
  return b.points - a.points || b.gd - a.gd || b.gf - a.gf
}

export function rankGroup(groupId, scores = {}) {
  const teamIds = GROUPS[groupId].map((_, index) => `${groupId}${index + 1}`)
  const rows = new Map(teamIds.map((teamId) => [teamId, emptyRow(teamId)]))
  const fixtures = FIXTURES[groupId]

  fixtures.forEach((fixture) => applyResult(rows, fixture, scores[fixture.id]))
  rows.forEach((row) => {
    row.gd = row.gf - row.ga
  })

  const drawOrder = new Map(teamIds.map((teamId, index) => [teamId, index]))
  const coreSorted = [...rows.values()].sort(
    (a, b) =>
      byCoreMetrics(a, b) ||
      drawOrder.get(a.teamId) - drawOrder.get(b.teamId),
  )

  const ranked = []
  for (let index = 0; index < coreSorted.length; ) {
    const current = coreSorted[index]
    const tied = coreSorted.filter(
      (row) =>
        row.points === current.points &&
        row.gd === current.gd &&
        row.gf === current.gf,
    )
    const alreadyRanked = new Set(ranked.map((row) => row.teamId))
    const unresolved = tied.filter((row) => !alreadyRanked.has(row.teamId))

    if (unresolved.length <= 1) {
      ranked.push(current)
      index += 1
      continue
    }

    const mini = miniTable(
      unresolved.map((row) => row.teamId),
      fixtures,
      scores,
    )
    mini.forEach((row) => {
      row.gd = row.gf - row.ga
    })
    unresolved.sort((a, b) => {
      const miniA = mini.get(a.teamId)
      const miniB = mini.get(b.teamId)
      return (
        byCoreMetrics(miniA, miniB) ||
        drawOrder.get(a.teamId) - drawOrder.get(b.teamId)
      )
    })
    ranked.push(...unresolved)
    index += unresolved.length
  }

  return ranked.map((row, index) => ({
    ...row,
    position: index + 1,
  }))
}

export function calculateTournament(scores = {}) {
  const groups = Object.fromEntries(
    GROUP_IDS.map((groupId) => [groupId, rankGroup(groupId, scores)]),
  )

  const thirdPlace = GROUP_IDS.map((groupId) => ({
    ...groups[groupId][2],
    groupId,
    groupComplete: FIXTURES[groupId].every((fixture) =>
      isScoreComplete(scores[fixture.id]),
    ),
  }))
    .sort(
      (a, b) =>
        byCoreMetrics(a, b) ||
        a.groupId.localeCompare(b.groupId) ||
        a.name.localeCompare(b.name),
    )
    .map((row, index) => ({
      ...row,
      thirdRank: index + 1,
      qualifies: index < 8,
    }))

  const completeMatches = Object.values(FIXTURES)
    .flat()
    .filter((fixture) => isScoreComplete(scores[fixture.id])).length

  return {
    groups,
    thirdPlace,
    completeMatches,
    isGroupStageComplete: completeMatches === 72,
  }
}

function resolveSeed(seed, tournament) {
  const position = Number(seed[0])
  const groupId = seed[1]
  return tournament.groups[groupId]?.[position - 1]?.teamId ?? null
}

function resolveThirdSlot(slot, tournament, thirdRoute) {
  const groupId = thirdRoute?.[slot.thirdFor]
  if (!groupId) return null
  return tournament.groups[groupId]?.[2]?.teamId ?? null
}

export function buildKnockout(tournament, picks = {}) {
  const qualifyingThirdGroups = tournament.isGroupStageComplete
    ? tournament.thirdPlace
        .filter((row) => row.qualifies)
        .map((row) => row.groupId)
        .sort()
        .join('')
    : ''
  const thirdRoute = tournament.isGroupStageComplete
    ? THIRD_PLACE_ROUTES[qualifyingThirdGroups]
    : null
  const resolvedPicks = {}
  const resolvedLosers = {}
  const matches = {}

  KNOCKOUT_ROUNDS.forEach((round) => {
    round.matches.forEach((match) => {
      const participants = !tournament.isGroupStageComplete
        ? [null, null]
        : match.slots
          ? match.slots.map((slot) =>
              typeof slot === 'string'
                ? resolveSeed(slot, tournament)
                : resolveThirdSlot(slot, tournament, thirdRoute),
            )
          : match.fromLosers
            ? match.fromLosers.map((sourceId) => resolvedLosers[sourceId] ?? null)
            : match.from.map((sourceId) => resolvedPicks[sourceId] ?? null)
      const participantsReady =
        participants.length === 2 &&
        participants.every(Boolean) &&
        participants[0] !== participants[1]

      const requestedPick = picks[match.id]
      if (
        participantsReady &&
        requestedPick &&
        participants.includes(requestedPick)
      ) {
        resolvedPicks[match.id] = requestedPick
        resolvedLosers[match.id] = participants.find(
          (participant) => participant !== requestedPick,
        )
      }

      matches[match.id] = {
        ...match,
        participants,
        participantsReady,
        winnerId: resolvedPicks[match.id] ?? null,
      }
    })
  })

  return {
    rounds: KNOCKOUT_ROUNDS.map((round) => ({
      ...round,
      matches: round.matches.map((match) => matches[match.id]),
    })),
    resolvedPicks,
    resolvedLosers,
    championId: resolvedPicks[104] ?? null,
    thirdRoute,
  }
}

export function getDependentMatchIds(matchId) {
  const dependents = []
  const queue = [Number(matchId)]

  while (queue.length) {
    const sourceId = queue.shift()
    KNOCKOUT_ROUNDS.forEach((round) => {
      round.matches.forEach((match) => {
        if (
          (match.from?.includes(sourceId) || match.fromLosers?.includes(sourceId)) &&
          !dependents.includes(match.id)
        ) {
          dependents.push(match.id)
          queue.push(match.id)
        }
      })
    })
  }

  return dependents
}

export function compareGroup(actualRows, scenarioRows) {
  const actualPositions = new Map(
    actualRows.map((row) => [row.teamId, row.position]),
  )
  return scenarioRows.map((row) => ({
    ...row,
    movement: actualPositions.has(row.teamId)
      ? actualPositions.get(row.teamId) - row.position
      : 0,
  }))
}

export function summarizeImpacts(actualTournament, scenarioTournament) {
  const impacts = []

  GROUP_IDS.forEach((groupId) => {
    const actual = actualTournament.groups[groupId]
    const scenario = scenarioTournament.groups[groupId]
    const actualPositions = new Map(
      actual.map((row) => [row.teamId, row.position]),
    )

    scenario.forEach((row) => {
      const previous = actualPositions.get(row.teamId)
      if (previous && previous !== row.position) {
        impacts.push({
          teamId: row.teamId,
          text: `${row.name} moves ${previous > row.position ? 'up' : 'down'} to ${ordinal(row.position)} in Group ${groupId}`,
          weight: Math.abs(previous - row.position),
        })
      }
    })
  })

  const actualThird = new Map(
    actualTournament.thirdPlace.map((row) => [row.teamId, row.qualifies]),
  )
  scenarioTournament.thirdPlace.forEach((row) => {
    if (actualThird.get(row.teamId) !== row.qualifies) {
      impacts.push({
        teamId: row.teamId,
        text: row.qualifies
          ? `${row.name} enters the best-third qualification line`
          : `${row.name} drops below the best-third cutoff`,
        weight: 3,
      })
    }
  })

  return impacts
    .sort((a, b) => b.weight - a.weight || a.text.localeCompare(b.text))
    .slice(0, 4)
}

function ordinal(value) {
  if (value === 1) return '1st'
  if (value === 2) return '2nd'
  if (value === 3) return '3rd'
  return `${value}th`
}
