export function TeamFlag({ flagCode, name }) {
  if (!flagCode) return null

  return (
    <img
      alt=""
      aria-hidden="true"
      className="team-flag"
      decoding="async"
      height="12"
      loading="lazy"
      src={`https://flagcdn.com/24x18/${flagCode}.png`}
      srcSet={`https://flagcdn.com/48x36/${flagCode}.png 2x`}
      title={name}
      width="16"
    />
  )
}

export function TeamName({ align = 'start', flagCode, name, team }) {
  const label = name ?? team?.name
  const displayFlagCode = flagCode ?? team?.flagCode

  if (!label) return null

  return (
    <span className={`team-name team-name-${align}`}>
      {align === 'end' ? (
        <>
          <span className="team-name-text">{label}</span>
          <TeamFlag flagCode={displayFlagCode} name={label} />
        </>
      ) : (
        <>
          <TeamFlag flagCode={displayFlagCode} name={label} />
          <span className="team-name-text">{label}</span>
        </>
      )}
    </span>
  )
}
