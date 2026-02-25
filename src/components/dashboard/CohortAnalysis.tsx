'use client';

interface CohortAnalysisProps {
  data: {
    newCustomers: { total: number; approved: number; approvalRate: number };
    returningCustomers: { total: number; approved: number; approvalRate: number };
  };
}

export default function CohortAnalysis({ data }: CohortAnalysisProps) {
  const diff = data.returningCustomers.approvalRate - data.newCustomers.approvalRate;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Cohort Analysis</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-gray-100 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-500 mb-2">New Customers</div>
          <div className="text-3xl font-bold text-amber-500 mb-1">{data.newCustomers.approvalRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400">
            {data.newCustomers.approved.toLocaleString()} / {data.newCustomers.total.toLocaleString()} transactions
          </div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full bg-amber-400" style={{ width: `${data.newCustomers.approvalRate}%` }} />
          </div>
        </div>

        <div className="border border-gray-100 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-500 mb-2">Returning Customers</div>
          <div className="text-3xl font-bold text-green-600 mb-1">{data.returningCustomers.approvalRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400">
            {data.returningCustomers.approved.toLocaleString()} / {data.returningCustomers.total.toLocaleString()} transactions
          </div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full bg-green-400" style={{ width: `${data.returningCustomers.approvalRate}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
        <p className="text-xs text-blue-700">
          <strong>Insight:</strong> Returning customers have a <strong>{diff.toFixed(1)}% higher</strong> approval rate than
          new customers. This suggests card-on-file tokenization and established trust relationships improve approval rates.
          Consider implementing account creation incentives and card vaulting to boost rates for new customers.
        </p>
      </div>
    </div>
  );
}
