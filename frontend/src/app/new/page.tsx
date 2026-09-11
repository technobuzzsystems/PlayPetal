"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { motion } from "framer-motion";
import { Star, ShoppingBag, Heart, Sparkles } from "lucide-react";
import { useCart } from "../../context/CartContext";

function NewArrivalsInner() {
  const { addToCart, toggleWishlist, isInWishlist, isMounted } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const approved = data.filter((item: any) => (item.status === "APPROVED" || item.status === "Active") && item.isActive !== false);
          const tagged = approved.filter((item: any) => Boolean(item.isNewArrival));

          const formatted = tagged.map((item: any, idx: number) => ({
            id: item.id,
            name: item.name,
            category: typeof item.category === "string" ? item.category : (item.category?.name || "Toys"),
            brand: item.brand || "Play Petal",
            price: Number(item.salePrice || item.price || item.basePrice),
            originalPrice: Number(item.basePrice || item.price || 1499),
            rating: Number(item.rating || 4.8),
            reviews: Number(item.reviewsCount || item.reviewCount || 24),
            img: item.images?.[0]?.url || item.image || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80",
            badge: "NEW",
          }));
          setProducts(formatted);
        } else {
          setProducts([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load new arrivals:", err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All") return products;
    return products.filter(p => p.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());
  }, [products, selectedCategory]);

  if (!isMounted) return null;

  return (
    <div className="w-full bg-[#FFFDF9] text-[#202124] min-h-screen py-8 font-sans">
      
      {/* HERO BANNER */}
      <section className="w-full px-3 sm:px-4 md:px-5 lg:px-6 mb-10">
        <div className="bg-[#D90429] rounded-3xl p-8 md:p-12 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-lg min-h-[200px]">
          <div className="z-10 max-w-xl text-center md:text-left mb-6 md:mb-0">
            <span className="bg-white/20 text-[#FFD43B] border border-white/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3 inline-flex items-center gap-1.5 shadow-xs">
              <Sparkles size={14} className="text-[#FFD43B]" />
              <span>Just Unboxed</span>
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight mb-2">
              New Arrivals <span className="text-[#FFD43B]">Kingdom</span>
            </h1>
            <p className="text-white/90 text-sm md:text-base font-semibold max-w-md">
              Fresh out of the factory! Discover the latest trending toys, STEM kits, and playful characters.
            </p>
          </div>
        </div>
      </section>

      {/* CATEGORY FILTER TABS */}
      <section className="w-full px-3 sm:px-4 md:px-5 lg:px-6 mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#D90429] text-white shadow-xs scale-105"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-500">
            Showing {filteredProducts.length} New Arrivals
          </span>
        </div>
      </section>

      {/* PRODUCTS GRID */}
      <section className="w-full px-3 sm:px-4 md:px-5 lg:px-6 mb-16">
        {loading ? (
          <div className="text-center py-20 font-bold text-slate-400">Loading New Arrivals...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-xl font-black text-[#202124] mb-2">No New Arrivals Found</h3>
            <p className="text-slate-500 text-sm font-medium">
              Check back soon! New toys are being added by verified sellers daily.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((p: any) => {
              const isWishlisted = isInWishlist(p.id);

              return (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-[#D90429]/40 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div className="relative h-64 w-full bg-slate-50 p-6 flex items-center justify-center overflow-hidden">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />

                    <span className="absolute top-4 left-4 bg-[#2196F3] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs uppercase tracking-wider">
                      {p.badge}
                    </span>

                    <button
                      onClick={() => toggleWishlist(p.id)}
                      className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-400 hover:text-[#F7255A] border border-slate-200 shadow-xs transition-all cursor-pointer"
                    >
                      <Heart size={16} className={isWishlisted ? "fill-[#F7255A] text-[#F7255A]" : ""} />
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {p.brand} • {p.category}
                      </div>
                      <h3 className="font-bold text-[#202124] text-sm md:text-base line-clamp-2 leading-snug mb-2 hover:text-[#D90429] transition-colors">
                        {p.name}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="flex items-center text-amber-500">
                          <Star size={14} className="fill-amber-500" />
                        </div>
                        <span className="text-xs font-black text-[#202124]">{p.rating}</span>
                        <span className="text-[11px] text-slate-400 font-medium">({p.reviews} reviews)</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-black text-[#202124]">₹{p.price}</div>
                        {p.originalPrice > p.price && (
                          <div className="text-xs text-slate-400 line-through">₹{p.originalPrice}</div>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart({
                          id: p.id,
                          name: p.name,
                          price: p.price,
                          originalPrice: p.originalPrice,
                          img: p.img,
                          category: p.category,
                          brand: p.brand
                        })}
                        className="bg-[#D90429] hover:bg-[#B7092B] text-white p-2.5 rounded-full shadow-xs transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                      >
                        <ShoppingBag size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}

export default function NewArrivalsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFFDF9] p-8 text-center text-[#202124] font-bold">Loading New Arrivals...</div>}>
      <NewArrivalsInner />
    </Suspense>
  );
}
