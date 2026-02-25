'use client';

import { useState, useMemo } from 'react';
import { Filters, Transaction } from '@/lib/data/schema';
import { generateTransactions } from '@/lib/data/generator';
import { filterTransactions } from '@/lib/data/store';
import { computeAllMetrics } from '@/lib/analysis/metrics';
import { detectAllInsights } from '@/lib/analysis/anomaly';
import { generateRecommendations } from '@/lib/analysis/recommendations';
import KPICards from './KPICards';
import FilterBar from './FilterBar';
import ApprovalTrend from './ApprovalTrend';
import DeclineReasons from './DeclineReasons';
import PaymentMethodChart from './PaymentMethodChart';
import CountryBreakdown from './CountryBreakdown';
import ProcessorComparison from './ProcessorComparison';
import HourlyHeatmap from './HourlyHeatmap';
import RecoverableRevenue from './RecoverableRevenue';
import InsightsPanel from './InsightsPanel';
import RecommendationsPanel from './RecommendationsPanel';
import CohortAnalysis from './CohortAnalysis';
import TransactionTable from './TransactionTable';

// Generate transactions once on module load (deterministic with seed)
let _allTransactions: Transaction[] | null = null;
function getAllTransactions(): Transaction[] {
  if (!_allTransactions) {
    _allTransactions = generateTransactions(5500, 42);
  }
  return _allTransactions;
}

export default function DashboardShell() {
  const [filters, setFilters] = useState<Filters>({
    country: 'all',
    paymentMethod: 'all',
    processor: 'all',
  });

  const [txnPage, setTxnPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'transactions'>('overview');

  const allTransactions = useMemo(() => getAllTransactions(), []);

  const filtered = useMemo(
    () => filterTransactions(allTransactions, filters),
    [allTransactions, filters]
  );

  const metrics = useMemo(() => computeAllMetrics(filtered), [filtered]);
  const insights = useMemo(() => detectAllInsights(filtered), [filtered]);
  const recommendations = useMemo(() => generateRecommendations(filtered), [filtered]);

  const txnLimit = 20;
  const txnMeta = useMemo(() => {
    const total = filtered.length;
    const totalPages = Math.ceil(total / txnLimit);
    const start = (txnPage - 1) * txnLimit;
    const paginated = filtered.slice(start, start + txnLimit);
    return { data: paginated, total, page: txnPage, totalPages };
  }, [filtered, txnPage]);

  const handlePageChange = (page: number) => {
    setTxnPage(page);
  };

  // Reset pagination when filters change
  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setTxnPage(1);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">VitaHealth Decline Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Payment approval analysis across {metrics.kpis.totalTransactions.toLocaleString()} transactions
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />
      </div>

      {/* KPIs */}
      <div className="mb-6">
        <KPICards kpis={metrics.kpis} />
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          {[
            { key: 'overview' as const, label: 'Overview' },
            { key: 'insights' as const, label: `Insights (${insights.length})` },
            { key: 'transactions' as const, label: 'Transactions' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top insights banner */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-amber-50 border border-red-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Top Finding</h3>
              <p className="text-sm text-gray-700">{insights[0].title}</p>
              <p className="text-xs text-gray-500 mt-1">{insights[0].description}</p>
            </div>
          )}

          {/* Row 1: Trend + Decline Reasons */}
          <ApprovalTrend data={metrics.timeSeries} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentMethodChart data={metrics.byPaymentMethod} />
            <ProcessorComparison data={metrics.byProcessor} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CountryBreakdown data={metrics.byCountry} />
            <DeclineReasons data={metrics.topDeclineReasons} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecoverableRevenue data={metrics.recoverableBreakdown} />
            <CohortAnalysis data={metrics.cohort} />
          </div>

          <HourlyHeatmap data={metrics.hourlyPattern} />
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          <InsightsPanel insights={insights} />
          <RecommendationsPanel recommendations={recommendations} />
        </div>
      )}

      {activeTab === 'transactions' && (
        <TransactionTable
          transactions={txnMeta.data}
          total={txnMeta.total}
          page={txnMeta.page}
          totalPages={txnMeta.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
