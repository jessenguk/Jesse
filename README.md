# 个股收益可视化 Dashboard

基于本地 Excel 数据自动生成的个股推荐收益分析仪表盘。所有图表数据均来自 `data/` 目录下的 Excel 文件，
不在代码中硬编码任何股票名称、收益率、行业或日期。

## 功能

1. **个股收益排行（Top / Bottom）**：按区间涨跌幅排序的前 N / 后 N 个股，红色为正收益、绿色为负收益。
2. **收益分布**：按 8 个收益区间（`<-30%` ~ `>50%`）统计个股数量，并给出广基 / 右尾特征说明。
3. **行业平均收益**：各行业大类的平均收益排行，附中位数、正收益占比、样本量提示。
4. **推荐批次贡献瀑布图**：各推荐日期对整体等权平均收益的贡献，累计值收敛到整体平均收益。
5. **行业四维气泡图**：X = 行业平均收益，Y = 正收益占比，气泡大小 = 股票数量，颜色深浅 = 行业弹性。

页面顶部提供行业筛选、推荐日期筛选、Top N 选择器，以及行业气泡标签显示开关，均会实时联动所有图表。

## 数据准备

1. 将 Excel 数据文件（`.xlsx`）放入 `data/` 目录。脚本会自动选择该目录下最新修改的 `.xlsx` 文件。
2. 脚本会优先使用名为 `Data_Master`（其次 `Clean_Data`）的工作表；如果都不存在，会自动寻找包含
   “个股名称”和“区间涨跌幅”列的工作表中行数最多的一个。
3. 运行数据准备脚本，生成 `public/generated/dashboard-data.json`：

   ```bash
   npm run prepare-data
   ```

   该命令会在终端打印：使用的文件名、工作表名、原始行数 / 有效个股数，以及任何警告（缺失列、空行、
   缺少必需字段的行数等）。

## 本地运行

```bash
npm install          # 首次运行，安装依赖
npm run prepare-data  # 生成 dashboard-data.json
npm run dev            # 启动开发服务器，默认 http://localhost:5173
```

打开浏览器访问开发服务器地址即可查看仪表盘。

## 构建生产版本

```bash
npm run build    # 类型检查 + 构建到 dist/
npm run preview  # 本地预览构建结果
```

## 替换 / 更新数据

1. 将新的 Excel 文件放入 `data/`（可保留旧文件，脚本会选择最新修改的 `.xlsx`）。
2. 重新运行 `npm run prepare-data` 生成新的 `dashboard-data.json`。
3. 刷新浏览器即可看到更新后的数据，无需修改任何组件代码。

## 发布到线上（Vercel）

修改 Excel 数据后，在终端依次运行以下命令，即可更新线上网站（约 1 分钟内生效）：

```bash
cd /Users/j/stock-dashboard
npm run prepare-data
git add data/ public/generated/dashboard-data.json
git commit -m "Update stock data"
git push
```

`git push` 会自动触发 Vercel 重新部署，线上地址（如 `jesse123.vercel.app`）会自动更新为最新数据，无需在 Vercel 上做任何操作。

## 字段说明

`scripts/prepare-data.ts` 会从 Excel 中识别并标准化以下字段（括号内为源数据列名）：

| 字段 | 说明 |
| --- | --- |
| `stockName` | 个股名称 |
| `stockCode` | 股票代码（自动补齐为 6 位） |
| `recommendDate` | 个股推荐日期（`YYYY-MM-DD`） |
| `industry` | 行业大类 |
| `returnPct` | 区间涨跌幅（百分数，如 `10.99` 表示 +10.99%） |
| `maxReturnPct` | 最高涨幅（%），缺失时为 `null` |
| `trackingDays` | 距推荐日交易天数，缺失时为 `null` |
| `dailyReturnPct` | 日均收益率；若源数据缺失，则按 `区间涨跌幅 / 距推荐日交易天数` 计算，仍无法计算时为 `null` |
| `isPositive` | 区间涨跌幅 > 0 |
| `returnBucket` | 收益分布区间（`<-30%` ~ `>50%` 共 8 档） |

## 已知限制

- 数据中如出现同一股票被多次推荐（不同推荐日期），会作为独立记录分别统计，不做去重。
- 行业平均收益等统计在样本量 n ≤ 2 时会在图表下方提示“仅供参考”。
- 若 `dailyReturnPct` 因缺少“距推荐日交易天数”而无法计算，页面顶部会显示数据提示。
- 若 Excel 中缺少必需列（个股名称、代码、推荐日期、行业、区间涨跌幅），相关行会被忽略，并在
  `npm run prepare-data` 的输出及页面顶部的“数据提示”中列出。
