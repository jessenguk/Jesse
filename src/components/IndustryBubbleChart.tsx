import {
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import EmptyState from './EmptyState'
import { type BubbleDatum, formatPct, getBubbleData, getIndustrySummary } from '../lib/metrics'
import type { StockRecord } from '../lib/types'

interface IndustryBubbleChartProps {
  stocks: StockRecord[]
  showLabels: boolean
}

interface BubbleTooltipProps {
  active?: boolean
  payload?: { payload: BubbleDatum }[]
}

function BubbleTooltip({ active, payload }: BubbleTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-card">
      <p className="font-semibold text-navy-900">{d.industry}</p>
      <p className="mt-1 font-mono tabular-nums text-gray-500">股票数量：{d.stockCount}</p>
      <p className="font-mono tabular-nums text-gray-500">平均收益：{formatPct(d.avgReturn)}</p>
      <p className="font-mono tabular-nums text-gray-500">中位数收益：{formatPct(d.medianReturn)}</p>
      <p className="font-mono tabular-nums text-gray-500">正收益占比：{d.positiveRatioPct.toFixed(1)}%</p>
      <p className="font-mono tabular-nums text-gray-500">行业弹性：{formatPct(d.elasticity, 2, false)}</p>
    </div>
  )
}

function getElasticityColor(value: number, min: number, max: number): string {
  const ratio = max > min ? (value - min) / (max - min) : 0.5
  const from = { r: 191, g: 219, b: 254 } // light blue
  const to = { r: 30, g: 58, b: 138 } // navy
  const r = Math.round(from.r + (to.r - from.r) * ratio)
  const g = Math.round(from.g + (to.g - from.g) * ratio)
  const b = Math.round(from.b + (to.b - from.b) * ratio)
  return `rgb(${r}, ${g}, ${b})`
}

const MAJOR_INDUSTRY_MIN_STOCKS = 3

export default function IndustryBubbleChart({ stocks, showLabels }: IndustryBubbleChartProps) {
  const industries = getIndustrySummary(stocks)
  if (industries.length === 0) return <EmptyState />

  const bubbles = getBubbleData(industries)
  const elasticities = bubbles.map((b) => b.elasticity)
  const min = Math.min(...elasticities)
  const max = Math.max(...elasticities)
  const majorIndustries = new Set(bubbles.filter((b) => b.stockCount >= MAJOR_INDUSTRY_MIN_STOCKS).map((b) => b.industry))

  const renderIndustryLabel = (props: { x?: number | string; y?: number | string; value?: number | string; index?: number }) => {
    const x = props.x ?? 0
    const y = Number(props.y ?? 0)
    const { value, index } = props
    if (index === undefined) return null
    const b = bubbles[index]
    if (!majorIndustries.has(b.industry)) return null
    return (
      <text x={x} y={y - 10} textAnchor="middle" fontSize={11} fill="#374151">
        {value}
      </text>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 24, right: 32, left: 8, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="avgReturn"
            name="平均区间涨跌幅"
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            label={{ value: '平均区间涨跌幅', position: 'bottom', fontSize: 11, fill: '#9ca3af' }}
          />
          <YAxis
            type="number"
            dataKey="positiveRatioPct"
            name="正收益占比"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            label={{ value: '正收益占比', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9ca3af' }}
          />
          <ZAxis type="number" dataKey="stockCount" range={[80, 500]} name="股票数量" />
          <Tooltip content={<BubbleTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#9ca3af' }} />
          <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={1.5} />
          <ReferenceLine y={50} stroke="#9ca3af" strokeWidth={1.5} />
          <Scatter data={bubbles} fillOpacity={0.85} isAnimationActive={false}>
            {bubbles.map((b, i) => (
              <Cell key={i} fill={getElasticityColor(b.elasticity, min, max)} />
            ))}
            {showLabels && <LabelList dataKey="industry" content={renderIndustryLabel} />}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500 sm:max-w-md">
        <p>左上：低收益、高胜率</p>
        <p>右上：高收益、高胜率</p>
        <p>左下：低收益、低胜率</p>
        <p>右下：高收益、低胜率</p>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2">
          <span>气泡大小：</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
            <span className="inline-block h-3 w-3 rounded-full bg-gray-300" />
            <span className="inline-block h-4 w-4 rounded-full bg-gray-300" />
          </span>
          <span>行业股票数量（越大越多）</span>
        </div>
        <div className="flex items-center gap-2">
          <span>气泡颜色：</span>
          <span className="inline-block h-3 w-24 rounded-full bg-gradient-to-r from-blue-200 to-navy-900" />
          <span>行业弹性（最高收益 − 最低收益），越深表示弹性越大</span>
        </div>
      </div>
      {showLabels && (
        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          仅标注样本数 ≥ {MAJOR_INDUSTRY_MIN_STOCKS} 的主要行业名称，避免标签过密。
        </p>
      )}
    </div>
  )
}
