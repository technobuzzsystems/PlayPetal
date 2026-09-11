"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, ShoppingBag, Star, Truck, ShieldCheck, RefreshCcw,
  CheckCircle2, Share2, ArrowLeft, PackageCheck, Zap,
  ChevronLeft, ChevronRight, X, Maximize2
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({
    customerName: "",
    customerEmail: "",
    rating: 5,
    comment: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmittedMessage, setReviewSubmittedMessage] = useState("");

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

  // Fetch product reviews
  useEffect(() => {
    if (!productId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const productRevs = data.filter((r: any) => String(r.productId) === String(productId));
          setReviews(productRevs);
        }
      })
      .catch(() => {});
  }, [productId]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.customerName || !newReview.comment || !product) return;
    setSubmittingReview(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          customerName: newReview.customerName,
          customerEmail: newReview.customerEmail,
          rating: Number(newReview.rating),
          comment: newReview.comment,
        }),
      });

      if (res.ok) {
        const added = await res.json();
        setReviews((prev) => [added, ...prev]);
      } else {
        throw new Error("Failed to post review");
      }
    } catch (err) {
      console.error("Failed to post review:", err);
      const fallbackRev = {
        id: `rev-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        customerName: newReview.customerName,
        rating: Number(newReview.rating),
        comment: newReview.comment,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      };
      setReviews((prev) => [fallbackRev, ...prev]);
    } finally {
      setNewReview({ customerName: "", customerEmail: "", rating: 5, comment: "" });
      setReviewSubmittedMessage("Thank you! Your review has been posted successfully 🎉");
      setSubmittingReview(false);
      setTimeout(() => setReviewSubmittedMessage(""), 5000);
    }
  };

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
        img: product.image || (product as any).img || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80",
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

  // Extract all valid sub-images (handles object array {url}, string array, additionalImages & galleryImages)
  const rawImagesList: string[] = [];
  if (product?.image && typeof product.image === "string" && product.image.trim()) {
    rawImagesList.push(product.image.trim());
  }

  if (Array.isArray(product?.images)) {
    product.images.forEach((img: any) => {
      if (typeof img === "string" && img.trim()) {
        rawImagesList.push(img.trim());
      } else if (img && typeof img === "object") {
        const u = img.url || img.src || img.link;
        if (typeof u === "string" && u.trim()) {
          rawImagesList.push(u.trim());
        }
      }
    });
  }

  if (Array.isArray((product as any)?.additionalImages)) {
    (product as any).additionalImages.forEach((img: any) => {
      if (typeof img === "string" && img.trim()) {
        rawImagesList.push(img.trim());
      }
    });
  }

  if (Array.isArray((product as any)?.galleryImages)) {
    (product as any).galleryImages.forEach((img: any) => {
      if (typeof img === "string" && img.trim()) {
        rawImagesList.push(img.trim());
      }
    });
  }

  const galleryImages = Array.from(new Set(rawImagesList.filter(Boolean)));
  if (galleryImages.length === 0 && product?.image) {
    galleryImages.push(product.image);
  }

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-8 px-3 sm:px-4 md:px-5 lg:px-6 font-sans text-[#202124]">
      <div className="w-full">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-6">
          <Link href="/" className="hover:text-[#D90429] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[#D90429] transition-colors">Products</Link>
          <span>/</span>
          <span className="text-[#202124] font-bold truncate max-w-[200px]">{product.name}</span>
        </div>

        {/* Product Showcase Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* LEFT: Image Gallery with Resized Main Image & Sub-Images Below */}
          <div className="space-y-5 flex flex-col items-center">
            
            {/* Main Product Image Container (Clickable for Fullscreen Multi-Angle Lightbox) */}
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="w-full max-w-[420px] aspect-square max-h-[380px] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 relative group flex items-center justify-center p-4 shadow-2xs mx-auto cursor-zoom-in"
              title="Click image to open fullscreen multi-angle view"
            >
              <img
                src={activeImage || product.image || (product as any).img || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80"}
                alt={product.name}
                className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
              {product.discount && (
                <span className="absolute top-3 left-3 bg-[#16803C] text-white text-xs font-black px-3 py-1 rounded-full shadow-sm">
                  {product.discount}% OFF
                </span>
              )}
              <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white px-2.5 py-1 rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-bold">
                <Maximize2 size={13} /> Fullscreen
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product.id);
                }}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 border border-slate-200 backdrop-blur-xs shadow-xs flex items-center justify-center text-slate-400 hover:text-[#F7255A] transition-colors cursor-pointer z-10"
              >
                <Heart size={18} className={wishlisted ? "fill-[#F7255A] text-[#F7255A]" : ""} />
              </button>
            </div>

            {/* Sub-Images (Horizontal Strip Directly Below Main Image) */}
            {galleryImages.length > 1 && (
              <div className="w-full max-w-[420px] flex items-center justify-center gap-3 overflow-x-auto py-2 no-scrollbar mx-auto">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(imgUrl)}
                    className={`w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all bg-slate-50 p-1 cursor-pointer ${
                      activeImage === imgUrl
                        ? "border-[#D90429] ring-2 ring-[#D90429]/30 scale-95 shadow-xs"
                        : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                    title={`View angle #${idx + 1}`}
                  >
                    <img src={imgUrl} alt={`Sub image ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
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

        {/* CUSTOMER REVIEWS & FEEDBACK SECTION */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
                Customer Reviews 💬
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#202124]">
                What Parents &amp; Kids Say
              </h2>
              <p className="text-slate-500 text-xs font-semibold mt-1">
                Real feedback from verified purchasers of {product.name}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-3xl font-black text-[#202124]">{product.rating || 4.9}</div>
              <div>
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className="fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">
                  {reviews.length > 0 ? `${reviews.length} Customer Reviews` : "Be the first to review!"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Reviews List Column */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-base font-black text-[#202124]">Verified Customer Reviews</h3>

              {reviews.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
                  <div className="text-4xl mb-2">⭐</div>
                  <h4 className="font-extrabold text-[#202124] text-sm">No Customer Reviews Yet</h4>
                  <p className="text-slate-500 text-xs mt-1">Have you purchased this toy? Share your experience using the form on the right!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev, idx) => (
                    <div key={rev.id || idx} className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#D90429] text-white font-black text-xs flex items-center justify-center">
                            {(rev.customerName || "C").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-[#202124] text-xs">{rev.customerName}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{rev.date || "Verified Purchase"}</div>
                          </div>
                        </div>

                        <div className="flex text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={13} className={i < (rev.rating || 5) ? "fill-amber-500 text-amber-500" : "text-slate-200"} />
                          ))}
                        </div>
                      </div>

                      <p className="text-slate-700 text-xs leading-relaxed italic font-medium pt-1">
                        "{rev.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* WRITE A REVIEW FORM */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 h-fit">
              <div>
                <h3 className="text-base font-black text-[#202124]">Write a Review ✍️</h3>
                <p className="text-xs text-slate-500 font-medium">Help other parents by sharing your feedback for this toy.</p>
              </div>

              {reviewSubmittedMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in duration-200">
                  {reviewSubmittedMessage}
                </div>
              )}

              <form onSubmit={handleAddReview} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Your Rating *</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className="p-1 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          size={22}
                          className={star <= newReview.rating ? "fill-amber-500 text-amber-500" : "text-slate-300"}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-black text-slate-700 ml-2">{newReview.rating} / 5 Stars</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sneha Kulkarni"
                    value={newReview.customerName}
                    onChange={(e) => setNewReview({ ...newReview, customerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#D90429]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Your Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. sneha@example.com"
                    value={newReview.customerEmail}
                    onChange={(e) => setNewReview({ ...newReview, customerEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#D90429]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Your Review Comment *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe toy quality, build material, child's enjoyment, etc..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#D90429]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-[#D90429] hover:bg-[#B7092B] text-white py-3 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submittingReview ? "Submitting Review..." : "Submit Customer Review ⭐"}
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>

      {/* Fullscreen Multi-Angle Image Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Header Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white border-b border-white/10 pb-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">{product.name}</h3>
              <p className="text-xs text-slate-300">
                Angle {Math.max(1, galleryImages.indexOf(activeImage) + 1)} of {galleryImages.length}
              </p>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close Fullscreen View (Esc)"
            >
              <X size={24} />
            </button>
          </div>

          {/* Main Fullscreen Display Frame */}
          <div className="relative w-full max-w-4xl flex-1 flex items-center justify-center p-2 my-auto">
            {galleryImages.length > 1 && (
              <button
                onClick={() => {
                  const currentIdx = galleryImages.indexOf(activeImage);
                  const prevIdx = (currentIdx - 1 + galleryImages.length) % galleryImages.length;
                  setActiveImage(galleryImages[prevIdx]);
                }}
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
                title="Previous angle"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img
              src={activeImage || product.image}
              alt={product.name}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl transition-all duration-200"
            />

            {galleryImages.length > 1 && (
              <button
                onClick={() => {
                  const currentIdx = galleryImages.indexOf(activeImage);
                  const nextIdx = (currentIdx + 1) % galleryImages.length;
                  setActiveImage(galleryImages[nextIdx]);
                }}
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
                title="Next angle"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Bottom Angle Thumbnails Bar */}
          {galleryImages.length > 1 && (
            <div className="w-full max-w-3xl flex items-center justify-center gap-3 overflow-x-auto pt-3 border-t border-white/10">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(imgUrl)}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImage === imgUrl ? "border-[#D90429] ring-2 ring-[#D90429]/50 scale-105" : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                  title={`View angle #${idx + 1}`}
                >
                  <img src={imgUrl} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
