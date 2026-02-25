'use client';

import { HourlyMetric } from '@/lib/data/schema';

interface HourlyHeatmapProps {
  data: HourlyMetric[];
}

export default function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  if (!data.length) return null;

  const maxRate = Math.max(...data.map(d => d.approvalRate));
  const minRate = Math.min(...data.map(d => d.approvalRate));
  const avgRate = data.reduce((s, d) => s + d.approvalRate, 0) / data.length;

  function getColor(rate: number): string {
    const ratio = (rate - minRate) / (maxRate - minRate || 1);
    if (ratio > 0.7) return 'bg-green-400';
    if (ratio > 0.4) return 'bg-amber-400';
    return 'bg-red-400';
  }

  // SVG bar chart
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 35, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barW = chartW / 24 - 2;

  const yMin = Math.max(0, minRate - 10);
  const yMax = Math.min(100, maxRate + 5);
  const yScale = (v: number) => padding.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Hourly Approval Pattern (UTC)</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Avg: <strong>{avgRate.toFixed(1)}%</strong></span>
          <span className="text-red-500">Peak decline: {minRate.toFixed(1)}%</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Y axis */}
        {[yMin, (yMin + yMax) / 2, yMax].map(v => (
          <g key={v}>
            <line x1={padding.left} y1={yScale(v)} x2={width - padding.right} y2={yScale(v)} stroke="#f0f0f0" />
            <text x={padding.left - 8} y={yScale(v) + 4} textAnchor="end" className="text-[10px] fill-gray-400">{v.toFixed(0)}%</text>
          </g>
        ))}

        {/* Average line */}
        <line x1={padding.left} y1={yScale(avgRate)} x2={width - padding.right} y2={yScale(avgRate)} stroke="#94a3b8" strokeDasharray="4 4" />

        {/* Bars */}
        {data.map((d, i) => {
          const x = padding.left + (i / 24) * chartW + 1;
          const barH = yScale(yMin) - yScale(d.approvalRate);
          const ratio = (d.approvalRate - minRate) / (maxRate - minRate || 1);
          const fill = ratio > 0.7 ? '#4ade80' : ratio > 0.4 ? '#fbbf24' : '#f87171';

          return (
            <g key={i}>
              <rect x={x} y={yScale(d.approvalRate)} width={barW} height={barH} fill={fill} rx={2} opacity={0.8} />
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="text-[9px] fill-gray-400">
                {d.hour}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
