"use client";

import { useCart } from "../../context/CartContext";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ArrowRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { api, FALLBACK_PRODUCTS } from "../../services/api";

const PRODUCTS_DATA = [
  {
    id: 1,
    name: "Cute Teddy Bear",
    category: "Soft Toys",
    price: 699,
    originalPrice: 999,
    rating: 4.8,
    reviews: 320,
    img: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80",
  },
  {
    id: 2,
    name: "Remote Control Car",
    category: "Cars & Vehicles",
    price: 1299,
    originalPrice: 1999,
    rating: 4.6,
    reviews: 210,
    img: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=500&q=80",
  },
  {
    id: 3,
    name: "Building Blocks Set",
    category: "Building Blocks",
    price: 799,
    originalPrice: 1199,
    rating: 4.7,
    reviews: 180,
    img: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=500&q=80",
  },
  {
    id: 4,
    name: "Princess Doll House",
    category: "Dolls & Playsets",
    price: 2499,
    originalPrice: 3499,
    rating: 4.8,
    reviews: 156,
    img: "https://images.unsplash.com/photo-1558066126-25816c278fb1?w=500&q=80",
  },
  {
    id: 5,
    name: "Art & Craft Kit",
    category: "Arts & Crafts",
    price: 499,
    originalPrice: 799,
    rating: 4.5,
    reviews: 98,
    img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&q=80",
  },
  {
    id: 6,
    name: "Kids Scooter",
    category: "Outdoor Toys",
    price: 1599,
    originalPrice: 2499,
    rating: 4.8,
    reviews: 143,
    img: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=500&q=80",
  },
  {
    id: 7,
    name: "Educational Puzzle",
    category: "Educational Toys",
    price: 699,
    originalPrice: 999,
    rating: 4.7,
    reviews: 201,
    img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&q=80",
  },
  {
    id: 8,
    name: "Doctor Play Set",
    category: "Baby Toys",
    price: 899,
    originalPrice: 1299,
    rating: 4.6,
    reviews: 112,
    img: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&q=80",
  }
];

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart, isMounted } = useCart();
  const [mounted, setMounted] = useState(false);
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    async function loadApiProducts() {
      try {
        const prods = await api.getProducts();
        setApiProducts(prods);
      } catch (err) {
        console.error("Failed to load API products for wishlist:", err);
      } finally {
        setLoading(false);
      }
    }
    loadApiProducts();
  }, []);

  const wishlistedProducts = useMemo(() => {
    if (!wishlist || wishlist.length === 0) return [];

    return wishlist.map((item) => {
      const wishIdStr = String(item);
      const numericId = Number(item);

      const foundApi = apiProducts.find((p) => String(p.id) === wishIdStr || String(p._id) === wishIdStr);
      if (foundApi) {
        const price = foundApi.salePrice || foundApi.price || foundApi.basePrice;
        const orig = foundApi.basePrice || (foundApi.salePrice ? foundApi.price : price);
        const catStr = typeof foundApi.category === "string" ? foundApi.category : foundApi.category?.name || "Toys";
        const imgUrl = typeof foundApi.images?.[0] === 'object' ? foundApi.images[0].url : (foundApi.image || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80");

        return {
          id: foundApi.id || wishIdStr,
          name: foundApi.name,
          category: catStr,
          price: price,
          originalPrice: orig,
          rating: foundApi.rating || 4.8,
          reviews: foundApi.salesCount || 100,
          img: imgUrl,
          vendorId: foundApi.vendorId,
          vendorName: foundApi.vendorName,
          sku: foundApi.sku
        };
      }

      if (!isNaN(numericId)) {
        const foundFallback = PRODUCTS_DATA.find((p) => p.id === numericId);
        if (foundFallback) return foundFallback;

        const foundService = FALLBACK_PRODUCTS.find((p) => Number(p.id) === numericId);
        if (foundService) {
          const price = foundService.salePrice || foundService.price || foundService.basePrice;
          const orig = foundService.basePrice || price;
          return {
            id: foundService.id,
            name: foundService.name,
            category: typeof foundService.category === "string" ? foundService.category : "Toys",
            price: price,
            originalPrice: orig,
            rating: foundService.rating || 4.7,
            reviews: foundService.salesCount || 80,
            img: foundService.image,
            vendorId: foundService.vendorId,
            vendorName: foundService.vendorName,
            sku: foundService.sku
          };
        }
      }

      return {
        id: wishIdStr,
        name: `Toy Product #${wishIdStr}`,
        category: "Featured Toys",
        price: 999,
        originalPrice: 1299,
        rating: 4.8,
        reviews: 50,
        img: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80",
      };
    });
  }, [wishlist, apiProducts]);

  if (!mounted || !isMounted) {
    return (
      <div className="w-full bg-[#FFFDF9] min-h-[70vh] py-12 px-4 flex items-center justify-center font-sans text-[#202124]">
        <div className="text-center font-bold text-slate-400 animate-pulse">Loading Wishlist...</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-10 px-4 sm:px-6 font-sans text-[#202124]">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#202124] flex items-center gap-3">
              My Wishlist <Heart size={30} className="text-[#F7255A] fill-[#F7255A]" />
            </h1>
            <p className="text-slate-600 text-sm font-semibold mt-1">
              You have <span className="text-[#D90429] font-extrabold">{wishlistedProducts.length}</span> saved toys in your wishlist.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {wishlistedProducts.length > 0 && (
              <button
                onClick={() => {
                  wishlistedProducts.forEach((prod) => addToCart(prod as any));
                }}
                className="bg-red-50 hover:bg-red-100 text-[#D90429] border border-red-200 font-extrabold text-xs px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ShoppingBag size={14} /> Add All to Cart
              </button>
            )}
            <Link href="/products" className="text-sm font-bold text-[#2196F3] hover:text-[#D90429] flex items-center gap-1 transition-colors">
              Explore More Toys &rarr;
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {!loading && wishlistedProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-2xl font-black text-[#202124] mb-2">Your Wishlist is Empty</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Save your favorite toys by tapping the heart icon on any product card!
            </p>
            <Link
              href="/products"
              className="bg-[#D90429] hover:bg-[#B7092B] text-white px-8 py-3 rounded-full font-black text-sm shadow-md transition-all inline-block"
            >
              Discover Toys Now &rarr;
            </Link>
          </div>
        ) : (
          /* Wishlisted Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {wishlistedProducts.map((prod) => {
                const orig = prod.originalPrice || prod.price;
                const discountPct = orig > prod.price ? Math.round(((orig - prod.price) / orig) * 100) : 0;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    key={prod.id}
                    className="bg-white rounded-[24px] overflow-hidden border border-slate-200 hover:border-[#D90429]/40 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group relative"
                  >
                    {/* Image Box */}
                    <div className="relative aspect-square overflow-hidden bg-slate-50 p-3 flex items-center justify-center">
                      <Link href={`/products/${prod.id}`} className="w-full h-full flex items-center justify-center">
                        <img
                          src={prod.img}
                          alt={prod.name}
                          className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-300 shadow-xs"
                        />
                      </Link>
                      
                      {/* Remove Button */}
                      <button 
                        onClick={() => toggleWishlist(prod.id)}
                        className="absolute top-3 right-3 p-2 rounded-full bg-white/90 border border-slate-200 text-[#F7255A] hover:bg-[#F7255A] hover:text-white transition-all shadow-xs cursor-pointer"
                        title="Remove from wishlist"
                      >
                        <Trash2 size={16} />
                      </button>

                      {discountPct > 0 && (
                        <span className="absolute top-3 left-3 bg-[#16803C] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-[#2196F3] uppercase tracking-wider">{prod.category}</span>
                        <Link href={`/products/${prod.id}`}>
                          <h3 className="font-black text-[#202124] text-base mb-1.5 line-clamp-1 hover:text-[#D90429] transition-colors">
                            {prod.name}
                          </h3>
                        </Link>

                        <div className="flex items-center gap-1 text-amber-500 font-black text-xs mb-3">
                          <Star size={12} fill="currentColor" />
                          <span>{prod.rating}</span>
                          <span className="text-slate-400 font-normal">({prod.reviews})</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-baseline justify-between mb-4">
                          <div>
                            <span className="text-lg font-black text-[#202124]">₹{prod.price}</span>
                            {orig > prod.price && (
                              <span className="text-xs text-slate-400 line-through ml-1.5">₹{orig}</span>
                            )}
                          </div>
                          {discountPct > 0 && (
                            <span className="text-[10px] font-bold text-[#16803C] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              Save ₹{orig - prod.price}
                            </span>
                          )}
                        </div>

                        <button 
                          onClick={() => addToCart(prod as any)}
                          className="w-full bg-[#D90429] hover:bg-[#B7092B] text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <ShoppingBag size={14} /> Move to Cart
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
