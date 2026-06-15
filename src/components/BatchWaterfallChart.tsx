import { Bar, Cell, ComposedChart, LabelList, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import EmptyState from './EmptyState'
import { COLOR_NEGATIVE, COLOR_NEUTRAL, COLOR_POSITIVE, formatPct, getBatchSummary } from '../lib/metrics'
import type { StockRecord } from '../lib/types'

interface BatchWaterfallChartProps {
  stocks: StockRecord[]
}

interface WaterfallDatum {
  label: string
  shortLabel: string
  base: number
  value: number
  contribution: number | null
  cumulativeContribution: number
  stockCount: number | null
  avgReturn: number | null
  positiveRatio: number | null
  isTotal: boolean
}

/** "2026-02-25" -> "02/25" */
function toShortDate(date: string): string {
  const parts = date.split('-')
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : date
}

interface WaterfallTooltipProps {
  active?: boolean
  payload?: { payload: WaterfallDatum }[]
}

function WaterfallTooltip({ active, payload }: WaterfallTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  if (d.isTotal) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-card">
        <p className="font-semibold text-navy-900">{d.label}</p>
        <p className="mt-1 font-mono font-medium tabular-nums" style={{ color: COLOR_NEUTRAL }}>
          整体等权平均收益：{formatPct(d.cumulativeContribution)}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-card">
      <p className="font-semibold text-navy-900">推荐日期：{d.label}</p>
      <p className="mt-1 font-mono tabular-nums text-gray-500">推荐数量：{d.stockCount}</p>
      <p className="font-mono tabular-nums text-gray-500">平均收益：{formatPct(d.avgReturn)}</p>
      <p className="font-mono tabular-nums text-gray-500">正收益占比：{((d.positiveRatio ?? 0) * 100).toFixed(1)}%</p>
      <p className="mt-1 font-mono font-medium tabular-nums" style={{ color: (d.contribution ?? 0) >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
        批次贡献：{formatPct(d.contribution)}
      </p>
    </div>
  )
}

export default function BatchWaterfallChart({ stocks }: BatchWaterfallChartProps) {
  const batches = getBatchSummary(stocks)
  if (batches.length === 0) return <EmptyState />

  let prev = 0
  const data: WaterfallDatum[] = batches.map((b) => {
    const start = Math.min(prev, b.cumulativeContribution)
    const end = Math.max(prev, b.cumulativeContribution)
    const item: WaterfallDatum = {
      label: b.recommendDate,
      shortLabel: toShortDate(b.recommendDate),
      base: start,
      value: end - start,
      contribution: b.contribution,
      cumulativeContribution: b.cumulativeContribution,
      stockCount: b.stockCount,
      avgReturn: b.avgReturn,
      positiveRatio: b.positiveRatio,
      isTotal: false,
    }
    prev = b.cumulativeContribution
    return item
  })

  const total = batches[batches.length - 1].cumulativeContribution
  const totalStart = Math.min(0, total)
  const totalEnd = Math.max(0, total)
  data.push({
    label: '整体平均',
    shortLabel: '整体平均',
    base: totalStart,
    value: totalEnd - totalStart,
    contribution: null,
    cumulativeContribution: total,
    stockCount: null,
    avgReturn: null,
    positiveRatio: null,
    isTotal: true,
  })

  // Only label the total bar plus the single most positive and most negative
  // contribution batches, to avoid cluttering the chart with 10+ labels.
  const totalIndex = data.length - 1
  let maxIndex = -1
  let minIndex = -1
  data.forEach((d, i) => {
    if (d.isTotal) return
    const c = d.contribution ?? 0
    if (maxIndex === -1 || c > (data[maxIndex].contribution ?? 0)) maxIndex = i
    if (minIndex === -1 || c < (data[minIndex].contribution ?? 0)) minIndex = i
  })
  const highlightIndices = new Set([totalIndex, maxIndex, minIndex])

  const renderContributionLabel = (props: { x?: number | string; y?: number | string; width?: number | string; index?: number }) => {
    const x = Number(props.x ?? 0)
    const y = Number(props.y ?? 0)
    const width = Number(props.width ?? 0)
    const { index } = props
    if (index === undefined || !highlightIndices.has(index)) return null
    const d = data[index]
    const value = d.isTotal ? d.cumulativeContribution : d.contribution
    const color = d.isTotal ? COLOR_NEUTRAL : (d.contribution ?? 0) >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fontFamily="'IBM Plex Mono', monospace"
        fill={color}
      >
        {formatPct(value)}
      </text>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 16 }}>
          <XAxis
            dataKey="shortLabel"
            tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            interval={0}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
          <ReferenceLine y={0} stroke="#d1d5db" />
          <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="value" stackId="wf" radius={[3, 3, 3, 3]} maxBarSize={40} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.isTotal ? COLOR_NEUTRAL : (d.contribution ?? 0) >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}
                fillOpacity={d.isTotal ? 1 : 0.85}
                stroke={d.isTotal ? COLOR_NEUTRAL : 'none'}
                strokeWidth={d.isTotal ? 1 : 0}
              />
            ))}
            <LabelList dataKey="value" content={renderContributionLabel} />
          </Bar>
          <Line
            type="stepAfter"
            dataKey="cumulativeContribution"
            stroke={COLOR_NEUTRAL}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        每根柱子表示该推荐批次对整体等权平均收益的贡献（红色为正贡献，绿色为负贡献），虚线为累计贡献走势；最右侧蓝色柱为整体等权平均收益{' '}
        {formatPct(total)}。仅标注贡献最大、最小的批次及整体平均值。
      </p>
    </div>
  )
}
