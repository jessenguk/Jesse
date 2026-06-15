import {
  COLOR_NEGATIVE,
  COLOR_NEUTRAL,
  COLOR_POSITIVE,
  formatPct,
  getDistribution,
  getDistributionShape,
  getKpiSummary,
} from '../lib/metrics'
import type { StockRecord } from '../lib/types'

interface KpiCardsProps {
  stocks: StockRecord[]
}

interface KpiCardDef {
  label: string
  value: string
  detail?: string
  color: string
  badge?: string
}

export default function KpiCards({ stocks }: KpiCardsProps) {
  const kpi = getKpiSummary(stocks)
  const shape = getDistributionShape(getDistribution(stocks))

  const cards: KpiCardDef[] = [
    {
      label: '平均区间涨跌幅',
      value: formatPct(kpi.totalStocks > 0 ? kpi.avgReturn : null),
      detail: '等权平均收益',
      color: kpi.avgReturn >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
      badge: kpi.totalStocks > 0 ? shape.label : undefined,
    },
    {
      label: '中位数区间涨跌幅',
      value: formatPct(kpi.totalStocks > 0 ? kpi.medianReturn : null),
      detail: '中位表现',
      color: kpi.medianReturn >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
    },
    {
      label: '正收益占比',
      value: kpi.totalStocks > 0 ? `${(kpi.positiveRatio * 100).toFixed(1)}%` : 'N/A',
      detail: `${kpi.positiveCount} / ${kpi.totalStocks} 支个股为正收益`,
      color: COLOR_NEUTRAL,
    },
    {
      label: '股票总数',
      value: `${kpi.totalStocks}`,
      detail: '当前筛选范围内的个股数量',
      color: COLOR_NEUTRAL,
    },
    {
      label: '最佳个股',
      value: kpi.bestStock ? kpi.bestStock.stockName : 'N/A',
      detail: kpi.bestStock ? `${formatPct(kpi.bestStock.returnPct)} · ${kpi.bestStock.industry}` : '',
      color: COLOR_POSITIVE,
    },
    {
      label: '最弱个股',
      value: kpi.worstStock ? kpi.worstStock.stockName : 'N/A',
      detail: kpi.worstStock ? `${formatPct(kpi.worstStock.returnPct)} · ${kpi.worstStock.industry}` : '',
      color: COLOR_NEGATIVE,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 shadow-card sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card, i) => (
        <div key={card.label} className="animate-fade-up bg-white p-4 sm:p-5" style={{ animationDelay: `${i * 40}ms` }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">{card.label}</p>
          <p className="mt-2 truncate font-mono text-xl font-semibold tabular-nums sm:text-2xl" style={{ color: card.color }} title={card.value}>
            {card.value}
          </p>
          {card.detail && (
            <p className="mt-1.5 truncate text-[11px] text-gray-400" title={card.detail}>
              {card.detail}
            </p>
          )}
          {card.badge && (
            <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {card.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
