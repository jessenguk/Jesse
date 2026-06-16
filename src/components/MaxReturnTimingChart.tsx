import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import EmptyState from './EmptyState'
import {
  COLOR_NEUTRAL,
  COLOR_POSITIVE,
  formatPct,
  getMaxReturnTimingHeadline,
  getMaxReturnTimingInsights,
  getMaxReturnTimingSummary,
} from '../lib/metrics'
import type { StockRecord } from '../lib/types'

interface MaxReturnTimingChartProps {
  stocks: StockRecord[]
}

const COLOR_COUNT = '#64748b' // slate / blue-gray — represents stock counts, not return direction

export default function MaxReturnTimingChart({ stocks }: MaxReturnTimingChartProps) {
  const summary = getMaxReturnTimingSummary(stocks)
  if (summary.totalCount === 0) return <EmptyState />

  const buckets = summary.buckets.filter((b) => b.count > 0 || b.bucket !== '待核对')
  const headline = getMaxReturnTimingHeadline(summary)
  const insights = getMaxReturnTimingInsights(summary)

  return (
    <div>
      {headline && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-medium text-navy-900">
          {headline}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={buckets} margin={{ top: 24, right: 16, left: 8, bottom: 20 }}>
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
                interval={0}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
                allowDecimals={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip
                formatter={(v: number) => [`${v} 支`, '股票数量']}
                labelFormatter={(label) => `最高涨幅出现区间：${label}`}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: '#e5e7eb',
                  backgroundColor: '#ffffff',
                  fontSize: 12,
                  boxShadow: '0 8px 24px -12px rgba(15,23,42,0.2)',
                }}
                cursor={{ fill: 'rgba(15,23,42,0.04)' }}
              />
              <Bar dataKey="count" fill={COLOR_COUNT} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-2 font-mono text-[10px] uppercase tracking-wider">最高涨幅出现区间</th>
                <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">股票数量</th>
                <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">数量占比</th>
                <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">平均最高涨幅</th>
                <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-wider">平均当前收益</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums text-gray-600">
              {buckets.map((b) => (
                <tr key={b.bucket} className="border-t border-gray-100">
                  <td className="py-1.5 text-navy-900">{b.bucket}</td>
                  <td className="py-1.5 text-right">{b.count}</td>
                  <td className="py-1.5 text-right">{(b.ratio * 100).toFixed(2)}%</td>
                  <td className="py-1.5 text-right" style={{ color: b.avgMaxReturn !== null ? COLOR_POSITIVE : undefined }}>
                    {formatPct(b.avgMaxReturn)}
                  </td>
                  <td className="py-1.5 text-right" style={{ color: COLOR_NEUTRAL }}>
                    {formatPct(b.avgReturn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {insights.length > 0 && (
          <div className="lg:col-span-3">
            <ul className="space-y-1 text-xs leading-relaxed text-gray-500">
              {insights.map((insight, i) => (
                <li key={i}>· {insight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
