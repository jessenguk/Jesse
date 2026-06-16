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

// ---------------------------------------------------------------------------
// 8. Max-return timing (推荐后收益机会出现节奏)
// ---------------------------------------------------------------------------

export const MAX_RETURN_TIMING_BUCKETS = ['1日内', '2-5日', '6-10日', '11-20日', '21-40日', '40日以上', '待核对'] as const

export type MaxReturnTimingBucket = (typeof MAX_RETURN_TIMING_BUCKETS)[number]

/** Uses 距推荐日交易天数 (trackingDays) as a proxy for "最高涨幅等待天数". */
export function getMaxReturnTimingBucket(stock: StockRecord): MaxReturnTimingBucket {
  if (stock.trackingDays === null || stock.maxReturnPct === null) return '待核对'
  const d = stock.trackingDays
  if (d <= 1) return '1日内'
  if (d <= 5) return '2-5日'
  if (d <= 10) return '6-10日'
  if (d <= 20) return '11-20日'
  if (d <= 40) return '21-40日'
  return '40日以上'
}

export interface MaxReturnTimingBucketSummary {
  bucket: MaxReturnTimingBucket
  count: number
  ratio: number
  avgMaxReturn: number | null
  avgReturn: number | null
}

export interface MaxReturnTimingSummary {
  buckets: MaxReturnTimingBucketSummary[]
  totalCount: number
  pendingCount: number
}

export function getMaxReturnTimingSummary(stocks: StockRecord[]): MaxReturnTimingSummary {
  const groups = new Map<MaxReturnTimingBucket, StockRecord[]>(MAX_RETURN_TIMING_BUCKETS.map((b) => [b, []]))
  stocks.forEach((s) => groups.get(getMaxReturnTimingBucket(s))!.push(s))

  const totalCount = stocks.length
  const buckets = MAX_RETURN_TIMING_BUCKETS.map((bucket) => {
    const group = groups.get(bucket) ?? []
    const maxReturns = group.map((s) => s.maxReturnPct).filter((v): v is number => v !== null)
    const returns = group.map((s) => s.returnPct)
    return {
      bucket,
      count: group.length,
      ratio: totalCount > 0 ? group.length / totalCount : 0,
      avgMaxReturn: maxReturns.length > 0 ? average(maxReturns) : null,
      avgReturn: group.length > 0 ? average(returns) : null,
    }
  })

  return {
    buckets,
    totalCount,
    pendingCount: groups.get('待核对')?.length ?? 0,
  }
}

const SHORT_TERM_BUCKETS = new Set<MaxReturnTimingBucket>(['1日内', '2-5日'])
const SMALL_SAMPLE_THRESHOLD = 3

function formatRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`
}

/** A short headline summarising where return opportunities mainly land, for use near the section title. */
export function getMaxReturnTimingHeadline(summary: MaxReturnTimingSummary): string | null {
  const ranked = summary.buckets.filter((b) => b.bucket !== '待核对')
  const validCount = ranked.reduce((sum, b) => sum + b.count, 0)
  if (validCount === 0) return null

  const top = [...ranked].sort((a, b) => b.count - a.count)[0]

  if (SHORT_TERM_BUCKETS.has(top.bucket)) {
    return '推荐后的收益机会主要集中在极短期；复盘推荐效果时，推荐后几天的表现已具有较强代表性。'
  }
  return `推荐后的收益机会并不主要集中在极短期，而更多出现在「${top.bucket}」窗口；因此复盘推荐效果时，不能只看推荐后几天的表现。`
}

/** Returns 2-3 short, auto-derived findings about max-return timing. */
export function getMaxReturnTimingInsights(summary: MaxReturnTimingSummary): string[] {
  const ranked = summary.buckets.filter((b) => b.bucket !== '待核对')
  const validCount = ranked.reduce((sum, b) => sum + b.count, 0)
  if (validCount === 0) return []

  const insights: string[] = []

  // 1. Dominant window
  const top = [...ranked].sort((a, b) => b.count - a.count)[0]
  let topNote: string
  if (SHORT_TERM_BUCKETS.has(top.bucket)) {
    topNote = '说明多数机会在推荐后短期内即可兑现。'
  } else if (top.bucket === '6-10日' || top.bucket === '11-20日') {
    topNote = '说明多数机会在推荐后 1-4 周内逐步出现，并非立即兑现。'
  } else if (top.bucket === '21-40日') {
    topNote = '说明多数机会不是推荐后立即兑现，而是在约 1-2 个月内逐步出现。'
  } else {
    topNote = '说明多数机会需要较长时间才会逐步出现。'
  }
  insights.push(`最高涨幅出现最集中的窗口是「${top.bucket}」，占 ${formatRatio(top.ratio)}（${top.count} 支个股），${topNote}`)

  // 2. Short-term (within 5 trading days) share
  const shortTermCount = ranked.filter((b) => SHORT_TERM_BUCKETS.has(b.bucket)).reduce((sum, b) => sum + b.count, 0)
  const shortRatio = shortTermCount / validCount
  if (shortRatio > 0.5) {
    insights.push(
      `推荐后 5 个交易日内出现最高涨幅的个股占 ${formatRatio(shortRatio)}，短期机会是主导；复盘时可优先关注推荐后的短线表现。`,
    )
  } else if (shortRatio > 0) {
    insights.push(
      `推荐后 5 个交易日内出现最高涨幅的个股占 ${formatRatio(shortRatio)}，短期机会存在，但不是主导；复盘时应同时关注短线弹性和中期跟踪。`,
    )
  } else {
    insights.push(`推荐后 5 个交易日内极少出现最高涨幅（占 ${formatRatio(shortRatio)}），复盘时应以中期跟踪为主。`)
  }

  // 3. Notably high-return bucket — flag as case evidence if sample is small
  const withMaxReturn = ranked.filter((b) => b.avgMaxReturn !== null && b.count > 0)
  if (withMaxReturn.length > 1) {
    const avgOfAvgs = average(withMaxReturn.map((b) => b.avgMaxReturn ?? 0))
    const best = [...withMaxReturn].sort((a, b) => (b.avgMaxReturn ?? 0) - (a.avgMaxReturn ?? 0))[0]
    if ((best.avgMaxReturn ?? 0) > avgOfAvgs * 1.2) {
      if (best.count <= SMALL_SAMPLE_THRESHOLD) {
        insights.push(
          `「${best.bucket}」样本仅 ${best.count} 支，平均最高涨幅较高（${formatPct(best.avgMaxReturn)}），更适合作为个案线索，不宜直接推断为稳定规律。`,
        )
      } else {
        insights.push(
          `「${best.bucket}」区间的平均最高涨幅（${formatPct(best.avgMaxReturn)}）明显高于其他区间，是潜在的高弹性窗口。`,
        )
      }
    }
  }

  if (summary.pendingCount > 0) {
    insights.push(`另有 ${summary.pendingCount} 支个股缺少跟踪天数或最高涨幅数据，标记为「待核对」，未纳入上述结论。`)
  }

  return insights
}

// ---------------------------------------------------------------------------
// 9. Batch comparison: current return vs max-return opportunity
// ---------------------------------------------------------------------------

export interface BatchComparisonBatch {
  recommendDate: string
  shortLabel: string
  stockCount: number
  avgReturn: number
  avgMaxReturn: number | null
  currentContribution: number
  maxContribution: number | null
  retainmentRate: number | null
}

export interface BatchComparisonKpis {
  overallAvgReturn: number
  overallAvgMaxReturn: number | null
  overallRetainmentRate: number | null
}

export interface BatchComparisonSummary {
  batches: BatchComparisonBatch[]
  totalCount: number
  kpis: BatchComparisonKpis
}

export function getBatchComparisonSummary(stocks: StockRecord[]): BatchComparisonSummary {
  const empty: BatchComparisonSummary = {
    batches: [],
    totalCount: 0,
    kpis: { overallAvgReturn: 0, overallAvgMaxReturn: null, overallRetainmentRate: null },
  }
  if (stocks.length === 0) return empty

  const totalCount = stocks.length
  const groups = new Map<string, StockRecord[]>()
  stocks.forEach((s) => {
    const arr = groups.get(s.recommendDate) ?? []
    arr.push(s)
    groups.set(s.recommendDate, arr)
  })

  const batches: BatchComparisonBatch[] = Array.from(groups.keys())
    .sort()
    .map((date) => {
      const group = groups.get(date) ?? []
      const avgReturn = average(group.map((s) => s.returnPct))
      const validMax = group.map((s) => s.maxReturnPct).filter((v): v is number => v !== null)
      const avgMaxReturn = validMax.length > 0 ? average(validMax) : null
      const currentContribution = (group.length / totalCount) * avgReturn
      const maxContribution = avgMaxReturn !== null ? (group.length / totalCount) * avgMaxReturn : null
      const retainmentRate =
        maxContribution !== null && maxContribution > 0 ? currentContribution / maxContribution : null
      const parts = date.split('-')
      return {
        recommendDate: date,
        shortLabel: parts.length === 3 ? `${parts[1]}/${parts[2]}` : date,
        stockCount: group.length,
        avgReturn,
        avgMaxReturn,
        currentContribution,
        maxContribution,
        retainmentRate,
      }
    })

  const overallAvgReturn = average(stocks.map((s) => s.returnPct))
  const stocksWithMax = stocks.filter((s) => s.maxReturnPct !== null)
  const overallAvgMaxReturn =
    stocksWithMax.length > 0 ? average(stocksWithMax.map((s) => s.maxReturnPct as number)) : null
  const overallRetainmentRate =
    overallAvgMaxReturn !== null && overallAvgMaxReturn > 0 ? overallAvgReturn / overallAvgMaxReturn : null

  return { batches, totalCount, kpis: { overallAvgReturn, overallAvgMaxReturn, overallRetainmentRate } }
}

export function getBatchComparisonInsights(summary: BatchComparisonSummary): string[] {
  const insights: string[] = []
  insights.push('当前收益图衡量截至统计日实际留存的收益，最高涨幅图衡量推荐后曾出现过的收益机会。')

  const batchesWithMax = summary.batches.filter((b) => b.maxContribution !== null)
  if (batchesWithMax.length === 0) return insights

  const byGap = [...batchesWithMax].sort(
    (a, b) => (b.maxContribution ?? 0) - b.currentContribution - ((a.maxContribution ?? 0) - a.currentContribution),
  )
  const topGap = byGap[0]
  const gap = (topGap.maxContribution ?? 0) - topGap.currentContribution
  if (gap > 0.5) {
    insights.push(
      `批次「${topGap.recommendDate}」最高涨幅机会贡献（${formatPct(topGap.maxContribution)}）高于当前收益贡献（${formatPct(topGap.currentContribution)}），存在收益回吐，建议复盘跟踪和兑现节奏。`,
    )
  } else {
    insights.push('各批次当前收益贡献与最高涨幅机会贡献差距较小，整体收益留存情况较好。')
  }

  const avgCurrent = average(summary.batches.map((b) => b.currentContribution))
  const avgMax = average(batchesWithMax.map((b) => b.maxContribution ?? 0))
  const strongBatches = batchesWithMax.filter(
    (b) => b.currentContribution > avgCurrent && (b.maxContribution ?? 0) > avgMax,
  )
  if (strongBatches.length > 0) {
    const dates = strongBatches.map((b) => b.recommendDate).join('、')
    insights.push(`批次「${dates}」在两个口径下均表现较强，既捕捉到了机会，也较好地保留了收益。`)
  }

  return insights
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
