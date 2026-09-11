"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, Order } from "../../services/api";
import { Package, ShieldCheck, Clock, CheckCircle2, Truck, Sparkles, ArrowRight } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      try {
        const list = await api.getOrders();
        setOrders(list);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans text-[#202124]">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#202124] flex items-center gap-2">
              My Orders 📦 <Sparkles className="text-[#D90429]" size={24} />
            </h1>
            <p className="text-slate-600 text-sm font-semibold mt-1">
              Track delivery progress and inspect vendor attributions for your toys.
            </p>
          </div>
          <Link
            href="/products"
            className="bg-[#D90429] hover:bg-[#B7092B] text-white px-6 py-2.5 rounded-full font-black text-xs shadow-md transition-all inline-block active:scale-95"
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

                    <div className="text-right">
                      <div className="text-sm font-black text-[#202124]">Total Amount</div>
                      <div className="text-xl font-black text-[#D90429]">₹{order.totalAmount}</div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <img
                          src={item.image || (item as any).img || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80"}
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
                      <span className="font-bold text-[#202124]">Ship To:</span> {order.shippingAddress}
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
    </div>
  );
}
