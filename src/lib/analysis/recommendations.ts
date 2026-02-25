import { Transaction, Recommendation } from '../data/schema';
import { aggregateByDimension, calculateKPIs, getTopDeclineReasons, getRecoverableBreakdown } from './metrics';

export function generateRecommendations(transactions: Transaction[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let rank = 0;

  const kpis = calculateKPIs(transactions);
  const byProcessor = aggregateByDimension(transactions, 'processor');
  const byMethod = aggregateByDimension(transactions, 'paymentMethod');
  const byCountry = aggregateByDimension(transactions, 'country');
  const reasons = getTopDeclineReasons(transactions);
  const recoverable = getRecoverableBreakdown(transactions);

  // 1. Processor routing optimization
  const sortedProcessors = [...byProcessor].sort((a, b) => b.approvalRate - a.approvalRate);
  if (sortedProcessors.length >= 2) {
    const best = sortedProcessors[0];
    const worst = sortedProcessors[sortedProcessors.length - 1];
    const diff = best.approvalRate - worst.approvalRate;

    if (diff > 10) {
      const estimatedRecovery = worst.lostRevenue * (diff / 100) * 0.6;
      recommendations.push({
        id: `rec_${++rank}`,
        rank,
        title: `Route ${worst.value} traffic to ${best.value}`,
        description: `${worst.value} has ${worst.approvalRate.toFixed(1)}% approval vs ${best.value}'s ${best.approvalRate.toFixed(1)}%. Gradually shifting traffic could recover ${diff.toFixed(0)}% of declines. Start with a 20% traffic split test.`,
        estimatedImpact: estimatedRecovery,
        effort: 'medium',
        category: 'Processor Optimization',
      });
    }
  }

  // 2. Retry logic for soft declines
  if (recoverable.softDeclineRevenue > 1000) {
    const retryRecovery = recoverable.softDeclineRevenue * 0.25; // Assume 25% recovery rate
    recommendations.push({
      id: `rec_${++rank}`,
      rank,
      title: 'Implement smart retry for soft declines',
      description: `${recoverable.softDeclines} soft declines ($${Math.round(recoverable.softDeclineRevenue).toLocaleString()} lost) could be partially recovered. Implement automatic retry after 1-4 hours for "insufficient_funds" and "do_not_honor" declines. Industry recovery rate: 20-30%.`,
      estimatedImpact: retryRecovery,
      effort: 'low',
      category: 'Retry Logic',
    });
  }

  // 3. Country-specific optimization
  const mexicoMetric = byCountry.find(c => c.value === 'Mexico');
  if (mexicoMetric && mexicoMetric.approvalRate < 55) {
    const oxxoMetric = byMethod.find(m => m.value === 'oxxo');
    const improvement = oxxoMetric ? oxxoMetric.lostRevenue * 0.3 : mexicoMetric.lostRevenue * 0.2;

    recommendations.push({
      id: `rec_${++rank}`,
      rank,
      title: 'Optimize Mexico payment mix',
      description: `Mexico has ${mexicoMetric.approvalRate.toFixed(1)}% approval rate. OXXO cash payments have high decline rates due to 3DS failures and timeout issues. Consider promoting credit card payments with local acquirers or adding SPEI (bank transfer) as an alternative.`,
      estimatedImpact: improvement,
      effort: 'medium',
      category: 'Geographic Optimization',
    });
  }

  // 4. PIX promotion in Brazil
  const pixMetric = byMethod.find(m => m.value === 'pix');
  const brazilMetric = byCountry.find(c => c.value === 'Brazil');
  if (pixMetric && brazilMetric && pixMetric.approvalRate > 85) {
    const brazilCC = transactions.filter(t => t.country === 'Brazil' && t.paymentMethod === 'credit_card');
    const ccDeclines = brazilCC.filter(t => t.status === 'declined').length;
    const conversionEstimate = ccDeclines * 0.3 * 45 * 0.18; // 30% convert, avg $45 BRL * USD rate

    recommendations.push({
      id: `rec_${++rank}`,
      rank,
      title: 'Promote PIX as preferred payment in Brazil',
      description: `PIX has ${pixMetric.approvalRate.toFixed(1)}% approval rate vs credit cards. Promoting PIX at checkout for Brazilian customers could convert ${Math.round(ccDeclines * 0.3)} declined credit card transactions.`,
      estimatedImpact: conversionEstimate,
      effort: 'low',
      category: 'Payment Method Optimization',
    });
  }

  // 5. 3DS optimization
  const tdsReason = reasons.find(r => r.reason === '3ds_failed');
  if (tdsReason && tdsReason.revenueImpact > 1000) {
    recommendations.push({
      id: `rec_${++rank}`,
      rank,
      title: 'Optimize 3DS authentication flow',
      description: `3DS failures account for ${tdsReason.count} declines ($${Math.round(tdsReason.revenueImpact).toLocaleString()} lost). Review 3DS challenge flow UX, implement frictionless 3DS 2.0 where possible, and consider exemptions for low-risk transactions.`,
      estimatedImpact: tdsReason.revenueImpact * 0.4,
      effort: 'high',
      category: 'Authentication Optimization',
    });
  }

  // 6. Customer communication for declines
  const insuffFunds = reasons.find(r => r.reason === 'insufficient_funds');
  if (insuffFunds && insuffFunds.revenueImpact > 1000) {
    recommendations.push({
      id: `rec_${++rank}`,
      rank,
      title: 'Implement declined payment recovery emails',
      description: `"Insufficient Funds" is the #1 decline reason with ${insuffFunds.count} occurrences. Send automated emails within 24 hours inviting customers to retry. Include alternative payment method suggestions.`,
      estimatedImpact: insuffFunds.revenueImpact * 0.15,
      effort: 'low',
      category: 'Customer Recovery',
    });
  }

  // 7. Processing error failover
  if (recoverable.processingErrorRevenue > 500) {
    recommendations.push({
      id: `rec_${++rank}`,
      rank,
      title: 'Add processor failover for gateway errors',
      description: `${recoverable.processingErrors} transactions failed due to processing errors ($${Math.round(recoverable.processingErrorRevenue).toLocaleString()}). Implement automatic failover to a secondary processor when gateway timeouts or issuer unavailability is detected.`,
      estimatedImpact: recoverable.processingErrorRevenue * 0.7,
      effort: 'medium',
      category: 'Infrastructure',
    });
  }

  // Sort by estimated impact
  recommendations.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
  recommendations.forEach((r, i) => {
    r.rank = i + 1;
    r.id = `rec_${i + 1}`;
  });

  return recommendations;
}
