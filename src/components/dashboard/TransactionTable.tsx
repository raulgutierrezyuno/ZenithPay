'use client';

import { useState } from 'react';
import { Transaction, DECLINE_REASON_LABELS } from '@/lib/data/schema';

interface TransactionTableProps {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const METHOD_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  pix: 'PIX',
  oxxo: 'OXXO',
  gopay: 'GoPay',
};

function formatAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = { BRL: 'R$', MXN: '$', IDR: 'Rp', USD: '$' };
  const sym = symbols[currency] || '$';
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransactionTable({ transactions, total, page, totalPages, onPageChange }: TransactionTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Transaction Details</h3>
        <span className="text-sm text-gray-400">{total.toLocaleString()} transactions</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Amount</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Method</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Country</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Processor</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Decline Reason</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr
                key={t.id}
                className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <td className="py-2 px-3 text-gray-600 text-xs">{new Date(t.timestamp).toLocaleString()}</td>
                <td className="py-2 px-3 font-medium text-gray-700">{formatAmount(t.amount, t.currency)}</td>
                <td className="py-2 px-3 text-gray-600">{METHOD_LABELS[t.paymentMethod] || t.paymentMethod}</td>
                <td className="py-2 px-3 text-gray-600">{t.country}</td>
                <td className="py-2 px-3 text-gray-600">{t.processor}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-500 text-xs">
                  {t.declineReason ? (
                    <div className="flex items-center gap-1">
                      <span>{DECLINE_REASON_LABELS[t.declineReason] || t.declineReason}</span>
                      {t.isRecoverable && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-green-100 text-green-600">R</span>
                      )}
                    </div>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-400">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50 text-gray-600"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50 text-gray-600"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
