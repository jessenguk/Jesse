import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import EmptyState from './EmptyState'
import ValueLabel from './ValueLabel'
import { type RankedStock, formatPct, getReturnColor, getTopBottom } from '../lib/metrics'
import type { StockRecord } from '../lib/types'

interface TopBottomChartProps {
  stocks: StockRecord[]
  topN: number
}

interface RankTooltipProps {
  active?: boolean
  payload?: { payload: RankedStock }[]
}

function RankTooltip({ active, payload }: RankTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-card">
      <p className="font-semibold text-navy-900">
        {d.stockName} ({d.stockCode})
      </p>
      <p className="mt-1 text-gray-500">行业：{d.industry}</p>
      <p className="text-gray-500">推荐日期：{d.recommendDate}</p>
      <p className="font-mono tabular-nums text-gray-500">日均收益率：{formatPct(d.dailyReturnPct, 2)}</p>
      <p className="mt-1 font-mono font-medium tabular-nums" style={{ color: getReturnColor(d.returnPct) }}>
        区间涨跌幅：{formatPct(d.returnPct)}
      </p>
    </div>
  )
}

function RankingPanel({ title, data }: { title: string; data: RankedStock[] }) {
  if (data.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-600">{title}</h3>
        <EmptyState />
      </div>
    )
  }
  const height = Math.max(220, data.length * 32)
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-semibold text-gray-600">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barCategoryGap="28%">
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
            dataKey="stockName"
            width={84}
            tick={{ fontSize: 12, fill: '#374151' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <Tooltip content={<RankTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
          <Bar dataKey="returnPct" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={getReturnColor(d.returnPct)} />
            ))}
            <LabelList dataKey="returnPct" content={<ValueLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function TopBottomChart({ stocks, topN }: TopBottomChartProps) {
  const { top, bottom } = getTopBottom(stocks, topN)
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <RankingPanel title={`Top ${topN}`} data={top} />
      <RankingPanel title={`Bottom ${topN}`} data={bottom} />
    </div>
  )
}
