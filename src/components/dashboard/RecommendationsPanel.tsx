'use client';

import { Recommendation } from '@/lib/data/schema';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

const EFFORT_STYLES: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700' },
  high: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  if (!recommendations.length) return null;

  const totalImpact = recommendations.reduce((s, r) => s + r.estimatedImpact, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Action Plan</h3>
        <div className="text-sm">
          <span className="text-gray-400">Total estimated recovery: </span>
          <span className="font-bold text-emerald-600">{formatCurrency(totalImpact)}/month</span>
        </div>
      </div>
      <div className="space-y-3">
        {recommendations.map(rec => {
          const effort = EFFORT_STYLES[rec.effort] || EFFORT_STYLES.medium;
          return (
            <div key={rec.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                  {rec.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-gray-800">{rec.title}</h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{rec.description}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{rec.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${effort.bg} ${effort.text}`}>
                      Effort: {rec.effort}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600">
                      +{formatCurrency(rec.estimatedImpact)}/mo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
