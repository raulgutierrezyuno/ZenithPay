'use client';

import { DimensionMetric } from '@/lib/data/schema';

interface ProcessorComparisonProps {
  data: DimensionMetric[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

const PROCESSOR_COLORS: Record<string, string> = {
  StripeConnect: '#635bff',
  AdyenLatam: '#0abf53',
  PayUBrasil: '#00a650',
  ConektaMX: '#0d2b45',
};

export default function ProcessorComparison({ data }: ProcessorComparisonProps) {
  const sorted = [...data].sort((a, b) => b.approvalRate - a.approvalRate);
  const avgRate = data.reduce((s, d) => s + d.approvalRate * d.total, 0) / data.reduce((s, d) => s + d.total, 0);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Processor Performance</h3>
        {best && worst && (
          <span className="text-xs text-gray-400">
            Gap: {(best.approvalRate - worst.approvalRate).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="space-y-4">
        {sorted.map((p, i) => {
          const color = PROCESSOR_COLORS[p.value] || '#6b7280';
          const isWorst = i === sorted.length - 1 && sorted.length > 1;
          const isBest = i === 0;

          return (
            <div key={p.value} className={`rounded-lg p-3 ${isWorst ? 'bg-red-50 border border-red-100' : 'hover:bg-gray-50'} transition-colors`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold text-gray-800">{p.value}</span>
                  {isBest && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Best</span>}
                  {isWorst && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Worst</span>}
                </div>
                <span className={`text-lg font-bold ${isWorst ? 'text-red-500' : isBest ? 'text-green-600' : 'text-gray-700'}`}>
                  {p.approvalRate.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Volume</span>
                  <div className="font-semibold text-gray-600">{p.total.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-400">Revenue</span>
                  <div className="font-semibold text-emerald-600">{formatCurrency(p.revenue)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Lost</span>
                  <div className="font-semibold text-red-500">{formatCurrency(p.lostRevenue)}</div>
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full" style={{ width: `${p.approvalRate}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-gray-400">Average: {avgRate.toFixed(1)}%</div>
    </div>
  );
}
