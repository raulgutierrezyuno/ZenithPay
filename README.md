# ZenithPay - Payment Decline Intelligence Dashboard

A data intelligence system that analyzes payment decline patterns for VitaHealth, an online pharmacy operating in Brazil, Mexico, Indonesia and the US. The dashboard identifies where revenue is leaking, detects anomalies, and provides actionable recommendations to improve approval rates.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3000
```

**Time to first meaningful screen: ~30 seconds**

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                    Next.js App                         │
├────────────────────────────────────────────────────────┤
│  Dashboard UI (React + Tailwind CSS)                   │
│  - KPI Cards, Charts (SVG), Filters, Tables            │
│  - Tabs: Overview | Insights | Transactions            │
├────────────────────────────────────────────────────────┤
│  API Routes                                            │
│  - GET /api/metrics    → KPIs + dimensional breakdowns │
│  - GET /api/insights   → Anomaly detection + recs      │
│  - GET /api/transactions → Paginated transaction list  │
├────────────────────────────────────────────────────────┤
│  Analysis Engine                                       │
│  - metrics.ts     → Aggregations by dimension          │
│  - anomaly.ts     → 6 anomaly detection algorithms     │
│  - recommendations.ts → Ranked action plan             │
├────────────────────────────────────────────────────────┤
│  Data Layer                                            │
│  - generator.ts   → Deterministic 5,500 txn generator  │
│  - store.ts       → In-memory data store + filtering   │
│  - schema.ts      → TypeScript types                   │
└────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Generation**: On first API call, `generator.ts` creates 5,500 realistic transactions using a seeded PRNG (deterministic, same data every time)
2. **Storage**: Transactions are cached in memory via `store.ts`
3. **Filtering**: API routes accept query params (country, paymentMethod, processor, date range) and filter transactions before analysis
4. **Analysis**: `metrics.ts` computes KPIs, aggregations, time series; `anomaly.ts` detects 6 types of patterns; `recommendations.ts` generates ranked action items
5. **Presentation**: React dashboard components consume API data with interactive filters

## Test Dataset

The generator creates **5,500 transactions** over 90 days (Dec 2025 - Feb 2026) with these embedded patterns:

| Dimension | Pattern |
|-----------|---------|
| **Overall approval rate** | ~64% (down from target of 78%) |
| **PIX (Brazil)** | ~92% approval - best performer |
| **OXXO (Mexico)** | ~45% approval - worst payment method |
| **ConektaMX** | ~48% approval - worst processor |
| **StripeConnect** | ~72% approval - best processor |
| **Mexico** | ~52% approval - worst country |
| **Peak hours (18-22 UTC)** | 5-8% lower approval rates |
| **New vs returning customers** | ~58% vs ~70% approval |
| **Top decline reason** | Insufficient Funds (25% of declines) |

## Key Findings from Analysis

### Top 3 Problems

1. **OXXO payments in Mexico** have ~45% approval rate (vs 64% average). OXXO cash payments suffer from high 3DS failure rates and timeouts, making Mexico the worst-performing country.

2. **ConektaMX processor** underperforms significantly at ~48% approval vs StripeConnect's ~72%. Routing traffic away from ConektaMX could recover substantial revenue.

3. **67%+ of all declined revenue is from soft declines** (insufficient funds, velocity limits, 3DS failures) — these are potentially recoverable through retry logic and customer communication.

### Top 3 Recommendations

1. **Route ConektaMX traffic to StripeConnect** where possible — estimated recovery of $30K-50K/month based on the 24% approval gap
2. **Implement smart retry for soft declines** — automatic retry after 1-4 hours for "insufficient_funds" and "do_not_honor" could recover 20-30% of soft declines
3. **Promote PIX as preferred payment in Brazil** — at 92% approval, shifting credit card traffic to PIX could convert many declined transactions

## Dashboard Features

### Core Requirements
- **Data Pipeline**: Generates, ingests, classifies (hard/soft/processing error), and enriches 5,500 transactions
- **Interactive Dashboard**: Filters by country, payment method, processor, date range with real-time updates
- **Automated Insights**: 6 anomaly detection algorithms with severity-based prioritization

### Stretch Goals Implemented
1. **Cohort Analysis**: New vs returning customer approval rate comparison
2. **Smart Recommendation Engine**: 7 ranked recommendations with estimated monthly revenue impact and effort level
3. *(Predictive ML model and real-time monitoring were scoped but not implemented)*

## Project Structure

```
src/
├── app/
│   ├── page.tsx                      # Main dashboard page
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Global styles
│   └── api/
│       ├── metrics/route.ts          # Metrics API
│       ├── insights/route.ts         # Insights + recommendations API
│       └── transactions/route.ts     # Transaction list API
├── components/dashboard/
│   ├── DashboardShell.tsx            # Main orchestrator
│   ├── KPICards.tsx                  # Summary KPI cards
│   ├── FilterBar.tsx                 # Global filter controls
│   ├── ApprovalTrend.tsx             # Time series line chart
│   ├── DeclineReasons.tsx            # Top 10 decline reasons
│   ├── PaymentMethodChart.tsx        # Method comparison
│   ├── CountryBreakdown.tsx          # Geographic performance
│   ├── ProcessorComparison.tsx       # Processor ranking
│   ├── HourlyHeatmap.tsx             # Hour-of-day pattern
│   ├── RecoverableRevenue.tsx        # Donut: soft vs hard declines
│   ├── InsightsPanel.tsx             # Automated insight alerts
│   ├── RecommendationsPanel.tsx      # Ranked action plan
│   ├── CohortAnalysis.tsx            # New vs returning customers
│   └── TransactionTable.tsx          # Paginated transaction detail
└── lib/
    ├── data/
    │   ├── schema.ts                 # TypeScript types
    │   ├── generator.ts              # Deterministic data generator
    │   └── store.ts                  # In-memory data store
    └── analysis/
        ├── metrics.ts                # KPI calculations
        ├── anomaly.ts                # 6 anomaly detection algorithms
        └── recommendations.ts        # Smart recommendation engine
```

## Tech Stack

- **Next.js 16** with App Router and TypeScript
- **Tailwind CSS** for styling
- **Custom SVG charts** (no external charting library needed)
- **In-memory data processing** (no database required)

## Anomaly Detection Algorithms

All detection algorithms use **z-score statistical analysis** instead of hardcoded thresholds. The z-score measures how many standard deviations a value is from the mean, making detection adaptive to data distribution.

| Algorithm | Statistical Method | Threshold |
|-----------|-------------------|-----------|
| **Underperforming Payment Methods** | z-score of approval rate across methods | z < -1.5σ (warning), z < -2σ (critical) |
| **Processor Anomalies** | z-score of approval rate across processors | z < -1.5σ (worst), z < -1σ (secondary) |
| **High-Impact Decline Reasons** | z-score of revenue impact across reasons | z > +1σ (warning), z > +2σ (critical) |
| **Geographic Outliers** | z-score of approval rate across countries | z < -1.5σ (warning), z < -2σ (critical) |
| **Recoverable Revenue** | Absolute revenue calculation | Soft decline revenue > $1,000 |
| **Temporal Anomalies** | z-score of hourly approval rates (2-sigma rule) | z < -2σ |

## Design Decisions

### Why Next.js (single project, no separate backend)?
A single `npm run dev` command starts the entire application. API routes handle data processing server-side, while React components render the dashboard client-side. This eliminates the need for a separate Python/Flask backend, reducing setup complexity for reviewers from multiple services to one command.

### Why in-memory data with seeded PRNG instead of a database?
The deterministic generator (`seed=42`) produces identical data on every run, making analysis reproducible and eliminating database setup. For 5,500 transactions, in-memory processing is faster than any database query. The seeded PRNG ensures reviewers see the exact same patterns and metrics.

### Why custom SVG charts instead of a charting library (Recharts, Chart.js)?
Custom SVG gives full control over the visual design without adding 200KB+ of dependencies. Each chart is a self-contained React component with `useMemo` for performance. This also avoids peer dependency conflicts (Tremor/Recharts had conflicts with React 19).

### Why z-score for anomaly detection instead of fixed thresholds?
Fixed thresholds (e.g., ">12% below average") don't adapt to data distribution. Z-scores dynamically calculate what's "anomalous" based on the actual spread of values. A payment method 15% below average might not be anomalous if all methods vary widely, but 8% below might be significant if variance is low. The -1.5σ and -2σ thresholds follow standard statistical practice for outlier detection.

### Why prioritize insights by financial impact, not just percentage?
A 30% decline in a method processing 50 transactions/month matters less than a 10% decline in one processing 5,000. All insights include USD-denominated `impact` values, and sorting uses severity first, then financial impact, ensuring the most business-critical issues surface first.
