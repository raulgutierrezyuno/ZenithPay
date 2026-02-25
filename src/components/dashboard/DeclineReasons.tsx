'use client';

import { DeclineReasonMetric } from '@/lib/data/schema';

interface DeclineReasonsProps {
  data: DeclineReasonMetric[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  soft_decline: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Soft' },
  hard_decline: { bg: 'bg-red-100', text: 'text-red-700', label: 'Hard' },
  processing_error: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Error' },
};

export default function DeclineReasons({ data }: DeclineReasonsProps) {
  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Decline Reasons</h3>
      <div className="space-y-3">
        {data.map(reason => {
          const cat = CATEGORY_COLORS[reason.category] || CATEGORY_COLORS.processing_error;
          const barWidth = (reason.count / maxCount) * 100;

          return (
            <div key={reason.reason} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{reason.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.bg} ${cat.text}`}>
                    {cat.label}
                  </span>
                  {reason.isRecoverable && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                      Recoverable
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500">{reason.count} txns ({reason.percentage.toFixed(1)}%)</span>
                  <span className="font-semibold text-red-500">{formatCurrency(reason.revenueImpact)}</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    reason.isRecoverable ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
