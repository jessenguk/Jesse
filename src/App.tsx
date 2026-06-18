import { useMemo, useState } from 'react'
import KpiCards from './components/KpiCards'
import CoreInsights from './components/CoreInsights'
import TopBottomChart from './components/TopBottomChart'
import ReturnDistributionChart from './components/ReturnDistributionChart'
import IndustryAverageChart from './components/IndustryAverageChart'
import MaxReturnTimingChart from './components/MaxReturnTimingChart'
import BatchWaterfallChart from './components/BatchWaterfallChart'
import IndustryBubbleChart from './components/IndustryBubbleChart'
import MarketContextChart from './components/MarketContextChart'
import SectionCard from './components/SectionCard'
import { useDashboardData } from './lib/data'
import { getUniqueDates, getUniqueIndustries } from './lib/metrics'

const TOP_N_OPTIONS = [5, 10, 15, 20]
const ALL = '__all__'

export default function App() {
  const dataState = useDashboardData()
  const [industry, setIndustry] = useState(ALL)
  const [recommendDate, setRecommendDate] = useState(ALL)
  const [topN, setTopN] = useState(10)
  const [showBubbleLabels, setShowBubbleLabels] = useState(true)

  const stocks = dataState.status === 'ready' ? dataState.data.stocks : []
  const indexPrices = dataState.status === 'ready' ? dataState.data.indexPrices : []

  const industries = useMemo(() => getUniqueIndustries(stocks), [stocks])
  const dates = useMemo(() => getUniqueDates(stocks), [stocks])

  const filteredStocks = useMemo(
    () =>
      stocks.filter(
        (s) => (industry === ALL || s.industry === industry) && (recommendDate === ALL || s.recommendDate === recommendDate),
      ),
    [stocks, industry, recommendDate],
  )

  const dataNotes: string[] = []
  if (dataState.status === 'ready') {
    dataNotes.push(...dataState.data.meta.warnings)
    if (stocks.some((s) => s.dailyReturnPct === null)) {
      dataNotes.push('部分个股缺少有效的"距推荐日交易天数"，其日均收益率显示为 N/A。')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-navy-900 px-4 py-8 text-white sm:px-8 sm:py-10">
        <div className="mx-auto max-w-page">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-blue-300">Stock Return Analytics</p>
          <h1 className="mt-2 text-2xl font-bold tracking-wide sm:text-3xl">个股收益可视化 Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">
            基于本地 Excel 数据自动生成 · 覆盖 53 支个股的区间涨跌幅、行业表现与推荐批次贡献分析
          </p>
          {dataState.status === 'ready' && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-blue-200">
              <span>
                数据源：{dataState.data.meta.sourceFile}（{dataState.data.meta.sourceSheet}）
              </span>
              <span>生成时间：{new Date(dataState.data.meta.generatedAt).toLocaleString('zh-CN')}</span>
              <span>
                样本数：{dataState.data.meta.totalValidRows} / {dataState.data.meta.totalRawRows}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-page space-y-8 px-4 py-6 sm:px-8">
        {dataState.status === 'loading' && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 shadow-card">
            正在加载数据…
          </div>
        )}

        {dataState.status === 'error' && (
          <div className="rounded-xl border border-red-100 bg-white p-6 shadow-card">
            <h2 className="text-base font-bold text-red-600">数据加载失败</h2>
            <p className="mt-2 text-sm text-gray-600">{dataState.message}</p>
            <p className="mt-2 text-sm text-gray-500">
              请确认已运行 <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">npm run prepare-data</code>{' '}
              生成 <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">public/generated/dashboard-data.json</code>。
            </p>
          </div>
        )}

        {dataState.status === 'ready' && (
          <>
            {dataNotes.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                <p className="mb-1 font-bold">数据提示</p>
                <ul className="list-inside list-disc space-y-0.5">
                  {dataNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            <KpiCards stocks={filteredStocks} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:p-5 lg:col-span-2">
                <div className="flex items-center gap-2.5">
                  <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">行业筛选</label>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-navy-900 transition focus:outline-none focus:ring-2 focus:ring-neutral/30"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value={ALL}>全部行业</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2.5">
                  <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">推荐日期</label>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-navy-900 transition focus:outline-none focus:ring-2 focus:ring-neutral/30"
                    value={recommendDate}
                    onChange={(e) => setRecommendDate(e.target.value)}
                  >
                    <option value={ALL}>全部日期</option>
                    {dates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2.5">
                  <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">排行榜 Top N</label>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-navy-900 transition focus:outline-none focus:ring-2 focus:ring-neutral/30"
                    value={topN}
                    onChange={(e) => setTopN(Number(e.target.value))}
                  >
                    {TOP_N_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        Top {n}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 accent-neutral focus:ring-neutral/30"
                    checked={showBubbleLabels}
                    onChange={(e) => setShowBubbleLabels(e.target.checked)}
                  />
                  显示行业气泡标签
                </label>

                <span className="ml-auto font-mono text-xs tabular-nums text-gray-400">
                  当前筛选 · {filteredStocks.length} 支个股
                </span>
              </section>

              <CoreInsights stocks={filteredStocks} />
            </div>

            <SectionCard index={1} title="个股收益排行（Top / Bottom）" subtitle="按区间涨跌幅排序，红色为正收益，绿色为负收益">
              <TopBottomChart stocks={filteredStocks} topN={topN} />
            </SectionCard>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectionCard index={2} title="收益分布" subtitle="按区间涨跌幅分桶统计个股数量">
                <ReturnDistributionChart stocks={filteredStocks} />
              </SectionCard>

              <SectionCard index={3} title="行业平均收益" subtitle="按平均区间涨跌幅从高到低排序">
                <IndustryAverageChart stocks={filteredStocks} />
              </SectionCard>
            </div>

            <SectionCard index={4} title="推荐后收益机会出现节奏" subtitle="推荐之后，最高涨幅通常在多久之后出现">
              <MaxReturnTimingChart stocks={filteredStocks} />
            </SectionCard>

            <SectionCard index={5} title="推荐批次贡献瀑布图" subtitle="各推荐日期对整体等权平均收益的贡献">
              <BatchWaterfallChart stocks={filteredStocks} />
            </SectionCard>

            <SectionCard index={6} title="行业四维气泡图" subtitle="X：平均收益　Y：正收益占比　气泡大小：股票数量　颜色：行业弹性">
              <IndustryBubbleChart stocks={filteredStocks} showLabels={showBubbleLabels} />
            </SectionCard>

            <SectionCard index={7} title="推荐时点与大盘环境" subtitle="推荐发生时创业板指所处位置，以及各批次在顺风／逆风环境下的表现">
              <MarketContextChart stocks={filteredStocks} indexPrices={indexPrices} />
            </SectionCard>

            <footer className="py-4 text-center font-mono text-[11px] tracking-wide text-gray-400">
              数据均来自本地 Excel 文件，未对图表内容进行任何硬编码
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
