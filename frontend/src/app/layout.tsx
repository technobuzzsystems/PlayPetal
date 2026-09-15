"use client";

import "./globals.css";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { ShoppingCart, Heart, Search, User, Truck, ShieldCheck, RefreshCcw, HelpCircle, Menu, X, Sparkles, Package, Gift, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CartProvider, useCart } from "../context/CartContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import RouteScrollManager from "../components/RouteScrollManager";

function HeaderNav() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount, wishlistCount, toastMessage } = useCart();
  const { user, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayCartCount = mounted ? cartCount : 0;
  const displayWishlistCount = mounted ? wishlistCount : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "All Toys", href: "/products" },
    { name: "Brands", href: "/brands" },
    { name: "Age Group", href: "/age" },
    { name: "Best Sellers", href: "/best-sellers" },
    { name: "New Arrivals", href: "/new" },
    { name: "Offers", href: "/offers" },
  ];

  return (
    <>
      {/* Toast Notification with framer-motion */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-24 right-6 z-50 bg-[#202124] text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 text-sm border border-slate-700"
          >
            <Sparkles className="text-[#FFD43B]" size={18} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP STICKY HEADER WRAPPER — VIBRANT HAMLEYS RED (#D90429) */}
      <header className="sticky top-0 z-50 shadow-md">
        
        {/* 1. TOP DELIVERY BAR (Deep Red #B7092B) - Hidden on Homepage */}
        {pathname !== "/" && (
          <div className="bg-[#B7092B] text-white text-xs py-2 border-b border-red-800/40">
            <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 flex justify-between items-center">
              <div className="flex items-center gap-2 font-semibold">
                <Truck size={14} className="text-[#FFD43B] shrink-0" />
                <span className="tracking-wide">⚡ 2 DAYS EXPRESS DELIVERY IN METROS • Free Shipping Above ₹999</span>
              </div>
              <div className="hidden md:flex items-center gap-4 lg:gap-6 font-semibold text-white/90 text-xs">
                <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#FFE66D]"/> Safe &amp; Secure Checkout</div>
                <div className="flex items-center gap-1.5"><RefreshCcw size={14} className="text-[#D7EEFF]"/> Easy Returns</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MAIN NAVBAR (Vibrant Red #D90429) */}
        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-3 bg-[#D90429]">
          {/* Desktop Symmetrical Navbar (>= md) */}
          <div className="hidden md:flex relative items-center justify-between w-full">
            
            {/* Column 1: Play Petal Logo (White & Gold Sparkle on Red) */}
            <div className="flex items-center justify-start shrink-0 z-10">
              <Link href="/" className="flex flex-col items-start leading-none shrink-0 group">
                <span className="text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-sm font-sans flex items-center gap-1">
                  Play<span className="text-[#FFD43B]">Petal</span>
                  <Sparkles size={20} className="text-[#FFD43B] inline animate-pulse" />
                </span>
                <span className="text-[10px] font-extrabold text-white/90 tracking-widest uppercase mt-0.5">Play • Learn • Grow</span>
              </Link>
            </div>

            {/* Column 2: White Search Pill Input */}
            <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center pointer-events-none z-10 w-full px-2">
              <div className="w-full max-w-[280px] md:max-w-[320px] lg:max-w-[380px] xl:max-w-[440px] 2xl:max-w-[540px] pointer-events-auto">
                <form onSubmit={handleSearch} className="w-full">
                  <div className="relative w-full flex items-center">
                    <Search size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for toys, games, brands..." 
                      className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-11 pr-12 outline-none focus:ring-2 focus:ring-[#FFD43B] transition-all text-sm font-medium text-[#202124] placeholder-slate-400 shadow-sm"
                    />
                    <button 
                      type="submit" 
                      className="absolute right-1 top-1 bottom-1 bg-[#202124] hover:bg-[#B7092B] transition-all text-white px-4 rounded-full font-bold flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Column 3 (Right): Wishlist, Login, Cart Icons */}
            <div className="flex items-center justify-end z-10 shrink-0 space-x-3 sm:space-x-4 md:space-x-5 lg:space-x-6">
              <Link href="/wishlist" className="flex items-center gap-1.5 text-white hover:text-[#FFD43B] transition-colors font-bold text-sm relative cursor-pointer shrink-0">
                <div className="relative">
                  <Heart size={22} />
                  {displayWishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#16803C] text-white text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                      {displayWishlistCount}
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline">Wishlist</span>
              </Link>
              
              {/* Login / Profile Dropdown */}
              <div className="relative group cursor-pointer">
                <div className="flex items-center gap-1.5 text-white hover:text-[#FFD43B] transition-colors font-bold text-sm py-2">
                  <User size={22} className="transform transition-transform group-hover:scale-110" />
                  <span className="hidden lg:inline">{user ? user.name.split(' ')[0] : 'Login'}</span>
                </div>

                {/* Hover Dropdown Menu */}
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-3 group-hover:translate-y-0 overflow-hidden z-50">
                  {!user ? (
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">New customer?</span>
                        <Link href="/signup" className="text-[#D90429] hover:underline font-bold text-xs">Sign Up</Link>
                      </div>
                      <Link href="/login" className="bg-[#D90429] hover:bg-[#B7092B] text-white text-center text-sm font-bold px-4 py-2.5 rounded-full transition-all shadow-md">
                        Login
                      </Link>
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Welcome back</span>
                      <span className="text-lg font-black text-[#202124]">{user.name}</span>
                      <span className="text-xs font-bold text-[#D90429] flex items-center gap-1 mt-1">
                        <Gift size={12} /> {user.playPoints || 0} Play Points
                      </span>
                    </div>
                  )}

                  {/* Quick Links */}
                  <div className="p-2 flex flex-col gap-1 bg-white">
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-700 hover:text-[#D90429] transition-colors">
                      <User size={16} className="text-slate-400" /> My Profile
                    </Link>
                    <Link href="/orders" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-700 hover:text-[#D90429] transition-colors">
                      <Package size={16} className="text-slate-400" /> Orders
                    </Link>
                    <Link href="/wishlist" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-700 hover:text-[#D90429] transition-colors">
                      <Heart size={16} className="text-slate-400" /> Wishlist
                    </Link>
                    <Link href="/rewards" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-700 hover:text-[#D90429] transition-colors">
                      <Gift size={16} className="text-slate-400" /> Play Points
                    </Link>
                    {user && (
                      <>
                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                        <button onClick={logout} className="flex items-center w-full gap-3 px-4 py-2.5 hover:bg-red-50 rounded-xl text-sm font-bold text-red-600 transition-colors text-left">
                          <LogOut size={16} /> Log Out
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Cart Button */}
              <Link href="/cart" className="flex items-center gap-1.5 text-white hover:text-[#FFD43B] transition-colors font-bold text-sm relative group">
                <div className="relative transform transition-transform group-hover:scale-110">
                  <ShoppingCart size={22} />
                  {displayCartCount > 0 && (
                    <motion.span
                      key={displayCartCount}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: [1, 1.3, 1], opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute -top-2 -right-2 bg-[#16803C] text-white text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-sm"
                    >
                      {displayCartCount}
                    </motion.span>
                  )}
                </div>
                <span className="hidden xl:inline">Cart</span>
              </Link>
            </div>
          </div>

          {/* Mobile Layout (< md) */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="p-2 text-white focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <Link href="/" className="flex flex-col items-start leading-none shrink-0">
                <span className="text-2xl font-black tracking-tight text-white flex items-center gap-1">
                  Play<span className="text-[#FFD43B]">Petal</span>
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Mobile Account / Login Action */}
              <Link 
                href={user ? "/profile" : "/login"} 
                aria-label={user ? "My Profile" : "Login"}
                className="text-white relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-[#FFD43B] transition-colors"
              >
                <User size={22} />
              </Link>

              {/* Wishlist */}
              <Link 
                href="/wishlist" 
                aria-label="Wishlist"
                className="text-white relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-[#FFD43B] transition-colors"
              >
                <Heart size={22} />
                {displayWishlistCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[#16803C] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                    {displayWishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link 
                href="/cart" 
                aria-label="Shopping Cart"
                className="text-white relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-[#FFD43B] transition-colors"
              >
                <ShoppingCart size={22} />
                {displayCartCount > 0 && (
                  <motion.span
                    key={displayCartCount}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: [1, 1.3, 1], opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute top-1 right-1 bg-[#16803C] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm"
                  >
                    {displayCartCount}
                  </motion.span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <form onSubmit={handleSearch} className="mt-2.5 flex md:hidden">
            <div className="relative w-full flex items-center">
              <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search toys..." 
                className="w-full bg-white border border-slate-200 rounded-full py-2 pl-9 pr-10 outline-none focus:ring-2 focus:ring-[#FFD43B] text-xs font-medium text-[#202124] placeholder-slate-400"
              />
              <button 
                type="submit" 
                aria-label="Submit search"
                className="absolute right-1 top-1 bottom-1 bg-[#202124] text-white px-3.5 rounded-full flex items-center justify-center min-w-[44px] min-h-[32px]"
              >
                <Search size={14} />
              </button>
            </div>
          </form>

          {/* Desktop Navigation Links Bar */}
          <nav className="hidden md:flex justify-center items-center space-x-3 lg:space-x-5 mt-3 pt-2 border-t border-red-400/30">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className={`text-sm font-extrabold transition-all px-4 py-1.5 rounded-full ${
                    isActive 
                      ? 'bg-white text-[#D90429] shadow-md' 
                      : 'text-white hover:bg-[#EF233C] hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#D90429] border-t border-red-700 px-4 py-4 space-y-2 shadow-2xl animate-fadeIn">
            {/* Mobile Account / Auth Block */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-3 border border-white/20 text-white">
              {user ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Welcome back</div>
                      <div className="text-base font-black text-white">{user.name}</div>
                    </div>
                    <span className="text-xs font-bold bg-[#FFD43B] text-[#202124] px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Gift size={12} /> {user.playPoints || 0} pts
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/20">
                    <Link 
                      href="/profile" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <User size={14} /> My Profile
                    </Link>
                    <Link 
                      href="/orders" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <Package size={14} /> My Orders
                    </Link>
                  </div>
                  <button 
                    onClick={() => { logout(); setMobileMenuOpen(false); }} 
                    className="w-full mt-1 bg-red-950/40 hover:bg-red-950/60 text-white text-xs font-bold py-2 rounded-xl text-center flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-bold text-white/90">Join Play Petal for exclusive offers!</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link 
                      href="/login" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className="bg-white text-[#D90429] hover:bg-white/90 text-xs font-black py-2.5 rounded-xl text-center flex items-center justify-center shadow-md min-h-[44px]"
                    >
                      Login
                    </Link>
                    <Link 
                      href="/signup" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className="bg-[#FFD43B] text-[#202124] hover:bg-[#FFD43B]/90 text-xs font-black py-2.5 rounded-xl text-center flex items-center justify-center shadow-md min-h-[44px]"
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Links */}
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2.5 rounded-xl text-sm font-extrabold transition-colors min-h-[44px] flex items-center ${
                    isActive ? 'bg-white text-[#D90429]' : 'text-white hover:bg-[#EF233C]'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased bg-[#FFFDF9] font-sans text-[#202124] selection:bg-[#D90429] selection:text-white">
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={null}>
              <RouteScrollManager />
            </Suspense>
            <HeaderNav />
            <main className="min-h-screen bg-[#FFFDF9]">
              {children}
            </main>

            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
