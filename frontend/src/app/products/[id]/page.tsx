"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, ShoppingBag, Star, Truck, ShieldCheck, RefreshCcw,
  CheckCircle2, Share2, ArrowLeft, PackageCheck, Zap
} from "lucide-react";
import { useCart } from "../../../context/CartContext";
import { api, Product } from "../../../services/api";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { addToCart, toggleWishlist, isInWishlist } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      setLoading(true);
      try {
        const data = await api.getProductById(productId);
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
  }, [productId]);

  if (loading) {
    return (
      <div className="w-full bg-[#FFFDF9] min-h-[70vh] flex items-center justify-center font-sans">
        <div className="text-center font-bold text-slate-400 animate-pulse">Loading Toy Details...</div>
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

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: product.name,
        price: currentPrice,
        originalPrice: originalPrice,
        img: product.image,
        category: typeof product.category === "string" ? product.category : product.category?.name,
        brand: product.brand,
        ageGroup: product.ageGroup,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        sku: product.sku
      });
    }
  };

  const handleBuyNow = () => {
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
    <div className="w-full bg-[#FFFDF9] min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-sans text-[#202124]">
      <div className="max-w-6xl mx-auto">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-6">
          <Link href="/" className="hover:text-[#D90429] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[#D90429] transition-colors">Toys</Link>
          <span>/</span>
          <span className="text-[#202124] font-bold truncate max-w-xs">{product.name}</span>
        </div>

        {/* Product Showcase Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* LEFT: Image Gallery */}
          <div className="space-y-4">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 relative group flex items-center justify-center p-4">
              <img
                src={activeImage || product.image}
                alt={product.name}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
              {product.discount && (
                <span className="absolute top-4 left-4 bg-[#16803C] text-white text-xs font-black px-3 py-1 rounded-full shadow-sm">
                  {product.discount}% OFF
                </span>
              )}
              <button
                onClick={() => toggleWishlist(product.id)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 border border-slate-200 backdrop-blur-xs shadow-xs flex items-center justify-center text-slate-400 hover:text-[#F7255A] transition-colors"
              >
                <Heart size={20} className={wishlisted ? "fill-[#F7255A] text-[#F7255A]" : ""} />
              </button>
            </div>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(imgUrl)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all bg-slate-50 p-1 ${
                      activeImage === imgUrl ? "border-[#D90429] ring-2 ring-[#D90429]/30 scale-95 shadow-xs" : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}
              </div>
            )}

            {/* Guarantee Pills */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <Truck className="mx-auto text-[#D90429] mb-1" size={20} />
                <div className="text-[11px] font-black text-[#202124]">Express Delivery</div>
                <div className="text-[9px] text-slate-500 font-semibold">2 - 3 Days Across India</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <ShieldCheck className="mx-auto text-[#2196F3] mb-1" size={20} />
                <div className="text-[11px] font-black text-[#202124]">100% Non-Toxic</div>
                <div className="text-[9px] text-slate-500 font-semibold">BIS &amp; EN71 Certified</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <RefreshCcw className="mx-auto text-[#FF9800] mb-1" size={20} />
                <div className="text-[11px] font-black text-[#202124]">7 Days Return</div>
                <div className="text-[9px] text-slate-500 font-semibold">Hassle-free policy</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Product Details & Actions */}
          <div className="flex flex-col justify-between space-y-6">
            
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-blue-50 text-[#2196F3] border border-blue-200 text-xs font-black px-3 py-1 rounded-full">
                  {product.brand}
                </span>
                <span className="bg-amber-50 text-[#FF9800] border border-amber-200 text-xs font-black px-3 py-1 rounded-full">
                  Age: {product.ageGroup}
                </span>
                <span className="bg-emerald-50 text-[#16803C] border border-emerald-200 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
                  <PackageCheck size={12} /> In Stock ({product.stock || 20} units)
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-[#202124] tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating & SKU */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    <Star size={16} className="fill-amber-500 text-amber-500" />
                  </div>
                  <span className="font-black text-[#202124] text-sm">{product.rating || 4.9}</span>
                  <span>•</span>
                  <span>{product.salesCount || 120} Happy Kids &amp; Parents</span>
                </div>
                <div className="text-[11px] text-slate-400">SKU: {product.sku || product.id}</div>
              </div>

              {/* Vendor Attribution */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#2196F3]">
                    Verified Toy Vendor
                  </div>
                  <div className="text-sm font-black text-[#202124] flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck size={16} className="text-[#2196F3]" />
                    <span>{product.vendorName || "Play Petal Marketplace"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Authorized brand seller • Dispatches within 24 hours
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-white px-2.5 py-1 rounded-full text-xs font-black text-amber-600 border border-slate-200 shadow-xs">
                    ⭐ {product.vendorRating || 4.9} / 5
                  </span>
                </div>
              </div>

              {/* Price Block */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-[#D90429]">₹{currentPrice}</span>
                {originalPrice && originalPrice > currentPrice && (
                  <>
                    <span className="text-base font-bold text-slate-400 line-through">₹{originalPrice}</span>
                    <span className="text-xs font-black text-[#16803C] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Save ₹{originalPrice - currentPrice}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-semibold">Inclusive of all taxes. Free shipping on orders over ₹999.</p>

              {/* Description */}
              <p className="text-slate-600 text-sm leading-relaxed">
                {product.description || product.shortDescription}
              </p>

              {/* Specifications */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                  <h4 className="font-extrabold text-[#202124] text-xs mb-1">Product Specifications:</h4>
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-slate-200 last:border-0">
                      <span className="font-bold text-slate-500">{key}:</span>
                      <span className="font-extrabold text-[#202124]">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Key Features */}
              {product.features && product.features.length > 0 && (
                <div>
                  <h4 className="font-extrabold text-[#202124] text-xs mb-2">Key Highlights:</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 font-medium">
                    {product.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#16803C] flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-600">Quantity:</span>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-[#202124] flex items-center justify-center font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer text-sm"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="min-w-[28px] text-center font-black text-[#202124] text-sm select-none">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-[#202124] flex items-center justify-center font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer text-sm"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleShare}
                  className="ml-auto flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#D90429] cursor-pointer transition-colors"
                >
                  <Share2 size={15} /> {copied ? "Link Copied!" : "Share Toy"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#202124] py-3.5 rounded-2xl font-black text-sm shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <ShoppingBag size={18} /> Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  className="w-full bg-[#D90429] hover:bg-[#B7092B] text-white py-3.5 rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Zap size={18} /> Buy Now
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
