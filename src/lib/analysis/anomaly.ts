import { Transaction, Insight } from '../data/schema';
import { calculateKPIs, aggregateByDimension, getTopDeclineReasons, getHourlyPattern, getRecoverableBreakdown } from './metrics';

let insightCounter = 0;
function nextId(): string {
  return `insight_${++insightCounter}`;
}

/** Compute standard deviation for an array of numbers */
function stdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  return Math.sqrt(variance);
}

/** Compute z-score: how many standard deviations a value is from the mean */
function zScore(value: number, mean: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - mean) / sd;
}

export function detectUnderperformingMethods(transactions: Transaction[], globalApprovalRate: number): Insight[] {
  const byMethod = aggregateByDimension(transactions, 'paymentMethod');
  const insights: Insight[] = [];

  const rates = byMethod.map(m => m.approvalRate);
  const mean = rates.reduce((s, v) => s + v, 0) / rates.length;
  const sd = stdDev(rates);

  for (const m of byMethod) {
    const z = zScore(m.approvalRate, mean, sd);
    // Flag methods below -1.5 sigma (statistically significant underperformance)
    if (z < -1.5 && m.total > 50) {
      const diff = globalApprovalRate - m.approvalRate;
      const severity = z < -2 ? 'critical' : 'warning';
      insights.push({
        id: nextId(),
        type: 'underperforming_method',
        severity,
        title: `${m.value.toUpperCase()} has ${m.approvalRate.toFixed(1)}% approval rate (z=${z.toFixed(2)})`,
        description: `${m.value} payments have an approval rate ${diff.toFixed(1)}% below the global average of ${globalApprovalRate.toFixed(1)}% (z-score: ${z.toFixed(2)}, threshold: -1.5σ). This affects ${m.declined} transactions with $${Math.round(m.lostRevenue).toLocaleString()} in lost revenue.`,
        impact: m.lostRevenue,
        recommendation: `Investigate ${m.value} decline reasons and consider implementing retry logic or offering alternative payment methods to affected customers.`,
      });
    }
  }

  return insights;
}

export function detectProcessorAnomalies(transactions: Transaction[], globalApprovalRate: number): Insight[] {
  const byProcessor = aggregateByDimension(transactions, 'processor');
  const insights: Insight[] = [];

  if (byProcessor.length < 2) return [];

  const rates = byProcessor.map(p => p.approvalRate);
  const mean = rates.reduce((s, v) => s + v, 0) / rates.length;
  const sd = stdDev(rates);

  // Find best and worst processor
  const sorted = [...byProcessor].sort((a, b) => a.approvalRate - b.approvalRate);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const diff = best.approvalRate - worst.approvalRate;
  const worstZ = zScore(worst.approvalRate, mean, sd);

  // Flag worst processor if statistically significant (below -1.5σ)
  if (worstZ < -1.5 && worst.total > 100) {
    insights.push({
      id: nextId(),
      type: 'processor_anomaly',
      severity: worstZ < -2 ? 'critical' : 'warning',
      title: `${worst.value} underperforms by ${diff.toFixed(1)}% vs ${best.value} (z=${worstZ.toFixed(2)})`,
      description: `${worst.value} has ${worst.approvalRate.toFixed(1)}% approval rate compared to ${best.value}'s ${best.approvalRate.toFixed(1)}% (z-score: ${worstZ.toFixed(2)}). Routing traffic away from ${worst.value} could recover significant revenue.`,
      impact: worst.lostRevenue * (diff / 100),
      recommendation: `Consider routing ${worst.value} traffic to ${best.value} where possible. Estimated monthly impact: $${Math.round(worst.lostRevenue * (diff / 100)).toLocaleString()}/month.`,
    });
  }

  // Check each processor below -1σ (excluding already-flagged worst)
  for (const p of byProcessor) {
    const pZ = zScore(p.approvalRate, mean, sd);
    if (pZ < -1 && p.total > 100 && p.value !== worst.value) {
      const pDiff = globalApprovalRate - p.approvalRate;
      insights.push({
        id: nextId(),
        type: 'processor_anomaly',
        severity: 'warning',
        title: `${p.value} approval rate is ${pDiff.toFixed(1)}% below average (z=${pZ.toFixed(2)})`,
        description: `${p.value} processes ${p.total} transactions at ${p.approvalRate.toFixed(1)}% approval rate (z-score: ${pZ.toFixed(2)}, below -1σ threshold).`,
        impact: p.lostRevenue * (pDiff / 100),
        recommendation: `Review ${p.value} configuration and consider A/B testing traffic splits with alternative processors.`,
      });
    }
  }

  return insights;
}

export function detectHighImpactReasons(transactions: Transaction[]): Insight[] {
  const kpis = calculateKPIs(transactions);
  const totalRevenue = kpis.totalRevenue + kpis.lostRevenue;
  const reasons = getTopDeclineReasons(transactions);
  const insights: Insight[] = [];

  const impacts = reasons.map(r => r.revenueImpact);
  const meanImpact = impacts.reduce((s, v) => s + v, 0) / impacts.length;
  const sdImpact = stdDev(impacts);

  for (const r of reasons) {
    const revenuePercent = (r.revenueImpact / totalRevenue) * 100;
    const z = zScore(r.revenueImpact, meanImpact, sdImpact);
    // Flag reasons with revenue impact above +1σ (high-impact outliers)
    if (z > 1 && revenuePercent > 2) {
      insights.push({
        id: nextId(),
        type: 'high_impact_reason',
        severity: z > 2 ? 'critical' : 'warning',
        title: `"${r.label}" costs $${Math.round(r.revenueImpact).toLocaleString()} (${revenuePercent.toFixed(1)}% of revenue, z=${z.toFixed(2)})`,
        description: `${r.count} transactions declined due to "${r.label}" (${r.category.replace('_', ' ')}). Revenue impact is ${z.toFixed(1)} standard deviations above the mean decline reason impact. This is ${r.isRecoverable ? 'potentially recoverable' : 'non-recoverable'}.`,
        impact: r.revenueImpact,
        recommendation: r.isRecoverable
          ? `Implement retry logic for "${r.label}" declines. Consider sending customer notifications to retry with alternative payment methods.`
          : `Review fraud rules and card validation processes to reduce "${r.label}" declines.`,
      });
    }
  }

  return insights;
}

export function detectGeographicOutliers(transactions: Transaction[], globalApprovalRate: number): Insight[] {
  const byCountry = aggregateByDimension(transactions, 'country');
  const insights: Insight[] = [];

  const rates = byCountry.map(c => c.approvalRate);
  const mean = rates.reduce((s, v) => s + v, 0) / rates.length;
  const sd = stdDev(rates);

  for (const c of byCountry) {
    const z = zScore(c.approvalRate, mean, sd);
    // Flag countries below -1.5σ
    if (z < -1.5 && c.total > 100) {
      const diff = globalApprovalRate - c.approvalRate;
      insights.push({
        id: nextId(),
        type: 'geographic_outlier',
        severity: z < -2 ? 'critical' : 'warning',
        title: `${c.value} has ${c.approvalRate.toFixed(1)}% approval rate (z=${z.toFixed(2)}, ${diff.toFixed(1)}% below avg)`,
        description: `${c.value} processes ${c.total} transactions but only approves ${c.approvalRate.toFixed(1)}% (z-score: ${z.toFixed(2)}, below -1.5σ). Lost revenue: $${Math.round(c.lostRevenue).toLocaleString()}.`,
        impact: c.lostRevenue,
        recommendation: `Investigate ${c.value}-specific decline patterns. Consider local processor optimization or alternative payment methods popular in ${c.value}.`,
      });
    }
  }

  return insights;
}

export function detectRecoverableRevenue(transactions: Transaction[]): Insight[] {
  const breakdown = getRecoverableBreakdown(transactions);
  const totalLost = breakdown.softDeclineRevenue + breakdown.hardDeclineRevenue + breakdown.processingErrorRevenue;

  if (totalLost === 0) return [];

  const recoverablePercent = ((breakdown.softDeclineRevenue + breakdown.processingErrorRevenue) / totalLost) * 100;

  const insights: Insight[] = [];

  if (breakdown.softDeclineRevenue > 1000) {
    insights.push({
      id: nextId(),
      type: 'recoverable_revenue',
      severity: 'critical',
      title: `$${Math.round(breakdown.softDeclineRevenue).toLocaleString()} in potentially recoverable revenue from soft declines`,
      description: `${recoverablePercent.toFixed(0)}% of all declined revenue ($${Math.round(breakdown.softDeclineRevenue).toLocaleString()}) comes from soft declines (insufficient funds, velocity limits, 3DS failures) that could be recovered through retry logic or customer communication.`,
      impact: breakdown.softDeclineRevenue,
      recommendation: `Implement automatic retry for soft declines after 1-4 hours. Send email/SMS notifications to customers with soft declines suggesting they retry or use an alternative payment method.`,
    });
  }

  if (breakdown.processingErrorRevenue > 500) {
    insights.push({
      id: nextId(),
      type: 'recoverable_revenue',
      severity: 'warning',
      title: `$${Math.round(breakdown.processingErrorRevenue).toLocaleString()} lost to processing errors`,
      description: `Processing errors (gateway timeouts, issuer unavailable) account for ${breakdown.processingErrors} transactions. These are typically transient and recoverable.`,
      impact: breakdown.processingErrorRevenue,
      recommendation: `Implement automatic retry with exponential backoff for processing errors. Consider failover routing to alternative processors.`,
    });
  }

  return insights;
}

export function detectTemporalAnomalies(transactions: Transaction[]): Insight[] {
  const hourly = getHourlyPattern(transactions);
  const rates = hourly.map(h => h.approvalRate);
  const mean = rates.reduce((s, v) => s + v, 0) / rates.length;
  const sd = stdDev(rates);
  const insights: Insight[] = [];

  // Flag hours below -2σ (statistically anomalous using 2-sigma rule)
  const anomalousHours = hourly.filter(h => {
    const z = zScore(h.approvalRate, mean, sd);
    return z < -2 && h.total > 50;
  });

  if (anomalousHours.length > 0) {
    const worstHour = anomalousHours.sort((a, b) => a.approvalRate - b.approvalRate)[0];
    const worstZ = zScore(worstHour.approvalRate, mean, sd);
    const hourRange = anomalousHours.map(h => `${h.hour}:00`).join(', ');

    insights.push({
      id: nextId(),
      type: 'temporal_anomaly',
      severity: worstZ < -3 ? 'warning' : 'info',
      title: `Anomalous approval rates at hours ${hourRange} (below -2σ)`,
      description: `Approval rates drop to ${worstHour.approvalRate.toFixed(1)}% at ${worstHour.hour}:00 UTC (z-score: ${worstZ.toFixed(2)}) compared to the mean of ${mean.toFixed(1)}% (σ=${sd.toFixed(2)}). Values beyond 2 standard deviations indicate statistically significant deviation.`,
      impact: 0,
      recommendation: `Consider implementing time-based routing to distribute load across processors during peak hours. Review velocity limit configurations.`,
    });
  }

  return insights;
}

export function detectAllInsights(transactions: Transaction[]): Insight[] {
  insightCounter = 0;
  const kpis = calculateKPIs(transactions);
  const globalRate = kpis.approvalRate;

  const insights = [
    ...detectRecoverableRevenue(transactions),
    ...detectUnderperformingMethods(transactions, globalRate),
    ...detectProcessorAnomalies(transactions, globalRate),
    ...detectHighImpactReasons(transactions),
    ...detectGeographicOutliers(transactions, globalRate),
    ...detectTemporalAnomalies(transactions),
  ];

  // Sort by severity then impact
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => {
    const svd = severityOrder[a.severity] - severityOrder[b.severity];
    if (svd !== 0) return svd;
    return b.impact - a.impact;
  });

  return insights;
}
