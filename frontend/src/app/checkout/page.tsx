"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  CheckCircle2,
  ArrowLeft,
  MapPin,
  Star,
  Plus,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import LocationPickerMap, { SelectedLocation, DEFAULT_MAP_LOCATION } from "../../components/LocationPickerMap";

export interface Address {
  id: string;
  userId: string;
  title: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, subtotal, deliveryFee, discountAmount, grandTotal, clearCart } = useCart();
  const { user } = useAuth();

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    latitude: "",
    longitude: "",
    paymentMethod: "Online UPI",
  });

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<any>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<
    'idle' | 'preparing' | 'gateway' | 'verifying' | 'success' | 'failed' | 'cancelled'
  >('idle');

  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [sandboxPaymentData, setSandboxPaymentData] = useState<{
    orderId: string;
    orderNumber: string;
    amount: number;
    gatewayOrderId: string;
    placedOrder: any;
  } | null>(null);
  const [sandboxOption, setSandboxOption] = useState<'success' | 'failure'>('success');
  const [sandboxProcessing, setSandboxProcessing] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
        street: prev.street || user.street || "",
        city: prev.city || user.city || "",
        state: prev.state || user.state || "",
        pincode: prev.pincode || user.pincode || "",
      }));
    }
  }, [user]);

  // Fetch saved addresses for authenticated customer
  useEffect(() => {
    if (!user) return;
    const fetchSavedAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const res = await fetch(`${API_URL}/customers/addresses`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const list: Address[] = data.addresses || [];
          setSavedAddresses(list);

          // Auto-select default address if available
          const defaultAddr = list.find((a) => a.isDefault) || list[0];
          if (defaultAddr) {
            applySavedAddress(defaultAddr);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch saved addresses for checkout:", err);
      } finally {
        setLoadingAddresses(false);
      }
    };
    fetchSavedAddresses();
  }, [user]);

  const applySavedAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setFormData((prev) => ({
      ...prev,
      fullName: addr.name || prev.fullName,
      phone: addr.phone || prev.phone,
      street: addr.street || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      country: addr.country || "India",
      latitude: addr.latitude ? String(addr.latitude) : "",
      longitude: addr.longitude ? String(addr.longitude) : "",
    }));
  };

  const [serviceability, setServiceability] = useState<{
    isChecking: boolean;
    isServiceable: boolean;
    message: string | null;
    unserviceableItems: any[];
  }>({
    isChecking: false,
    isServiceable: true,
    message: null,
    unserviceableItems: [],
  });

  useEffect(() => {
    const pin = formData.pincode.trim();
    if (!pin || pin.length < 5 || cart.length === 0) {
      setServiceability({ isChecking: false, isServiceable: true, message: null, unserviceableItems: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setServiceability((prev) => ({ ...prev, isChecking: true }));
      try {
        const res = await fetch(`${API_URL}/checkout/serviceability`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pincode: pin, items: cart }),
        });
        const data = await res.json();

        if (res.ok && data.isServiceable) {
          setServiceability({
            isChecking: false,
            isServiceable: true,
            message: "Delivery is available for all items in your cart.",
            unserviceableItems: [],
          });
        } else {
          setServiceability({
            isChecking: false,
            isServiceable: false,
            message: data.message || "Service is not available in your area. Please select a different address.",
            unserviceableItems: data.unserviceableItems || [],
          });
        }
      } catch (err) {
        setServiceability({ isChecking: false, isServiceable: true, message: null, unserviceableItems: [] });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.pincode, cart]);

  const handleSelectMapLocation = (loc: SelectedLocation) => {
    setSelectedAddressId(null); // Custom map location
    setFormData((prev) => ({
      ...prev,
      street: loc.street || prev.street,
      city: loc.city || prev.city,
      state: loc.state || prev.state,
      pincode: loc.pincode || prev.pincode,
      country: loc.country || prev.country || "India",
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
    }));
  };

  if (cart.length === 0 && !orderPlaced) {
    return (
      <div className="w-full bg-[#FFFDF9] min-h-[70vh] flex flex-col items-center justify-center font-sans p-6 text-[#202124]">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-black text-[#202124] mb-2">Your Cart is Empty</h2>
        <p className="text-slate-600 text-sm mb-6">Add toys to your cart before proceeding to checkout.</p>
        <Link
          href="/products"
          className="bg-[#D90429] hover:bg-[#B7092B] text-white px-8 py-3 rounded-full font-black text-sm shadow-md transition-all cursor-pointer"
        >
          Discover Toys
        </Link>
      </div>
    );
  }

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setOrderError(null);

    if (!serviceability.isServiceable) {
      setOrderError("Service is not available in your area. Please select a different address.");
      return;
    }

    setSubmitting(true);
    setPaymentStep("preparing");

    try {
      const shippingAddressSnapshot = {
        name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country || "India",
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        addressId: selectedAddressId || undefined,
      };

      const isCOD = formData.paymentMethod === "Cash on Delivery";

      const orderPayload = {
        customerName: formData.fullName,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        items: cart.map((item) => ({
          id: String(item.id),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.img,
          vendorId: item.vendorId || "vendor-1",
          vendorName: item.vendorName || "Play Petal Marketplace",
          sku: item.sku || `SKU-${item.id}`,
        })),
        subtotal,
        discount: discountAmount,
        deliveryFee,
        totalAmount: grandTotal,
        shippingAddress: `${formData.street}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        shippingAddressSnapshot,
        paymentMethod: formData.paymentMethod,
        paymentStatus: isCOD ? "Pending" : "Pending",
        status: "Pending",
      };

      const placedOrder = await api.createOrder(orderPayload);

      // Branch A: Cash on Delivery (COD) -> Create order directly without Razorpay
      if (isCOD) {
        setPaymentStep("success");
        clearCart();
        setOrderPlaced(placedOrder);
        setSubmitting(false);
        return;
      }

      // Branch B: Online Payment -> Initialize server-side PaymentAttempt
      const createRes = await fetch(`${API_URL}/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId: placedOrder.id || placedOrder.orderNumber }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(errData.message || errData.error || "Failed to initialize gateway payment attempt.");
      }

      const paymentInit = await createRes.json();

      // Branch B1: Local Development / Sandbox Payment Mode
      if (paymentInit.provider === "SANDBOX" || paymentInit.keyId === "sandbox_key_local") {
        setSandboxPaymentData({
          orderId: placedOrder.id || placedOrder.orderNumber,
          orderNumber: placedOrder.orderNumber || placedOrder.id,
          amount: paymentInit.amount,
          gatewayOrderId: paymentInit.gatewayOrderId,
          placedOrder: placedOrder,
        });
        setIsSandboxModalOpen(true);
        setSubmitting(false);
        return;
      }

      // Branch B2: Production Razorpay Integration
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as any).Razorpay) {
        setPaymentStep("failed");
        setOrderError("Razorpay Payment Gateway SDK could not be loaded. Please check network connection.");
        setSubmitting(false);
        return;
      }

      setPaymentStep("gateway");

      const options = {
        key: paymentInit.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: Math.round(paymentInit.amount * 100),
        currency: paymentInit.currency || "INR",
        name: "Play Petal Marketplace",
        description: `Order #${placedOrder.orderNumber || placedOrder.id}`,
        order_id: paymentInit.gatewayOrderId,
        handler: async function (response: any) {
          setPaymentStep("verifying");
          try {
            const verifyRes = await fetch(`${API_URL}/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                orderId: placedOrder.id || placedOrder.orderNumber,
                gatewayOrderId: response.razorpay_order_id,
                gatewayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              setPaymentStep("success");
              clearCart();
              setOrderPlaced({
                ...placedOrder,
                paymentStatus: "Paid",
                status: "Confirmed",
              });
            } else {
              setPaymentStep("failed");
              setOrderError(verifyData.message || "Payment verification failed server-side.");
            }
          } catch (vErr: any) {
            console.error("Payment verification error:", vErr);
            setPaymentStep("failed");
            setOrderError("Network error verifying payment. Please contact support.");
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: async function () {
            setPaymentStep("cancelled");
            setSubmitting(false);
            setOrderError("Payment Cancelled. Your order has not been placed.");
            try {
              await fetch(`${API_URL}/payments/failure`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  orderId: placedOrder.id || placedOrder.orderNumber,
                  gatewayOrderId: paymentInit.gatewayOrderId,
                  errorMessage: "Customer cancelled payment modal",
                }),
              });
            } catch (e) {}
          },
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#D90429",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", async function (response: any) {
        setPaymentStep("failed");
        setSubmitting(false);
        setOrderError(`Payment Failed: ${response.error?.description || "Transaction failed on gateway."}`);
        try {
          await fetch(`${API_URL}/payments/failure`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              orderId: placedOrder.id || placedOrder.orderNumber,
              gatewayOrderId: paymentInit.gatewayOrderId,
              errorMessage: response.error?.description || "Payment failed on gateway",
            }),
          });
        } catch (e) {}
      });

      rzp.open();
    } catch (err: any) {
      console.error("Failed to place order:", err);
      const errMsg = err.message || "";
      setPaymentStep("failed");
      if (errMsg.includes("DELIVERY_NOT_AVAILABLE") || errMsg.includes("Service is not available")) {
        setOrderError("Service is not available in your area. Please select a different address.");
      } else {
        setOrderError("Failed to submit order: " + (errMsg || "Please verify details."));
      }
      setSubmitting(false);
    }
  };

  const handleSandboxSubmit = async () => {
    if (!sandboxPaymentData) return;
    setSandboxProcessing(true);
    setOrderError(null);

    if (sandboxOption === "success") {
      setPaymentStep("verifying");
      try {
        const mockPaymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const verifyRes = await fetch(`${API_URL}/payments/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            orderId: sandboxPaymentData.orderId,
            gatewayOrderId: sandboxPaymentData.gatewayOrderId,
            gatewayPaymentId: mockPaymentId,
            signature: "sandbox_success_sig",
          }),
        });

        const verifyData = await verifyRes.json();

        if (verifyRes.ok && verifyData.success) {
          setPaymentStep("success");
          clearCart();
          setOrderPlaced({
            ...sandboxPaymentData.placedOrder,
            paymentStatus: "Paid",
            status: "Confirmed",
          });
          setIsSandboxModalOpen(false);
        } else {
          setPaymentStep("failed");
          setOrderError(verifyData.message || "Sandbox payment verification failed.");
          setIsSandboxModalOpen(false);
        }
      } catch (err: any) {
        console.error("Sandbox verification error:", err);
        setPaymentStep("failed");
        setOrderError("Network error verifying sandbox payment.");
        setIsSandboxModalOpen(false);
      } finally {
        setSandboxProcessing(false);
        setSubmitting(false);
      }
    } else {
      setPaymentStep("failed");
      setOrderError("Payment failed. Your order has not been charged.");
      try {
        await fetch(`${API_URL}/payments/failure`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            orderId: sandboxPaymentData.orderId,
            gatewayOrderId: sandboxPaymentData.gatewayOrderId,
            errorMessage: "Simulated sandbox payment failure",
          }),
        });
      } catch (err) {
        console.error("Failed to post sandbox failure:", err);
      } finally {
        setSandboxProcessing(false);
        setSubmitting(false);
        setIsSandboxModalOpen(false);
      }
    }
  };

  const handleSandboxCancel = async () => {
    if (!sandboxPaymentData) {
      setIsSandboxModalOpen(false);
      return;
    }
    setPaymentStep("cancelled");
    setOrderError("Payment Cancelled. Your order has not been placed.");
    try {
      await fetch(`${API_URL}/payments/failure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId: sandboxPaymentData.orderId,
          gatewayOrderId: sandboxPaymentData.gatewayOrderId,
          errorMessage: "Customer cancelled sandbox payment modal",
        }),
      });
    } catch (e) {}
    setIsSandboxModalOpen(false);
    setSubmitting(false);
  };

  const getButtonText = () => {
    if (!serviceability.isServiceable) return "Delivery Not Available in Selected Area";
    if (serviceability.isChecking) return "Checking Delivery Serviceability...";
    if (paymentStep === "preparing") return "Preparing Secure Payment...";
    if (paymentStep === "gateway") return "Complete Payment...";
    if (paymentStep === "verifying") return "Verifying Payment...";
    if (paymentStep === "success") return "Payment Successful!";
    if (formData.paymentMethod === "Cash on Delivery") return `Place Order (₹${grandTotal})`;
    return `Proceed to Pay (₹${grandTotal})`;
  };

  // Order Confirmed Screen with framer-motion animations
  if (orderPlaced) {
    return (
      <div className="w-full bg-[#FFFDF9] min-h-screen py-16 px-4 font-sans flex items-center justify-center text-[#202124]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 max-w-lg w-full text-center relative overflow-hidden"
        >
          {/* Animated checkmark circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ duration: 0.5, delay: 0.1, ease: "backOut" }}
            className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 text-[#16803C] shadow-inner"
          >
            <CheckCircle2 size={42} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <span className="bg-emerald-50 text-[#16803C] border border-emerald-200 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500 animate-pulse" /> Order Confirmed 🎉
            </span>
            <h2 className="text-3xl font-black text-[#202124] mt-3 mb-2">Thank You!</h2>
            <p className="text-slate-600 text-sm font-semibold mb-6">
              Your order <span className="text-[#D90429] font-black">{orderPlaced.orderNumber}</span> has been placed successfully.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 mb-6 text-xs"
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link
              href="/orders"
              className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#202124] py-3 rounded-full font-black text-xs shadow-xs transition-all text-center cursor-pointer"
            >
              Track Order Status &rarr;
            </Link>
            <Link
              href="/products"
              className="flex-1 bg-[#D90429] hover:bg-[#B7092B] text-white py-3 rounded-full font-black text-xs shadow-md transition-all text-center active:scale-95 cursor-pointer"
            >
              Continue Shopping
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans text-[#202124]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/cart"
            className="text-slate-500 hover:text-[#D90429] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Cart
          </Link>
        </div>

        <h1 className="text-3xl font-black text-[#202124] mb-8">Secure Checkout 🔒</h1>

        {orderError && (
          <div className="bg-red-50 border-2 border-red-300 text-red-700 rounded-2xl p-4 mb-6 text-sm font-bold flex items-center gap-3 shadow-xs">
            <AlertCircle size={22} className="text-red-600 flex-shrink-0" />
            <span>{orderError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Body */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Saved Address Selection for Authenticated Customers */}
            {user && savedAddresses.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-base font-black text-[#202124] flex items-center gap-2">
                    <MapPin className="text-[#D90429]" size={18} /> Select Saved Address
                  </h2>
                  <Link
                    href="/profile?tab=addresses"
                    className="text-xs font-bold text-[#D90429] hover:underline"
                  >
                    Manage Address Book &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => applySavedAddress(addr)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-red-50/50 border-[#D90429] shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {addr.title || "Home"}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold text-[#D90429] flex items-center gap-1">
                                <Star size={10} className="fill-[#D90429]" /> Default
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-xs text-[#202124]">{addr.name}</h4>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{addr.street}</p>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-bold text-[#D90429] flex items-center gap-1">
                          {isSelected ? (
                            <>
                              <CheckCircle2 size={14} /> Selected for Delivery
                            </>
                          ) : (
                            "Select This Address"
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery Address Details */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-[#202124] flex items-center gap-2">
                  <Truck className="text-[#D90429]" size={18} /> Shipping &amp; Delivery Details
                </h2>

                <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  className="bg-red-50 hover:bg-red-100 text-[#D90429] border border-red-200 px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MapPin size={14} /> Pick Location on Map
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Mobile Phone *</label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Street Address / Flat No / Landmark *
                </label>
                <input
                  required
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">City *</label>
                  <input
                    required
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">State *</label>
                  <input
                    required
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">PIN Code *</label>
                  <input
                    required
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] transition-all"
                  />
                </div>
              </div>

              {formData.latitude && formData.longitude && (
                <div className="p-2.5 bg-red-50 text-[#D90429] rounded-xl text-[11px] font-mono font-bold flex items-center justify-between">
                  <span>📍 Map Pin Coordinates Attached: ({formData.latitude}, {formData.longitude})</span>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-base font-black text-[#202124] flex items-center gap-2">
                <CreditCard className="text-[#D90429]" size={18} /> Select Payment Method
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["Online UPI", "Credit / Debit Card", "Net Banking", "Cash on Delivery"].map((method) => {
                  const isSelected = formData.paymentMethod === method;
                  return (
                    <div
                      key={method}
                      onClick={() => setFormData({ ...formData, paymentMethod: method })}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? "bg-red-50/50 border-[#D90429] shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-[#D90429] bg-[#D90429]" : "border-slate-300"
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-[#202124]">{method}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          {method === "Cash on Delivery" ? "Pay at doorstep upon delivery" : "Instant & 100% Encrypted"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-24">
              <h2 className="text-base font-black text-[#202124] mb-4 pb-3 border-b border-slate-100">
                Order Summary ({cart.reduce((s, i) => s + i.quantity, 0)} items)
              </h2>

              <div className="space-y-3 max-h-56 overflow-y-auto mb-4 pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={item.img} alt={item.name} className="w-12 h-12 object-cover rounded-xl border border-slate-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#202124] truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Qty: {item.quantity} × ₹{item.price}
                      </p>
                    </div>
                    <span className="text-xs font-black text-[#D90429]">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#202124]">₹{subtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-bold text-[#202124]">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#202124] pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-lg text-[#D90429]">₹{grandTotal}</span>
                </div>
              </div>

              {!serviceability.isServiceable && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-300 text-red-900 rounded-2xl flex items-start gap-2.5 shadow-xs">
                  <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Service Not Available</h4>
                    <p className="text-xs font-semibold mt-0.5">{serviceability.message}</p>
                    {serviceability.unserviceableItems.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-[11px] text-red-700 font-medium">
                        {serviceability.unserviceableItems.map((it, idx) => (
                          <li key={idx}>
                            <span className="font-bold">{it.name}</span> (Seller: {it.vendorName})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !serviceability.isServiceable || serviceability.isChecking}
                className="w-full mt-6 bg-[#D90429] hover:bg-[#B7092B] text-white py-3.5 rounded-full font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getButtonText()}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-bold mt-4">
                <ShieldCheck size={14} className="text-emerald-600" /> 100% Safe &amp; Verified Toy Order
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Map Location Picker Modal */}
      <LocationPickerMap
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelectLocation={handleSelectMapLocation}
        initialLat={formData.latitude ? parseFloat(formData.latitude) : DEFAULT_MAP_LOCATION.lat}
        initialLng={formData.longitude ? parseFloat(formData.longitude) : DEFAULT_MAP_LOCATION.lng}
      />

      {/* Sandbox Payment Modal */}
      {isSandboxModalOpen && sandboxPaymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-amber-300">
                  SANDBOX / TEST MODE
                </span>
              </div>
              <button
                onClick={handleSandboxCancel}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-lg font-black text-[#202124]">Online Payment Gateway</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Order #{sandboxPaymentData.orderNumber} • Amount: <span className="font-bold text-[#D90429]">₹{sandboxPaymentData.amount}</span>
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Ref: {sandboxPaymentData.gatewayOrderId}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <label
                onClick={() => setSandboxOption("success")}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  sandboxOption === "success"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-950"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="sandboxOption"
                  checked={sandboxOption === "success"}
                  onChange={() => setSandboxOption("success")}
                  className="mt-1 accent-emerald-600"
                />
                <div>
                  <span className="font-bold text-xs block text-emerald-900">Test Payment Success</span>
                  <span className="text-[11px] text-slate-500 block">
                    Simulates a successful gateway transaction and backend signature verification.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setSandboxOption("failure")}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  sandboxOption === "failure"
                    ? "border-red-500 bg-red-50/50 text-red-950"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="sandboxOption"
                  checked={sandboxOption === "failure"}
                  onChange={() => setSandboxOption("failure")}
                  className="mt-1 accent-red-600"
                />
                <div>
                  <span className="font-bold text-xs block text-red-900">Test Payment Failure</span>
                  <span className="text-[11px] text-slate-500 block">
                    Simulates a failed gateway transaction and updates order payment attempt to failed.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSandboxCancel}
                disabled={sandboxProcessing}
                className="flex-1 py-3 px-4 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSandboxSubmit}
                disabled={sandboxProcessing}
                className={`flex-1 py-3 px-4 rounded-full text-white text-xs font-black shadow-md transition-all disabled:opacity-50 cursor-pointer ${
                  sandboxOption === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {sandboxProcessing ? "Processing..." : "Process Sandbox Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
