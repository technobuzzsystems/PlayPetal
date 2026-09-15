import React from 'react';
import { Package, CheckCircle2, Clock, Truck, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';

export interface OrderLifecycleData {
  new: number;
  acceptedProcessing: number;
  readyToShip: number;
  shippedInTransit: number;
  delivered: number;
  completed: number;
  cancelledRejected: number;
  returnRefund: number;
}

interface VendorOrdersChartProps {
  lifecycle: OrderLifecycleData;
  onSelectTab?: (tab: string) => void;
}

export const VendorOrdersChart: React.FC<VendorOrdersChartProps> = ({
  lifecycle,
  onSelectTab,
}) => {
  const total =
    (lifecycle.new || 0) +
    (lifecycle.acceptedProcessing || 0) +
    (lifecycle.readyToShip || 0) +
    (lifecycle.shippedInTransit || 0) +
    (lifecycle.delivered || 0) +
    (lifecycle.completed || 0) +
    (lifecycle.cancelledRejected || 0) +
    (lifecycle.returnRefund || 0);

  const stages = [
    {
      id: 'NEW',
      label: 'New Orders',
      count: lifecycle.new || 0,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: Clock,
    },
    {
      id: 'ACCEPTED_PROCESSING',
      label: 'Accepted / Processing',
      count: lifecycle.acceptedProcessing || 0,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      icon: Package,
    },
    {
      id: 'READY_TO_SHIP',
      label: 'Ready to Ship',
      count: lifecycle.readyToShip || 0,
      color: 'bg-sky-500',
      bgColor: 'bg-sky-50 border-sky-200 text-sky-900',
      icon: RefreshCw,
    },
    {
      id: 'SHIPPED_IN_TRANSIT',
      label: 'Shipped / In Transit',
      count: lifecycle.shippedInTransit || 0,
      color: 'bg-blue-600',
      bgColor: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: Truck,
    },
    {
      id: 'DELIVERED',
      label: 'Delivered',
      count: lifecycle.delivered || 0,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: CheckCircle2,
    },
    {
      id: 'COMPLETED',
      label: 'Completed',
      count: lifecycle.completed || 0,
      color: 'bg-teal-600',
      bgColor: 'bg-teal-50 border-teal-200 text-teal-900',
      icon: CheckCircle2,
    },
    {
      id: 'CANCELLED_REJECTED',
      label: 'Cancelled / Rejected',
      count: lifecycle.cancelledRejected || 0,
      color: 'bg-rose-500',
      bgColor: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: XCircle,
    },
    {
      id: 'RETURN_REFUND',
      label: 'Return / Refund',
      count: lifecycle.returnRefund || 0,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 border-purple-200 text-purple-900',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Order Lifecycle Distribution</h3>
          <p className="text-xs text-slate-500 font-medium">
            Live suborder counts derived from PostgreSQL
          </p>
        </div>
        <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
          {total} Suborder{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Progress Multi-Bar */}
      {total > 0 ? (
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-2xs">
          {stages.map(
            (st) =>
              st.count > 0 && (
                <div
                  key={st.id}
                  style={{ width: `${(st.count / total) * 100}%` }}
                  className={`${st.color} transition-all duration-300`}
                  title={`${st.label}: ${st.count}`}
                />
              )
          )}
        </div>
      ) : (
        <div className="w-full h-3 bg-slate-100 rounded-full" />
      )}

      {/* Grid of Interactive Lifecycle Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {stages.map((st) => {
          const Icon = st.icon;
          const percentage = total > 0 ? Math.round((st.count / total) * 100) : 0;
          return (
            <div
              key={st.id}
              onClick={() => onSelectTab && onSelectTab(st.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-2xs ${st.bgColor}`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4 opacity-80" />
                <span className="text-[10px] font-bold opacity-60">{percentage}%</span>
              </div>
              <div className="text-lg font-extrabold mt-1">{st.count}</div>
              <div className="text-[11px] font-semibold truncate mt-0.5">{st.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
