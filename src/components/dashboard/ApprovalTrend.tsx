'use client';

import { useMemo } from 'react';
import { TimeSeriesPoint } from '@/lib/data/schema';

interface ApprovalTrendProps {
  data: TimeSeriesPoint[];
}

export default function ApprovalTrend({ data }: ApprovalTrendProps) {
  const chartData = useMemo(() => {
    if (!data.length) return null;

    const maxRate = Math.max(...data.map(d => d.approvalRate));
    const minRate = Math.min(...data.map(d => d.approvalRate));
    const avgRate = data.reduce((s, d) => s + d.approvalRate, 0) / data.length;

    const width = 800;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const yMin = Math.max(0, minRate - 10);
    const yMax = Math.min(100, maxRate + 5);

    const xScale = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
    const yScale = (v: number) => padding.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

    const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.approvalRate)}`).join(' ');
    const areaPath = linePath + ` L ${xScale(data.length - 1)} ${yScale(yMin)} L ${xScale(0)} ${yScale(yMin)} Z`;

    const yTicks: number[] = [];
    for (let v = Math.ceil(yMin / 5) * 5; v <= yMax; v += 5) {
      yTicks.push(v);
    }

    const xLabels: { index: number; label: string }[] = [];
    const step = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += step) {
      const d = new Date(data[i].date);
      xLabels.push({ index: i, label: `${d.getMonth() + 1}/${d.getDate()}` });
    }

    return { maxRate, minRate, avgRate, width, height, padding, yMin, yMax, xScale, yScale, linePath, areaPath, yTicks, xLabels };
  }, [data]);

  if (!chartData) return null;

  const { maxRate, minRate, avgRate, width, height, padding, xScale, yScale, linePath, areaPath, yTicks, xLabels } = chartData;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Approval Rate Trend</h3>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Avg: <strong className="text-gray-700">{avgRate.toFixed(1)}%</strong></span>
          <span>Min: <strong className="text-red-500">{minRate.toFixed(1)}%</strong></span>
          <span>Max: <strong className="text-green-500">{maxRate.toFixed(1)}%</strong></span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={padding.left} y1={yScale(v)} x2={width - padding.right} y2={yScale(v)} stroke="#f0f0f0" />
            <text x={padding.left - 8} y={yScale(v) + 4} textAnchor="end" className="text-[10px] fill-gray-400">{v}%</text>
          </g>
        ))}

        {/* Average line */}
        <line
          x1={padding.left} y1={yScale(avgRate)}
          x2={width - padding.right} y2={yScale(avgRate)}
          stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1}
        />

        {/* Area */}
        <path d={areaPath} fill="url(#areaGradient)" opacity={0.3} />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2} />

        {/* X labels */}
        {xLabels.map(({ index, label }) => (
          <text key={index} x={xScale(index)} y={height - 8} textAnchor="middle" className="text-[10px] fill-gray-400">{label}</text>
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
