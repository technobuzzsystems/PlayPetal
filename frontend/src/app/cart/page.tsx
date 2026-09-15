"use client";

import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, ShoppingBag, Truck, MapPin, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartCount, subtotal, deliveryFee, discountAmount, grandTotal, isMounted } = useCart();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [pincodeInput, setPincodeInput] = useState<string>("");
  const [activePincode, setActivePincode] = useState<string>("");
  const [unserviceableItems, setUnserviceableItems] = useState<any[]>([]);
  const [isCheckingServiceability, setIsCheckingServiceability] = useState<boolean>(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    setMounted(true);
    let initialPin = "";
    if (user && user.pincode) {
      initialPin = String(user.pincode).trim();
    } else if (typeof window !== "undefined") {
      const stored = localStorage.getItem("playpetal_pincode") || localStorage.getItem("toyjoy_pincode");
      if (stored) initialPin = stored.trim();
    }

    if (initialPin && /^[1-9][0-9]{5}$/.test(initialPin)) {
      setPincodeInput(initialPin);
      setActivePincode(initialPin);
    }
  }, [user]);

  // Evaluates cart serviceability via backend API
  const evaluateCartServiceability = useCallback(async (pin: string) => {
    const cleanPin = pin.trim();
    if (!cleanPin || !/^[1-9][0-9]{5}$/.test(cleanPin) || cart.length === 0) {
      setUnserviceableItems([]);
      return;
    }

    setIsCheckingServiceability(true);
    try {
      const res = await fetch(`${API_URL}/checkout/serviceability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: cleanPin, items: cart }),
      });

      const data = await res.json();
      if (!res.ok || !data.isServiceable) {
        setUnserviceableItems(data.unserviceableItems || []);
      } else {
        setUnserviceableItems([]);
      }
    } catch (err) {
      console.warn("Cart serviceability check error:", err);
    } finally {
      setIsCheckingServiceability(false);
    }
  }, [API_URL, cart]);

  useEffect(() => {
    if (activePincode) {
      evaluateCartServiceability(activePincode);
    }
  }, [activePincode, evaluateCartServiceability]);

  // Lightweight 5s polling for active pincode (Rule 6)
  useEffect(() => {
    if (!activePincode || activePincode.length < 6 || cart.length === 0) return;

    const intervalId = setInterval(() => {
      evaluateCartServiceability(activePincode);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [activePincode, cart, evaluateCartServiceability]);

  const handlePincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pincodeInput.trim();
    if (/^[1-9][0-9]{5}$/.test(pin)) {
      setActivePincode(pin);
      if (typeof window !== "undefined") {
        localStorage.setItem("playpetal_pincode", pin);
      }
      evaluateCartServiceability(pin);
    } else {
      alert("Please enter a valid 6-digit Indian PIN code.");
    }
  };

  if (!mounted || !isMounted) {
    return (
      <div className="w-full bg-[#FFFDF9] min-h-[70vh] py-12 px-4 flex items-center justify-center font-sans text-[#202124]">
        <div className="text-center font-bold text-slate-400 animate-pulse">Loading Shopping Cart...</div>
      </div>
    );
  }

  const hasUnserviceableItems = unserviceableItems.length > 0;

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans text-[#202124]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-black text-[#202124]">Your Shopping Cart 🛍️</h1>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-bold text-[#D90429] hover:underline transition-colors cursor-pointer"
            >
              Empty Cart
            </button>
          )}
        </div>
        <p className="text-slate-600 text-sm font-semibold mb-6 flex items-center gap-1.5">
          You have <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-[#D90429] font-black text-sm">{cartCount}</span> item{cartCount === 1 ? '' : 's'} in your bag.
        </p>

        {/* Pincode Selector */}
        {cart.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[#D90429]" />
              <div>
                <div className="text-xs font-black text-[#202124] uppercase tracking-wider">Delivery Pincode</div>
                <div className="text-xs text-slate-500 font-medium">
                  {activePincode ? `Checking availability for PIN: ${activePincode}` : "Enter your PIN code to verify seller delivery coverage"}
                </div>
              </div>
            </div>
            <form onSubmit={handlePincodeSubmit} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit PIN code"
                value={pincodeInput}
                onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ""))}
                className="w-36 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#D90429]"
              />
              <button
                type="submit"
                className="bg-[#202124] hover:bg-black text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Apply
              </button>
            </form>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-black text-[#202124] mb-2">Your Bag is Empty</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Looks like you haven&apos;t added any toys yet! Explore our certified marketplace and find something magical.
            </p>
            <Link
              href="/products"
              className="bg-[#D90429] hover:bg-[#B7092B] text-white px-8 py-3 rounded-full font-black text-sm shadow-md transition-all inline-block"
            >
              Start Shopping &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => {
                const isItemUnserviceable = unserviceableItems.some(
                  (u) => String(u.id) === String(item.id) || u.name === item.name
                );

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl p-5 shadow-sm border transition-all flex flex-col justify-between gap-4 ${
                      isItemUnserviceable ? "border-red-400 bg-red-50/20" : "border-slate-200 hover:border-[#D90429]/40"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={item.img}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-2xl bg-slate-50 p-1 border border-slate-200 flex-shrink-0"
                        />
                        <div>
                          <Link href={`/products/${item.id}`} className="font-extrabold text-[#202124] text-sm hover:text-[#D90429] transition-colors line-clamp-1">
                            {item.name}
                          </Link>
                          
                          {/* Vendor Attribution */}
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2196F3] my-1">
                            <ShieldCheck size={13} className="text-[#2196F3]" />
                            <span>Sold by: {item.vendorName || "Play Petal Marketplace"}</span>
                          </div>

                          <div className="text-xs font-black text-[#D90429]">₹{item.price} each</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-6 mt-2 sm:mt-0">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-[#202124] flex items-center justify-center font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[28px] text-center font-black text-sm text-[#202124] select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-[#202124] flex items-center justify-center font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} strokeWidth={2.5} />
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-[#202124] text-base">
                            ₹{item.price * item.quantity}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 p-1 mt-1 cursor-pointer transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unserviceable Item Alert Badge */}
                    {isItemUnserviceable && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-2.5 text-xs font-bold flex items-center gap-2">
                        <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
                        <span>
                          Service is not available in your area for PIN: {activePincode}. This vendor does not deliver to this pincode.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-black text-[#202124] mb-4 pb-2 border-b border-slate-200">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm font-semibold text-slate-600 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-black text-[#202124]">₹{subtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#16803C]">
                    <span>Special Savings</span>
                    <span className="font-black">-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Express Shipping</span>
                  <span className="font-black text-[#16803C]">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-[11px] text-[#FF9800] font-bold">
                    Add ₹{999 - subtotal} more for FREE shipping!
                  </p>
                )}
                <div className="flex justify-between items-baseline text-base font-black text-[#202124] pt-3 border-t border-slate-200">
                  <span>Total Amount</span>
                  <span className="text-2xl font-black text-[#D90429]">₹{grandTotal}</span>
                </div>
              </div>

              {hasUnserviceableItems && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-xs font-bold mb-4 flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Service is not available in your area. Please select a different address or remove unserviceable items to checkout.
                  </span>
                </div>
              )}

              {hasUnserviceableItems ? (
                <button
                  disabled
                  className="w-full bg-slate-300 text-slate-500 py-3.5 rounded-full font-black text-sm shadow-xs cursor-not-allowed text-center opacity-70"
                >
                  Checkout Disabled (Delivery Unavailable)
                </button>
              ) : (
                <Link
                  href="/checkout"
                  className="w-full bg-[#D90429] hover:bg-[#B7092B] text-white py-3.5 rounded-full font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 text-center active:scale-95"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </Link>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                <ShieldCheck size={14} className="text-[#16803C]" />
                <span>Safe 256-Bit SSL Checkout</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
