import { Bar, Cell, ComposedChart, LabelList, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import EmptyState from './EmptyState'
import {
  COLOR_NEGATIVE,
  COLOR_NEUTRAL,
  COLOR_POSITIVE,
  formatPct,
  getBatchComparisonInsights,
  getBatchComparisonSummary,
  type BatchComparisonBatch,
} from '../lib/metrics'
import type { StockRecord } from '../lib/types'

interface BatchComparisonChartProps {
  stocks: StockRecord[]
}

interface WaterfallDatum {
  shortLabel: string
  label: string
  base: number
  value: number
  contribution: number | null
  cumulativeContribution: number
  stockCount: number | null
  isTotal: boolean
}

function buildWaterfallData(
  batches: BatchComparisonBatch[],
  field: 'currentContribution' | 'maxContribution',
  totalLabel: string,
): WaterfallDatum[] {
  let cumulative = 0
  const items: WaterfallDatum[] = []

  for (const b of batches) {
    const contribution = field === 'currentContribution' ? b.currentContribution : b.maxContribution
    if (contribution === null) continue
    const prev = cumulative
    cumulative += contribution
    items.push({
      shortLabel: b.shortLabel,
      label: b.recommendDate,
      base: Math.min(prev, cumulative),
      value: Math.abs(contribution),
      contribution,
      cumulativeContribution: cumulative,
      stockCount: b.stockCount,
      isTotal: false,
    })
  }

  items.push({
    shortLabel: totalLabel,
    label: totalLabel,
    base: Math.min(0, cumulative),
    value: Math.abs(cumulative),
    contribution: null,
    cumulativeContribution: cumulative,
    stockCount: null,
    isTotal: true,
  })

  return items
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: WaterfallDatum }[]
  totalLabel: string
}

function WaterfallTooltip({ active, payload, totalLabel }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  if (d.isTotal) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-card">
        <p className="font-semibold text-navy-900">{totalLabel}</p>
        <p className="mt-1 font-mono font-medium tabular-nums" style={{ color: COLOR_NEUTRAL }}>
          {formatPct(d.cumulativeContribution)}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-card">
      <p className="font-semibold text-navy-900">推荐日期：{d.label}</p>
      <p className="mt-1 font-mono tabular-nums text-gray-500">推荐数量：{d.stockCount}</p>
      <p
        className="font-mono font-medium tabular-nums"
        style={{ color: (d.contribution ?? 0) >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}
      >
        批次贡献：{formatPct(d.contribution)}
      </p>
    </div>
  )
}

interface WaterfallPaneProps {
  data: WaterfallDatum[]
  totalLabel: string
}

function WaterfallPane({ data, totalLabel }: WaterfallPaneProps) {
  const totalIndex = data.length - 1
  let maxIdx = -1
  let minIdx = -1
  data.forEach((d, i) => {
    if (d.isTotal) return
    const c = d.contribution ?? 0
    if (maxIdx === -1 || c > (data[maxIdx].contribution ?? 0)) maxIdx = i
    if (minIdx === -1 || c < (data[minIdx].contribution ?? 0)) minIdx = i
  })
  const highlight = new Set([totalIndex, maxIdx, minIdx].filter((i) => i >= 0))

  const renderLabel = (props: { x?: number | string; y?: number | string; width?: number | string; index?: number }) => {
    const x = Number(props.x ?? 0)
    const y = Number(props.y ?? 0)
    const width = Number(props.width ?? 0)
    const { index } = props
    if (index === undefined || !highlight.has(index)) return null
    const d = data[index]
    const value = d.isTotal ? d.cumulativeContribution : d.contribution
    const color = d.isTotal ? COLOR_NEUTRAL : (d.contribution ?? 0) >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE
    return (
      <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fontFamily="'IBM Plex Mono', monospace" fill={color}>
        {formatPct(value)}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 16 }}>
        <XAxis
          dataKey="shortLabel"
          tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={44}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tickFormatter={(v: number) => `${v.toFixed(2)}%`}
          tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip content={<WaterfallTooltip totalLabel={totalLabel} />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
        <ReferenceLine y={0} stroke="#d1d5db" />
        <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="wf" radius={[3, 3, 3, 3]} maxBarSize={36} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.isTotal ? COLOR_NEUTRAL : (d.contribution ?? 0) >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}
              fillOpacity={d.isTotal ? 1 : 0.85}
            />
          ))}
          <LabelList dataKey="value" content={renderLabel} />
        </Bar>
        <Line type="stepAfter" dataKey="cumulativeContribution" stroke={COLOR_NEUTRAL} strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export default function BatchComparisonChart({ stocks }: BatchComparisonChartProps) {
  const summary = getBatchComparisonSummary(stocks)
  if (summary.totalCount === 0) return <EmptyState />

  const { kpis, batches } = summary
  const insights = getBatchComparisonInsights(summary)
  const currentData = buildWaterfallData(batches, 'currentContribution', '整体平均')
  const maxData = buildWaterfallData(batches, 'maxContribution', '整体平均')

  const retainmentPct =
    kpis.overallRetainmentRate !== null ? `${(kpis.overallRetainmentRate * 100).toFixed(2)}%` : 'N/A'

  return (
    <div className="space-y-6">
      {/* 3 KPI mini cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">当前平均收益</p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: kpis.overallAvgReturn >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
            {formatPct(kpis.overallAvgReturn)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">平均最高涨幅</p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: COLOR_POSITIVE }}>
            {formatPct(kpis.overallAvgMaxReturn)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">整体机会留存率</p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: COLOR_NEUTRAL }}>
            {retainmentPct}
          </p>
        </div>
      </div>

      {/* Waterfall: current return */}
      <div>
        <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-gray-500">
          当前收益贡献 · 实际留存结果
        </p>
        <WaterfallPane data={currentData} totalLabel="整体当前平均收益" />
      </div>

      {/* Waterfall: max return opportunity */}
      <div>
        <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-gray-500">
          最高涨幅机会贡献 · 曾出现过的收益机会
        </p>
        <WaterfallPane data={maxData} totalLabel="整体平均最高涨幅" />
      </div>

      {/* Comparison data table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="pb-2 font-mono text-[10px] uppercase tracking-wider">推荐日期</th>
              <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">数量</th>
              <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">当前收益贡献</th>
              <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">最高涨幅机会贡献</th>
              <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">机会留存率</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums text-gray-600">
            {batches.map((b) => (
              <tr key={b.recommendDate} className="border-t border-gray-100">
                <td className="py-1.5 text-navy-900">{b.recommendDate}</td>
                <td className="py-1.5 text-right">{b.stockCount}</td>
                <td className="py-1.5 text-right" style={{ color: b.currentContribution >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                  {formatPct(b.currentContribution)}
                </td>
                <td className="py-1.5 text-right" style={{ color: b.maxContribution !== null ? COLOR_POSITIVE : undefined }}>
                  {formatPct(b.maxContribution)}
                </td>
                <td className="py-1.5 text-right" style={{ color: b.retainmentRate !== null ? COLOR_NEUTRAL : undefined }}>
                  {b.retainmentRate !== null ? `${(b.retainmentRate * 100).toFixed(2)}%` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <ul className="space-y-1 text-xs leading-relaxed text-gray-500">
          {insights.map((insight, i) => (
            <li key={i}>· {insight}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
