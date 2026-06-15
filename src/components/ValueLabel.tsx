import { formatPct } from '../lib/metrics'

interface ValueLabelProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
  /**
   * When the bar is too short to hold the label, render it just outside the
   * bar instead of centered (which would otherwise be invisible on white).
   * 'right' always places the fallback to the right (for charts where every
   * bar starts at x=0, so "right" never collides with the axis labels).
   * 'auto' places it on the side away from zero (for charts where bars can
   * extend in either direction from a mid-chart zero line).
   */
  allowOutside?: 'right' | 'auto'
}

const MIN_WIDTH_FOR_INSIDE = 34

export default function ValueLabel({ x = 0, y = 0, width = 0, height = 0, value = 0, allowOutside }: ValueLabelProps) {
  const text = formatPct(value)
  const fitsInside = width >= MIN_WIDTH_FOR_INSIDE

  if (fitsInside || !allowOutside) {
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        dy={4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fontFamily="'IBM Plex Mono', monospace"
        fill={fitsInside ? '#ffffff' : '#374151'}
      >
        {text}
      </text>
    )
  }

  const placeRight = allowOutside === 'right' || value >= 0
  const labelX = placeRight ? x + width + 5 : x - 5

  return (
    <text
      x={labelX}
      y={y + height / 2}
      dy={4}
      textAnchor={placeRight ? 'start' : 'end'}
      fontSize={11}
      fontWeight={600}
      fontFamily="'IBM Plex Mono', monospace"
      fill="#374151"
    >
      {text}
    </text>
  )
}
