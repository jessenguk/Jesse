/**
 * Reads the stock-return Excel workbook from data/, normalises it into
 * StockRecord[], and writes public/generated/dashboard-data.json for the
 * dashboard to fetch at runtime. Run via `npm run prepare-data`.
 */
import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import { type DashboardData, type StockRecord, getReturnBucket } from '../src/lib/types'

const DATA_DIR = path.join(process.cwd(), 'data')
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'generated', 'dashboard-data.json')

const REQUIRED_FIELDS = ['stockName', 'stockCode', 'recommendDate', 'industry', 'returnPct'] as const

const COLUMN_ALIASES: Record<string, string[]> = {
  stockName: ['个股名称', '股票名称', '名称'],
  stockCode: ['代码', '股票代码', '证券代码'],
  recommendDate: ['个股推荐日期', '推荐日期', '推荐日'],
  industry: ['行业大类', '行业', '行业分类'],
  returnPct: ['区间涨跌幅', '区间收益率', '收益率'],
  maxReturnPct: ['最高涨幅（%）', '最高涨幅(%)', '最高涨幅'],
  trackingDays: ['距推荐日交易天数', '跟踪天数', '交易天数'],
  dailyReturnPct: ['日均收益率'],
}

function findExcelFile(): string {
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`未找到 data/ 目录，请创建 ${DATA_DIR} 并放入 Excel 数据文件。`)
  }
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'))
  if (files.length === 0) {
    throw new Error(`未在 data/ 目录中找到 .xlsx 文件，请将 Excel 数据文件放入 ${DATA_DIR}`)
  }
  files.sort((a, b) => fs.statSync(path.join(DATA_DIR, b)).mtimeMs - fs.statSync(path.join(DATA_DIR, a)).mtimeMs)
  return files[0]
}

function selectSheet(workbook: XLSX.WorkBook): { sheetName: string; rows: unknown[][] } {
  const readRows = (name: string): unknown[][] =>
    XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: true, defval: null })

  for (const name of ['Data_Master', 'Clean_Data']) {
    if (workbook.SheetNames.includes(name)) {
      const rows = readRows(name)
      if (rows.length > 1) return { sheetName: name, rows }
    }
  }

  let best: { sheetName: string; rows: unknown[][] } | null = null
  for (const name of workbook.SheetNames) {
    const rows = readRows(name)
    if (rows.length < 2) continue
    const header = (rows[0] ?? []).map((h) => String(h ?? '').trim())
    const hasName = COLUMN_ALIASES.stockName.some((a) => header.includes(a))
    const hasReturn = COLUMN_ALIASES.returnPct.some((a) => header.includes(a))
    if (hasName && hasReturn && (!best || rows.length > best.rows.length)) {
      best = { sheetName: name, rows }
    }
  }
  if (!best) {
    throw new Error('未找到包含"个股名称"和"区间涨跌幅"列的数据表，请检查 Excel 文件结构。')
  }
  return best
}

function buildColumnMap(header: string[]): { map: Record<string, number>; used: Record<string, string | null> } {
  const trimmed = header.map((h) => String(h ?? '').trim())
  const map: Record<string, number> = {}
  const used: Record<string, string | null> = {}
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = aliases.map((a) => trimmed.indexOf(a)).find((i) => i !== -1)
    if (idx !== undefined && idx !== -1) {
      map[field] = idx
      used[field] = trimmed[idx]
    } else {
      used[field] = null
    }
  }
  return { map, used }
}

/** Numbers are treated as decimal fractions (0.1099 -> 10.99); strings with "%" are read as-is. */
function parsePercent(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isNaN(raw) ? null : raw * 100
  const str = String(raw).trim()
  if (str === '') return null
  const hasPercentSign = str.includes('%')
  const num = parseFloat(str.replace(/%/g, '').replace(/,/g, ''))
  if (Number.isNaN(num)) return null
  return hasPercentSign ? num : num * 100
}

function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isNaN(raw) ? null : raw
  const str = String(raw).trim()
  if (str === '') return null
  const num = parseFloat(str.replace(/,/g, ''))
  return Number.isNaN(num) ? null : num
}

function formatDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (raw instanceof Date) {
    const y = raw.getUTCFullYear()
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0')
    const d = String(raw.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof raw === 'number') {
    // Excel date serial number -> calendar date (epoch = 1899-12-30, UTC, no DST issues).
    const date = new Date(Date.UTC(1899, 11, 30) + raw * 86400000)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const str = String(raw).trim()
  if (/^\d{8}$/.test(str)) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  return str
}

function normalizeCode(raw: unknown): string {
  let str = String(raw ?? '').trim()
  if (/^\d+$/.test(str) && str.length < 6) str = str.padStart(6, '0')
  return str
}

function round(n: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

function main() {
  const warnings: string[] = []
  const fileName = findExcelFile()
  const filePath = path.join(DATA_DIR, fileName)
  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const { sheetName, rows } = selectSheet(workbook)

  const header = (rows[0] ?? []).map((h) => String(h ?? '').trim())
  const dataRows = rows.slice(1)
  const { map, used } = buildColumnMap(header)

  for (const [field, colName] of Object.entries(used)) {
    if (colName !== null) continue
    if ((REQUIRED_FIELDS as readonly string[]).includes(field)) {
      warnings.push(`未找到必需列「${field}」（候选列名：${COLUMN_ALIASES[field].join('、')}），相关行将被忽略。`)
    } else {
      warnings.push(`未找到可选列「${field}」（候选列名：${COLUMN_ALIASES[field].join('、')}），该字段将显示为 N/A。`)
    }
  }

  const totalRawRows = dataRows.length
  let skippedEmpty = 0
  let skippedMissingRequired = 0
  const stocks: StockRecord[] = []

  for (const row of dataRows) {
    if (row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')) {
      skippedEmpty++
      continue
    }

    const get = (field: string): unknown => (map[field] !== undefined ? row[map[field]] : undefined)

    const stockName = String(get('stockName') ?? '').trim()
    const stockCode = normalizeCode(get('stockCode'))
    const recommendDate = formatDate(get('recommendDate'))
    const industry = String(get('industry') ?? '').trim()
    const returnPct = parsePercent(get('returnPct'))

    if (!stockName || !stockCode || !recommendDate || !industry || returnPct === null) {
      skippedMissingRequired++
      continue
    }

    const maxReturnPct = parsePercent(get('maxReturnPct'))
    const trackingDaysRaw = parseNumber(get('trackingDays'))
    const trackingDays = trackingDaysRaw !== null && trackingDaysRaw > 0 ? Math.round(trackingDaysRaw) : null

    let dailyReturnPct = parsePercent(get('dailyReturnPct'))
    if (dailyReturnPct === null && trackingDays !== null) {
      dailyReturnPct = returnPct / trackingDays
    }

    stocks.push({
      stockName,
      stockCode,
      recommendDate,
      industry,
      returnPct: round(returnPct, 2),
      maxReturnPct: maxReturnPct !== null ? round(maxReturnPct, 2) : null,
      trackingDays,
      dailyReturnPct: dailyReturnPct !== null ? round(dailyReturnPct, 4) : null,
      isPositive: returnPct > 0,
      returnBucket: getReturnBucket(returnPct),
    })
  }

  if (skippedEmpty > 0) warnings.push(`忽略了 ${skippedEmpty} 行完全空白的数据行。`)
  if (skippedMissingRequired > 0) {
    warnings.push(`忽略了 ${skippedMissingRequired} 行缺少必需字段（股票名称/代码/推荐日期/行业/区间涨跌幅）的数据行。`)
  }
  const noTrackingDays = stocks.filter((s) => s.dailyReturnPct === null).length
  if (noTrackingDays > 0) {
    warnings.push(`${noTrackingDays} 支个股缺少有效的"距推荐日交易天数"，日均收益率显示为 N/A。`)
  }

  const output: DashboardData = {
    meta: {
      sourceFile: fileName,
      sourceSheet: sheetName,
      generatedAt: new Date().toISOString(),
      totalRawRows,
      totalValidRows: stocks.length,
      columnsUsed: used,
      warnings,
    },
    stocks,
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8')

  console.log(`数据源文件: ${fileName}`)
  console.log(`使用数据表: ${sheetName}`)
  console.log(`原始数据行: ${totalRawRows}, 有效个股记录: ${stocks.length}`)
  if (warnings.length > 0) {
    console.log('警告:')
    warnings.forEach((w) => console.log(`  - ${w}`))
  }
  console.log(`已生成: ${path.relative(process.cwd(), OUTPUT_PATH)}`)
}

main()
