"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { api, Order } from "../../services/api";
import {
  Package,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Truck,
  Sparkles,
  ArrowRight,
  MapPin,
  RefreshCcw,
  AlertTriangle,
  Loader2,
  X,
  ExternalLink,
  Info
} from "lucide-react";

export interface TrackingEvent {
  id: string;
  providerEventId: string;
  providerStatus: string;
  normalizedStatus: string;
  location?: string;
  description?: string;
  eventTimestamp: string;
}

export interface ShipmentTrackingData {
  id: string;
  suborderId: string;
  suborderNumber: string;
  orderId: string;
  orderNumber: string;
  sellerId: string;
  sellerName: string;
  provider: string;
  providerShipmentId: string;
  awbNumber?: string;
  shippingCarrier?: string;
  labelUrl?: string;
  status: string;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  trackingEvents: TrackingEvent[];
}

export interface CustomerOrderTrackingResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  suborders: ShipmentTrackingData[];
}

export default function OrdersPage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer Live Delivery Tracking Modal State
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<CustomerOrderTrackingResponse | null>(null);
  const [activeSuborderIdx, setActiveSuborderIdx] = useState<number>(0);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const list = await api.getOrders();
      setOrders(list);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="w-full min-h-screen bg-[#FFFDF9] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
          <Loader2 className="animate-spin text-[#D90429]" size={24} />
          <span>Loading orders...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const fetchTracking = async (orderId: string, isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else if (!trackingData) {
      setTrackingLoading(true);
    }

    try {
      const data = await api.getCustomerOrderTracking(orderId);
      const subordersArr = Array.isArray(data.suborders)
        ? data.suborders
        : Array.isArray(data)
        ? data
        : [data];

      setTrackingData({
        orderId: data.orderId || orderId,
        orderNumber: data.orderNumber || orderId,
        status: data.status || "CONFIRMED",
        createdAt: data.createdAt || new Date().toISOString(),
        suborders: subordersArr,
      });
      setTrackingError(null);
      setLastUpdatedAt(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    } catch (err: any) {
      console.error("Failed to fetch tracking data:", err);
      if (!trackingData) {
        setTrackingError(
          err.message || "Tracking information is not yet available for this shipment. Please check back shortly."
        );
      }
    } finally {
      setTrackingLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleOpenTracking = (orderId: string) => {
    setActiveTrackingOrderId(orderId);
    setTrackingData(null);
    setActiveSuborderIdx(0);
    setTrackingError(null);
    fetchTracking(orderId);
  };

  const handleCloseTracking = () => {
    setActiveTrackingOrderId(null);
    setTrackingData(null);
    setTrackingError(null);
    setTrackingLoading(false);
  };

  // 25-Second Near-Real-Time Safe Polling Hook
  useEffect(() => {
    if (!activeTrackingOrderId) return;

    // Check terminal status across all suborders
    const isTerminal = trackingData?.suborders?.every((sub) => {
      const s = (sub.status || "").toUpperCase();
      return s === "DELIVERED" || s === "CANCELLED" || s === "FAILED" || s === "RTO";
    });

    if (isTerminal) return;

    const interval = setInterval(() => {
      if (activeTrackingOrderId && !isRefreshing && !trackingLoading) {
        fetchTracking(activeTrackingOrderId, false);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [activeTrackingOrderId, trackingData, isRefreshing, trackingLoading]);

  const getNormalizedStepIndex = (status?: string): number => {
    const s = (status || "").toUpperCase();
    if (s === "DELIVERED") return 5;
    if (s === "OUT_FOR_DELIVERY") return 4;
    if (s === "IN_TRANSIT") return 3;
    if (s === "PICKED_UP") return 2;
    if (s === "AWB_ASSIGNED" || s === "PICKUP_SCHEDULED") return 1;
    return 0; // CREATED / CONFIRMED
  };

  const isTerminalState = (status?: string): boolean => {
    const s = (status || "").toUpperCase();
    return s === "CANCELLED" || s === "FAILED" || s === "RTO";
  };

  const currentSuborder: ShipmentTrackingData | null =
    trackingData && trackingData.suborders && trackingData.suborders[activeSuborderIdx]
      ? trackingData.suborders[activeSuborderIdx]
      : null;

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans text-[#202124]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#202124] flex items-center gap-2">
              My Orders 📦 <Sparkles className="text-[#D90429]" size={24} />
            </h1>
            <p className="text-slate-600 text-sm font-semibold mt-1">
              Track live delivery progress and inspect multi-vendor order shipments.
            </p>
          </div>
          <Link
            href="/products"
            className="bg-[#D90429] hover:bg-[#B7092B] text-white px-6 py-2.5 rounded-full font-black text-xs shadow-md transition-all inline-block active:scale-95 text-center"
          >
            Explore More Toys
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 animate-pulse space-y-4">
                <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                <div className="h-16 bg-slate-100 rounded-2xl"></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200">
            <div className="text-6xl mb-4">🎁</div>
            <h2 className="text-2xl font-black text-[#202124] mb-2">No Orders Placed Yet</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              You haven&apos;t ordered any toys yet! Explore our catalog and surprise your little ones.
            </p>
            <Link
              href="/products"
              className="bg-[#D90429] hover:bg-[#B7092B] text-white px-8 py-3 rounded-full font-black text-sm shadow-md transition-all inline-block"
            >
              Browse Toys &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const statusColors: Record<string, string> = {
                Pending: "bg-amber-50 text-[#FF9800] border-amber-200",
                Confirmed: "bg-blue-50 text-[#2196F3] border-blue-200",
                Processing: "bg-purple-50 text-[#9C27B0] border-purple-200",
                Shipped: "bg-blue-50 text-[#2196F3] border-blue-200",
                Delivered: "bg-emerald-50 text-[#16803C] border-emerald-200",
                Cancelled: "bg-red-50 text-[#D90429] border-red-200",
              };

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#202124] text-base">{order.orderNumber}</span>
                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${statusColors[order.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-semibold mt-1">
                        Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Amount</div>
                        <div className="text-lg font-black text-[#D90429]">₹{order.totalAmount}</div>
                      </div>

                      <button
                        onClick={() => handleOpenTracking(order.id)}
                        className="bg-[#D90429] hover:bg-[#B7092B] text-white px-4 py-2.5 min-h-[44px] rounded-full font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
                      >
                        <Truck size={16} /> Track Delivery
                      </button>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 object-cover rounded-xl bg-white flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${item.id}`} className="font-extrabold text-[#202124] text-sm hover:text-[#D90429] transition-colors truncate block">
                            {item.name}
                          </Link>
                          
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2196F3] mt-0.5">
                            <ShieldCheck size={13} className="text-[#2196F3]" />
                            <span>Sold by: {item.vendorName || "Play Petal Store"}</span>
                          </div>
                          
                          <div className="text-xs text-slate-500 font-medium">Qty: {item.quantity} × ₹{item.price}</div>
                        </div>

                        <div className="text-right font-black text-[#202124] text-sm">
                          ₹{item.price * item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shipping Info Footer */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 font-medium gap-2">
                    <div>
                      <span className="font-bold text-[#202124]">Ship To:</span> {typeof order.shippingAddress === 'string' ? order.shippingAddress : (order.shippingAddress?.address || order.shippingAddress?.street || 'Delivery Address')}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-[#16803C]">
                      <Truck size={14} /> Payment: {order.paymentMethod} ({order.paymentStatus})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Live Delivery Tracking Modal */}
      {(activeTrackingOrderId !== null) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95">
            <button
              onClick={handleCloseTracking}
              className="absolute top-5 right-5 text-slate-400 hover:text-red-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 pr-8">
              <div className="flex items-center gap-2">
                <Truck size={22} className="text-[#D90429]" />
                <h2 className="text-xl font-black text-[#202124]">Live Customer Delivery Tracker</h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Near-Real-Time Tracking
                </span>

                {lastUpdatedAt && (
                  <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                    Updated {lastUpdatedAt}
                  </span>
                )}

                <button
                  onClick={() => activeTrackingOrderId && fetchTracking(activeTrackingOrderId, true)}
                  disabled={isRefreshing || trackingLoading}
                  className="text-xs font-bold text-[#D90429] hover:bg-red-50 p-1.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh Tracking Status"
                >
                  <RefreshCcw size={14} className={isRefreshing ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {trackingLoading && !trackingData ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 size={36} className="animate-spin text-[#D90429] mx-auto" />
                <p className="text-sm font-bold text-slate-600">Fetching live courier tracking events...</p>
              </div>
            ) : trackingError ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
                  <AlertTriangle size={28} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Tracking Notice</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">{trackingError}</p>
                <button
                  onClick={() => activeTrackingOrderId && fetchTracking(activeTrackingOrderId, true)}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#202124] px-5 py-2 rounded-full font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCcw size={14} /> Retry Fetch
                </button>
              </div>
            ) : trackingData && currentSuborder ? (
              <div className="space-y-6">
                {/* Multi-Seller Suborders Tabs */}
                {trackingData.suborders.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-400 shrink-0">Packages ({trackingData.suborders.length}):</span>
                    {trackingData.suborders.map((sub, idx) => (
                      <button
                        key={sub.id || idx}
                        onClick={() => setActiveSuborderIdx(idx)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          activeSuborderIdx === idx
                            ? "bg-[#D90429] text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Package {idx + 1}: {sub.sellerName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Suborder Meta Summary Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Seller</span>
                    <span className="font-extrabold text-[#202124]">{currentSuborder.sellerName || "Not available"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Carrier</span>
                    <span className="font-extrabold text-[#2196F3]">{currentSuborder.shippingCarrier || "Not available"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">AWB Number</span>
                    <span className="font-extrabold font-mono text-[#D90429]">
                      {currentSuborder.awbNumber || "Not available"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Current Status</span>
                    <span
                      className={`font-black px-2 py-0.5 rounded-full border inline-block text-[11px] ${
                        currentSuborder.status === "DELIVERED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : currentSuborder.status === "CANCELLED"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : currentSuborder.status === "FAILED" || currentSuborder.status === "RTO"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {currentSuborder.status}
                    </span>
                  </div>
                </div>

                {/* Terminal Error States Banner */}
                {isTerminalState(currentSuborder.status) && (
                  <div className="p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 bg-red-50 border-red-200 text-red-800">
                    <AlertTriangle size={20} className="shrink-0 text-red-600" />
                    <div>
                      <div className="font-black text-sm text-red-900">
                        {currentSuborder.status === "CANCELLED"
                          ? "Shipment Cancelled"
                          : currentSuborder.status === "FAILED"
                          ? "Delivery Attempt Failed"
                          : "Returned to Origin (RTO)"}
                      </div>
                      <div className="text-xs font-medium text-red-700 mt-0.5">
                        {currentSuborder.failureReason ||
                          (currentSuborder.status === "CANCELLED"
                            ? "This package shipment was cancelled."
                            : currentSuborder.status === "RTO"
                            ? "The carrier was unable to complete delivery and is returning the parcel to origin."
                            : "Delivery attempt failed. Please contact customer support.")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Milestone Progress Tracker (Hidden if cancelled/failed/rto) */}
                {!isTerminalState(currentSuborder.status) && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-[#202124] uppercase tracking-wider">Delivery Journey</h4>
                      {currentSuborder.estimatedDeliveryDate && (
                        <span className="text-[11px] font-bold text-[#16803C] flex items-center gap-1">
                          <Clock size={12} /> Est. Delivery: {new Date(currentSuborder.estimatedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>

                    {(() => {
                      const stepIdx = getNormalizedStepIndex(currentSuborder.status);
                      const steps = [
                        "Confirmed",
                        "AWB Assigned",
                        "Picked Up",
                        "In Transit",
                        "Out for Delivery",
                        "Delivered"
                      ];

                      return (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-2">
                          {steps.map((label, i) => {
                            const isCompleted = i <= stepIdx;
                            const isCurrent = i === stepIdx;

                            return (
                              <div key={i} className="flex flex-col items-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                    isCurrent
                                      ? "bg-[#D90429] text-white ring-4 ring-red-100 shadow-md scale-110"
                                      : isCompleted
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 text-slate-400 border border-slate-200"
                                  }`}
                                >
                                  {isCompleted ? "✓" : i + 1}
                                </div>
                                <span
                                  className={`text-[10px] font-extrabold mt-2 leading-tight ${
                                    isCurrent ? "text-[#D90429]" : isCompleted ? "text-emerald-700" : "text-slate-400"
                                  }`}
                                >
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Chronological Event Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-[#202124] uppercase tracking-wider">
                      Tracking Events ({currentSuborder.trackingEvents ? currentSuborder.trackingEvents.length : 0} updates)
                    </h4>

                    <button
                      onClick={() => activeTrackingOrderId && fetchTracking(activeTrackingOrderId, true)}
                      disabled={isRefreshing}
                      className="text-xs font-bold text-[#D90429] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCcw size={12} className={isRefreshing ? "animate-spin" : ""} /> Refresh Timeline
                    </button>
                  </div>

                  {!currentSuborder.trackingEvents || currentSuborder.trackingEvents.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs font-medium text-slate-500 border border-slate-200">
                      Tracking information will appear after the logistics provider scans the package.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 py-1">
                      {currentSuborder.trackingEvents.map((ev, idx) => (
                        <div key={ev.id || idx} className="relative pl-6">
                          <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-[#D90429] border-2 border-white shadow-xs"></div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-black text-[#202124]">{ev.normalizedStatus || ev.providerStatus}</span>
                              <span className="text-[11px] font-semibold text-slate-400">
                                {ev.eventTimestamp
                                  ? new Date(ev.eventTimestamp).toLocaleString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Not available"}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-600">{ev.description || "Not available"}</p>
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> Location: {ev.location || "Not available"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {currentSuborder.labelUrl && (
                  <div className="pt-2 text-right">
                    <a
                      href={currentSuborder.labelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2196F3] hover:underline"
                    >
                      <ExternalLink size={14} /> Download Official Shipping Label PDF
                    </a>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
