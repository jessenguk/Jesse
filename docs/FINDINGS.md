# Methodology & Findings

## Research question

Do a set of analyst stock recommendations show evidence of genuine
**selection skill** — i.e. the ability to pick stocks that outperform the
broad market — or are their returns explained by market movement (beta) alone?

This is deliberately framed as a falsifiable question with a clear null
hypothesis: *the recommendations have no edge over the market.* The goal was to
build a framework rigorous enough to reject that hypothesis if an edge existed —
and to report honestly if it did not.

## Data

- **53 stock recommendations** across **17 batches** (grouped by recommendation
  date), spanning **25 Feb – 21 May 2026**.
- Sourced from **Tonghuashun iFinD**: a recommendation master sheet, per-stock
  daily back-adjusted close prices, and daily closes for three benchmark
  indices.
- 52 / 53 names have complete daily price coverage; every batch has valid data
  for both the T+2 and T+5 windows.

## Method

### Return measurement

Two complementary definitions of "return after recommendation":

1. **Full window** — recommendation date → the analyst's recorded settlement
   date. Settlement dates differ by batch (10–30+ trading days), so each batch
   is measured over its own analyst-defined horizon.
2. **Fixed windows (T+2, T+5)** — close-to-close over exactly 2 or 5 trading
   days after the recommendation, using back-adjusted daily prices. This
   isolates **short-term entry timing** from longer-horizon drift and removes
   the confound of unequal holding periods.

Batch return is the **equal-weight average** across the stocks in the batch.

### Benchmarking

For every batch and every horizon:

```
excess return = batch stock return − benchmark index return  (same window)
```

computed independently against **three benchmarks** of differing breadth — the
**SSE Composite** (broad large-cap), **CSI 500** (mid-cap), and **STAR
Composite** (科创 board). Using three benchmarks ensures the conclusion does not
depend on a single, possibly flattering, choice of index. Trading-day alignment
guarantees the stock and index returns cover identical calendar periods
(weekends and holidays are skipped by construction).

### The four-quadrant lens

Each batch is plotted on two axes — *market direction* (did the benchmark rise
or fall over the window?) and *stock direction* (did the batch rise or fall?) —
producing four cases:

| | Market up | Market down |
| --- | --- | --- |
| **Stocks up** | Tailwind, good pick | **Headwind, good pick** ← genuine skill |
| **Stocks down** | Tailwind, poor pick | Headwind, poor pick |

The bottom-left → top-right diagonal is beta; the off-diagonal "headwind, good
pick" cell is where real selection skill would show up.

## Results

### Hit rate (share of batches beating the benchmark)

| Horizon | SSE Composite | CSI 500 | STAR Composite |
| --- | --- | --- | --- |
| Full window | 47% (8/17) | — | — |
| T+2 | 47% (8/17) | 35% (6/17) | 35% (6/17) |
| T+5 | 47% (8/17) | 53% (9/17) | 53% (9/17) |

### Mean excess return

| Horizon | SSE Composite | CSI 500 | STAR Composite |
| --- | --- | --- | --- |
| Full window | +3.7% | — | — |
| T+2 | −1.2% | −1.2% | −1.9% |
| T+5 | +0.8% | +0.8% | −0.5% |

### Headwind selection

In the 5–7 batches per benchmark where the market *fell* after recommendation,
only about **2** still delivered positive returns (~30%) — no evidence of
counter-cyclical picking ability.

### Absolute performance (context)

55% of individual names (29/53) finished positive, mean +4.0%. But the period
was broadly bullish, so this reflects market beta, not skill — which is exactly
why excess-return benchmarking is the meaningful test.

## Conclusion

Across **three benchmarks and three horizons**, the recommendation hit rate
sits between **35% and 53%** and mean excess return is **approximately zero**.
The null hypothesis — no systematic edge over the market — **cannot be
rejected**. The recommendations' positive absolute returns are attributable to
a rising market rather than demonstrable selection skill.

## Caveats

- **Small sample.** 53 names / 17 batches over ~4 months; the result is
  suggestive, not statistically conclusive. No formal significance test was run
  given the sample size.
- **Single bullish regime.** The framework has not been tested across a market
  downturn, where selection ability matters most.
- **Entry-price asymmetry.** T+N returns use the recommendation-day close;
  the full-window figure uses the analyst's recorded entry price. The two
  definitions are reported separately and not pooled.
- **No de-duplication.** Stocks recommended on multiple dates count as separate
  records by design, to preserve each batch as an independent event.

## Possible extensions

- Widen the sample to multiple quarters and at least one drawdown period.
- Add risk-adjusted metrics (e.g. return per unit of realised volatility).
- Test alternative entry assumptions (next-day open) and weighting schemes.
- Bootstrap the hit rate to attach a confidence interval to the null result.
