"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Settings, Heart, Package, LogOut, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[85vh] bg-[#FFFDF9] text-[#202124] flex flex-col pt-12 pb-20 px-4">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-[#D90429] text-white flex items-center justify-center text-2xl font-bold shadow-md">
            {user ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#202124]">My Profile</h1>
            <p className="text-slate-600 font-medium">Manage your Play Petal account settings.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-2 h-max">
            <Link href="/profile" className="flex items-center gap-3 px-4 py-3 bg-[#D90429] text-white rounded-xl font-bold text-sm shadow-xs">
              <User size={18} /> Account Info
            </Link>
            <Link href="/orders" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-[#D90429] rounded-xl font-bold text-sm transition-colors">
              <Package size={18} /> My Orders
            </Link>
            <Link href="/wishlist" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-[#D90429] rounded-xl font-bold text-sm transition-colors">
              <Heart size={18} /> Wishlist
            </Link>
            <Link href="/rewards" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-[#D90429] rounded-xl font-bold text-sm transition-colors">
              <SparkleIcon /> Play Points
            </Link>
            {user && (
              <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors text-left mt-4 cursor-pointer">
                <LogOut size={18} /> Log Out
              </button>
            )}
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center min-h-[400px]">
             <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="text-6xl mb-4">
               🧸
             </motion.div>
             <h2 className="text-xl font-black text-[#202124] mb-2">Welcome to Your Play Petal Space</h2>
             <p className="text-slate-600 font-medium max-w-sm mb-6">
               View your activity, check ongoing orders, and explore certified toys for your family.
             </p>
             <Link href="/products" className="bg-[#D90429] hover:bg-[#B7092B] text-white px-6 py-2.5 rounded-full font-bold shadow-md transition-all active:scale-95">
               Discover Toys
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
  );
}
