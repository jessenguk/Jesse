import { getCoreInsights } from '../lib/metrics'
import type { StockRecord } from '../lib/types'

interface CoreInsightsProps {
  stocks: StockRecord[]
}

export default function CoreInsights({ stocks }: CoreInsightsProps) {
  const insights = getCoreInsights(stocks)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:p-5">
      <h2 className="text-sm font-bold text-navy-900">核心发现</h2>
      {insights.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">当前筛选条件下没有数据。</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {insights.map((text, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-gray-600">
              <span className="mt-0.5 font-mono text-[10px] text-neutral">{String(i + 1).padStart(2, '0')}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
