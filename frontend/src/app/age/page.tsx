"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, AgeGroup } from "../../services/api";
import { ArrowRight, Sparkles } from "lucide-react";

export default function AgePage() {
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);

  useEffect(() => {
    api.getAgeGroups().then(setAgeGroups);
  }, []);

  const getShumeeAgeTheme = (label: string, idx: number) => {
    const l = (label || "").toLowerCase();
    if (l.includes("0-1") || l.includes("0 - 1") || l.includes("0-2") || l.includes("0 - 2") || idx === 0) {
      return {
        badgeBg: "bg-[#FF9800] text-white",
        iconGradient: "from-[#FF9800] to-[#FFB52E]",
        btnHover: "hover:bg-[#FF9800] hover:text-white",
      };
    }
    if (l.includes("1-3") || l.includes("1 - 3") || l.includes("2-4") || idx === 1) {
      return {
        badgeBg: "bg-[#2196F3] text-white",
        iconGradient: "from-[#2196F3] to-[#42A5F5]",
        btnHover: "hover:bg-[#2196F3] hover:text-white",
      };
    }
    if (l.includes("3-6") || l.includes("3 - 6") || l.includes("4-6") || idx === 2) {
      return {
        badgeBg: "bg-[#9C27B0] text-white",
        iconGradient: "from-[#9C27B0] to-[#B23AC6]",
        btnHover: "hover:bg-[#9C27B0] hover:text-white",
      };
    }
    return {
      badgeBg: "bg-[#43B94A] text-white",
      iconGradient: "from-[#43B94A] to-[#66C96A]",
      btnHover: "hover:bg-[#43B94A] hover:text-white",
    };
  };

  return (
    <div className="w-full bg-[#FFFDF9] min-h-screen py-8 px-3 sm:px-4 md:px-5 lg:px-6 font-sans text-[#202124]">
      <div className="w-full max-w-7xl mx-auto">
        
        {/* Top Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="bg-amber-50 text-[#FF9800] text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider border border-amber-200 shadow-xs inline-block">
            Developmentally Tailored 🎈
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#202124] tracking-tight mt-3 mb-2">
            Shop Toys by <span className="text-[#D90429]">Age Group</span>
          </h1>
          <p className="text-slate-600 text-sm md:text-base font-medium">
            Find the perfect toys tailored to cognitive milestones, motor skills, and creative imagination.
          </p>
        </div>

        {/* MILESTONE BANNER */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm mb-12 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="max-w-xl space-y-2 text-center md:text-left relative z-10">
            <span className="text-xs font-black uppercase tracking-widest text-[#2196F3]">
              Child Development Philosophy
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-[#202124]">
              We Believe that Play is <span className="text-[#D90429]">90% Child</span> &amp; <span className="text-[#FF9800]">10% Toy!</span>
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
              Every milestone matters. Our toys are scientifically chosen by educators to build curiosity, motor skills, problem solving, and confidence.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 relative z-10">
            <span className="bg-[#FF9800] text-white font-black text-xs px-4 py-2 rounded-full shadow-xs">0-1 Years</span>
            <span className="bg-[#2196F3] text-white font-black text-xs px-4 py-2 rounded-full shadow-xs">1-3 Years</span>
            <span className="bg-[#9C27B0] text-white font-black text-xs px-4 py-2 rounded-full shadow-xs">3-6 Years</span>
            <span className="bg-[#43B94A] text-white font-black text-xs px-4 py-2 rounded-full shadow-xs">6+ Years</span>
          </div>
        </div>

        {/* Age Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
          {ageGroups.map((ag, idx) => {
            const theme = getShumeeAgeTheme(ag.label, idx);
            return (
              <motion.div
                key={ag.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg border border-slate-200 hover:border-[#D90429]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.iconGradient} text-white flex items-center justify-center text-2xl shadow-xs mb-4`}>
                    {ag.icon || "🧸"}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${theme.badgeBg}`}>
                      {ag.badge || "Milestone Age"}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-[#202124] mb-1">{ag.label}</h3>
                  <p className="text-slate-500 text-xs font-semibold mb-3">{ag.subtitle}</p>
                </div>

                <Link
                  href={`/products?ageGroup=${encodeURIComponent(ag.label)}`}
                  className="w-full bg-[#D90429] hover:bg-[#B7092B] text-white py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 text-center shadow-md active:scale-95 mt-4"
                >
                  Explore {ag.label} Toys <ArrowRight size={14} />
                </Link>
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
