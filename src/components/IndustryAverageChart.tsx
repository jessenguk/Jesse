import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import EmptyState from './EmptyState'
import ValueLabel from './ValueLabel'
import { type IndustrySummary, formatPct, getIndustrySummary, getReturnColor } from '../lib/metrics'
import type { StockRecord } from '../lib/types'

interface IndustryAverageChartProps {
  stocks: StockRecord[]
}

interface IndustryTooltipProps {
  active?: boolean
  payload?: { payload: IndustrySummary & { label: string } }[]
}

function IndustryTooltip({ active, payload }: IndustryTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-card">
      <p className="font-semibold text-navy-900">{d.industry}</p>
      <p className="mt-1 font-mono tabular-nums text-gray-500">股票数量：{d.stockCount}</p>
      <p className="font-mono tabular-nums text-gray-500">中位数收益：{formatPct(d.medianReturn)}</p>
      <p className="font-mono tabular-nums text-gray-500">正收益占比：{(d.positiveRatio * 100).toFixed(1)}%</p>
      <p className="mt-1 font-mono font-medium tabular-nums" style={{ color: getReturnColor(d.avgReturn) }}>
        平均收益：{formatPct(d.avgReturn)}
      </p>
    </div>
  )
}

export default function IndustryAverageChart({ stocks }: IndustryAverageChartProps) {
  const industries = getIndustrySummary(stocks).sort((a, b) => b.avgReturn - a.avgReturn)

  if (industries.length === 0) return <EmptyState />

  const data = industries.map((ind) => ({ ...ind, label: `${ind.industry}（n=${ind.stockCount}）` }))
  const hasSmallSample = industries.some((ind) => ind.stockCount <= 2)
  const height = Math.max(260, data.length * 32)

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
          <XAxis
            type="number"
            allowDecimals={false}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ fontSize: 12, fill: '#374151' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <Tooltip content={<IndustryTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
          <Bar dataKey="avgReturn" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={getReturnColor(d.avgReturn)} />
            ))}
            <LabelList dataKey="avgReturn" content={<ValueLabel allowOutside="auto" />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {hasSmallSample && (
        <p className="mt-2 text-xs leading-relaxed text-gray-500">注：n≤2 的行业样本较少，平均收益波动较大，仅供参考。</p>
      )}
    </div>
  )
}
