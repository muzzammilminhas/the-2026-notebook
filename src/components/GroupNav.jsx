import { GROUP_IDS } from '../data/tournament'
import { Icon } from './Icons'

export function GroupNav({
  selectedGroup,
  onSelectGroup,
  view,
  onViewChange,
  tournament,
}) {
  return (
    <aside className="group-nav">
      <div className="view-nav">
        <button
          className={view === 'groups' ? 'active' : ''}
          onClick={() => onViewChange('groups')}
          type="button"
        >
          <Icon name="groups" />
          Groups
        </button>
        <button
          className={view === 'knockout' ? 'active' : ''}
          onClick={() => onViewChange('knockout')}
          type="button"
        >
          <Icon name="bracket" />
          Knockout
        </button>
        <button
          className={view === 'leaderboard' ? 'active' : ''}
          onClick={() => onViewChange('leaderboard')}
          type="button"
        >
          <Icon name="trophy" />
          Leaderboard
        </button>
      </div>

      <p className="nav-label">Group pages</p>
      <div className="group-tabs">
        {GROUP_IDS.map((groupId) => {
          const leader = tournament.groups[groupId][0]
          return (
            <button
              className={
                view === 'groups' && selectedGroup === groupId ? 'active' : ''
              }
              key={groupId}
              onClick={() => onSelectGroup(groupId)}
              type="button"
            >
              <span className="group-letter">{groupId}</span>
              <span>
                <strong>Group {groupId}</strong>
                <small>{leader.name}</small>
              </span>
              <Icon name="chevron" size={15} />
            </button>
          )
        })}
      </div>
    </aside>
  )
}
