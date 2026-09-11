"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Star, Filter, Heart, ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "../../../context/CartContext";

export default function ProductListingPage() {
  const params = useParams();
  const categorySlug = (params?.slug ? String(params.slug) : "toys").toLowerCase();
  const { addToCart, toggleWishlist, isInWishlist, isMounted } = useCart();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAge, setSelectedAge] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(10000);

  // Friendly title from slug
  const categoryTitle = useMemo(() => {
    return categorySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }, [categorySlug]);

  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const approved = data.filter(
            (p: any) => (p.status === "APPROVED" || p.status === "Active") && p.isActive !== false
          );
          setProducts(approved);
        }
      })
      .catch((err) => console.error("Failed to fetch category products:", err))
      .finally(() => setLoading(false));
  }, []);

  // Filter products by category slug
  const categoryProducts = useMemo(() => {
    const slugClean = categorySlug.replace(/[^a-z0-9]/g, "");
    return products.filter((p: any) => {
      const catName = (typeof p.category === "string" ? p.category : p.category?.name || "").toLowerCase();
      const catClean = catName.replace(/[^a-z0-9]/g, "");
      const matchesCategory =
        catClean.includes(slugClean) ||
        slugClean.includes(catClean) ||
        (p.categoryId && p.categoryId.toLowerCase().includes(slugClean));

      if (!matchesCategory) return false;

      // Age filter
      if (selectedAge !== "all") {
        const cleanAge = selectedAge.toLowerCase().replace("years", "").trim();
        if (!p.ageGroup?.toLowerCase().includes(cleanAge)) return false;
      }

      // Price filter
      const price = Number(p.salePrice || p.price || p.basePrice || 0);
      if (price > maxPrice) return false;

      return true;
    });
  }, [products, categorySlug, selectedAge, maxPrice]);

  if (!isMounted) return null;

  return (
    <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-8 font-sans bg-[#FFFDF9] min-h-screen text-[#202124]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#D90429] mb-3 transition-colors"
        >
          <ArrowLeft size={16} /> Back to All Toys
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-[#202124] capitalize flex items-center gap-3">
              Explore {categoryTitle} <span className="text-[#D90429]">✨</span>
            </h1>
            <p className="text-slate-600 mt-2 text-sm md:text-base font-medium">
              Showing {categoryProducts.length} toy{categoryProducts.length === 1 ? "" : "s"} in {categoryTitle}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-64 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-fit"
        >
          <div className="flex items-center gap-2 mb-6 text-[#202124] font-black text-base">
            <Filter size={18} className="text-[#D90429]" />
            Filters
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-3">Age Group</h3>
              <div className="space-y-2 text-sm">
                {["all", "0-2 Years", "3-5 Years", "6-8 Years", "9-12 Years", "13+ Years"].map((age) => (
                  <label
                    key={age}
                    className="flex items-center gap-2.5 text-slate-700 cursor-pointer hover:text-[#D90429] font-semibold"
                  >
                    <input
                      type="radio"
                      name="ageGroup"
                      checked={selectedAge === age}
                      onChange={() => setSelectedAge(age)}
                      className="accent-[#D90429]"
                    />
                    <span className="capitalize">{age === "all" ? "All Ages" : age}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Max Price</h3>
                <span className="font-black text-[#D90429] text-xs">₹{maxPrice}</span>
              </div>
              <input
                type="range"
                min="200"
                max="10000"
                step="100"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#D90429] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 font-semibold mt-1">
                <span>₹200</span>
                <span>₹10,000</span>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-20 font-bold text-slate-400">Loading {categoryTitle} Toys...</div>
          ) : categoryProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
              <div className="text-6xl mb-4">🧸</div>
              <h3 className="text-xl font-black text-[#202124] mb-2">No toys found in {categoryTitle}</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                Try adjusting your filters or explore our complete toy catalog.
              </p>
              <Link
                href="/products"
                className="inline-block bg-[#D90429] hover:bg-[#B7092B] text-white font-black text-xs px-6 py-3 rounded-full transition-all shadow-md"
              >
                Browse All Toys &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryProducts.map((product, idx) => {
                const price = Number(product.salePrice || product.price || product.basePrice || 999);
                const originalPrice = Number(product.basePrice || product.price || price);
                const imageUrl =
                  product.images?.[0]?.url ||
                  product.image ||
                  "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80";
                const inWish = isInWishlist(product.id);

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -6 }}
                    key={product.id}
                    className="bg-white rounded-[24px] p-5 shadow-sm hover:shadow-lg border border-slate-200 hover:border-[#D90429]/40 group transition-all relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(product.id);
                      }}
                      className={`absolute top-4 right-4 z-10 p-2.5 rounded-full backdrop-blur-xs transition-all border ${
                        inWish
                          ? "bg-[#F7255A] border-[#F7255A] text-white shadow-xs"
                          : "bg-white/80 border-slate-200 text-slate-400 hover:text-[#F7255A]"
                      }`}
                      title={inWish ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <Heart size={18} fill={inWish ? "currentColor" : "none"} />
                    </button>

                    {/* Product Image */}
                    <Link href={`/products/${product.id}`} className="block relative aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-50 p-2">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500 shadow-xs"
                      />
                      {product.isBestSeller && (
                        <span className="absolute top-3 left-3 bg-[#FF9800] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                          🔥 Best Seller
                        </span>
                      )}
                      {product.isNewArrival && !product.isBestSeller && (
                        <span className="absolute top-3 left-3 bg-[#2196F3] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                          ✨ New
                        </span>
                      )}
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold text-[#2196F3] uppercase tracking-wider mb-1">
                          {typeof product.category === "string" ? product.category : product.category?.name || "Toys"}
                        </div>
                        <Link href={`/products/${product.id}`}>
                          <h3 className="font-extrabold text-[#202124] leading-snug mb-1 line-clamp-2 hover:text-[#D90429] transition-colors">
                            {product.name}
                          </h3>
                        </Link>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1 mb-2">
                          <Star size={14} className="text-amber-500 fill-amber-500" />
                          <span className="text-xs font-bold text-[#202124]">{product.rating || 5.0}</span>
                          <span className="text-[11px] text-slate-400">({product.salesCount || 12} sold)</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-[#202124]">₹{price}</span>
                            {originalPrice > price && (
                              <span className="text-xs text-slate-400 line-through font-semibold">
                                ₹{originalPrice}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              addToCart({
                                id: product.id,
                                name: product.name,
                                price: price,
                                image: imageUrl,
                                img: imageUrl,
                                category: typeof product.category === "string" ? product.category : product.category?.name,
                              })
                            }
                            className="bg-[#D90429] hover:bg-[#B7092B] text-white p-2.5 rounded-full transition-all shadow-xs cursor-pointer active:scale-95"
                            title="Add to Cart"
                          >
                            <ShoppingBag size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
