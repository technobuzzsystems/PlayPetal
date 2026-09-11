"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, Offer } from "../../services/api";
import { Tag, Copy, Check, ArrowRight, Sparkles, Flame } from "lucide-react";

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    api.getOffers().then(setOffers);
  }, []);

  const handleCopy = (code: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-8 px-3 sm:px-4 md:px-5 lg:px-6 font-sans text-[#202124]">
      <div className="w-full">
        
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="bg-red-50 text-[#D90429] border border-red-200 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 w-fit mx-auto shadow-xs">
            <Flame size={14} className="text-[#D90429] animate-pulse" /> Limited Period Discounts
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[#202124] tracking-tight mt-3 mb-2">
            Special Deals &amp; <span className="text-[#D90429]">Promo Offers</span>
          </h1>
          <p className="text-slate-600 text-sm font-medium">
            Unlock exclusive coupons for toys, building sets, and STEM robotics kits across top sellers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {offers.map((offer, idx) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-lg border border-slate-200 hover:border-[#D90429]/40 flex flex-col justify-between relative overflow-hidden transition-all"
            >
              <div className="relative z-10">
                <span className="bg-[#16803C] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                  {offer.tag || "Hot Offer"}
                </span>

                <div className="text-4xl font-black text-[#D90429] mt-4 mb-1">
                  {offer.discountPercent}% OFF
                </div>
                <h3 className="text-lg font-black text-[#202124] mb-2">{offer.title}</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                  {offer.description}
                </p>
              </div>

              <div className="relative z-10 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 w-full sm:w-auto justify-between">
                  <span className="font-mono font-black text-[#D90429] text-xs tracking-wider">{offer.code}</span>
                  <button
                    onClick={() => handleCopy(offer.code)}
                    className="text-[#2196F3] hover:text-[#D90429] text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedCode === offer.code ? (
                      <>
                        <Check size={14} className="text-[#16803C]" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy
                      </>
                    )}
                  </button>
                </div>

                <Link
                  href="/products?onSale=true"
                  className="w-full sm:w-auto bg-[#D90429] hover:bg-[#B7092B] text-white px-5 py-2.5 rounded-full font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                >
                  Shop Deal <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
