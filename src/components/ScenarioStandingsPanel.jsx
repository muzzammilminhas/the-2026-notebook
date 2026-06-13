import { FIXTURES, GROUP_IDS, TEAMS } from '../data/tournament'
import { compareGroup, isScoreComplete } from '../lib/tournamentEngine'
import { StandingsTable } from './StandingsTable'

export function ScenarioStandingsPanel({
  actualTournament,
  impacts,
  onSelectGroup,
  scores,
  selectedGroup,
  tournament,
}) {
  const rows = compareGroup(
    actualTournament.groups[selectedGroup],
    tournament.groups[selectedGroup],
  )
  const completed = FIXTURES[selectedGroup].filter((fixture) =>
    isScoreComplete(scores[fixture.id]),
  ).length
  const groupImpacts = impacts
    .filter((impact) => TEAMS[impact.teamId]?.groupId === selectedGroup)
    .slice(0, 3)

  return (
    <aside className="scenario-panel">
      <div className="scenario-panel-heading">
        <div>
          <span className="hand-note">Live scenario table</span>
          <h3>Group {selectedGroup}</h3>
        </div>
        <span>{completed}/6 filled</span>
      </div>

      <div className="scenario-group-tabs" aria-label="Scenario group table">
        {GROUP_IDS.map((groupId) => (
          <button
            aria-pressed={selectedGroup === groupId}
            className={selectedGroup === groupId ? 'active' : ''}
            key={groupId}
            onClick={() => onSelectGroup(groupId)}
            type="button"
          >
            {groupId}
          </button>
        ))}
      </div>

      <StandingsTable compact rows={rows} showMovement />

      <div className="scenario-panel-note">
        {groupImpacts.length ? (
          groupImpacts.map((impact) => (
            <span key={`${impact.teamId}-${impact.text}`}>{impact.text}</span>
          ))
        ) : (
          <span>Change a future score to see movement here.</span>
        )}
      </div>
    </aside>
  )
}
