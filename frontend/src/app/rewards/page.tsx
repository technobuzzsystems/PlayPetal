"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Gift, Sparkles, ChevronRight } from "lucide-react";

export default function RewardsPage() {
  return (
    <div className="min-h-[85vh] bg-[#FFFDF9] text-[#202124] flex flex-col pt-12 pb-20 px-4">
      <div className="max-w-4xl mx-auto w-full text-center">
        {/* Header */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center justify-center w-24 h-24 bg-[#D90429] text-white rounded-full shadow-md mb-6">
          <Gift size={40} />
        </motion.div>
        
        <h1 className="text-4xl font-black text-[#202124] mb-4">Play Petal <span className="text-[#D90429]">Play Points</span></h1>
        <p className="text-slate-600 font-medium max-w-lg mx-auto mb-10 text-lg">
          Earn magical points on every purchase and unlock exclusive toys, early access, and huge discounts!
        </p>

        {/* Content */}
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
          <div className="flex flex-col items-center justify-center">
             <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="text-5xl mb-6">
               👑
             </motion.div>
             <h2 className="text-2xl font-black text-[#D90429] mb-2">Rewards Program Coming Soon!</h2>
             <p className="text-slate-600 font-medium max-w-sm mb-8">
               We are crafting the ultimate loyalty experience. Soon you&apos;ll be able to view and redeem your Play Points right here.
             </p>
             <Link href="/products" className="bg-[#D90429] hover:bg-[#B7092B] text-white px-8 py-3 rounded-full font-bold shadow-md transition-all flex items-center justify-center gap-2 group active:scale-95">
               <span>Start Shopping</span>
               <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
