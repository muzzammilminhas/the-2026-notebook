import { TEAMS } from '../data/tournament'

function TeamSlot({ teamId, winnerId, onPick, disabled }) {
  const isWinner = teamId && winnerId === teamId
  const isEliminated = teamId && winnerId && winnerId !== teamId

  return (
    <button
      className={`team-slot ${isWinner ? 'winner' : ''} ${
        isEliminated ? 'eliminated' : ''
      }`}
      disabled={!teamId || disabled}
      onClick={() => onPick(teamId)}
      type="button"
    >
      <span>{teamId ? TEAMS[teamId].name : 'To be decided'}</span>
      {isWinner ? <strong>✓</strong> : null}
    </button>
  )
}

function formatKickoff(value) {
  if (!value) return 'Schedule pending'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function KnockoutBoard({
  knockout,
  tournament,
  onPickWinner,
  isWhatIf,
  matchByNumber,
  predictions,
  onReset,
}) {
  const champion = knockout.championId ? TEAMS[knockout.championId] : null
  const qualifiedThirds = tournament.isGroupStageComplete
    ? tournament.thirdPlace
        .filter((row) => row.qualifies)
        .map((row) => row.groupId)
        .join(', ')
    : ''

  return (
    <div className="knockout-view">
      <section className="knockout-heading">
        <div>
          <span className="hand-note">
            {isWhatIf ? 'The simulation page' : 'Official bracket'}
          </span>
          <h2>
            {isWhatIf && !tournament.isGroupStageComplete
              ? 'Knockout bracket preview'
              : isWhatIf
                ? 'Knockout predictions'
                : 'Knockout results'}
          </h2>
          <p>
            {isWhatIf
              ? tournament.isGroupStageComplete
                ? 'Pick who advances. Click your selected winner again to undo it.'
                : `Complete the group notebook first. ${tournament.completeMatches}/72 results are filled.`
              : 'This bracket is read-only and advances from verified FIFA results.'}
          </p>
        </div>
        <div className={`champion-box ${champion ? 'decided' : ''}`}>
          <span>{isWhatIf ? 'My champion' : 'World champion'}</span>
          <strong>
            {champion?.name ??
              (tournament.isGroupStageComplete
                ? 'Still unwritten'
                : 'After the groups')}
          </strong>
        </div>
      </section>

      {!tournament.isGroupStageComplete ? (
        <div className="bracket-gate" role="status">
          <strong>Group stage in progress</strong>
          <span>
            The Round of 32 is not active yet. Fill every remaining group score
            in What If to unlock a complete, consistent simulation.
          </span>
        </div>
      ) : null}

      <div className="route-note">
        <strong>Official third-place routing:</strong>
        <span>{qualifiedThirds || 'Awaiting group standings'}</span>
        <small>
          Annex C pairing is calculated only from a complete group table.
        </small>
        {isWhatIf ? (
          <button
            className="reset-bracket-button"
            disabled={!Object.values(predictions).some(
              (prediction) => !prediction.scoredAt,
            )}
            onClick={onReset}
            type="button"
          >
            Reset picks
          </button>
        ) : null}
      </div>

      <div className="bracket-scroll">
        <div className="bracket-board">
          {knockout.rounds.map((round) => (
            <section className={`round-column ${round.id}`} key={round.id}>
              <div className="round-title">
                <span>{round.label}</span>
                <small>
                  {round.matches.length}{' '}
                  {round.matches.length === 1 ? 'match' : 'matches'}
                </small>
              </div>
              <div className="round-matches">
                {round.matches.map((match) => {
                  const officialMatch = matchByNumber[match.id]
                  const locked =
                    !officialMatch ||
                    officialMatch.status !== 'scheduled' ||
                    (officialMatch.kickoff_at &&
                      new Date(officialMatch.kickoff_at) <= new Date())
                  const prediction = predictions[match.id]
                  const selectionDisabled =
                    !isWhatIf ||
                    locked ||
                    !tournament.isGroupStageComplete ||
                    !match.participantsReady
                  const status =
                    officialMatch?.status === 'live'
                      ? 'Live'
                      : officialMatch?.status === 'finished'
                        ? officialMatch.verified
                          ? 'Final · verified'
                          : 'Final · checking'
                        : formatKickoff(officialMatch?.kickoff_at)

                  return (
                    <article
                      className={`knockout-match ${locked ? 'locked' : ''}`}
                      key={match.id}
                    >
                      <span className="match-number">
                        M{match.id} · {status}
                      </span>
                      <TeamSlot
                        disabled={selectionDisabled}
                        onPick={(teamId) => onPickWinner(match.id, teamId)}
                        teamId={match.participants[0]}
                        winnerId={match.winnerId}
                      />
                      <TeamSlot
                        disabled={selectionDisabled}
                        onPick={(teamId) => onPickWinner(match.id, teamId)}
                        teamId={match.participants[1]}
                        winnerId={match.winnerId}
                      />
                      {prediction?.scoredAt ? (
                        <span
                          className={`knockout-grade ${prediction.grade}`}
                        >
                          {prediction.grade === 'correct'
                            ? 'Correct · +2'
                            : 'Wrong · +0'}
                        </span>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <p className="bracket-footnote">
        {isWhatIf
          ? 'Both opponents are required before a pick can advance. Predictions lock at kickoff, and verified winners replace your simulation.'
          : 'Scores and winners are supplied by FIFA and cannot be edited here.'}
      </p>
    </div>
  )
}
