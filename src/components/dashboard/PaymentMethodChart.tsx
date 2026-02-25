'use client';

import { useMemo } from 'react';
import { DimensionMetric } from '@/lib/data/schema';

interface PaymentMethodChartProps {
  data: DimensionMetric[];
}

const METHOD_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  pix: 'PIX',
  oxxo: 'OXXO',
  gopay: 'GoPay',
};

const METHOD_COLORS: Record<string, string> = {
  credit_card: '#3b82f6',
  pix: '#10b981',
  oxxo: '#f59e0b',
  gopay: '#8b5cf6',
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const { sorted, avgRate } = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.approvalRate - a.approvalRate);
    const totalWeighted = data.reduce((s, d) => s + d.approvalRate * d.total, 0);
    const totalTxns = data.reduce((s, d) => s + d.total, 0);
    const avgRate = totalTxns > 0 ? totalWeighted / totalTxns : 0;
    return { sorted, avgRate };
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Approval Rate by Payment Method</h3>
      <div className="space-y-4">
        {sorted.map(m => {
          const color = METHOD_COLORS[m.value] || '#6b7280';
          const isBelow = m.approvalRate < avgRate - 5;

          return (
            <div key={m.value}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium text-gray-700">{METHOD_LABELS[m.value] || m.value}</span>
                  {isBelow && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                      Below Avg
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">{m.total.toLocaleString()} txns</span>
                  <span className="text-gray-400">Lost: {formatCurrency(m.lostRevenue)}</span>
                  <span className={`font-bold ${isBelow ? 'text-red-500' : 'text-green-600'}`}>
                    {m.approvalRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 relative">
                <div
                  className="h-4 rounded-full transition-all"
                  style={{ width: `${m.approvalRate}%`, backgroundColor: color }}
                />
                {/* Average marker */}
                <div
                  className="absolute top-0 h-4 w-0.5 bg-gray-400"
                  style={{ left: `${avgRate}%` }}
                  title={`Average: ${avgRate.toFixed(1)}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <div className="w-3 h-0.5 bg-gray-400" />
        <span>Average: {avgRate.toFixed(1)}%</span>
      </div>
    </div>
  );
}
