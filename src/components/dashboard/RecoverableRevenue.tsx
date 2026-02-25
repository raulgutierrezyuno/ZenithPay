'use client';

interface RecoverableRevenueProps {
  data: {
    softDeclines: number;
    hardDeclines: number;
    processingErrors: number;
    softDeclineRevenue: number;
    hardDeclineRevenue: number;
    processingErrorRevenue: number;
  };
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function RecoverableRevenue({ data }: RecoverableRevenueProps) {
  const totalDeclines = data.softDeclines + data.hardDeclines + data.processingErrors;
  const totalRevenue = data.softDeclineRevenue + data.hardDeclineRevenue + data.processingErrorRevenue;
  const recoverableRevenue = data.softDeclineRevenue + data.processingErrorRevenue;
  const recoverablePercent = totalRevenue > 0 ? (recoverableRevenue / totalRevenue) * 100 : 0;

  const segments = [
    {
      label: 'Soft Declines',
      count: data.softDeclines,
      revenue: data.softDeclineRevenue,
      color: '#fbbf24',
      recoverable: true,
      desc: 'Insufficient funds, velocity limits, 3DS failures',
    },
    {
      label: 'Hard Declines',
      count: data.hardDeclines,
      revenue: data.hardDeclineRevenue,
      color: '#ef4444',
      recoverable: false,
      desc: 'Stolen card, fraud, expired card, invalid card',
    },
    {
      label: 'Processing Errors',
      count: data.processingErrors,
      revenue: data.processingErrorRevenue,
      color: '#3b82f6',
      recoverable: true,
      desc: 'Gateway timeouts, issuer unavailable',
    },
  ];

  // Donut chart SVG
  const size = 160;
  const center = size / 2;
  const radius = 60;
  const innerRadius = 40;
  let startAngle = -90;

  const arcs = segments.map(seg => {
    const percent = totalDeclines > 0 ? (seg.count / totalDeclines) * 100 : 0;
    const angle = (percent / 100) * 360;
    const endAngle = startAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    const ix1 = center + innerRadius * Math.cos(startRad);
    const iy1 = center + innerRadius * Math.sin(startRad);
    const ix2 = center + innerRadius * Math.cos(endRad);
    const iy2 = center + innerRadius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

    startAngle = endAngle;

    return { ...seg, percent, path };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Decline Category Breakdown</h3>
      <div className="flex items-center gap-8">
        <div className="flex-shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {arcs.map((arc, i) => (
              <path key={i} d={arc.path} fill={arc.color} opacity={0.85} />
            ))}
            <text x={center} y={center - 5} textAnchor="middle" className="text-[11px] fill-gray-500 font-medium">Recoverable</text>
            <text x={center} y={center + 12} textAnchor="middle" className="text-[14px] fill-gray-800 font-bold">{recoverablePercent.toFixed(0)}%</text>
          </svg>
        </div>
        <div className="flex-1 space-y-3">
          {segments.map(seg => (
            <div key={seg.label} className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{seg.label}</span>
                  {seg.recoverable && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Recoverable</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{seg.desc}</div>
                <div className="text-sm mt-0.5">
                  <span className="text-gray-600">{seg.count.toLocaleString()} txns</span>
                  <span className="text-gray-300 mx-2">|</span>
                  <span className="font-semibold text-red-500">{formatCurrency(seg.revenue)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
