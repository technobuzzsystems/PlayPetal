import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { useAdmin } from '../../context/AdminContext';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export const LowStockWidget: React.FC = () => {
  const { inventory } = useAdmin();

  // Find items where currentStock <= minThreshold or Out of Stock
  const lowStockItems = inventory
    .filter((item) => item.status === 'Low Stock' || item.status === 'Out of Stock')
    .slice(0, 4);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between pb-3 border-b-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <CardTitle>Low Stock Products</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Items requiring warehouse replenishment</p>
          </div>
        </div>
        <Link
          to="/admin/inventory"
          className="text-xs font-bold text-[#D90429] hover:text-[#B7092B] flex items-center gap-0.5"
        >
          Manage inventory <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="pt-0 flex-1">
        {lowStockItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            All inventory levels are healthy.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {item.productName}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {item.sku}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900">
                      {item.currentStock}
                    </span>
                    <span className="text-[10px] text-slate-500 block">units left</span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
