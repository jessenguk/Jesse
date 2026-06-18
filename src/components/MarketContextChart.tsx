import {
  ComposedChart,
  Label,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import EmptyState from './EmptyState'
import {
  COLOR_NEGATIVE,
  COLOR_NEUTRAL,
  COLOR_POSITIVE,
  formatPct,
  getMarketContextInsights,
  getMarketContextSummary,
  type IndexKey,
  type MarketContextBatch,
} from '../lib/metrics'
import type { IndexDailyPrice, StockRecord } from '../lib/types'

interface MarketContextChartProps {
  stocks: StockRecord[]
  indexPrices: IndexDailyPrice[]
  indexKey?: IndexKey
  indexName?: string
}

const QUADRANT_COLORS: Record<string, string> = {
  逆风好选: COLOR_POSITIVE,
  顺风好选: '#f59e0b',
  逆风差选: COLOR_NEGATIVE,
  顺风差选: '#9ca3af',
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: { payload: MarketContextBatch }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-card">
      <p className="font-semibold text-navy-900">推荐日期：{d.recommendDate}</p>
      <p className="mt-1 font-mono tabular-nums text-gray-500">股票数量：{d.stockCount}</p>
      <p className="font-mono tabular-nums" style={{ color: d.avgStockReturn >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
        个股均值：{formatPct(d.avgStockReturn)}
      </p>
      <p className="font-mono tabular-nums" style={{ color: d.marketReturnPct != null && d.marketReturnPct >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
        同期大盘：{formatPct(d.marketReturnPct)}
      </p>
      {d.quadrant && (
        <p className="mt-1 font-semibold" style={{ color: QUADRANT_COLORS[d.quadrant] }}>
          {d.quadrant}
        </p>
      )}
    </div>
  )
}

export default function MarketContextChart({ stocks, indexPrices, indexKey = 'shzs', indexName = '上证综指' }: MarketContextChartProps) {
  const summary = getMarketContextSummary(stocks, indexPrices, indexKey)
  if (summary.batches.length === 0) return <EmptyState />

  const { batches, indexSeries, recDates, latestIndexDate } = summary
  const insights = getMarketContextInsights(summary)

  // X axis: show date labels every ~20 trading days
  const tickDates = indexSeries.filter((_, i) => i % 20 === 0 || i === indexSeries.length - 1).map((d) => d.date)

  // Scatter data — only batches with market return available
  const scatterData = batches.filter((b) => b.marketReturnPct !== null)

  return (
    <div className="space-y-6">
      {/* Index timeline */}
      <div>
        <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-gray-500">
          {indexName}走势 · 竖线为推荐时点
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={indexSeries} margin={{ top: 12, right: 16, left: 8, bottom: 16 }}>
            <XAxis
              dataKey="date"
              ticks={tickDates}
              tickFormatter={(d: string) => d.slice(5).replace('-', '/')}
              tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => v.toFixed(0)}
              tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              width={48}
            />
            <Tooltip
              formatter={(v: number) => [v.toFixed(2), indexName]}
              labelFormatter={(l) => `日期：${l}`}
              contentStyle={{ borderRadius: 8, borderColor: '#e5e7eb', fontSize: 12 }}
              cursor={{ stroke: '#d1d5db' }}
            />
            {recDates.map((date) => (
              <ReferenceLine key={date} x={date} stroke={COLOR_NEUTRAL} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.6} />
            ))}
            <Line
              dataKey="value"
              dot={false}
              stroke={COLOR_NEUTRAL}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {latestIndexDate && (
          <p className="mt-1 text-right font-mono text-[10px] text-gray-400">
            数据截至 {latestIndexDate} · 蓝色竖线为推荐日期
          </p>
        )}
      </div>

      {/* Quadrant scatter */}
      <div>
        <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-gray-500">
          推荐批次四象限 · X 轴：推荐后{indexName}涨跌 · Y 轴：批次个股均值
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 24, left: 8, bottom: 20 }}>
            <XAxis
              type="number"
              dataKey="marketReturnPct"
              name="大盘涨跌"
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            >
              <Label value={`同期${indexName}涨跌幅`} offset={-10} position="insideBottom" style={{ fontSize: 10, fill: '#9ca3af' }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="avgStockReturn"
              name="个股均值"
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              width={48}
            >
              <Label value="批次个股平均收益" angle={-90} position="insideLeft" style={{ fontSize: 10, fill: '#9ca3af' }} />
            </YAxis>
            <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />
            <ReferenceLine x={0} stroke="#d1d5db" strokeWidth={1} />
            <Scatter
              data={scatterData}
              shape={(props: { cx?: number; cy?: number; payload?: MarketContextBatch }) => {
                const { cx = 0, cy = 0, payload } = props
                const color = payload?.quadrant ? QUADRANT_COLORS[payload.quadrant] : '#9ca3af'
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={6} fill={color} fillOpacity={0.85} />
                    <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fill={color} fontFamily="'IBM Plex Mono', monospace" fontWeight={600}>
                      {payload?.shortLabel}
                    </text>
                  </g>
                )
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Quadrant legend */}
        <div className="flex flex-wrap justify-center gap-4 text-xs">
          {Object.entries(QUADRANT_COLORS).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5 font-mono">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="pb-2 font-mono text-[10px] uppercase tracking-wider">推荐日期</th>
              <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">数量</th>
              <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">个股均值</th>
              <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">同期{indexName}</th>
              <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">分类</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums text-gray-600">
            {batches.map((b) => (
              <tr key={b.recommendDate} className="border-t border-gray-100">
                <td className="py-1.5 text-navy-900">{b.recommendDate}</td>
                <td className="py-1.5 text-right">{b.stockCount}</td>
                <td className="py-1.5 text-right" style={{ color: b.avgStockReturn >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                  {formatPct(b.avgStockReturn)}
                </td>
                <td className="py-1.5 text-right" style={{ color: b.marketReturnPct != null && b.marketReturnPct >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                  {formatPct(b.marketReturnPct)}
                </td>
                <td className="py-1.5 text-right" style={{ color: b.quadrant ? QUADRANT_COLORS[b.quadrant] : undefined }}>
                  {b.quadrant ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
