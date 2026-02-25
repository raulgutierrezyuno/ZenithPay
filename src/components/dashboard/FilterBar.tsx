'use client';

import { Filters } from '@/lib/data/schema';

interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const update = (key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value || undefined });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Country</label>
          <select
            value={filters.country || 'all'}
            onChange={e => update('country', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="all">All Countries</option>
            <option value="Brazil">Brazil</option>
            <option value="Mexico">Mexico</option>
            <option value="Indonesia">Indonesia</option>
            <option value="US">United States</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Payment Method</label>
          <select
            value={filters.paymentMethod || 'all'}
            onChange={e => update('paymentMethod', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="all">All Methods</option>
            <option value="credit_card">Credit Card</option>
            <option value="pix">PIX</option>
            <option value="oxxo">OXXO</option>
            <option value="gopay">GoPay</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Processor</label>
          <select
            value={filters.processor || 'all'}
            onChange={e => update('processor', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="all">All Processors</option>
            <option value="StripeConnect">StripeConnect</option>
            <option value="AdyenLatam">AdyenLatam</option>
            <option value="PayUBrasil">PayUBrasil</option>
            <option value="ConektaMX">ConektaMX</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">From</label>
          <input
            type="date"
            value={filters.dateFrom?.substring(0, 10) || ''}
            onChange={e => update('dateFrom', e.target.value ? e.target.value + 'T00:00:00Z' : '')}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">To</label>
          <input
            type="date"
            value={filters.dateTo?.substring(0, 10) || ''}
            onChange={e => update('dateTo', e.target.value ? e.target.value + 'T23:59:59Z' : '')}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <button
          onClick={() => onFilterChange({ country: 'all', paymentMethod: 'all', processor: 'all' })}
          className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
