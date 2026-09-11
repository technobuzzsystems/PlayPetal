import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { revenueData } from '../../data/dashboard';

type Timeframe = 'today' | 'weekly' | 'monthly' | 'yearly';

interface RevenueChartProps {
  dateFilter?: 'today' | 'week' | 'month';
  onFilterChange?: (filter: 'today' | 'week' | 'month') => void;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ dateFilter, onFilterChange }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>(
    dateFilter === 'today' ? 'today' : dateFilter === 'week' ? 'weekly' : 'monthly'
  );
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    amount: number;
    orders: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (dateFilter === 'today') setTimeframe('today');
    else if (dateFilter === 'week') setTimeframe('weekly');
    else if (dateFilter === 'month') setTimeframe('monthly');
  }, [dateFilter]);

  const data = revenueData[timeframe] || revenueData.monthly;
  const maxAmount = Math.max(...data.map((d) => d.amount)) * 1.15;
  const minAmount = 0;

  // Chart coordinate dimensions
  const width = 600;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.amount - minAmount) / (maxAmount - minAmount)) * chartHeight;
    return { ...d, x, y };
  });

  // Construct SVG path string for smooth cubic bezier curve
  const getCurvedPath = (pts: typeof points) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getCurvedPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  const currentTotal =
    timeframe === 'today'
      ? 2557
      : timeframe === 'weekly'
      ? 8802
      : timeframe === 'yearly'
      ? 168000
      : 12450;

  const currentLabel =
    timeframe === 'today'
      ? 'Today (2 orders)'
      : timeframe === 'weekly'
      ? 'This Week (6 orders)'
      : timeframe === 'yearly'
      ? 'In 2026'
      : 'In September 2026';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between pb-2 border-b-0">
        <div>
          <CardTitle>Revenue Overview</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Sales trends and gross volume</p>
        </div>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'yearly', label: 'Yearly' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTimeframe(item.id);
                setHoveredPoint(null);
                if (onFilterChange) {
                  if (item.id === 'today') onFilterChange('today');
                  else if (item.id === 'weekly') onFilterChange('week');
                  else if (item.id === 'monthly') onFilterChange('month');
                }
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize ${
                timeframe === item.id
                  ? 'bg-[#D90429] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-2 flex-1 flex flex-col justify-end">
        {/* Dynamic Metric Display */}
        <div className="flex items-baseline gap-2 mb-2 px-1">
          <span className="text-2xl font-black text-slate-900">
            {hoveredPoint ? `₹${hoveredPoint.amount.toLocaleString()}` : `₹${currentTotal.toLocaleString()}`}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {hoveredPoint ? `(${hoveredPoint.orders} orders in ${hoveredPoint.label})` : currentLabel}
          </span>
        </div>

        {/* SVG Chart Container */}
        <div className="w-full relative select-none">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-56 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D90429" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#D90429" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingTop + chartHeight * (1 - ratio);
              const val = Math.round(minAmount + ratio * maxAmount);
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-bold"
                  >
                    ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <path d={areaPath} fill="url(#revenueGradient)" />

            {/* Line Stroke */}
            <path
              d={linePath}
              fill="none"
              stroke="#D90429"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Points & X-Labels */}
            {points.map((pt, i) => (
              <g key={i}>
                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  className={`text-[11px] font-bold transition-colors ${
                    hoveredPoint?.label === pt.label ? 'fill-[#D90429] font-black' : 'fill-slate-500'
                  }`}
                >
                  {pt.label}
                </text>

                {/* Point dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint?.label === pt.label ? 6 : 4}
                  className="fill-white stroke-[#D90429] stroke-2 cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredPoint(pt)}
                />

                {/* Invisible hover hotspot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="16"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                />
              </g>
            ))}

            {/* Vertical crosshair on hover */}
            {hoveredPoint && (
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={paddingTop + chartHeight}
                stroke="#D90429"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            )}
          </svg>

          {/* Floating Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-slate-900 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full z-20"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100 - 8}%`,
              }}
            >
              <p className="font-black text-amber-400">₹{hoveredPoint.amount.toLocaleString()}</p>
              <p className="text-[10px] text-slate-300">
                {hoveredPoint.orders} orders ({hoveredPoint.label})
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
