'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Sparkles,
  Send,
  Heart,
  ArrowUp,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-gradient-to-b from-[#FFFDF9] via-[#F8F9FC] to-[#EFF2F7] text-[#5F6368] border-t border-slate-200/80 pt-12 pb-8 overflow-hidden">
      
      {/* Background Decorative Playful Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#D90429]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 bg-[#FF9800]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-[#2196F3]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* 🌟 VALUE PROPOSITION GUARANTEE BAR 🌟 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          
          <div className="group bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-xl hover:border-[#D90429]/30 hover:-translate-y-1.5 transition-all duration-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-[#D90429] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#D90429] group-hover:text-white transition-all duration-300 shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-bold text-[#202124] text-sm group-hover:text-[#D90429] transition-colors">Free Express Shipping</h5>
              <p className="text-xs text-slate-500 mt-0.5">On all orders above ₹499</p>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-xl hover:border-[#FF9800]/30 hover:-translate-y-1.5 transition-all duration-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#FF9800] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FF9800] group-hover:text-white transition-all duration-300 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-bold text-[#202124] text-sm group-hover:text-[#FF9800] transition-colors">100% Non-Toxic & Safe</h5>
              <p className="text-xs text-slate-500 mt-0.5">BIS Certified & Child Safe</p>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-xl hover:border-[#4CAF50]/30 hover:-translate-y-1.5 transition-all duration-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#4CAF50] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#4CAF50] group-hover:text-white transition-all duration-300 shadow-xs">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-bold text-[#202124] text-sm group-hover:text-[#4CAF50] transition-colors">7-Day Easy Returns</h5>
              <p className="text-xs text-slate-500 mt-0.5">Hassle-free replacement</p>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-xl hover:border-[#2196F3]/30 hover:-translate-y-1.5 transition-all duration-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2196F3] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#2196F3] group-hover:text-white transition-all duration-300 shadow-xs">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-bold text-[#202124] text-sm group-hover:text-[#2196F3] transition-colors">24/7 Parent Assistance</h5>
              <p className="text-xs text-slate-500 mt-0.5">Dedicated customer care</p>
            </div>
          </div>

        </div>

        {/* 📬 NEWSLETTER BANNER CARD 📬 */}
        <div className="relative mb-16 rounded-3xl bg-gradient-to-r from-[#D90429] via-[#E52E4D] to-[#FF9800] p-8 md:p-10 shadow-2xl text-white overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-60 h-60 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-white/30">
                <Sparkles className="w-4 h-4 text-yellow-200 animate-spin-slow" />
                <span>Join the PlayPetal Club</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Unlock Secret Discounts & Fun Toy Deals!
              </h3>
              <p className="text-red-100 text-sm mt-2 leading-relaxed">
                Subscribe for festive giveaways, parenting tips, and exclusive new arrival drops right in your inbox.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="w-full lg:w-auto flex-1 max-w-md">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl bg-white text-[#202124] placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-yellow-300/50 shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  className="px-7 py-3.5 rounded-2xl bg-[#202124] hover:bg-black text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group whitespace-nowrap cursor-pointer"
                >
                  <span>Subscribe</span>
                  <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>

              {subscribed && (
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-yellow-200 bg-black/20 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/20 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>Yay! You're officially subscribed to PlayPetal fun! 🎉</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* 🏢 MAIN FOOTER CONTENT GRID 🏢 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">

          {/* BRAND COLUMN */}
          <div className="space-y-5">
            <Link href="/" className="inline-block group">
              <span className="text-3xl font-black tracking-tight text-[#D90429] group-hover:scale-105 transition-transform inline-block">
                Play<span className="text-[#FF9800]">Petal</span>
              </span>
            </Link>
            <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
              Discover a magical world of premium, safe, and educational toys designed to ignite imagination, foster learning, and bring endless joy to every child.
            </p>

            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Connect With Us</p>
              <div className="flex items-center gap-3">
                {/* Facebook SVG */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] hover:-translate-y-1 hover:shadow-lg hover:rotate-6 transition-all duration-300"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                {/* Instagram SVG */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 hover:text-white hover:border-transparent hover:-translate-y-1 hover:shadow-lg hover:-rotate-6 transition-all duration-300"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                {/* Twitter / X SVG */}
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:bg-[#000000] hover:text-white hover:border-[#000000] hover:-translate-y-1 hover:shadow-lg hover:rotate-6 transition-all duration-300"
                  aria-label="Twitter"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                {/* YouTube SVG */}
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] hover:-translate-y-1 hover:shadow-lg hover:-rotate-6 transition-all duration-300"
                  aria-label="YouTube"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h4 className="font-extrabold text-[#202124] mb-5 text-base relative inline-block pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-1 after:bg-[#D90429] after:rounded-full">
              Quick Links
            </h4>
            <ul className="space-y-3 text-sm text-slate-600">
              {['About Us', 'Contact Us', 'Privacy Policy', 'Terms & Conditions'].map((item) => {
                const slug = item.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                return (
                  <li key={item}>
                    <Link
                      href={`/${slug}`}
                      className="group inline-flex items-center gap-2 hover:text-[#D90429] transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:w-3 group-hover:bg-[#D90429] transition-all duration-300" />
                      <span className="group-hover:translate-x-1 transition-transform">{item}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* TOP CATEGORIES */}
          <div>
            <h4 className="font-extrabold text-[#202124] mb-5 text-base relative inline-block pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-1 after:bg-[#FF9800] after:rounded-full">
              Top Categories
            </h4>
            <ul className="space-y-3 text-sm text-slate-600">
              {[
                { name: 'Soft Toys & Teddy Bears', cat: 'Soft Toys' },
                { name: 'Educational & STEM Toys', cat: 'Educational' },
                { name: 'Outdoor & Sports Play', cat: 'Outdoor Toys' },
                { name: 'Board Games & Puzzles', cat: 'Board Games' },
                { name: 'Building Blocks & Sets', cat: 'Building Blocks' },
                { name: 'Cars & Vehicles', cat: 'Cars & Vehicles' },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    href={`/shop?category=${encodeURIComponent(item.cat)}`}
                    className="group inline-flex items-center gap-2 hover:text-[#FF9800] transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:w-3 group-hover:bg-[#FF9800] transition-all duration-300" />
                    <span className="group-hover:translate-x-1 transition-transform">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CONTACT & SUPPORT */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-[#202124] mb-5 text-base relative inline-block pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-1 after:bg-[#2196F3] after:rounded-full">
              Get in Touch
            </h4>
            <ul className="space-y-3.5 text-sm text-slate-600">
              <li className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#D90429] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#D90429] group-hover:text-white transition-colors">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="leading-snug">123 Toy Street, Magic World, Mumbai, Maharashtra 400001</span>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#FF9800] flex items-center justify-center shrink-0 group-hover:bg-[#FF9800] group-hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="font-semibold text-[#202124]">+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2196F3] flex items-center justify-center shrink-0 group-hover:bg-[#2196F3] group-hover:text-white transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <span>hello@playpetal.com</span>
              </li>
            </ul>

            {/* SECURE PAYMENTS */}
            <div className="pt-4 border-t border-slate-200/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
                <Lock className="w-3.5 h-3.5 text-green-600" />
                <span>100% Safe & Secure Checkout</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-700">
                <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs hover:border-[#D90429] transition-colors">
                  💳 UPI / GPay
                </span>
                <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs hover:border-[#D90429] transition-colors">
                  💳 Visa / MC
                </span>
                <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs hover:border-[#D90429] transition-colors">
                  📦 COD Available
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* 📑 BOTTOM BAR WITH ANIMATED BACK TO TOP BUTTON 📑 */}
        <div className="pt-8 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2026 Play Petal Store. All rights reserved.</p>

          <p className="font-semibold text-slate-600 flex items-center gap-1.5">
            <span>Designed &amp; Developed with</span>
            <Heart className="w-4 h-4 text-[#D90429] fill-[#D90429] animate-bounce" />
            <span>by</span>
            <span className="text-[#D90429] font-bold hover:underline cursor-pointer">
              TechnoBuzzSystems
            </span>
          </p>

          <button
            onClick={scrollToTop}
            className="group flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-xs hover:bg-[#D90429] hover:text-white hover:border-[#D90429] hover:-translate-y-1 transition-all duration-300 text-xs font-bold text-slate-700 cursor-pointer"
            aria-label="Back to Top"
          >
            <span>Back to Top</span>
            <ArrowUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

      </div>
    </footer>
  );
}
