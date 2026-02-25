'use client';

import { useMemo } from 'react';
import { DimensionMetric } from '@/lib/data/schema';

interface CountryBreakdownProps {
  data: DimensionMetric[];
}

const COUNTRY_FLAGS: Record<string, string> = {
  Brazil: 'BR',
  Mexico: 'MX',
  Indonesia: 'ID',
  US: 'US',
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function CountryBreakdown({ data }: CountryBreakdownProps) {
  const { sorted, totalTxns } = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.total - a.total);
    const totalTxns = data.reduce((s, d) => s + d.total, 0);
    return { sorted, totalTxns };
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance by Country</h3>
      <div className="space-y-4">
        {sorted.map(c => {
          const sharePercent = (c.total / totalTxns) * 100;
          const rateColor = c.approvalRate >= 70 ? 'text-green-600' : c.approvalRate >= 55 ? 'text-amber-500' : 'text-red-500';
          const barColor = c.approvalRate >= 70 ? 'bg-green-400' : c.approvalRate >= 55 ? 'bg-amber-400' : 'bg-red-400';

          return (
            <div key={c.value} className="border border-gray-50 rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-500">{COUNTRY_FLAGS[c.value]}</span>
                  <span className="text-sm font-semibold text-gray-800">{c.value}</span>
                  <span className="text-xs text-gray-400">({sharePercent.toFixed(0)}% of traffic)</span>
                </div>
                <span className={`text-lg font-bold ${rateColor}`}>{c.approvalRate.toFixed(1)}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div>
                  <span className="text-gray-400">Transactions</span>
                  <div className="font-semibold text-gray-700">{c.total.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-400">Revenue</span>
                  <div className="font-semibold text-emerald-600">{formatCurrency(c.revenue)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Lost</span>
                  <div className="font-semibold text-red-500">{formatCurrency(c.lostRevenue)}</div>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${c.approvalRate}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
