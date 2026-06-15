export const RETURN_BUCKETS = [
  '<-30%',
  '-30~-20%',
  '-20~-10%',
  '-10~0%',
  '0~10%',
  '10~20%',
  '20~50%',
  '>50%',
] as const

export type ReturnBucket = (typeof RETURN_BUCKETS)[number]

/** Returns are stored as percentage numbers, e.g. 10.99 means +10.99%. */
export interface StockRecord {
  stockName: string
  stockCode: string
  recommendDate: string
  industry: string
  returnPct: number
  maxReturnPct: number | null
  trackingDays: number | null
  dailyReturnPct: number | null
  isPositive: boolean
  returnBucket: ReturnBucket
}

export interface DashboardMeta {
  sourceFile: string
  sourceSheet: string
  generatedAt: string
  totalRawRows: number
  totalValidRows: number
  columnsUsed: Record<string, string | null>
  warnings: string[]
}

export interface DashboardData {
  meta: DashboardMeta
  stocks: StockRecord[]
}

export function getReturnBucket(returnPct: number): ReturnBucket {
  if (returnPct < -30) return '<-30%'
  if (returnPct < -20) return '-30~-20%'
  if (returnPct < -10) return '-20~-10%'
  if (returnPct < 0) return '-10~0%'
  if (returnPct < 10) return '0~10%'
  if (returnPct < 20) return '10~20%'
  if (returnPct < 50) return '20~50%'
  return '>50%'
}
