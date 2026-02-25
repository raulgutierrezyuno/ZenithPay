'use client';

import { Insight } from '@/lib/data/schema';

interface InsightsPanelProps {
  insights: Insight[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-500 text-white', icon: '!' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-500 text-white', icon: '!' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-500 text-white', icon: 'i' },
};

const TYPE_LABELS: Record<string, string> = {
  underperforming_method: 'Payment Method',
  processor_anomaly: 'Processor',
  high_impact_reason: 'Decline Reason',
  geographic_outlier: 'Geography',
  recoverable_revenue: 'Revenue Recovery',
  temporal_anomaly: 'Temporal',
};

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  if (!insights.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Key Findings</h3>
        <span className="text-sm text-gray-400">{insights.length} insights detected</span>
      </div>
      <div className="space-y-3">
        {insights.map(insight => {
          const style = SEVERITY_STYLES[insight.severity];
          return (
            <div key={insight.id} className={`rounded-lg border p-4 ${style.bg} ${style.border}`}>
              <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${style.badge}`}>
                  {style.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-gray-600 font-medium">
                      {TYPE_LABELS[insight.type] || insight.type}
                    </span>
                    {insight.impact > 0 && (
                      <span className="text-xs font-semibold text-red-600">
                        Impact: {formatCurrency(insight.impact)}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">{insight.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">{insight.description}</p>
                  <div className="text-xs text-gray-500 bg-white/50 rounded-md p-2">
                    <strong>Recommendation:</strong> {insight.recommendation}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
