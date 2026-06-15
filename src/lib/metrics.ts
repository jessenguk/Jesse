import { RETURN_BUCKETS, type ReturnBucket, type StockRecord } from './types'

export const COLOR_POSITIVE = '#dc2626' // red — positive return
export const COLOR_NEGATIVE = '#16a34a' // green — negative return
export const COLOR_NEUTRAL = '#2563eb' // blue — summary / neutral

export function getReturnColor(value: number): string {
  return value >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE
}

export function formatPct(value: number | null | undefined, decimals = 2, signed = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  const sign = signed && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// ---------------------------------------------------------------------------
// Filter option helpers (call on the full, unfiltered stock list)
// ---------------------------------------------------------------------------

export function getUniqueIndustries(stocks: StockRecord[]): string[] {
  return Array.from(new Set(stocks.map((s) => s.industry))).sort()
}

export function getUniqueDates(stocks: StockRecord[]): string[] {
  return Array.from(new Set(stocks.map((s) => s.recommendDate))).sort()
}

// ---------------------------------------------------------------------------
// 1. KPI summary
// ---------------------------------------------------------------------------

export interface KpiSummary {
  totalStocks: number
  avgReturn: number
  medianReturn: number
  positiveCount: number
  positiveRatio: number
  bestStock: StockRecord | null
  worstStock: StockRecord | null
}

export function getKpiSummary(stocks: StockRecord[]): KpiSummary {
  if (stocks.length === 0) {
    return {
      totalStocks: 0,
      avgReturn: 0,
      medianReturn: 0,
      positiveCount: 0,
      positiveRatio: 0,
      bestStock: null,
      worstStock: null,
    }
  }
  const returns = stocks.map((s) => s.returnPct)
  const positiveCount = stocks.filter((s) => s.isPositive).length
  const sorted = [...stocks].sort((a, b) => b.returnPct - a.returnPct)
  return {
    totalStocks: stocks.length,
    avgReturn: average(returns),
    medianReturn: median(returns),
    positiveCount,
    positiveRatio: positiveCount / stocks.length,
    bestStock: sorted[0],
    worstStock: sorted[sorted.length - 1],
  }
}

// ---------------------------------------------------------------------------
// 2. Top / Bottom ranking
// ---------------------------------------------------------------------------

export interface RankedStock extends StockRecord {
  rank: number
}

export function getTopBottom(stocks: StockRecord[], n: number): { top: RankedStock[]; bottom: RankedStock[] } {
  const sorted = [...stocks].sort((a, b) => b.returnPct - a.returnPct)
  const top = sorted.slice(0, n).map((s, i) => ({ ...s, rank: i + 1 }))
  const bottom = sorted
    .slice(-n)
    .sort((a, b) => a.returnPct - b.returnPct)
    .map((s, i) => ({ ...s, rank: i + 1 }))
  return { top, bottom }
}

// ---------------------------------------------------------------------------
// 3. Return distribution
// ---------------------------------------------------------------------------

export interface DistributionBucket {
  bucket: ReturnBucket
  count: number
  isPositive: boolean
}

export interface DistributionSummary {
  buckets: DistributionBucket[]
  totalCount: number
  positiveCount: number
  positiveRatio: number
  avgReturn: number
  medianReturn: number
}

export function getDistribution(stocks: StockRecord[]): DistributionSummary {
  const counts = new Map<ReturnBucket, number>(RETURN_BUCKETS.map((b) => [b, 0]))
  stocks.forEach((s) => counts.set(s.returnBucket, (counts.get(s.returnBucket) ?? 0) + 1))

  const negativeBucketCount = 4 // first 4 buckets in RETURN_BUCKETS are negative
  const buckets: DistributionBucket[] = RETURN_BUCKETS.map((bucket, i) => ({
    bucket,
    count: counts.get(bucket) ?? 0,
    isPositive: i >= negativeBucketCount,
  }))

  const returns = stocks.map((s) => s.returnPct)
  const positiveCount = stocks.filter((s) => s.isPositive).length

  return {
    buckets,
    totalCount: stocks.length,
    positiveCount,
    positiveRatio: stocks.length > 0 ? positiveCount / stocks.length : 0,
    avgReturn: average(returns),
    medianReturn: median(returns),
  }
}

// ---------------------------------------------------------------------------
// 4. Industry summary
// ---------------------------------------------------------------------------

export interface IndustrySummary {
  industry: string
  stockCount: number
  avgReturn: number
  medianReturn: number
  positiveCount: number
  positiveRatio: number
  maxReturn: number
  minReturn: number
  elasticity: number
}

export function getIndustrySummary(stocks: StockRecord[]): IndustrySummary[] {
  const groups = new Map<string, StockRecord[]>()
  stocks.forEach((s) => {
    const arr = groups.get(s.industry) ?? []
    arr.push(s)
    groups.set(s.industry, arr)
  })

  return Array.from(groups.entries()).map(([industry, group]) => {
    const returns = group.map((s) => s.returnPct)
    const positiveCount = group.filter((s) => s.isPositive).length
    const maxReturn = Math.max(...returns)
    const minReturn = Math.min(...returns)
    return {
      industry,
      stockCount: group.length,
      avgReturn: average(returns),
      medianReturn: median(returns),
      positiveCount,
      positiveRatio: positiveCount / group.length,
      maxReturn,
      minReturn,
      elasticity: maxReturn - minReturn,
    }
  })
}

// ---------------------------------------------------------------------------
// 5. Batch (recommendation date) summary + waterfall contribution
// ---------------------------------------------------------------------------

export interface BatchSummary {
  recommendDate: string
  stockCount: number
  avgReturn: number
  positiveCount: number
  positiveRatio: number
  contribution: number
  cumulativeContribution: number
}

export function getBatchSummary(stocks: StockRecord[]): BatchSummary[] {
  const totalCount = stocks.length
  const groups = new Map<string, StockRecord[]>()
  stocks.forEach((s) => {
    const arr = groups.get(s.recommendDate) ?? []
    arr.push(s)
    groups.set(s.recommendDate, arr)
  })

  const sortedDates = Array.from(groups.keys()).sort()
  let cumulative = 0
  return sortedDates.map((date) => {
    const group = groups.get(date) ?? []
    const returns = group.map((s) => s.returnPct)
    const avgReturn = average(returns)
    const positiveCount = group.filter((s) => s.isPositive).length
    const contribution = totalCount > 0 ? (group.length / totalCount) * avgReturn : 0
    cumulative += contribution
    return {
      recommendDate: date,
      stockCount: group.length,
      avgReturn,
      positiveCount,
      positiveRatio: group.length > 0 ? positiveCount / group.length : 0,
      contribution,
      cumulativeContribution: cumulative,
    }
  })
}

// ---------------------------------------------------------------------------
// 6. Industry bubble chart data
// ---------------------------------------------------------------------------

export interface BubbleDatum {
  industry: string
  avgReturn: number
  medianReturn: number
  positiveRatioPct: number
  stockCount: number
  elasticity: number
}

export function getBubbleData(industries: IndustrySummary[]): BubbleDatum[] {
  return industries.map((ind) => ({
    industry: ind.industry,
    avgReturn: ind.avgReturn,
    medianReturn: ind.medianReturn,
    positiveRatioPct: ind.positiveRatio * 100,
    stockCount: ind.stockCount,
    elasticity: ind.elasticity,
  }))
}

// ---------------------------------------------------------------------------
// 7. Distribution shape + core findings (derived insights, no new raw metrics)
// ---------------------------------------------------------------------------

export interface DistributionShape {
  label: string
  tailShare: number
}

export function getDistributionShape(dist: DistributionSummary): DistributionShape {
  const tailCount = dist.buckets
    .filter((b) => b.bucket === '20~50%' || b.bucket === '>50%')
    .reduce((sum, b) => sum + b.count, 0)
  const tailShare = dist.positiveCount > 0 ? tailCount / dist.positiveCount : 0

  let label: string
  if (dist.totalCount === 0) label = '收益结构：暂无数据'
  else if (tailShare > 0.45) label = '收益结构：明显右尾'
  else if (tailShare > 0.25) label = '收益结构：轻微右尾'
  else label = '收益结构：分布均衡'

  return { label, tailShare }
}

/** Returns 2-3 short, auto-derived findings for the "核心发现" card. */
export function getCoreInsights(stocks: StockRecord[]): string[] {
  if (stocks.length === 0) return []

  const kpi = getKpiSummary(stocks)
  const industries = getIndustrySummary(stocks)
  const insights: string[] = []

  const diff = kpi.avgReturn - kpi.medianReturn
  if (Math.abs(diff) < 0.5) {
    insights.push(
      `平均收益（${formatPct(kpi.avgReturn)}）与中位数收益（${formatPct(kpi.medianReturn)}）接近，整体表现较为均衡。`,
    )
  } else if (diff > 0) {
    insights.push(
      `平均收益（${formatPct(kpi.avgReturn)}）高于中位数（${formatPct(kpi.medianReturn)}），少数高收益个股拉高了整体水平。`,
    )
  } else {
    insights.push(
      `平均收益（${formatPct(kpi.avgReturn)}）低于中位数（${formatPct(kpi.medianReturn)}），少数大幅亏损个股拉低了整体水平。`,
    )
  }

  if (industries.length > 0) {
    const sorted = [...industries].sort((a, b) => b.avgReturn - a.avgReturn)
    const strongest = sorted[0]
    const weakest = sorted[sorted.length - 1]
    if (strongest.industry === weakest.industry) {
      insights.push(`行业「${strongest.industry}」平均收益 ${formatPct(strongest.avgReturn)}（n=${strongest.stockCount}）。`)
    } else {
      insights.push(
        `行业表现分化：「${strongest.industry}」最强（${formatPct(strongest.avgReturn)}，n=${strongest.stockCount}），「${weakest.industry}」最弱（${formatPct(weakest.avgReturn)}，n=${weakest.stockCount}）。`,
      )
    }
  }

  const ratioPct = kpi.positiveRatio * 100
  insights.push(
    ratioPct >= 50
      ? `正收益占比 ${ratioPct.toFixed(1)}%，超过半数个股录得正收益。`
      : `正收益占比 ${ratioPct.toFixed(1)}%，未达半数，整体呈现分化格局。`,
  )

  return insights
}
