# Stock Recommendation Analytics Dashboard

An end-to-end analytics pipeline that evaluates whether a set of analyst stock
recommendations showed genuine **selection skill** — measured against three
market benchmarks over multiple holding horizons.

**Live demo:** https://jesse-dashboard.pages.dev

> Built as a self-directed quantitative project: data sourced from Tonghuashun
> iFinD, cleaned and analysed with a reproducible pipeline, and published as an
> interactive dashboard with automated CI/CD deployment.

> **Scope of my work.** The stock recommendations being evaluated were produced
> by a third party — they are the *input* under test, not my picks. I designed
> and built everything else: the research question and evaluation framework, the
> data pipeline, the benchmarking and four-quadrant methodology, the dashboard,
> and the deployment. This is an **evaluator's** project — the buy-side task of
> independently judging whether someone else's recommendations have an edge.

---

## Key finding

Across **53 recommendations** in **17 batches** (Feb–May 2026), benchmarked
against the **SSE Composite, CSI 500, and STAR Composite** indices over the
recommendation window and at **T+2 / T+5** trading-day horizons:

| Horizon | Batches beating benchmark | Mean excess return |
| --- | --- | --- |
| Full window (to settlement) | 8 / 17 (47%) | +3.7% |
| T+2 | 6–8 / 17 (≈39%) | −1.2% to −1.9% |
| T+5 | 8–9 / 17 (≈51%) | −0.5% to +0.8% |

**The hit rate hovers around 35–53% — statistically indistinguishable from a
coin flip — and mean excess return is approximately zero.** There is no
evidence of systematic stock-selection skill. Absolute returns were positive
(55% of names up, +4.0% mean), but this reflects a broadly rising market
(beta), not alpha. The recommendations also showed no special "headwind"
ability: in batches where the market fell after recommendation, only ≈30% of
batches still delivered positive returns.

This is reported as a **null result on purpose** — the value of the project is
the evaluation framework and the honesty of the conclusion, not a manufactured
edge.

---

## What the dashboard shows

15 linked sections, all driven by the underlying data (no hardcoded values).
Global filters (industry, recommendation date, Top N) update every chart live.

**Descriptive (1–6)**
1. Top / Bottom return ranking
2. Return distribution across 8 buckets (`<-30%` … `>50%`)
3. Industry average return, with median, hit rate, sample size
4. Timing of peak return after recommendation
5. Batch contribution waterfall (each batch's share of the equal-weight mean)
6. Four-dimension industry bubble chart

**Market-context evaluation (7–15)** — the analytical core
- **7–9:** Full-window performance vs SSE Composite / CSI 500 / STAR Composite,
  each batch placed in a four-quadrant grid (tailwind/headwind × good/poor pick).
- **10–15:** The same framework measured over fixed **T+2** and **T+5**
  trading-day windows, for each of the three benchmarks — isolating short-term
  entry timing from longer-horizon drift.

The four quadrants distinguish *market environment* from *selection quality*:
a stock can rise in a rising market (beta) or rise while the market falls
(genuine pick) — the grid separates the two.

---

## Architecture

```
Tonghuashun iFinD (.xlsx)
        │
        ▼
  npm run prepare-data        ← Node + tsx pipeline (scripts/prepare-data.ts)
        │  parse · clean · validate · merge price + index series
        ▼
public/generated/dashboard-data.json
        │
        ▼
  React + Recharts dashboard  ← fetched at runtime, fully data-driven
        │
        ▼
  git push → GitHub Actions → Cloudflare Pages   (auto-deploy, ~2 min)
```

**Tech stack:** React 18, TypeScript, Vite, Tailwind CSS, Recharts;
data pipeline in Node/tsx with `xlsx`; CI/CD via GitHub Actions → Cloudflare
Pages (chosen over Vercel for accessibility in mainland China without a VPN).

### Why this design
- **Single source of truth.** Charts never hardcode numbers; everything flows
  from the Excel inputs through one deterministic pipeline, so refreshing the
  analysis is one command.
- **Separation of concerns.** The pipeline (`scripts/`) handles messy
  real-world Excel — multiple sheets, inconsistent date formats, settlement
  dates split across files — and emits one clean JSON contract the UI consumes.
- **Reproducible.** Anyone can drop in new iFinD exports and regenerate the
  entire dashboard.

---

## Methodology

Full write-up in [`docs/FINDINGS.md`](docs/FINDINGS.md). In brief:

- **Returns** are measured two ways: (a) recommendation date → analyst
  settlement date (full window), and (b) close-to-close over fixed T+2 / T+5
  trading-day windows using back-adjusted daily prices.
- **Excess return** = batch equal-weight stock return − same-window index
  return, computed separately for each of three benchmarks.
- **Trading-day alignment.** Windows count actual trading days (holidays and
  weekends skipped automatically), so stock and index returns cover identical
  calendar periods.
- **Honest benchmarking.** Three indices of differing breadth (large-cap,
  mid-cap, STAR board) are used so the conclusion does not hinge on a single
  benchmark choice.

---

## Running locally

```bash
npm install           # install dependencies (first run)
npm run prepare-data  # parse data/*.xlsx → public/generated/dashboard-data.json
npm run dev           # dev server at http://localhost:5173
```

Production build:

```bash
npm run build         # type-check + bundle to dist/
npm run preview       # preview the production build
```

## Updating the data

1. Drop new iFinD `.xlsx` exports into `data/` (file names are auto-detected:
   `行情序列` = daily prices, index files by name, the rest = the recommendation
   master sheet).
2. Run the deploy sequence:

   ```bash
   npm run prepare-data
   npm run build
   git add .
   git commit -m "Update data"
   git push                       # GitHub Actions redeploys to Cloudflare Pages
   ```

No component code changes are needed — the UI re-renders from the new JSON.

---

## Data inputs

| File pattern | Contents |
| --- | --- |
| Recommendation master | Stock name, code, recommend date, industry, window return, settlement date |
| `行情序列` | Per-stock daily back-adjusted close prices |
| Index files | Daily closes for SSE Composite, CSI 500, STAR Composite |

The pipeline standardises codes to 6 digits, normalises mixed date formats
(`YYYYMMDD`, `YYYY/M/D`, Excel serials) to `YYYY-MM-DD`, and merges settlement
dates that live in a separate supplementary export.

## Limitations

- 53 recommendations / 17 batches over ~4 months is a small sample; the null
  result is suggestive, not statistically conclusive.
- The observation period was broadly bullish, so absolute returns overstate
  skill — excess return vs benchmark is the meaningful metric.
- A stock recommended on multiple dates is treated as independent records, not
  de-duplicated.
- T+N returns use the recommendation-day **close** as the entry price (daily
  series provides closes only), whereas the full-window figure uses the
  analyst's recorded entry; the two are not directly comparable.
