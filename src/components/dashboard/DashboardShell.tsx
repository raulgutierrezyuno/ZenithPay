'use client';

import { useState, useEffect, useCallback } from 'react';
import { Filters, MetricsResponse, Insight, Recommendation, Transaction } from '@/lib/data/schema';
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

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.country && filters.country !== 'all') params.set('country', filters.country);
  if (filters.paymentMethod && filters.paymentMethod !== 'all') params.set('paymentMethod', filters.paymentMethod);
  if (filters.processor && filters.processor !== 'all') params.set('processor', filters.processor);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  return params.toString();
}

export default function DashboardShell() {
  const [filters, setFilters] = useState<Filters>({
    country: 'all',
    paymentMethod: 'all',
    processor: 'all',
  });

  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnMeta, setTxnMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'transactions'>('overview');

  const fetchData = useCallback(async (currentFilters: Filters, page: number = 1) => {
    setLoading(true);
    const query = buildQuery(currentFilters);

    try {
      const [metricsRes, insightsRes, txnRes] = await Promise.all([
        fetch(`/api/metrics?${query}`),
        fetch(`/api/insights?${query}`),
        fetch(`/api/transactions?${query}&page=${page}&limit=20`),
      ]);

      const metricsData = await metricsRes.json();
      const insightsData = await insightsRes.json();
      const txnData = await txnRes.json();

      setMetrics(metricsData);
      setInsights(insightsData.insights);
      setRecommendations(insightsData.recommendations);
      setTransactions(txnData.data);
      setTxnMeta({ total: txnData.total, page: txnData.page, totalPages: txnData.totalPages });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [filters, fetchData]);

  const handlePageChange = (page: number) => {
    fetchData(filters, page);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading transaction data...</p>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

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
        <FilterBar filters={filters} onFilterChange={setFilters} />
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
          transactions={transactions}
          total={txnMeta.total}
          page={txnMeta.page}
          totalPages={txnMeta.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
