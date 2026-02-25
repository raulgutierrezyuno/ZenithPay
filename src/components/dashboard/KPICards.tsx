'use client';

import { KPIMetrics } from '@/lib/data/schema';

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  color: string;
  icon: string;
}

function KPICard({ title, value, subtitle, color, icon }: KPICardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span className={`text-2xl ${color}`}>{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-sm text-gray-400">{subtitle}</div>
    </div>
  );
}

interface KPICardsProps {
  kpis: KPIMetrics;
}

export default function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Approval Rate"
        value={`${kpis.approvalRate.toFixed(1)}%`}
        subtitle={`${formatNumber(kpis.approved)} of ${formatNumber(kpis.totalTransactions)} transactions`}
        color={kpis.approvalRate < 70 ? 'text-red-600' : 'text-green-600'}
        icon={kpis.approvalRate < 70 ? '!' : ''}
      />
      <KPICard
        title="Total Revenue"
        value={formatCurrency(kpis.totalRevenue)}
        subtitle={`${formatNumber(kpis.approved)} approved transactions`}
        color="text-emerald-600"
        icon=""
      />
      <KPICard
        title="Lost Revenue"
        value={formatCurrency(kpis.lostRevenue)}
        subtitle={`${formatNumber(kpis.declined)} declined transactions`}
        color="text-red-500"
        icon=""
      />
      <KPICard
        title="Recoverable Revenue"
        value={formatCurrency(kpis.recoverableRevenue)}
        subtitle={`${((kpis.recoverableRevenue / kpis.lostRevenue) * 100).toFixed(0)}% of lost revenue`}
        color="text-amber-500"
        icon=""
      />
    </div>
  );
}
