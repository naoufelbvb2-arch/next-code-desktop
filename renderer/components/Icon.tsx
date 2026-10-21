import type { CSSProperties } from 'react'

const paths = {
  plus: 'M12 5v14M5 12h14',
  panels: 'M4 4h16v16H4zM9 4v16',
  folder: 'M3 7V5h6l2 2h10v12H3z',
  agents: 'M9 4h6v5H9zM3 15h6v5H3zM15 15h6v5h-6zM12 9v3M6 15v-3h12v3',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  arrow: 'M12 19V5M6 11l6-6 6 6',
  chevron: 'M9 5l7 7-7 7',
  terminal: 'M4 6l5 6-5 6M12 18h8',
  close: 'M6 6l12 12M6 18 18 6',
  file: 'M6 3h8l4 4v14H6zM14 3v5h4M9 13h6M9 17h4',
  message: 'M4 4h16v13H9l-5 4z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2',
  lock: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',
  monitor: 'M3 4h18v13H3zM8 21h8M12 17v4',
  spark: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z'
} as const
export type IconName = keyof typeof paths
export function Icon({
  name,
  size = 20,
  style
}: {
  name: IconName
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  )
}
