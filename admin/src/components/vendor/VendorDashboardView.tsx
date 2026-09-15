import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  TrendingUp,
  Package,
  AlertTriangle,
  Truck,
  DollarSign,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  MapPin,
  Star,
  Store,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { VendorSalesChart } from './VendorSalesChart';
import { VendorOrdersChart } from './VendorOrdersChart';
import { VendorTrackingModal } from '../VendorTrackingModal';
import { useAuth } from '../../context/AuthContext';

interface VendorDashboardViewProps {
  vendorId: string;
  onNavigateTab: (tab: string) => void;
}

export const VendorDashboardView: React.FC<VendorDashboardViewProps> = ({
  vendorId,
  onNavigateTab,
}) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [salesRange, setSalesRange] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [trackingOrder, setTrackingOrder] = useState<{
    suborderId: string;
    orderNumber: string;
    vendorId: string;
  } | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE}/vendor/${vendorId}/dashboard`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn('Failed to load vendor dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [vendorId]);

  const kpi = data?.kpi || {
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalGrossSales: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    activeShipments: 0,
    pendingPayout: 0,
  };

  const salesTrend = data?.salesTrends?.[salesRange] || [];
  const lifecycle = data?.lifecycle || {
    new: 0,
    acceptedProcessing: 0,
    readyToShip: 0,
    shippedInTransit: 0,
    delivered: 0,
    completed: 0,
    cancelledRejected: 0,
    returnRefund: 0,
  };
  const shipments = data?.shipments || {};
  const financials = data?.financials || { available: 0, reserved: 0, paid: 0, failed: 0 };
  const recentOrders = data?.recentOrders || [];
  const topProducts = data?.topProducts || [];
  const inventoryAlerts = data?.inventoryAlerts || [];
  const reviews = data?.reviews || { totalReviews: 0, averageRating: 5.0, ratingBreakdown: {} };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-indigo-400 text-xs font-black uppercase tracking-wider">
            <Store className="w-4 h-4 text-indigo-400" />
            <span>Shopkeeper Seller Portal</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Welcome back, {user?.name || 'Shopkeeper'}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-medium">
            Here's what's happening with your shop inventory, orders &amp; shipments today.
          </p>
          {lastUpdated && (
            <span className="inline-block text-[11px] text-slate-400 mt-2 font-mono">
              Last updated: {lastUpdated}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Data</span>
          </button>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Storefront</span>
          </a>
        </div>
      </div>

      {/* 2. Top 8 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {kpi.totalOrders.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">Current period</div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pending Orders
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpi.pendingOrders}</div>
          <div className="text-[11px] font-medium text-amber-600 mt-1">Requires action</div>
        </div>

        {/* Completed Orders */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Completed
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpi.completedOrders}</div>
          <div className="text-[11px] font-medium text-emerald-600 mt-1">Fulfilled</div>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Gross Sales
            </span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{kpi.totalGrossSales.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">Order totals</div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              My Products
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpi.totalProducts}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">Active catalog</div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Low Stock
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpi.lowStockProducts}</div>
          <div className="text-[11px] font-medium text-rose-600 mt-1">Stock ≤ 10</div>
        </div>

        {/* Active Shipments */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Shipments
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpi.activeShipments}</div>
          <div className="text-[11px] font-medium text-sky-600 mt-1">In transit</div>
        </div>

        {/* Pending Payout */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Available Payout
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{kpi.pendingPayout.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-purple-600 mt-1">Eligible settlement</div>
        </div>
      </div>

      {/* 3. Sales Graph & Order Lifecycle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VendorSalesChart
            data={salesTrend}
            range={salesRange}
            onRangeChange={(r) => setSalesRange(r)}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-1">
          <VendorOrdersChart
            lifecycle={lifecycle}
            onSelectTab={() => onNavigateTab('orders')}
          />
        </div>
      </div>

      {/* 4. Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Shop Orders</h3>
            <p className="text-xs text-slate-500 font-medium">
              Authorized customer suborders belonging to your shop
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>View All Orders</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No recent orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-3">Order Number</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Products</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">{ord.customerName}</td>
                    <td className="py-3 px-3 font-medium text-slate-600 truncate max-w-[200px]">
                      {ord.productSummary}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      ₹{ord.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {['READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(
                          String(ord.status).toUpperCase()
                        ) && (
                          <button
                            onClick={() =>
                              setTrackingOrder({
                                suborderId: ord.suborderId,
                                orderNumber: ord.orderNumber,
                                vendorId,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Track</span>
                          </button>
                        )}
                        <button
                          onClick={() => onNavigateTab('orders')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Inventory Alerts & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Top Seller Products</h3>
              <p className="text-xs text-slate-500 font-medium">Ranked by actual sales volume</p>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Manage Catalog
            </button>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs font-medium">
              No top products recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p: any, idx: number) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {p.unitsSold} units sold • {p.stock} in stock
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">
                    ₹{p.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Inventory Stock Alerts</h3>
              <p className="text-xs text-slate-500 font-medium">
                Items requiring restock or stock update
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-bold text-rose-600 hover:text-rose-800"
            >
              Update Stock
            </button>
          </div>

          {inventoryAlerts.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs font-medium">
              🎉 All product inventory levels are healthy!
            </div>
          ) : (
            <div className="space-y-3">
              {inventoryAlerts.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        item.stock === 0 ? 'text-rose-600' : 'text-amber-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        item.stock === 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {item.status}: {item.stock} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delivery Overview, Financial Summary, and Customer Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Delivery Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-600" /> Delivery Overview
            </h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Live Carrier States</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-semibold">AWB Assigned</span>
              <span className="text-sm font-extrabold text-slate-900">{shipments.AWB_ASSIGNED || 0}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
              <span className="text-[10px] text-sky-600 block font-semibold">In Transit</span>
              <span className="text-sm font-extrabold text-sky-900">{shipments.IN_TRANSIT || 0}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] text-amber-700 block font-semibold">Out for Delivery</span>
              <span className="text-sm font-extrabold text-amber-900">{shipments.OUT_FOR_DELIVERY || 0}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block font-semibold">Delivered</span>
              <span className="text-sm font-extrabold text-emerald-900">{shipments.DELIVERED || 0}</span>
            </div>
          </div>
        </div>

        {/* Financial Payout Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-600" /> Financial Payout Summary
            </h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Settlement</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="font-semibold text-emerald-800">Available for Payout</span>
              <span className="font-black text-emerald-900">₹{financials.available.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-xl bg-amber-50/60 border border-amber-100">
              <span className="font-semibold text-amber-800">Reserved / Processing</span>
              <span className="font-black text-amber-900">₹{financials.reserved.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-600">Disbursed (Paid)</span>
              <span className="font-black text-slate-900">₹{financials.paid.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Customer Reviews Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> Customer Rating &amp; Reviews
            </h3>
            <button
              onClick={() => onNavigateTab('reviews')}
              className="text-xs font-bold text-amber-600 hover:text-amber-800"
            >
              View Reviews
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center p-3 rounded-2xl bg-amber-50 border border-amber-200 shrink-0">
              <div className="text-2xl font-black text-amber-900">{reviews.averageRating}</div>
              <div className="flex items-center justify-center gap-0.5 mt-0.5 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3 h-3 fill-amber-400" />
                ))}
              </div>
              <span className="text-[10px] font-bold text-amber-700 mt-1 block">
                {reviews.totalReviews} Reviews
              </span>
            </div>
            <div className="flex-1 space-y-1 text-[11px] font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>5 Stars</span>
                <span>{reviews.ratingBreakdown?.[5] || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>4 Stars</span>
                <span>{reviews.ratingBreakdown?.[4] || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>3 Stars</span>
                <span>{reviews.ratingBreakdown?.[3] || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Quick Shop Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigateTab('add')}
            className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-900 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-5 h-5 text-amber-600" />
            <span className="text-xs font-bold text-center">Add Product</span>
          </button>
          <button
            onClick={() => onNavigateTab('products')}
            className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Package className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold text-center">Manage Products</span>
          </button>
          <button
            onClick={() => onNavigateTab('orders')}
            className="p-3 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100 text-sky-900 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <ShoppingBag className="w-5 h-5 text-sky-600" />
            <span className="text-xs font-bold text-center">View Orders</span>
          </button>
          <button
            onClick={() => onNavigateTab('delivery')}
            className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-900 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <MapPin className="w-5 h-5 text-rose-600" />
            <span className="text-xs font-bold text-center">Delivery Areas</span>
          </button>
          <button
            onClick={() => onNavigateTab('reviews')}
            className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-900 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Star className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold text-center">Customer Reviews</span>
          </button>
          <button
            onClick={() => onNavigateTab('profile')}
            className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100 text-teal-900 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Store className="w-5 h-5 text-teal-600" />
            <span className="text-xs font-bold text-center">Shop Profile</span>
          </button>
        </div>
      </div>

      {/* Tracking Modal Integration */}
      {trackingOrder && (
        <VendorTrackingModal
          suborderId={trackingOrder.suborderId}
          vendorId={trackingOrder.vendorId}
          orderNumber={trackingOrder.orderNumber}
          isOpen={!!trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </div>
  );
};
