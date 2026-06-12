export function Icon({ name, size = 18 }) {
  const paths = {
    reset: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    save: (
      <>
        <path d="M5 3h12l2 2v14H5z" />
        <path d="M8 3v6h8V3M8 19v-6h8v6" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="19" r="2" />
        <path d="m8 11 8-5M8 13l8 5" />
      </>
    ),
    bracket: (
      <>
        <path d="M4 4h6v5H4zM4 15h6v5H4zM14 9.5h6v5h-6z" />
        <path d="M10 6.5h2v5.5h2M10 17.5h2V12" />
      </>
    ),
    groups: (
      <>
        <path d="M4 5h16M4 12h16M4 19h16" />
        <path d="M8 3v18" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v4c0 3-1.8 5-4 5s-4-2-4-5z" />
        <path d="M8 6H5v1c0 2 1 3 3 3M16 6h3v1c0 2-1 3-3 3M12 13v4M8 20h8M9 17h6" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
  }

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        {paths[name]}
      </g>
    </svg>
  )
}
