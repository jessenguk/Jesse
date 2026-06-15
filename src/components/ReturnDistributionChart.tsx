import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import EmptyState from './EmptyState'
import { COLOR_NEGATIVE, COLOR_POSITIVE, formatPct, getDistribution, getDistributionShape } from '../lib/metrics'
import type { StockRecord } from '../lib/types'

interface ReturnDistributionChartProps {
  stocks: StockRecord[]
}

const TAIL_BUCKETS = new Set(['<-30%', '>50%'])

export default function ReturnDistributionChart({ stocks }: ReturnDistributionChartProps) {
  const dist = getDistribution(stocks)

  if (dist.totalCount === 0) return <EmptyState />

  const shape = getDistributionShape(dist)
  const shapeNote =
    shape.tailShare > 0.45
      ? '右尾特征明显：正收益中有相当一部分来自少数涨幅较大的个股，整体表现受“大赢家”拉动较明显。'
      : shape.tailShare > 0.25
        ? '右尾特征轻微：正收益中有一部分来自涨幅较大的个股，但并非主导因素。'
        : '正收益个股在各区间分布较为均衡，整体呈广基特征，并非由少数极端值主导。'
  const avgVsMedian =
    Math.abs(dist.avgReturn - dist.medianReturn) < 0.5
      ? '平均收益与中位数接近'
      : dist.avgReturn > dist.medianReturn
        ? '平均收益高于中位数'
        : '平均收益低于中位数'

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dist.buckets} margin={{ top: 24, right: 16, left: 8, bottom: 20 }}>
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
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
            labelFormatter={(label) => `区间：${label}`}
            contentStyle={{
              borderRadius: 8,
              borderColor: '#e5e7eb',
              backgroundColor: '#ffffff',
              fontSize: 12,
              boxShadow: '0 8px 24px -12px rgba(15,23,42,0.2)',
            }}
            cursor={{ fill: 'rgba(15,23,42,0.04)' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
            {dist.buckets.map((b, i) => (
              <Cell
                key={i}
                fill={b.isPositive ? COLOR_POSITIVE : COLOR_NEGATIVE}
                stroke={TAIL_BUCKETS.has(b.bucket) ? (b.isPositive ? COLOR_POSITIVE : COLOR_NEGATIVE) : 'none'}
                strokeWidth={TAIL_BUCKETS.has(b.bucket) ? 2 : 0}
                strokeOpacity={0.35}
              />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        正收益个股 {dist.positiveCount} / {dist.totalCount} 支，占比 {formatPct(dist.positiveRatio * 100, 1, false)}；平均收益{' '}
        {formatPct(dist.avgReturn)}，中位数收益 {formatPct(dist.medianReturn)}，{avgVsMedian}。{shapeNote}
      </p>
    </div>
  )
}
