import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useAdmin } from '../../context/AdminContext';
import { Link } from 'react-router-dom';
import { TrendingUp, ChevronRight, Flame, Sparkles } from 'lucide-react';

interface TopProductsWidgetProps {
  activeDateFilter?: 'today' | 'week' | 'month';
}

export const TopProductsWidget: React.FC<TopProductsWidgetProps> = ({ activeDateFilter = 'month' }) => {
  const { products } = useAdmin();

  // Sort by salesCount descending
  const topProducts = [...products]
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5);

  const subtitle =
    activeDateFilter === 'today'
      ? 'Best selling toys today'
      : activeDateFilter === 'week'
      ? 'Best selling toys this week'
      : 'Best selling toys this month';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between pb-3 border-b-0">
        <div>
          <CardTitle>Top Products</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>
        </div>
        <Link
          to="/admin/products"
          className="text-xs font-bold text-[#D90429] hover:text-[#B7092B] flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col justify-between">
        <div className="divide-y divide-slate-100">
          {topProducts.map((product, idx) => (
            <div
              key={product.id}
              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 text-center text-xs font-bold text-slate-400 group-hover:text-slate-900">
                  #{idx + 1}
                </span>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-[#D90429] transition-colors">
                      {product.name}
                    </h4>
                    {product.isBestSeller && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /> Best Seller
                      </span>
                    )}
                    {product.isNewArrival && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-[#16803C] border border-emerald-200">
                        <Sparkles className="w-2.5 h-2.5 text-[#16803C]" /> New
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ₹{product.salePrice || product.price} • {product.category}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-black text-slate-900 flex items-center justify-end gap-1">
                  {product.salesCount} <span className="text-[11px] font-medium text-slate-500">sold</span>
                </span>
                <span className="text-[10px] text-[#16803C] font-bold flex items-center justify-end gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> High demand
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
