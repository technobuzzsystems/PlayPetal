import React, { useState } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

export interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface VendorSalesChartProps {
  data: SalesPoint[];
  range: '7d' | '30d' | '90d' | '1y';
  onRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
  loading?: boolean;
}

export const VendorSalesChart: React.FC<VendorSalesChartProps> = ({
  data,
  range,
  onRangeChange,
  loading = false,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const hasSales = data && data.some((d) => d.revenue > 0 || d.orders > 0);
  const maxRevenue = Math.max(...(data || []).map((d) => d.revenue), 100);
  const totalPeriodRevenue = (data || []).reduce((sum, d) => sum + d.revenue, 0);
  const totalPeriodOrders = (data || []).reduce((sum, d) => sum + d.orders, 0);

  // SVG dimensions
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const points = (data || []).map((d, idx) => {
    const x =
      paddingX +
      (data.length > 1 ? (idx / (data.length - 1)) * chartWidth : chartWidth / 2);
    const y =
      svgHeight - paddingY - (d.revenue / maxRevenue) * chartHeight;
    return { x, y, data: d, index: idx };
  });

  const pathD =
    points.length > 0
      ? points.reduce(
          (acc, p, i) => (i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`),
          ''
        )
      : '';

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x},${svgHeight - paddingY} L ${points[0].x},${svgHeight - paddingY} Z`
      : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      {/* Chart Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Sales Overview</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <TrendingUp className="w-3 h-3" /> Real-time
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Gross seller revenue and order volume calculated from database
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          {(
            [
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: '1y', label: '1 Year' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => onRangeChange(item.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                range === item.id
                  ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Metrics */}
      <div className="flex items-center gap-6 text-xs font-medium">
        <div>
          <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
            Period Revenue
          </span>
          <span className="text-lg font-extrabold text-slate-900">
            ₹{totalPeriodRevenue.toLocaleString()}
          </span>
        </div>
        <div className="border-l border-slate-200 pl-6">
          <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
            Period Orders
          </span>
          <span className="text-lg font-extrabold text-slate-900">{totalPeriodOrders}</span>
        </div>
        <div className="border-l border-slate-200 pl-6 hidden sm:block">
          <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
            Comparison
          </span>
          <span className="text-xs font-bold text-slate-500">Current period</span>
        </div>
      </div>

      {/* Chart Body / Empty State */}
      <div className="relative min-h-[220px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-2xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasSales ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300" />
            <span className="text-xs font-bold text-slate-600">No sales data available</span>
            <span className="text-[11px] text-slate-400">
              No orders were recorded for the selected date range.
            </span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto scrollbar-none">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto min-w-[500px]"
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={paddingX}
                y1={svgHeight - paddingY}
                x2={svgWidth - paddingX}
                y2={svgHeight - paddingY}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <line
                x1={paddingX}
                y1={svgHeight / 2}
                x2={svgWidth - paddingX}
                y2={svgHeight / 2}
                stroke="#F1F5F9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Area Path */}
              {areaD && <path d={areaD} fill="url(#salesGradient)" />}

              {/* Line Path */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {points.map((p, idx) => {
                const isHovered = hoverIndex === idx;
                return (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 6 : 3.5}
                      className="fill-indigo-600 stroke-white stroke-2 cursor-pointer transition-all"
                      onMouseEnter={() => setHoverIndex(idx)}
                      onMouseLeave={() => setHoverIndex(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoverIndex !== null && points[hoverIndex] && (
              <div
                className="absolute bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl pointer-events-none z-20 border border-slate-700/80 -translate-x-1/2 -translate-y-full mb-2"
                style={{
                  left: `${(points[hoverIndex].x / svgWidth) * 100}%`,
                  top: `${(points[hoverIndex].y / svgHeight) * 100}%`,
                }}
              >
                <div className="font-bold text-slate-200">
                  {points[hoverIndex].data.date}
                </div>
                <div className="text-emerald-400 font-extrabold mt-0.5">
                  ₹{points[hoverIndex].data.revenue.toLocaleString()}
                </div>
                <div className="text-slate-400 text-[10px]">
                  {points[hoverIndex].data.orders} Order
                  {points[hoverIndex].data.orders !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
