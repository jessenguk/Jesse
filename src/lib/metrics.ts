import { RETURN_BUCKETS, type DailyPrice, type IndexDailyPrice, type ReturnBucket, type StockRecord } from './types'

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

// ---------------------------------------------------------------------------
// Section 10: Market context — 推荐时点与大盘环境

export interface MarketContextBatch {
  recommendDate: string
  shortLabel: string
  stockCount: number
  avgStockReturn: number
  marketReturnPct: number | null
  quadrant: '逆风好选' | '逆风差选' | '顺风好选' | '顺风差选' | null
}

export interface MarketContextSummary {
  batches: MarketContextBatch[]
  indexSeries: { date: string; value: number }[]
  recDates: string[]
  latestIndexDate: string | null
}

function roundM(n: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

export type IndexKey = 'shzs' | 'zz500' | 'kcgz'

export function getMarketContextSummary(
  stocks: StockRecord[],
  indexPrices: IndexDailyPrice[],
  indexKey: IndexKey = 'shzs',
): MarketContextSummary {
  if (stocks.length === 0 || indexPrices.length === 0) {
    return { batches: [], indexSeries: [], recDates: [], latestIndexDate: null }
  }

  const validIndex = indexPrices.filter((p) => p[indexKey] !== null)
  const indexByDate = new Map(validIndex.map((p) => [p.date, p[indexKey]!]))
  const latestEntry = validIndex[validIndex.length - 1]
  const latestIndexDate = latestEntry?.date ?? null

  const byDate = new Map<string, StockRecord[]>()
  for (const s of stocks) {
    if (!byDate.has(s.recommendDate)) byDate.set(s.recommendDate, [])
    byDate.get(s.recommendDate)!.push(s)
  }

  const batches: MarketContextBatch[] = []
  for (const [date, batchStocks] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const avgStockReturn = roundM(batchStocks.reduce((sum, s) => sum + s.returnPct, 0) / batchStocks.length, 2)

    let indexOnDate = indexByDate.get(date) ?? null
    if (indexOnDate === null) {
      const next = validIndex.find((p) => p.date >= date)
      indexOnDate = next?.[indexKey] ?? null
    }

    // Use the batch's own settlement date (from Excel) as the index endpoint
    const settlementDate = batchStocks[0]?.settlementDate ?? null
    let indexOnSettlement: number | null = null
    if (settlementDate) {
      indexOnSettlement = indexByDate.get(settlementDate) ?? null
      if (indexOnSettlement === null) {
        // Find nearest trading day on or before settlement date
        const candidates = validIndex.filter((p) => p.date <= settlementDate)
        indexOnSettlement = candidates.length > 0 ? candidates[candidates.length - 1][indexKey] : null
      }
    }

    const marketReturnPct =
      indexOnDate !== null && indexOnSettlement !== null
        ? roundM(((indexOnSettlement - indexOnDate) / indexOnDate) * 100, 2)
        : null

    let quadrant: MarketContextBatch['quadrant'] = null
    if (marketReturnPct !== null) {
      const marketUp = marketReturnPct >= 0
      const stockUp = avgStockReturn >= 0
      quadrant = marketUp ? (stockUp ? '顺风好选' : '顺风差选') : stockUp ? '逆风好选' : '逆风差选'
    }

    batches.push({
      recommendDate: date,
      shortLabel: date.slice(5).replace('-', '/'),
      stockCount: batchStocks.length,
      avgStockReturn,
      marketReturnPct,
      quadrant,
    })
  }

  const earliestRec = batches[0]?.recommendDate ?? ''
  const indexSeries = validIndex
    .filter((p) => p.date >= earliestRec)
    .map((p) => ({ date: p.date, value: p[indexKey]! }))

  return { batches, indexSeries, recDates: batches.map((b) => b.recommendDate), latestIndexDate }
}

export function getMarketContextInsights(summary: MarketContextSummary): string[] {
  const { batches } = summary
  const withMarket = batches.filter((b) => b.marketReturnPct !== null)
  if (withMarket.length === 0) return []

  const insights: string[] = []
  const headwind = withMarket.filter((b) => b.marketReturnPct! < 0)
  const headwindPositive = headwind.filter((b) => b.avgStockReturn > 0)
  const tailwind = withMarket.filter((b) => b.marketReturnPct! >= 0)
  const tailwindPositive = tailwind.filter((b) => b.avgStockReturn > 0)

  if (headwind.length > 0) {
    insights.push(
      `${headwind.length} 个批次面临逆风（推荐后大盘下行），其中 ${headwindPositive.length} 个仍取得正收益——逆风选股成功率 ${((headwindPositive.length / headwind.length) * 100).toFixed(0)}%。`,
    )
  }
  if (tailwind.length > 0) {
    insights.push(
      `${tailwind.length} 个批次顺风（大盘上行），其中 ${tailwindPositive.length} 个个股同步正收益。`,
    )
  }
  const best = [...withMarket].sort((a, b) => b.avgStockReturn - a.avgStockReturn)[0]
  if (best) {
    insights.push(
      `表现最佳批次 ${best.recommendDate}：个股均值 ${formatPct(best.avgStockReturn)}，同期大盘 ${formatPct(best.marketReturnPct)}。`,
    )
  }
  return insights
}

// ---------------------------------------------------------------------------
// Sections 10+: 推荐后固定窗口（T+2 / T+5）大盘环境
// Same four-quadrant framework, but stock & index returns are measured over a
// fixed number of trading days after the recommendation, not to the settlement date.

/** Given a date-sorted series, return the value on/after recDate and `window`
 *  trading days later. Returns null if the window extends past available data. */
function valueAtAndAfter(
  series: { date: string; value: number }[],
  recDate: string,
  window: number,
): { start: number; endDate: string; end: number } | null {
  if (series.length === 0) return null
  const startIdx = series.findIndex((p) => p.date >= recDate)
  if (startIdx === -1) return null
  const endIdx = startIdx + window
  if (endIdx >= series.length) return null
  return { start: series[startIdx].value, endDate: series[endIdx].date, end: series[endIdx].value }
}

export function getTimeWindowContextSummary(
  stocks: StockRecord[],
  dailyPrices: Record<string, DailyPrice[]>,
  indexPrices: IndexDailyPrice[],
  indexKey: IndexKey,
  window: number,
): MarketContextSummary {
  if (stocks.length === 0 || indexPrices.length === 0) {
    return { batches: [], indexSeries: [], recDates: [], latestIndexDate: null }
  }

  const validIndex = indexPrices
    .filter((p) => p[indexKey] !== null)
    .map((p) => ({ date: p.date, value: p[indexKey]! }))
  const latestIndexDate = validIndex.length > 0 ? validIndex[validIndex.length - 1].date : null

  const byDate = new Map<string, StockRecord[]>()
  for (const s of stocks) {
    if (!byDate.has(s.recommendDate)) byDate.set(s.recommendDate, [])
    byDate.get(s.recommendDate)!.push(s)
  }

  const batches: MarketContextBatch[] = []
  for (const [date, batchStocks] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    // Per-stock T+N return (close-to-close, using back-adjusted daily prices)
    const stockReturns: number[] = []
    for (const s of batchStocks) {
      const raw = dailyPrices[s.stockCode]
      if (!raw || raw.length === 0) continue
      const series = raw.map((p) => ({ date: p.date, value: p.close }))
      const r = valueAtAndAfter(series, date, window)
      if (r && r.start !== 0) stockReturns.push(((r.end - r.start) / r.start) * 100)
    }
    const avgStockReturn = stockReturns.length > 0 ? roundM(stockReturns.reduce((a, b) => a + b, 0) / stockReturns.length, 2) : 0

    // Index T+N return over the same window
    const idxR = valueAtAndAfter(validIndex, date, window)
    const marketReturnPct = idxR && idxR.start !== 0 ? roundM(((idxR.end - idxR.start) / idxR.start) * 100, 2) : null

    let quadrant: MarketContextBatch['quadrant'] = null
    if (marketReturnPct !== null) {
      const marketUp = marketReturnPct >= 0
      const stockUp = avgStockReturn >= 0
      quadrant = marketUp ? (stockUp ? '顺风好选' : '顺风差选') : stockUp ? '逆风好选' : '逆风差选'
    }

    batches.push({
      recommendDate: date,
      shortLabel: date.slice(5).replace('-', '/'),
      stockCount: stockReturns.length,
      avgStockReturn,
      marketReturnPct,
      quadrant,
    })
  }

  const earliestRec = batches[0]?.recommendDate ?? ''
  const indexSeries = validIndex.filter((p) => p.date >= earliestRec)

  return { batches, indexSeries, recDates: batches.map((b) => b.recommendDate), latestIndexDate }
}
