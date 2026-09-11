"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Truck, ShieldCheck, RefreshCcw, Headphones, Sun, Sparkles, Star, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../context/CartContext";

export default function Home() {
  const router = useRouter();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 150]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);

  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      video: "/videos/video1.mp4",
      image: "/videos/frame1.jpg",
      badge: "🎈 Play & Learn Together",
      heading: "Learn Through",
      highlight: "Play & Fun!",
      subtitle: "Outdoor adventures, joyful cartoon friends, and educational toys for bright growing minds.",
      cta: "Discover More",
    },
    {
      id: 2,
      video: "/videos/video2.mp4",
      image: "/videos/frame2.jpg",
      badge: "🏎️ Speed & Action Fun",
      heading: "The Great",
      highlight: "Toy Car Race!",
      subtitle: "Zoom into fun with high-speed RC racing cars, superhero tracks, and stunt vehicles.",
      cta: "Start Adventure",
    },
    {
      id: 3,
      video: "/videos/video3.mp4",
      image: "/videos/frame3.jpg",
      badge: "🦖 Magical Surprise Kingdom",
      heading: "Discover The",
      highlight: "Magical Dinosaur!",
      subtitle: "Unwrap pure joy with magical eggs, robot friends, and cuddly buddies with up to 50% OFF.",
      cta: "Grab Offers",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 9000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));

  // Circular Top Categories
  const categoryCircles = [
    { name: "Soft Toys", img: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200&h=200&fit=crop", bg: "bg-orange-50 border-orange-200" },
    { name: "Cars & Vehicles", img: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=200&h=200&fit=crop", bg: "bg-sky-50 border-sky-200" },
    { name: "Building Blocks", img: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=200&h=200&fit=crop", bg: "bg-amber-50 border-amber-200" },
    { name: "Dolls & Playsets", img: "https://images.unsplash.com/photo-1558066126-25816c278fb1?w=200&h=200&fit=crop", bg: "bg-pink-50 border-pink-200" },
    { name: "Baby Toys", img: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop", bg: "bg-purple-50 border-purple-200" },
    { name: "Board Games", img: "https://images.unsplash.com/photo-1610890716171-6b1e0ce2d1dd?w=200&h=200&fit=crop", bg: "bg-emerald-50 border-emerald-200" },
    { name: "Arts & Crafts", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop", bg: "bg-rose-50 border-rose-200" },
    { name: "Outdoor Toys", img: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=200&h=200&fit=crop", bg: "bg-teal-50 border-teal-200" },
    { name: "Educational", img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop", bg: "bg-blue-50 border-blue-200" },
    { name: "Gift Sets", img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&h=200&fit=crop", bg: "bg-yellow-50 border-yellow-200" },
  ];

  const [categoriesList, setCategoriesList] = useState(categoryCircles);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const bgColors = [
            "bg-orange-50 border-orange-200", "bg-sky-50 border-sky-200", "bg-amber-50 border-amber-200", "bg-pink-50 border-pink-200",
            "bg-purple-50 border-purple-200", "bg-emerald-50 border-emerald-200", "bg-rose-50 border-rose-200", "bg-teal-50 border-teal-200",
            "bg-blue-50 border-blue-200", "bg-yellow-50 border-yellow-200"
          ];
          const formatted = data.map((c: any, i: number) => ({
            name: c.name,
            img: c.image || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200&h=200&fit=crop",
            bg: bgColors[i % bgColors.length],
          }));
          setCategoriesList(formatted);
        }
      })
      .catch(() => console.log("Using static categories fallback"));
  }, []);

  // 1:1 HAMLEYS REFERENCE IMAGE CATEGORY CARDS
  const hamleysCategories = [
    {
      title: "ART & CRAFT",
      discount: "UPTO 50% OFF",
      accent: "#9C27B0",
      borderClass: "border-[#9C27B0]/40 hover:border-[#9C27B0]",
      btnBg: "bg-[#9C27B0] hover:bg-[#8E24AA] text-white",
      img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80",
      slug: "Arts & Crafts",
    },
    {
      title: "COLLECTORS",
      discount: "UPTO 80% OFF",
      accent: "#00A896",
      borderClass: "border-[#00A896]/40 hover:border-[#00A896]",
      btnBg: "bg-[#00A896] hover:bg-[#009688] text-white",
      img: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=400&q=80",
      slug: "Collectibles",
    },
    {
      title: "CONSTRUCTION TOYS",
      discount: "UPTO 80% OFF",
      accent: "#FF9800",
      borderClass: "border-[#FF9800]/40 hover:border-[#FF9800]",
      btnBg: "bg-[#FF9800] hover:bg-[#F57C00] text-white",
      img: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&q=80",
      slug: "Building Blocks",
    },
    {
      title: "GAMES & PUZZLES",
      discount: "UPTO 80% OFF",
      accent: "#2196F3",
      borderClass: "border-[#2196F3]/40 hover:border-[#2196F3]",
      btnBg: "bg-[#2196F3] hover:bg-[#1976D2] text-white",
      img: "https://images.unsplash.com/photo-1610890716171-6b1e0ce2d1dd?w=400&q=80",
      slug: "Board Games",
    },
    {
      title: "OUTDOOR TOYS",
      discount: "UPTO 50% OFF",
      accent: "#43B94A",
      borderClass: "border-[#43B94A]/40 hover:border-[#43B94A]",
      btnBg: "bg-[#43B94A] hover:bg-[#388E3C] text-white",
      img: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&q=80",
      slug: "Outdoor Toys",
    },
    {
      title: "PREMIUM DOLLS",
      discount: "UPTO 30% OFF",
      accent: "#F7255A",
      borderClass: "border-[#F7255A]/40 hover:border-[#F7255A]",
      btnBg: "bg-[#F7255A] hover:bg-[#E01E4F] text-white",
      img: "https://images.unsplash.com/photo-1558066126-25816c278fb1?w=400&q=80",
      slug: "Dolls & Playsets",
    },
    {
      title: "SOFT TOYS",
      discount: "UPTO 50% OFF",
      accent: "#FF9800",
      borderClass: "border-[#FF9800]/40 hover:border-[#FF9800]",
      btnBg: "bg-[#FF9800] hover:bg-[#F57C00] text-white",
      img: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=400&q=80",
      slug: "Soft Toys",
    },
    {
      title: "GAMES & PUZZLES",
      discount: "UPTO 70% OFF",
      accent: "#3F51B5",
      borderClass: "border-[#3F51B5]/40 hover:border-[#3F51B5]",
      btnBg: "bg-[#3F51B5] hover:bg-[#303F9F] text-white",
      img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80",
      slug: "Educational",
    },
    {
      title: "VEHICLES & TRACKSETS",
      discount: "UPTO 50% OFF",
      accent: "#FFB52E",
      borderClass: "border-[#FFB52E]/40 hover:border-[#FFB52E]",
      btnBg: "bg-[#FFB52E] hover:bg-[#FFA000] text-slate-900 font-black",
      img: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=400&q=80",
      slug: "Cars & Vehicles",
    },
  ];

  return (
    <div className="w-full font-sans bg-[#FFFDF9] text-[#202124] pb-16 overflow-hidden">
      
      {/* FLOATING DECORATIONS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none opacity-40">
        <motion.div style={{ y: y1 }} className="absolute top-[12%] left-[4%] text-5xl">🎈</motion.div>
        <motion.div style={{ y: y2 }} className="absolute top-[32%] right-[6%] text-6xl">🧸</motion.div>
        <motion.div style={{ y: y1 }} className="absolute bottom-[25%] left-[10%] text-6xl">⭐</motion.div>
        <motion.div style={{ y: y2 }} className="absolute bottom-[15%] right-[12%] text-5xl">🎨</motion.div>
      </div>

      {/* 🚀 HERO SLIDER 🚀 */}
      <section className="w-full relative h-[60vh] sm:h-[68vh] md:h-[74vh] max-h-[720px] min-h-[460px] group cursor-pointer overflow-hidden select-none bg-[#FFFDF9]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full overflow-hidden"
            onClick={() => router.push('/shop')}
          >
            {/* Background Video */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
              <video
                key={slides[currentSlide].video}
                className="hero-background-video absolute inset-0 w-full h-full object-cover object-center motion-reduce:hidden"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster={slides[currentSlide].image}
                ref={(el) => {
                  if (el) {
                    el.defaultMuted = true;
                    el.muted = true;
                    el.play().catch(() => {});
                  }
                }}
              >
                <source src={slides[currentSlide].video} type="video/mp4" />
                <img
                  src={slides[currentSlide].image}
                  alt="Hero Background"
                  className="w-full h-full object-cover object-center"
                />
              </video>
            </div>

            {/* Light Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-900/40 to-transparent pointer-events-none" />

            {/* Hero Content */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 relative z-10">
                <motion.div 
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="max-w-xl backdrop-blur-md bg-white/85 p-6 sm:p-8 rounded-3xl border border-white/60 shadow-2xl"
                >
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D90429] text-white text-xs font-black shadow-md mb-3.5 tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFD43B] animate-spin" style={{ animationDuration: '3s' }} />
                    <span>{slides[currentSlide].badge}</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#202124] leading-[1.15] mb-3 drop-shadow-xs">
                    {slides[currentSlide].heading} <br/>
                    <span className="text-[#D90429]">
                      {slides[currentSlide].highlight}
                    </span>
                  </h1>

                  <p className="text-slate-600 text-sm sm:text-base font-semibold mb-6 leading-relaxed">
                    {slides[currentSlide].subtitle}
                  </p>

                  <Link href="/shop" onClick={(e) => e.stopPropagation()}>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-[#D90429] hover:bg-[#B7092B] text-white px-8 py-3.5 rounded-full font-black text-sm sm:text-base shadow-lg flex items-center gap-3 transition-all cursor-pointer"
                    >
                      {slides[currentSlide].cta} <ArrowRight size={18} />
                    </motion.button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Buttons */}
        <button 
          onClick={(e) => { e.stopPropagation(); prevSlide(); }} 
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-[#202124] hover:text-[#D90429] p-3.5 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-xl z-20 cursor-pointer border border-slate-200"
          title="Previous Slide"
        >
          <ChevronLeft size={26} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); nextSlide(); }} 
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-[#202124] hover:text-[#D90429] p-3.5 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-xl z-20 cursor-pointer border border-slate-200"
          title="Next Slide"
        >
          <ChevronRight size={26} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200">
          {slides.map((_, idx) => (
            <button 
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(idx); }}
              className={`h-3 rounded-full transition-all duration-300 cursor-pointer shadow-xs ${
                currentSlide === idx ? 'w-10 bg-[#D90429]' : 'w-3 bg-slate-300'
              }`}
            />
          ))}
        </div>
      </section>

      {/* 🎈 PLAYFUL TICKER BAR 🎈 */}
      <div className="bg-[#D90429] text-white py-3 shadow-md">
        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-black tracking-wide">
          <div className="flex items-center gap-2">
            <span>🧸</span>
            <span>100% Non-Toxic &amp; Child Safe Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#FFD43B]">⭐</span>
            <span>Loved by 50,000+ Happy Kids</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#FFD43B]">⚡</span>
            <span>2-Day Express Delivery in Metros</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span>🎁</span>
            <span>Surprise Gift with Every Order!</span>
          </div>
        </div>
      </div>

      {/* 🎪 TOP CATEGORY CIRCLES BAR 🎪 */}
      <section className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-6 relative z-10 bg-[#FFFDF9]">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex justify-between items-center overflow-x-auto py-2 no-scrollbar gap-4 md:gap-2 px-2">
            {categoriesList.map((cat, idx) => (
              <Link href={`/products?category=${encodeURIComponent(cat.name)}`} key={idx} className="flex flex-col items-center min-w-[85px] group">
                <motion.div 
                  whileHover={{ y: -6, scale: 1.08 }}
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-full p-1 shadow-md border-2 ${cat.bg} group-hover:border-[#D90429] transition-all flex items-center justify-center relative overflow-hidden bg-white`}
                >
                  <img src={cat.img} alt={cat.name} className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300" />
                </motion.div>
                <span className="mt-2 text-xs font-extrabold text-[#202124] text-center group-hover:text-[#D90429] transition-colors">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* 🌟 1:1 HAMLEYS REFERENCE IMAGE CATEGORY SHELF 🌟 */}
      {/* ================================================== */}
      <section className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-8 relative z-10 bg-[#F8F9FC]">
        <div className="text-center mb-10">
          <span className="text-xs font-black uppercase tracking-widest text-[#D90429] bg-red-50 border border-red-200 px-4 py-1.5 rounded-full inline-block mb-2 shadow-xs">
            POPULAR CATEGORIES 🎈
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#202124] tracking-tight">
            Explore Toys By Category
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Handpicked colorful collections designed for pure joy &amp; active play
          </p>
        </div>

        {/* HAMLEYS CATEGORY GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {hamleysCategories.map((cat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.25 }}
              className={`bg-white rounded-[24px] border-2 ${cat.borderClass} shadow-[0_8px_25px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.12)] p-4 flex flex-col justify-between relative group transition-all cursor-pointer`}
              onClick={() => router.push(`/products?category=${encodeURIComponent(cat.slug)}`)}
            >
              {/* OVERLAPPING DARK GREEN DISCOUNT BADGE (REFERENCE IMAGE MATCH) */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                <span className="bg-[#16803C] text-white text-[11px] font-black uppercase px-4 py-1 rounded-full shadow-md tracking-wider border border-white/20 whitespace-nowrap">
                  {cat.discount}
                </span>
              </div>

              {/* CARD CONTENT */}
              <div className="pt-3 pb-2 text-center flex-1 flex flex-col items-center">
                {/* Category Title */}
                <h3 className="text-base font-black text-[#202124] tracking-tight uppercase mb-3 px-2">
                  {cat.title}
                </h3>

                {/* Rounded Category Image */}
                <div className="w-full h-44 rounded-2xl overflow-hidden mb-4 bg-slate-50 relative group-hover:shadow-md transition-shadow">
                  <img 
                    src={cat.img} 
                    alt={cat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>

              {/* ROUNDED CTA BUTTON MATCHING CATEGORY ACCENT COLOR */}
              <button 
                className={`w-full py-2.5 rounded-full font-black text-xs uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${cat.btnBg}`}
              >
                <span>Explore Now</span>
                <ArrowRight size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 🎯 SHOP BY PRICE 🎯 */}
      <section className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-10 relative z-10 bg-[#FFFDF9]">
        <div className="text-center mb-8">
          <span className="text-xs font-black uppercase tracking-widest text-[#FF9800] bg-orange-50 border border-orange-200 px-4 py-1.5 rounded-full inline-block mb-2">
            POCKET FRIENDLY PLAY 🎈
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#202124] tracking-tight">
            Toys For Every Budget
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Discover developmentally tailored toys matching every price tier
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {[
            { label: "UNDER", amount: "700", maxPrice: 700, bg: "bg-blue-50/70 border-blue-200 hover:border-[#2196F3]", btn: "bg-[#2196F3] text-white" },
            { label: "UNDER", amount: "900", maxPrice: 900, bg: "bg-purple-50/70 border-purple-200 hover:border-[#9C27B0]", btn: "bg-[#9C27B0] text-white" },
            { label: "UNDER", amount: "1200", maxPrice: 1200, bg: "bg-pink-50/70 border-pink-200 hover:border-[#F7255A]", btn: "bg-[#F7255A] text-white" },
            { label: "ABOVE", amount: "1200", minPrice: 1200, bg: "bg-amber-50/70 border-amber-200 hover:border-[#FF9800]", btn: "bg-[#FF9800] text-white" },
          ].map((tier, idx) => (
            <Link
              key={idx}
              href={tier.maxPrice ? `/products?maxPrice=${tier.maxPrice}` : `/products?minPrice=${tier.minPrice}`}
            >
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                className={`rounded-3xl p-6 text-center border-2 ${tier.bg} shadow-sm hover:shadow-lg transition-all flex flex-col items-center justify-between min-h-[190px] cursor-pointer group`}
              >
                <div className="space-y-1">
                  <span className="text-xs font-black tracking-widest text-slate-500 block uppercase">
                    {tier.label}
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-[#202124] tracking-tight">
                    <span className="text-2xl align-top text-[#D90429]">₹</span>{tier.amount}
                  </div>
                </div>

                <div className="mt-4">
                  <span className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-sm inline-flex items-center gap-1 transition-all ${tier.btn}`}>
                    SHOP NOW
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* 🎢 3 MIDDLE FEATURED BANNERS 🎢 */}
      <section className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-8 relative z-10 bg-[#F8F9FC]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          
          {/* Card 1: Blue Pilot */}
          <Link href="/shop">
            <motion.div 
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl h-[260px] relative overflow-hidden p-7 flex flex-col justify-between shadow-md border-2 border-blue-100 hover:border-[#2196F3] group cursor-pointer transition-all"
            >
              <div className="z-10 max-w-[65%]">
                <h2 className="text-2xl md:text-3xl font-black text-[#202124] leading-tight mb-2 tracking-tight">
                  Let <br />
                  <span className="text-[#2196F3]">Imagination</span> <br />
                  Take Flight!
                </h2>
                <p className="text-slate-500 text-xs font-bold mb-4">Toys for every little dreamer</p>
                <span className="bg-[#2196F3] text-white px-5 py-2 rounded-full font-black text-xs shadow-sm inline-flex items-center gap-1">
                  Shop Now &rarr;
                </span>
              </div>
              <img 
                src="/jetpack.png" 
                alt="Pilot kid flying airplane"
                className="absolute -right-4 bottom-0 h-[105%] w-[65%] object-contain" 
              />
            </motion.div>
          </Link>

          {/* Card 2: Pink Teddy Offer */}
          <Link href="/shop">
            <motion.div 
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl h-[260px] relative overflow-hidden p-7 flex flex-col justify-between shadow-md border-2 border-pink-100 hover:border-[#F7255A] group cursor-pointer transition-all"
            >
              <div className="z-10 max-w-[65%]">
                <span className="bg-[#16803C] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm mb-2 inline-block">
                  UPTO 50% OFF
                </span>
                <h2 className="text-xl md:text-2xl font-black text-[#F7255A] leading-tight mb-1">
                  SPECIAL OFFER
                </h2>
                <h3 className="text-2xl font-black text-[#202124] mb-1">
                  Top Trending Toys
                </h3>
                <p className="text-slate-500 text-xs font-bold mb-4">Handpicked Toys Collection</p>
                <span className="bg-[#F7255A] text-white px-5 py-2 rounded-full font-black text-xs shadow-sm inline-flex items-center gap-1">
                  Grab Deal &rarr;
                </span>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=400&q=80" 
                alt="Fluffy Teddy Bear"
                className="absolute -right-4 bottom-0 h-[95%] w-[55%] object-cover rounded-l-full shadow-md" 
              />
            </motion.div>
          </Link>

          {/* Card 3: Green Educational */}
          <Link href="/shop">
            <motion.div 
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl h-[260px] relative overflow-hidden p-7 flex flex-col justify-between shadow-md border-2 border-emerald-100 hover:border-[#43B94A] group cursor-pointer transition-all"
            >
              <div className="z-10 max-w-[65%]">
                <h2 className="text-2xl md:text-3xl font-black text-[#202124] leading-tight mb-2 tracking-tight">
                  Educational <br />
                  <span className="text-[#43B94A]">Toys for a</span> <br />
                  Smarter Future!
                </h2>
                <p className="text-slate-500 text-xs font-bold mb-4">Fun Learning Bright Mind</p>
                <span className="bg-[#43B94A] text-white px-5 py-2 rounded-full font-black text-xs shadow-sm inline-flex items-center gap-1">
                  Explore Now &rarr;
                </span>
              </div>
              <img 
                src="/drawing.png" 
                alt="Educational Play"
                className="absolute -right-6 bottom-0 h-[105%] w-[60%] object-cover rounded-l-3xl shadow-md" 
              />
            </motion.div>
          </Link>

        </div>
      </section>

      {/* 🛡️ TRUST BADGES BAR 🛡️ */}
      <section className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-6 relative z-10 bg-[#FFFDF9]">
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-4 items-center max-w-7xl mx-auto">
          
          <div className="flex items-center gap-3 p-2 border-r border-slate-100 last:border-none">
            <div className="w-10 h-10 rounded-full bg-red-50 text-[#D90429] flex items-center justify-center flex-shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <h4 className="font-black text-[#202124] text-xs">Free Shipping</h4>
              <p className="text-[10px] text-slate-500 font-semibold">on orders above ₹999</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 border-r border-slate-100 last:border-none">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2196F3] flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-black text-[#202124] text-xs">Safe &amp; Secure</h4>
              <p className="text-[10px] text-slate-500 font-semibold">100% verified payment</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 border-r border-slate-100 last:border-none">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-[#FF9800] flex items-center justify-center flex-shrink-0">
              <RefreshCcw size={20} />
            </div>
            <div>
              <h4 className="font-black text-[#202124] text-xs">Easy Returns</h4>
              <p className="text-[10px] text-slate-500 font-semibold">Hassle free policy</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 border-r border-slate-100 last:border-none">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#43B94A] flex items-center justify-center flex-shrink-0">
              <Headphones size={20} />
            </div>
            <div>
              <h4 className="font-black text-[#202124] text-xs">24/7 Support</h4>
              <p className="text-[10px] text-slate-500 font-semibold">Always ready to help</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 col-span-2 md:col-span-1 justify-center md:justify-start">
            <div className="w-10 h-10 rounded-full bg-pink-50 text-[#F7255A] flex items-center justify-center flex-shrink-0">
              <Sun size={20} />
            </div>
            <div>
              <h4 className="font-black text-[#F7255A] text-xs">Happy Playtime!</h4>
              <p className="text-[10px] text-slate-500 font-semibold">Smiles guaranteed</p>
            </div>
          </div>

        </div>
      </section>

      {/* 🎪 5 BOTTOM CALLOUT CARDS 🎪 */}
      <section className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-6 relative z-10 bg-[#F8F9FC]">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-7xl mx-auto">
          
          <Link href="/shop">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl p-4 h-[160px] relative overflow-hidden shadow-sm border-2 border-pink-100 hover:border-[#F7255A] flex flex-col justify-between group cursor-pointer transition-all"
            >
              <div>
                <h4 className="font-black text-[#202124] text-sm">Trending Toys</h4>
                <div className="w-7 h-7 rounded-full bg-[#F7255A] text-white flex items-center justify-center mt-2 group-hover:scale-110 transition-transform shadow-xs">
                  <ArrowRight size={14} />
                </div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=300&q=80" 
                alt="Sports Car" 
                className="absolute -right-2 -bottom-2 h-[80%] w-[65%] object-cover rounded-tl-2xl shadow-xs" 
              />
            </motion.div>
          </Link>

          <Link href="/new">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl p-4 h-[160px] relative overflow-hidden shadow-sm border-2 border-blue-100 hover:border-[#2196F3] flex flex-col justify-between group cursor-pointer transition-all"
            >
              <div>
                <h4 className="font-black text-[#202124] text-sm">New Arrivals</h4>
                <div className="w-7 h-7 rounded-full bg-[#2196F3] text-white flex items-center justify-center mt-2 group-hover:scale-110 transition-transform shadow-xs">
                  <ArrowRight size={14} />
                </div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=300&q=80" 
                alt="Dinosaur" 
                className="absolute -right-2 -bottom-2 h-[80%] w-[65%] object-cover rounded-tl-2xl shadow-xs" 
              />
            </motion.div>
          </Link>

          <Link href="/best-sellers">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl p-4 h-[160px] relative overflow-hidden shadow-sm border-2 border-amber-100 hover:border-[#FF9800] flex flex-col justify-between group cursor-pointer transition-all"
            >
              <div>
                <h4 className="font-black text-[#202124] text-sm">Best Sellers</h4>
                <div className="w-7 h-7 rounded-full bg-[#FF9800] text-white flex items-center justify-center mt-2 group-hover:scale-110 transition-transform shadow-xs">
                  <ArrowRight size={14} />
                </div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80" 
                alt="Teddy Bear" 
                className="absolute -right-2 -bottom-2 h-[80%] w-[65%] object-cover rounded-tl-2xl shadow-xs" 
              />
            </motion.div>
          </Link>

          <Link href="/shop">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl p-4 h-[160px] relative overflow-hidden shadow-sm border-2 border-purple-100 hover:border-[#9C27B0] flex flex-col justify-between group cursor-pointer transition-all"
            >
              <div>
                <h4 className="font-black text-[#202124] text-sm">Outdoor Fun</h4>
                <div className="w-7 h-7 rounded-full bg-[#9C27B0] text-white flex items-center justify-center mt-2 group-hover:scale-110 transition-transform shadow-xs">
                  <ArrowRight size={14} />
                </div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&q=80" 
                alt="Scooter" 
                className="absolute -right-2 -bottom-2 h-[80%] w-[65%] object-cover rounded-tl-2xl shadow-xs" 
              />
            </motion.div>
          </Link>

          <Link href="/shop">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl p-4 h-[160px] relative overflow-hidden shadow-sm border-2 border-emerald-100 hover:border-[#43B94A] flex flex-col justify-between group cursor-pointer transition-all"
            >
              <div>
                <h4 className="font-black text-[#202124] text-sm">Creative Play</h4>
                <div className="w-7 h-7 rounded-full bg-[#43B94A] text-white flex items-center justify-center mt-2 group-hover:scale-110 transition-transform shadow-xs">
                  <ArrowRight size={14} />
                </div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&q=80" 
                alt="Paint palette" 
                className="absolute -right-2 -bottom-2 h-[80%] w-[65%] object-cover rounded-tl-2xl shadow-xs" 
              />
            </motion.div>
          </Link>

        </div>
      </section>

      {/* FOOTER TAGLINE */}
      <div className="mt-8 text-center text-xs font-bold text-slate-500 tracking-wider flex items-center justify-center gap-3">
        <span className="w-12 h-[1px] bg-slate-300 inline-block"></span>
        <span>Toys Today Brighter Tomorrows ❤️</span>
        <span className="w-12 h-[1px] bg-slate-300 inline-block"></span>
      </div>

    </div>
  );
}
