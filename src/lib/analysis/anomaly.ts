import { Transaction, Insight, DimensionMetric } from '../data/schema';
import { calculateKPIs, aggregateByDimension, getTopDeclineReasons, getHourlyPattern, getRecoverableBreakdown } from './metrics';

let insightCounter = 0;
function nextId(): string {
  return `insight_${++insightCounter}`;
}

export function detectUnderperformingMethods(transactions: Transaction[], globalApprovalRate: number): Insight[] {
  const byMethod = aggregateByDimension(transactions, 'paymentMethod');
  const insights: Insight[] = [];

  for (const m of byMethod) {
    const diff = globalApprovalRate - m.approvalRate;
    if (diff > 12 && m.total > 50) {
      const severity = diff > 20 ? 'critical' : 'warning';
      insights.push({
        id: nextId(),
        type: 'underperforming_method',
        severity,
        title: `${m.value.toUpperCase()} has ${m.approvalRate.toFixed(1)}% approval rate`,
        description: `${m.value} payments have an approval rate ${diff.toFixed(1)}% below the global average of ${globalApprovalRate.toFixed(1)}%. This affects ${m.declined} transactions with $${Math.round(m.lostRevenue).toLocaleString()} in lost revenue.`,
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

  // Find best and worst processor
  const sorted = [...byProcessor].sort((a, b) => a.approvalRate - b.approvalRate);
  if (sorted.length < 2) return [];

  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const diff = best.approvalRate - worst.approvalRate;

  if (diff > 10 && worst.total > 100) {
    insights.push({
      id: nextId(),
      type: 'processor_anomaly',
      severity: diff > 20 ? 'critical' : 'warning',
      title: `${worst.value} underperforms by ${diff.toFixed(1)}% vs ${best.value}`,
      description: `${worst.value} has ${worst.approvalRate.toFixed(1)}% approval rate compared to ${best.value}'s ${best.approvalRate.toFixed(1)}%. Routing traffic away from ${worst.value} could recover significant revenue.`,
      impact: worst.lostRevenue * (diff / 100),
      recommendation: `Consider routing ${worst.value} traffic to ${best.value} where possible. Estimated monthly impact: $${Math.round(worst.lostRevenue * (diff / 100)).toLocaleString()}/month.`,
    });
  }

  // Check each processor below average
  for (const p of byProcessor) {
    const pDiff = globalApprovalRate - p.approvalRate;
    if (pDiff > 8 && p.total > 100 && p.value !== worst.value) {
      insights.push({
        id: nextId(),
        type: 'processor_anomaly',
        severity: 'warning',
        title: `${p.value} approval rate is ${pDiff.toFixed(1)}% below average`,
        description: `${p.value} processes ${p.total} transactions at ${p.approvalRate.toFixed(1)}% approval rate, which is ${pDiff.toFixed(1)}% below the global average.`,
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

  for (const r of reasons) {
    const revenuePercent = (r.revenueImpact / totalRevenue) * 100;
    if (revenuePercent > 3) {
      insights.push({
        id: nextId(),
        type: 'high_impact_reason',
        severity: revenuePercent > 7 ? 'critical' : 'warning',
        title: `"${r.label}" costs $${Math.round(r.revenueImpact).toLocaleString()} (${revenuePercent.toFixed(1)}% of total revenue)`,
        description: `${r.count} transactions declined due to "${r.label}" (${r.category.replace('_', ' ')}). This is ${r.isRecoverable ? 'potentially recoverable' : 'non-recoverable'}.`,
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

  for (const c of byCountry) {
    const diff = globalApprovalRate - c.approvalRate;
    if (diff > 8 && c.total > 100) {
      insights.push({
        id: nextId(),
        type: 'geographic_outlier',
        severity: diff > 15 ? 'critical' : 'warning',
        title: `${c.value} has ${c.approvalRate.toFixed(1)}% approval rate (${diff.toFixed(1)}% below average)`,
        description: `${c.value} processes ${c.total} transactions but only approves ${c.approvalRate.toFixed(1)}%. Lost revenue: $${Math.round(c.lostRevenue).toLocaleString()}.`,
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
  const avgRate = hourly.reduce((s, h) => s + h.approvalRate, 0) / hourly.length;
  const insights: Insight[] = [];

  const peakHours = hourly.filter(h => h.approvalRate < avgRate - 5 && h.total > 50);

  if (peakHours.length > 0) {
    const worstHour = peakHours.sort((a, b) => a.approvalRate - b.approvalRate)[0];
    const hourRange = peakHours.map(h => `${h.hour}:00`).join(', ');

    insights.push({
      id: nextId(),
      type: 'temporal_anomaly',
      severity: 'info',
      title: `Lower approval rates during peak hours (${hourRange})`,
      description: `Approval rates drop to ${worstHour.approvalRate.toFixed(1)}% at ${worstHour.hour}:00 UTC compared to the daily average of ${avgRate.toFixed(1)}%. This suggests increased transaction volume overwhelming processor capacity or higher fraud rates.`,
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
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => {
    const sd = severityOrder[a.severity] - severityOrder[b.severity];
    if (sd !== 0) return sd;
    return b.impact - a.impact;
  });

  return insights;
}
