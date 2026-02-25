import {
  Transaction,
  KPIMetrics,
  DimensionMetric,
  DeclineReasonMetric,
  TimeSeriesPoint,
  HourlyMetric,
  MetricsResponse,
  DECLINE_REASON_LABELS,
  DECLINE_CATEGORY_MAP,
  RECOVERABLE_REASONS,
  DeclineReason,
} from '../data/schema';
import { USD_RATES } from '../data/generator';

function toUSD(amount: number, currency: string): number {
  return amount * (USD_RATES[currency as keyof typeof USD_RATES] || 1);
}

export function calculateKPIs(transactions: Transaction[]): KPIMetrics {
  const total = transactions.length;
  const approved = transactions.filter(t => t.status === 'approved').length;
  const declined = total - approved;
  const approvalRate = total > 0 ? (approved / total) * 100 : 0;

  const totalRevenue = transactions
    .filter(t => t.status === 'approved')
    .reduce((sum, t) => sum + toUSD(t.amount, t.currency), 0);

  const lostRevenue = transactions
    .filter(t => t.status === 'declined')
    .reduce((sum, t) => sum + toUSD(t.amount, t.currency), 0);

  const recoverableRevenue = transactions
    .filter(t => t.status === 'declined' && t.isRecoverable)
    .reduce((sum, t) => sum + toUSD(t.amount, t.currency), 0);

  return { totalTransactions: total, approved, declined, approvalRate, totalRevenue, lostRevenue, recoverableRevenue };
}

export function aggregateByDimension(
  transactions: Transaction[],
  dimension: 'paymentMethod' | 'country' | 'processor' | 'currency'
): DimensionMetric[] {
  const groups = new Map<string, Transaction[]>();

  for (const t of transactions) {
    const key = t[dimension];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const metrics: DimensionMetric[] = [];
  for (const [value, txns] of groups) {
    const approved = txns.filter(t => t.status === 'approved').length;
    const total = txns.length;
    const revenue = txns.filter(t => t.status === 'approved').reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
    const lostRevenue = txns.filter(t => t.status === 'declined').reduce((s, t) => s + toUSD(t.amount, t.currency), 0);

    metrics.push({
      dimension,
      value,
      total,
      approved,
      declined: total - approved,
      approvalRate: total > 0 ? (approved / total) * 100 : 0,
      revenue,
      lostRevenue,
    });
  }

  return metrics.sort((a, b) => b.total - a.total);
}

export function getTopDeclineReasons(transactions: Transaction[], limit: number = 10): DeclineReasonMetric[] {
  const declined = transactions.filter(t => t.status === 'declined' && t.declineReason);
  const totalDeclined = declined.length;
  const groups = new Map<DeclineReason, Transaction[]>();

  for (const t of declined) {
    if (!groups.has(t.declineReason!)) groups.set(t.declineReason!, []);
    groups.get(t.declineReason!)!.push(t);
  }

  const metrics: DeclineReasonMetric[] = [];
  for (const [reason, txns] of groups) {
    const revenueImpact = txns.reduce((s, t) => s + toUSD(t.amount, t.currency), 0);
    metrics.push({
      reason,
      label: DECLINE_REASON_LABELS[reason],
      count: txns.length,
      percentage: totalDeclined > 0 ? (txns.length / totalDeclined) * 100 : 0,
      revenueImpact,
      category: DECLINE_CATEGORY_MAP[reason],
      isRecoverable: RECOVERABLE_REASONS.has(reason),
    });
  }

  return metrics.sort((a, b) => b.count - a.count).slice(0, limit);
}

export function getTimeSeries(transactions: Transaction[]): TimeSeriesPoint[] {
  const groups = new Map<string, Transaction[]>();

  for (const t of transactions) {
    const date = t.timestamp.substring(0, 10); // YYYY-MM-DD
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(t);
  }

  const series: TimeSeriesPoint[] = [];
  for (const [date, txns] of groups) {
    const approved = txns.filter(t => t.status === 'approved').length;
    const total = txns.length;
    const revenue = txns.filter(t => t.status === 'approved').reduce((s, t) => s + toUSD(t.amount, t.currency), 0);

    series.push({
      date,
      total,
      approved,
      declined: total - approved,
      approvalRate: total > 0 ? Math.round((approved / total) * 10000) / 100 : 0,
      revenue,
    });
  }

  return series.sort((a, b) => a.date.localeCompare(b.date));
}

export function getHourlyPattern(transactions: Transaction[]): HourlyMetric[] {
  const groups = new Map<number, Transaction[]>();

  for (let h = 0; h < 24; h++) groups.set(h, []);

  for (const t of transactions) {
    const hour = new Date(t.timestamp).getUTCHours();
    groups.get(hour)!.push(t);
  }

  const metrics: HourlyMetric[] = [];
  for (let h = 0; h < 24; h++) {
    const txns = groups.get(h)!;
    const approved = txns.filter(t => t.status === 'approved').length;
    metrics.push({
      hour: h,
      total: txns.length,
      approved,
      approvalRate: txns.length > 0 ? Math.round((approved / txns.length) * 10000) / 100 : 0,
    });
  }

  return metrics;
}

export function getRecoverableBreakdown(transactions: Transaction[]) {
  const declined = transactions.filter(t => t.status === 'declined');

  const soft = declined.filter(t => t.declineCategory === 'soft_decline');
  const hard = declined.filter(t => t.declineCategory === 'hard_decline');
  const processing = declined.filter(t => t.declineCategory === 'processing_error');

  return {
    softDeclines: soft.length,
    hardDeclines: hard.length,
    processingErrors: processing.length,
    softDeclineRevenue: soft.reduce((s, t) => s + toUSD(t.amount, t.currency), 0),
    hardDeclineRevenue: hard.reduce((s, t) => s + toUSD(t.amount, t.currency), 0),
    processingErrorRevenue: processing.reduce((s, t) => s + toUSD(t.amount, t.currency), 0),
  };
}

export function getCohortAnalysis(transactions: Transaction[]) {
  const returning = transactions.filter(t => t.isReturningCustomer);
  const newCust = transactions.filter(t => !t.isReturningCustomer);

  const retApproved = returning.filter(t => t.status === 'approved').length;
  const newApproved = newCust.filter(t => t.status === 'approved').length;

  return {
    newCustomers: {
      total: newCust.length,
      approved: newApproved,
      approvalRate: newCust.length > 0 ? Math.round((newApproved / newCust.length) * 10000) / 100 : 0,
    },
    returningCustomers: {
      total: returning.length,
      approved: retApproved,
      approvalRate: returning.length > 0 ? Math.round((retApproved / returning.length) * 10000) / 100 : 0,
    },
  };
}

export function computeAllMetrics(transactions: Transaction[]): MetricsResponse {
  return {
    kpis: calculateKPIs(transactions),
    byPaymentMethod: aggregateByDimension(transactions, 'paymentMethod'),
    byCountry: aggregateByDimension(transactions, 'country'),
    byProcessor: aggregateByDimension(transactions, 'processor'),
    byCurrency: aggregateByDimension(transactions, 'currency'),
    topDeclineReasons: getTopDeclineReasons(transactions),
    timeSeries: getTimeSeries(transactions),
    hourlyPattern: getHourlyPattern(transactions),
    recoverableBreakdown: getRecoverableBreakdown(transactions),
    cohort: getCohortAnalysis(transactions),
  };
}
