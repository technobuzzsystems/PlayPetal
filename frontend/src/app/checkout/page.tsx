"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "../../context/CartContext";
import { api } from "../../services/api";
import { ShieldCheck, Truck, CreditCard, Banknote, CheckCircle2, ArrowLeft } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, subtotal, deliveryFee, discountAmount, grandTotal, clearCart } = useCart();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    paymentMethod: "Online UPI",
  });

  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<any>(null);

  if (cart.length === 0 && !orderPlaced) {
    return (
      <div className="w-full bg-[#FFFDF9] min-h-[70vh] flex flex-col items-center justify-center font-sans p-6 text-[#202124]">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-black text-[#202124] mb-2">Your Cart is Empty</h2>
        <p className="text-slate-600 text-sm mb-6">Add toys to your cart before proceeding to checkout.</p>
        <Link href="/products" className="bg-[#D90429] hover:bg-[#B7092B] text-white px-8 py-3 rounded-full font-black text-sm shadow-md transition-all">
          Discover Toys
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const orderPayload = {
        customerName: formData.fullName,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        items: cart.map(item => ({
          id: String(item.id),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.img,
          vendorId: item.vendorId || "vendor-1",
          vendorName: item.vendorName || "Play Petal Marketplace",
          sku: item.sku || `SKU-${item.id}`
        })),
        subtotal,
        discount: discountAmount,
        deliveryFee,
        totalAmount: grandTotal,
        shippingAddress: `${formData.street}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentMethod === "Cash on Delivery" ? "Pending" : "Paid",
        status: "Pending",
      };

      const placed = await api.createOrder(orderPayload);
      clearCart();
      setOrderPlaced(placed);
    } catch (err) {
      console.error("Failed to place order:", err);
      alert("Failed to submit order. Please verify API is running at http://localhost:5000");
    } finally {
      setSubmitting(false);
    }
  };

  // Order Confirmed State
  if (orderPlaced) {
    return (
      <div className="w-full bg-[#FFFDF9] min-h-screen py-16 px-4 font-sans flex items-center justify-center text-[#202124]">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 text-[#16803C]">
            <CheckCircle2 size={42} />
          </div>
          <span className="bg-emerald-50 text-[#16803C] border border-emerald-200 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider inline-block">
            Order Confirmed 🎉
          </span>
          <h2 className="text-3xl font-black text-[#202124] mt-3 mb-2">Thank You!</h2>
          <p className="text-slate-600 text-sm font-semibold mb-6">
            Your order <span className="text-[#D90429] font-black">{orderPlaced.orderNumber}</span> has been placed successfully.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 mb-6 text-xs">
            <div className="flex justify-between font-bold text-slate-500">
              <span>Total Amount:</span>
              <span className="font-black text-[#D90429] text-sm">₹{orderPlaced.totalAmount}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-500">
              <span>Payment Mode:</span>
              <span className="font-extrabold text-[#202124]">{orderPlaced.paymentMethod}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-500">
              <span>Delivery To:</span>
              <span className="font-extrabold text-[#202124] truncate max-w-[200px]">{orderPlaced.shippingAddress}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/orders"
              className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#202124] py-3 rounded-full font-black text-xs shadow-xs transition-all text-center"
            >
              Track Order Status &rarr;
            </Link>
            <Link
              href="/products"
              className="flex-1 bg-[#D90429] hover:bg-[#B7092B] text-white py-3 rounded-full font-black text-xs shadow-md transition-all text-center active:scale-95"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans text-[#202124]">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex items-center gap-2 mb-6">
          <Link href="/cart" className="text-slate-500 hover:text-[#D90429] text-xs font-bold flex items-center gap-1 transition-colors">
            <ArrowLeft size={14} /> Back to Cart
          </Link>
        </div>

        <h1 className="text-3xl font-black text-[#202124] mb-8">Secure Checkout 🔒</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Shipping & Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Delivery Address */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-base font-black text-[#202124] flex items-center gap-2">
                <Truck className="text-[#D90429]" size={18} /> Shipping &amp; Delivery Address
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] focus:ring-2 focus:ring-[#D90429]/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Mobile Phone (for delivery SMS)</label>
                  <input
                    required
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] focus:ring-2 focus:ring-[#D90429]/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] focus:ring-2 focus:ring-[#D90429]/30 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Street Address, Apartment, Landmark</label>
                <input
                  required
                  type="text"
                  placeholder="House/Flat No., Street, Area, Landmark"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] focus:ring-2 focus:ring-[#D90429]/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">City</label>
                  <input
                    required
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] focus:ring-2 focus:ring-[#D90429]/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">State</label>
                  <input
                    required
                    type="text"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] focus:ring-2 focus:ring-[#D90429]/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">PIN Code</label>
                  <input
                    required
                    type="text"
                    placeholder="6-digit PIN"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] focus:ring-2 focus:ring-[#D90429]/30 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-base font-black text-[#202124] flex items-center gap-2">
                <CreditCard className="text-[#2196F3]" size={18} /> Payment Options
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "Online UPI", label: "Instant UPI (GPay, PhonePe, Paytm)", icon: "⚡" },
                  { id: "Credit/Debit Card", label: "Credit / Debit Card (Visa, RuPay)", icon: "💳" },
                  { id: "Net Banking", label: "Net Banking (All Indian Banks)", icon: "🏦" },
                  { id: "Cash on Delivery", label: "Cash on Delivery (Pay at Door)", icon: "💵" },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                      formData.paymentMethod === m.id
                        ? "border-[#D90429] bg-red-50/60 shadow-xs"
                        : "border-slate-200 bg-slate-50 hover:border-[#D90429]/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.id}
                      checked={formData.paymentMethod === m.id}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="accent-[#D90429]"
                    />
                    <div>
                      <div className="text-xs font-black text-[#202124] flex items-center gap-1.5">
                        <span>{m.icon}</span>
                        <span>{m.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">{m.label}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Order Summary Column */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-base font-black text-[#202124] mb-4 pb-2 border-b border-slate-200">
                Order Review ({cart.length} items)
              </h2>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 mb-4">
                {cart.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <img src={it.img || (it as any).image || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80"} alt="" className="w-12 h-12 rounded-lg object-cover bg-white flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-[#202124] truncate">{it.name}</div>
                      <div className="text-[10px] text-[#2196F3] font-bold">Sold by: {it.vendorName || "Play Petal Store"}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">Qty: {it.quantity}</div>
                    </div>
                    <div className="font-black text-[#D90429]">₹{it.price * it.quantity}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200 text-xs font-semibold text-slate-600 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#202124]">₹{subtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#16803C]">
                    <span>Discount</span>
                    <span className="font-bold">-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="font-bold text-[#16803C]">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-base font-black text-[#202124] pt-2 border-t border-slate-200">
                  <span>Total Due</span>
                  <span className="text-2xl font-black text-[#D90429]">₹{grandTotal}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#D90429] hover:bg-[#B7092B] text-white py-3.5 rounded-full font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {submitting ? "Placing Order..." : `Place Order (₹${grandTotal})`}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
                <ShieldCheck size={14} className="text-[#16803C]" />
                <span>Verified Marketplace Purchase</span>
              </div>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
