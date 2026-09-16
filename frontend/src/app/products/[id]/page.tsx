"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart, ShoppingBag, Star, Truck, ShieldCheck, RefreshCcw,
  CheckCircle2, Share2, ArrowLeft, PackageCheck, Zap, MapPin, AlertCircle, Sparkles, FileText, Check, ArrowRight
} from "lucide-react";
import { useCart } from "../../../context/CartContext";
import { useAuth } from "../../../context/AuthContext";
import { api, Product } from "../../../services/api";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Suggested Products State
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Delivery Serviceability State
  const [pincodeInput, setPincodeInput] = useState<string>("");
  const [activePincode, setActivePincode] = useState<string>("");
  const [serviceability, setServiceability] = useState<{
    isChecking: boolean;
    isServiceable: boolean | null; // null means no pincode entered yet
    message: string | null;
  }>({
    isChecking: false,
    isServiceable: null,
    message: "Enter your pincode to check delivery availability.",
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Initial user pincode pre-fill
  useEffect(() => {
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

  // Load Product Data
  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      setLoading(true);
      try {
        const data = await api.getProductById(productId, activePincode || undefined);
        if (data) {
          setProduct(data);
          setActiveImage(data.image);
        }
      } catch (err) {
        console.error("Failed to load product detail:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [productId, activePincode]);

  // Evaluates dynamic serviceability against backend
  const evaluateServiceability = useCallback(async (pin: string, prod: Product) => {
    const cleanPin = pin.trim();
    if (!cleanPin || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setServiceability({
        isChecking: false,
        isServiceable: null,
        message: "Enter your pincode to check delivery availability.",
      });
      return;
    }

    setServiceability((prev) => ({ ...prev, isChecking: true }));
    try {
      const res = await fetch(`${API_URL}/checkout/serviceability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincode: cleanPin,
          items: [{ id: prod.id, name: prod.name, vendorId: prod.vendorId, vendorName: prod.vendorName }],
        }),
      });

      const data = await res.json();
      if (res.ok && data.isServiceable) {
        setServiceability({
          isChecking: false,
          isServiceable: true,
          message: `✓ Delivery available to ${cleanPin}`,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("playpetal_pincode", cleanPin);
        }
      } else {
        setServiceability({
          isChecking: false,
          isServiceable: false,
          message: data.message || "Service is not available in your area. Please select a different address.",
        });
      }
    } catch (err) {
      setServiceability({
        isChecking: false,
        isServiceable: true,
        message: null,
      });
    }
  }, [API_URL]);

  // Auto-eval on pincode change
  useEffect(() => {
    if (product && activePincode) {
      evaluateServiceability(activePincode, product);
    }
  }, [activePincode, product, evaluateServiceability]);

  // Lightweight polling (5s) for storefront status check
  useEffect(() => {
    if (!product || !activePincode || activePincode.length < 6) return;

    const intervalId = setInterval(() => {
      evaluateServiceability(activePincode, product);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [activePincode, product, evaluateServiceability]);

  // Load Pincode-Aware Suggested Products from PostgreSQL Catalog
  useEffect(() => {
    async function loadSuggestedProducts() {
      if (!product) return;
      setLoadingSuggestions(true);
      try {
        const all = await api.getProducts();

        // 1. Exclude current product
        const candidates = all.filter((p) => String(p.id) !== String(product.id));

        // 2. Filter active & in stock
        const validCandidates = candidates.filter((p) => {
          if (p.status && p.status !== "APPROVED") return false;
          if (p.isActive === false) return false;
          if (p.stock !== undefined && p.stock <= 0) return false;
          return true;
        });

        // 3. Score candidates based on category, brand, age group matches
        const currentCategory = (typeof product.category === "string" ? product.category : product.category?.name || "").toLowerCase();
        const currentBrand = (product.brand || "").toLowerCase();
        const currentAge = (product.ageGroup || "").toLowerCase();

        const scored = validCandidates.map((p) => {
          let score = 0;
          const pCat = (typeof p.category === "string" ? p.category : p.category?.name || "").toLowerCase();
          const pBrand = (p.brand || "").toLowerCase();
          const pAge = (p.ageGroup || "").toLowerCase();

          if (pCat && currentCategory && (pCat === currentCategory || pCat.includes(currentCategory) || currentCategory.includes(pCat))) {
            score += 10;
          }
          if (pBrand && currentBrand && pBrand === currentBrand) {
            score += 5;
          }
          if (pAge && currentAge && pAge === currentAge) {
            score += 5;
          }

          return { product: p, score };
        });

        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (b.product.rating || 0) - (a.product.rating || 0);
        });

        let recommendations = scored.map((s) => s.product);

        // 4. If an active pincode exists, filter by backend serviceability
        if (activePincode && /^[1-9][0-9]{5}$/.test(activePincode)) {
          const checks = await Promise.all(
            recommendations.slice(0, 8).map(async (p) => {
              try {
                const res = await fetch(`${API_URL}/checkout/serviceability`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    pincode: activePincode,
                    items: [{ id: p.id, name: p.name, vendorId: p.vendorId, vendorName: p.vendorName }],
                  }),
                });
                const data = await res.json();
                return res.ok && data.isServiceable ? p : null;
              } catch (e) {
                return p;
              }
            })
          );
          const serviceableOnly = checks.filter(Boolean) as Product[];
          if (serviceableOnly.length > 0) {
            recommendations = serviceableOnly;
          }
        }

        setSuggestedProducts(recommendations.slice(0, 4));
      } catch (err) {
        console.error("Failed to load suggested products:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }

    loadSuggestedProducts();
  }, [product, activePincode, API_URL]);

  const handleCheckPincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pincodeInput.trim();
    if (/^[1-9][0-9]{5}$/.test(pin)) {
      setActivePincode(pin);
      if (product) evaluateServiceability(pin, product);
    } else {
      alert("Please enter a valid 6-digit Indian PIN code.");
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-[#FFFDF9] min-h-[70vh] flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-[#202124] font-extrabold text-base animate-pulse">
          <Sparkles className="text-[#D90429] animate-spin" size={24} />
          <span>Loading Product Details...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full bg-[#FFFDF9] min-h-[70vh] flex flex-col items-center justify-center font-sans p-6 text-[#202124]">
        <div className="text-6xl mb-4">🧸</div>
        <h2 className="text-2xl font-black text-[#202124] mb-2">Toy Not Found</h2>
        <p className="text-slate-500 text-sm mb-6">This product might have been moved or is undergoing seller review.</p>
        <Link href="/products" className="bg-[#D90429] hover:bg-[#B7092B] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md transition-all">
          &larr; Back to Toy Wonderland
        </Link>
      </div>
    );
  }

  const currentPrice = product.salePrice || product.price || product.basePrice;
  const originalPrice = product.basePrice || (product.salePrice ? product.price : undefined);
  const wishlisted = isInWishlist(product.id);

  const isAddToCartDisabled = serviceability.isServiceable === false;

  const handleAddToCart = (targetProd = product) => {
    if (isAddToCartDisabled && targetProd.id === product.id) return;
    const targetPrice = targetProd.salePrice || targetProd.price || targetProd.basePrice;
    const targetOrigPrice = targetProd.basePrice || targetProd.price;

    for (let i = 0; i < (targetProd.id === product.id ? quantity : 1); i++) {
      addToCart({
        id: targetProd.id,
        name: targetProd.name,
        price: targetPrice,
        originalPrice: targetOrigPrice,
        img: targetProd.image,
        category: typeof targetProd.category === "string" ? targetProd.category : targetProd.category?.name,
        brand: targetProd.brand,
        ageGroup: targetProd.ageGroup,
        vendorId: targetProd.vendorId,
        vendorName: targetProd.vendorName,
        sku: targetProd.sku
      });
    }
  };

  const handleBuyNow = () => {
    if (isAddToCartDisabled) return;
    handleAddToCart();
    router.push("/checkout");
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const galleryImages = product.images && product.images.length > 0
    ? product.images.map(img => img.url)
    : [product.image];

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-6 px-3 sm:px-5 lg:px-8 font-sans text-[#202124]">
      <div className="w-full space-y-8">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mb-1">
          <Link href="/" className="hover:text-[#D90429] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[#D90429] transition-colors">Toys</Link>
          <span>/</span>
          <span className="text-[#202124] font-extrabold truncate max-w-xs">{product.name}</span>
        </div>

        {/* Compact Product Showcase Card — 12-Column Responsive Layout */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
            
            {/* LEFT COLUMN: Gallery (lg:col-span-5 ~42% width, Compact Height 380-420px max) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Main Product Image Box */}
              <div className="w-full h-[320px] sm:h-[380px] lg:h-[400px] max-h-[400px] rounded-2xl overflow-hidden bg-slate-50/50 border border-slate-200 relative group flex items-center justify-center p-4">
                <img
                  src={activeImage || product.image}
                  alt={product.name}
                  className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
                {product.discount && (
                  <span className="absolute top-3 left-3 bg-[#16803C] text-white text-[11px] font-black px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                    <Sparkles size={12} /> {product.discount}% OFF
                  </span>
                )}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Toggle Wishlist"
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 border border-slate-200 backdrop-blur-xs shadow-xs flex items-center justify-center text-slate-400 hover:text-[#F7255A] transition-all active:scale-90 cursor-pointer"
                >
                  <Heart size={18} className={wishlisted ? "fill-[#F7255A] text-[#F7255A]" : ""} />
                </button>
              </div>

              {/* Thumbnails Strip */}
              {galleryImages.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(imgUrl)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all bg-white p-1 cursor-pointer ${
                        activeImage === imgUrl ? "border-[#D90429] ring-2 ring-[#D90429]/30 scale-95 shadow-2xs" : "border-slate-200 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-contain rounded-lg" />
                    </button>
                  ))}
                </div>
              )}

              {/* Compact Guarantee Pills */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                  <Truck className="mx-auto text-[#D90429] mb-0.5" size={18} />
                  <div className="text-[10px] font-black text-[#202124]">Express Delivery</div>
                  <div className="text-[9px] text-slate-500 font-semibold">2 - 3 Days</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                  <ShieldCheck className="mx-auto text-[#2196F3] mb-0.5" size={18} />
                  <div className="text-[10px] font-black text-[#202124]">100% Non-Toxic</div>
                  <div className="text-[9px] text-slate-500 font-semibold">BIS Certified</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                  <RefreshCcw className="mx-auto text-[#FF9800] mb-0.5" size={18} />
                  <div className="text-[10px] font-black text-[#202124]">7 Days Return</div>
                  <div className="text-[9px] text-slate-500 font-semibold">Easy Policy</div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Product Information & Buy Box (lg:col-span-7 ~58% width, Compact & Readable) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-blue-50 text-[#2196F3] border border-blue-200 text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                  {product.brand || "PLAY PETAL"}
                </span>
                <span className="bg-amber-50 text-[#FF9800] border border-amber-200 text-[11px] font-black px-3 py-0.5 rounded-full">
                  Age: {product.ageGroup || "3+ Years"}
                </span>
                <span className="bg-emerald-50 text-[#16803C] border border-emerald-200 text-[11px] font-black px-3 py-0.5 rounded-full flex items-center gap-1">
                  <PackageCheck size={12} /> In Stock ({product.stock || 20} available)
                </span>
              </div>

              {/* Title — Compact 30-36px font size */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#202124] tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating & SKU Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    <Star size={16} className="fill-amber-500 text-amber-500" />
                  </div>
                  <span className="font-black text-[#202124] text-sm">{product.rating || 4.9}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 font-semibold">{product.salesCount || 120} Happy Kids &amp; Parents</span>
                </div>
                <div className="text-xs text-slate-400 font-mono font-semibold">SKU: {product.sku || product.id}</div>
              </div>

              {/* Price Box */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-[#D90429]">₹{currentPrice}</span>
                  {originalPrice && originalPrice > currentPrice && (
                    <>
                      <span className="text-base font-bold text-slate-400 line-through">₹{originalPrice}</span>
                      <span className="text-xs font-black text-[#16803C] bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-md">
                        Save ₹{originalPrice - currentPrice}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-semibold">Inclusive of all taxes. Free shipping on orders over ₹999.</p>
              </div>

              {/* Compact Verified Seller Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-[#2196F3]">
                    VERIFIED TOY VENDOR
                  </div>
                  <div className="text-sm font-black text-[#202124] flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-[#2196F3]" />
                    <span>{product.vendorName || "Play Petal Marketplace"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Authorized brand seller • Dispatches within 24 hours
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="bg-amber-50 px-2.5 py-1 rounded-full text-xs font-black text-amber-700 border border-amber-200 shadow-2xs inline-block">
                    ⭐ {product.vendorRating || 4.9} / 5
                  </span>
                </div>
              </div>

              {/* Compact Delivery Pincode Checker */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#202124] flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin size={14} className="text-[#D90429]" /> Deliver To Pincode
                  </span>
                </div>

                <form onSubmit={handleCheckPincodeSubmit} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN code..."
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#D90429]"
                  />
                  <button
                    type="submit"
                    className="bg-[#202124] hover:bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Check
                  </button>
                </form>

                {/* Status Indicator */}
                {serviceability.isChecking ? (
                  <div className="text-[11px] text-slate-500 font-bold animate-pulse">
                    Checking delivery availability in PostgreSQL...
                  </div>
                ) : serviceability.isServiceable === null ? (
                  <div className="text-[11px] text-amber-800 font-bold flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
                    <span>Enter your pincode to check delivery availability.</span>
                  </div>
                ) : serviceability.isServiceable === true ? (
                  <div className="text-[11px] text-[#16803C] font-black bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#16803C] flex-shrink-0" />
                    <span>{serviceability.message}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#D90429] font-black bg-red-50 border border-red-200 p-2 rounded-lg flex items-start gap-1.5">
                    <AlertCircle size={14} className="text-[#D90429] flex-shrink-0 mt-0.5" />
                    <span>{serviceability.message}</span>
                  </div>
                )}
              </div>

              {/* Quantity Selector & Share Button */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Quantity:</span>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 text-[#202124] flex items-center justify-center font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer text-xs"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="min-w-[28px] text-center font-black text-[#202124] text-sm select-none">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 text-[#202124] flex items-center justify-center font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer text-xs"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#D90429] cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"
                >
                  <Share2 size={14} /> {copied ? "Link Copied!" : "Share"}
                </button>
              </div>

              {/* Main CTA Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={isAddToCartDisabled}
                  className={`w-full py-3.5 rounded-full font-black text-sm shadow-xs transition-all flex items-center justify-center gap-2 ${
                    isAddToCartDisabled
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 opacity-60"
                      : "bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#202124] active:scale-95 cursor-pointer"
                  }`}
                >
                  <ShoppingBag size={18} /> {isAddToCartDisabled ? "Delivery Unavailable" : "Add to Cart"}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isAddToCartDisabled}
                  className={`w-full py-3.5 rounded-full font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isAddToCartDisabled
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
                      : "bg-[#D90429] hover:bg-[#B7092B] text-white active:scale-95 cursor-pointer"
                  }`}
                >
                  <Zap size={18} /> {isAddToCartDisabled ? "Delivery Unavailable" : "Buy Now"}
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Structured Product Details Cards Below Main Buy Box */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Overview & Specs (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Overview Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-3">
              <h3 className="text-base font-black text-[#202124] flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="text-[#D90429]" size={18} /> Product Overview
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
                {product.description || product.shortDescription}
              </p>
            </div>

            {/* Key Highlights Card */}
            {product.features && product.features.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-3">
                <h3 className="text-base font-black text-[#202124] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Sparkles className="text-[#FF9800]" size={18} /> Key Features &amp; Highlights
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-semibold">
                  {product.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                      <CheckCircle2 size={16} className="text-[#16803C] flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specifications Card */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-3">
                <h3 className="text-base font-black text-[#202124] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <PackageCheck className="text-[#2196F3]" size={18} /> Technical Specifications
                </h3>
                <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-2">
                      <span className="font-bold text-slate-500">{key}</span>
                      <span className="font-black text-[#202124] text-right">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Guarantee Box (1 Col) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-4 sticky top-24">
              <h3 className="text-base font-black text-[#202124] border-b border-slate-100 pb-3">
                Play Petal Assurance
              </h3>
              
              <div className="space-y-4 text-xs font-medium text-slate-600">
                <div className="flex items-start gap-3">
                  <Truck className="text-[#D90429] shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-[#202124]">Fast Nationwide Dispatch</h4>
                    <p className="text-slate-500 text-[11px]">Orders ship within 24 hours via express partner couriers.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="text-[#2196F3] shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-[#202124]">100% Child Safe</h4>
                    <p className="text-slate-500 text-[11px]">Certified non-toxic, BPA-free, BIS &amp; EN71 standard compliant.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <RefreshCcw className="text-[#FF9800] shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-[#202124]">7-Day Return Policy</h4>
                    <p className="text-slate-500 text-[11px]">Damaged or wrong item? Return easily within 7 days.</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-bold text-center">
                100% Verified Authentic Product
              </div>
            </div>
          </div>

        </div>

        {/* 🚀 NEW SECTION: SUGGESTED PRODUCTS ("Suggested For You") 🚀 */}
        {suggestedProducts.length > 0 && (
          <div className="pt-6 border-t border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="bg-red-50 text-[#D90429] border border-red-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  HANDPICKED RECOMMENDATIONS
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#202124] tracking-tight mt-1">
                  Suggested For You ✨
                </h2>
              </div>
              <Link
                href="/products"
                className="text-xs font-bold text-[#D90429] hover:underline flex items-center gap-1"
              >
                View All Toys &rarr;
              </Link>
            </div>

            {/* Suggested Products Grid (4 cols desktop, 3 tablet, 2 mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {suggestedProducts.map((suggestedProd) => {
                const sPrice = suggestedProd.salePrice || suggestedProd.price || suggestedProd.basePrice;
                const sOriginalPrice = suggestedProd.basePrice || suggestedProd.price;
                const sHasDiscount = (suggestedProd.salePrice && suggestedProd.salePrice < suggestedProd.basePrice) || (suggestedProd.discount && suggestedProd.discount > 0);
                const sDiscountPercent = suggestedProd.discount || (sHasDiscount ? Math.round(((sOriginalPrice - sPrice) / sOriginalPrice) * 100) : 0);
                const sIsWish = isInWishlist(suggestedProd.id);
                const sImg = typeof suggestedProd.images?.[0] === 'object' ? suggestedProd.images[0].url : (suggestedProd.image || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=400&q=80");

                return (
                  <motion.div
                    key={suggestedProd.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-[#D90429]/40 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group relative"
                  >
                    {/* Image & Badges */}
                    <div className="relative w-full pt-[90%] bg-slate-50 overflow-hidden">
                      <Link href={`/products/${suggestedProd.id}`}>
                        <img
                          src={sImg}
                          alt={suggestedProd.name}
                          className="absolute inset-0 w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>

                      {/* Top Badges */}
                      {sHasDiscount && (
                        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                          <span className="bg-[#16803C] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs">
                            {sDiscountPercent}% OFF
                          </span>
                        </div>
                      )}

                      {/* Wishlist Button */}
                      <button
                        onClick={() => toggleWishlist(suggestedProd.id)}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 flex items-center justify-center transition-all z-10 cursor-pointer shadow-2xs ${
                          sIsWish ? "text-[#F7255A]" : "text-slate-400 hover:text-[#F7255A]"
                        }`}
                      >
                        <Heart size={14} fill={sIsWish ? "currentColor" : "none"} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-400 mb-1">
                          <span className="uppercase tracking-wider truncate">{suggestedProd.brand || "PLAY PETAL"}</span>
                          <div className="flex items-center gap-0.5 text-amber-500 shrink-0 font-bold">
                            <Star size={11} fill="currentColor" />
                            <span>{suggestedProd.rating || 4.8}</span>
                          </div>
                        </div>

                        <Link href={`/products/${suggestedProd.id}`}>
                          <h3 className="font-extrabold text-[#202124] text-xs leading-snug line-clamp-2 hover:text-[#D90429] transition-colors">
                            {suggestedProd.name}
                          </h3>
                        </Link>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-black text-[#D90429]">₹{sPrice}</span>
                            {sOriginalPrice && sOriginalPrice > sPrice && (
                              <span className="text-[10px] font-bold text-slate-400 line-through">₹{sOriginalPrice}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(suggestedProd)}
                          className="bg-slate-100 hover:bg-[#D90429] text-[#202124] hover:text-white p-2 rounded-xl transition-all active:scale-90 cursor-pointer shadow-2xs"
                          title="Add to Cart"
                        >
                          <ShoppingBag size={15} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
