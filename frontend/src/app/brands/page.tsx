"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, Brand } from "../../services/api";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

const BRAND_FALLBACK_LOGOS: Record<string, string> = {
  lego: "/brands/lego.svg",
  "hot-wheels": "/brands/hot-wheels.svg",
  "hot wheels": "/brands/hot-wheels.svg",
  barbie: "/brands/barbie.svg",
  "fisher-price": "/brands/fisher-price.svg",
  "fisher price": "/brands/fisher-price.svg",
  nerf: "/brands/nerf.svg",
  "melissa & doug": "/brands/melissa-doug.svg",
  "melissa-and-doug": "/brands/melissa-doug.svg",
  "melissa and doug": "/brands/melissa-doug.svg",
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    api.getBrands().then(setBrands);
  }, []);

  const getLogoSrc = (brand: Brand) => {
    const key = (brand.slug || brand.name || "").toLowerCase();
    const fallback = BRAND_FALLBACK_LOGOS[key] || "/brands/lego.svg";
    if (!brand.logo || brand.logo.includes("placeholder") || brand.logo.includes("broken")) {
      return fallback;
    }
    return brand.logo;
  };

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-8 px-3 sm:px-4 md:px-5 lg:px-6 font-sans text-[#202124]">
      <div className="w-full">
        
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="bg-red-50 text-[#D90429] border border-red-200 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider inline-block shadow-xs">
            Official Brand Partners 🌟
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[#202124] tracking-tight mt-3 mb-2">
            World-Famous <span className="text-[#D90429]">Toy Brands</span>
          </h1>
          <p className="text-slate-600 text-sm font-medium">
            Explore authentic, certified collections from LEGO, Hot Wheels, Barbie, Melissa &amp; Doug, and Fisher-Price.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
          {brands.map((brand, idx) => {
            const key = (brand.slug || brand.name || "").toLowerCase();
            const fallback = BRAND_FALLBACK_LOGOS[key] || "/brands/lego.svg";

            return (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg border border-slate-200 hover:border-[#D90429]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 mb-4 flex items-center justify-center p-2 shadow-xs">
                    <img 
                      src={getLogoSrc(brand)} 
                      alt={brand.name} 
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#2196F3] mb-1">
                    <ShieldCheck size={14} className="text-[#2196F3]" />
                    <span>Verified Official Brand</span>
                  </div>
                  <h3 className="text-xl font-black text-[#202124] mb-2">{brand.name}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6 font-medium">
                    {brand.description}
                  </p>
                </div>

                <Link
                  href={`/products?brand=${encodeURIComponent(brand.name)}`}
                  className="w-full bg-[#D90429] hover:bg-[#B7092B] text-white py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 text-center shadow-md active:scale-95"
                >
                  Shop {brand.name} Toys <ArrowRight size={14} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
