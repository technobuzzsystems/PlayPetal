"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, Heart, ShoppingBag, Star, SlidersHorizontal,
  X, Sparkles
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { api, Product, Category, Brand, AgeGroup } from "../../services/api";

function ProductsContent() {
  const searchParams = useSearchParams();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "all");
  const [selectedAge, setSelectedAge] = useState(searchParams.get("ageGroup") || "all");
  const [maxPrice, setMaxPrice] = useState<number>(() => {
    const p = searchParams.get("maxPrice");
    return p && !isNaN(Number(p)) ? Number(p) : 6000;
  });
  const [minPrice, setMinPrice] = useState<number>(() => {
    const p = searchParams.get("minPrice");
    return p && !isNaN(Number(p)) ? Number(p) : 0;
  });
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(searchParams.get("onSale") === "true");
  const [sortBy, setSortBy] = useState("popular");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Fetch data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [prods, cats, brs, ages] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getBrands(),
          api.getAgeGroups()
        ]);
        setProducts(prods);
        setCategories(cats);
        setBrands(brs);
        setAgeGroups(ages);
      } catch (err) {
        console.error("Failed to load products data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update query states if searchParams change
  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) setSearchQuery(q);
    const cat = searchParams.get("category");
    if (cat !== null) setSelectedCategory(cat);
    const br = searchParams.get("brand");
    if (br !== null) setSelectedBrand(br);
    const age = searchParams.get("ageGroup");
    if (age !== null) setSelectedAge(age);
    const sale = searchParams.get("onSale");
    if (sale === "true") setOnSaleOnly(true);

    const maxP = searchParams.get("maxPrice");
    if (maxP !== null && !isNaN(Number(maxP))) {
      setMaxPrice(Number(maxP));
    }
    const minP = searchParams.get("minPrice");
    if (minP !== null && !isNaN(Number(minP))) {
      setMinPrice(Number(minP));
    }
  }, [searchParams]);

  // Dynamically merge categories
  const allCategoriesList = useMemo(() => {
    const map = new Map<string, Category>();
    const usedIds = new Set<string>();

    categories.forEach((c) => {
      if (c && c.name) {
        const key = c.name.trim().toLowerCase();
        const slug = c.slug || key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let id = c.id;
        if (!id || usedIds.has(id)) {
          id = `cat-${slug}`;
        }
        usedIds.add(id);
        map.set(key, { ...c, id, slug });
      }
    });

    products.forEach((p) => {
      if ((p.status !== "APPROVED" && p.status !== "Active") || p.isActive === false) return;
      const catName = typeof p.category === "string" ? p.category : p.category?.name;
      if (catName && catName.trim()) {
        const key = catName.trim().toLowerCase();
        if (!map.has(key)) {
          const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          let id = p.categoryId || `cat-${slug}`;
          if (usedIds.has(id)) {
            id = `cat-${slug}`;
          }
          usedIds.add(id);
          map.set(key, {
            id,
            name: catName.trim(),
            slug,
            description: `${catName.trim()} toys`,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [categories, products]);

  // Dynamically merge brands
  const allBrandsList = useMemo(() => {
    const map = new Map<string, Brand>();
    const usedIds = new Set<string>();

    brands.forEach((b) => {
      if (b && b.name) {
        const key = b.name.trim().toLowerCase();
        const slug = b.slug || key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let id = b.id;
        if (!id || usedIds.has(id)) {
          id = `brand-${slug}`;
        }
        usedIds.add(id);
        map.set(key, { ...b, id, slug });
      }
    });

    products.forEach((p) => {
      if ((p.status !== "APPROVED" && p.status !== "Active") || p.isActive === false) return;
      const bName = p.brand;
      if (bName && bName.trim()) {
        const key = bName.trim().toLowerCase();
        if (!map.has(key)) {
          const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          let id = `brand-${slug}`;
          if (usedIds.has(id)) {
            id = `brand-${slug}`;
          }
          usedIds.add(id);
          map.set(key, {
            id,
            name: bName.trim(),
            slug,
            description: `${bName.trim()} toys`,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [brands, products]);

  // Dynamically merge age groups
  const allAgeGroupsList = useMemo(() => {
    const map = new Map<string, AgeGroup>();
    const usedIds = new Set<string>();

    ageGroups.forEach((a) => {
      if (a && a.label) {
        const key = a.label.trim().toLowerCase();
        let id = a.id;
        if (!id || usedIds.has(id)) {
          id = `age-${key.replace(/[^a-z0-9]+/g, '-')}`;
        }
        usedIds.add(id);
        map.set(key, { ...a, id });
      }
    });

    products.forEach((p) => {
      if ((p.status !== "APPROVED" && p.status !== "Active") || p.isActive === false) return;
      const aName = p.ageGroup;
      if (aName && aName.trim()) {
        const key = aName.trim().toLowerCase();
        if (!map.has(key)) {
          let id = `age-${key.replace(/[^a-z0-9]+/g, '-')}`;
          if (usedIds.has(id)) {
            id = `age-${key.replace(/[^a-z0-9]+/g, '-')}`;
          }
          usedIds.add(id);
          map.set(key, {
            id,
            label: aName.trim(),
            subtitle: `${aName.trim()} toys`,
            minAge: 0,
            maxAge: 99,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [ageGroups, products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if ((p.status !== "APPROVED" && p.status !== "Active") || p.isActive === false) return false;

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const pName = p.name.toLowerCase();
          const pDesc = (p.description || "").toLowerCase();
          const pBrand = (p.brand || "").toLowerCase();
          const pCat = (typeof p.category === "string" ? p.category : p.category?.name || "").toLowerCase();
          const pVendor = (p.vendorName || "").toLowerCase();

          const matches = pName.includes(q) || pDesc.includes(q) || pBrand.includes(q) || pCat.includes(q) || pVendor.includes(q);
          if (!matches) return false;
        }

        // Category
        if (selectedCategory !== "all") {
          const cName = (typeof p.category === "string" ? p.category : p.category?.name || "").toLowerCase();
          const target = selectedCategory.toLowerCase();
          if (cName !== target && !cName.includes(target) && !target.includes(cName)) return false;
        }

        // Brand
        if (selectedBrand !== "all") {
          const bName = (p.brand || "").toLowerCase();
          const target = selectedBrand.toLowerCase();
          if (bName !== target && !bName.includes(target) && !target.includes(bName)) return false;
        }

        // Age Group
        if (selectedAge !== "all") {
          const aGroup = (p.ageGroup || "").toLowerCase();
          const target = selectedAge.toLowerCase();
          if (aGroup !== target && !aGroup.includes(target) && !target.includes(aGroup)) return false;
        }

        // Price
        const price = p.salePrice || p.price || p.basePrice;
        if (price > maxPrice) return false;
        if (minPrice > 0 && price < minPrice) return false;

        // Stock
        if (inStockOnly && (p.stock || 0) <= 0) return false;

        // On Sale
        if (onSaleOnly && !((p.salePrice && p.salePrice < p.basePrice) || (p.discount && p.discount > 0))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const pA = a.salePrice || a.price || a.basePrice;
        const pB = b.salePrice || b.price || b.basePrice;
        if (sortBy === "price_asc") return pA - pB;
        if (sortBy === "price_desc") return pB - pA;
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        return (b.salesCount || 0) - (a.salesCount || 0);
      });
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedAge, maxPrice, minPrice, inStockOnly, onSaleOnly, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedAge("all");
    setMaxPrice(6000);
    setMinPrice(0);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSortBy("popular");
  };

  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedBrand !== "all" ? 1 : 0) +
    (selectedAge !== "all" ? 1 : 0) +
    (maxPrice < 6000 ? 1 : 0) +
    (minPrice > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (searchQuery ? 1 : 0);

  return (
    <div className="w-full bg-[#FFFDF9] text-[#202124] min-h-screen py-6 px-3 sm:px-4 md:px-5 lg:px-6 font-sans">
      <div className="w-full">
        {/* Header Title & Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-2">
            <Link href="/" className="hover:text-[#D90429] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#202124] font-bold">Discover Toys</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#202124] tracking-tight flex items-center gap-3">
                Kids Toy Wonderland <Sparkles className="text-[#D90429] animate-spin" size={28} />
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Explore certified safe toys from verified sellers across India.
              </p>
            </div>
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search toys, brands, sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-semibold text-[#202124] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429] shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden flex items-center gap-2 bg-[#D90429] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
            >
              <SlidersHorizontal size={14} /> Filters ({activeFiltersCount})
            </button>

            <span className="text-xs font-bold text-slate-500 mr-2">
              Showing <span className="text-[#D90429] font-extrabold">{filteredProducts.length}</span> Toys
            </span>

            {/* Active Pills */}
            {selectedCategory !== "all" && (
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory("all")}><X size={12} /></button>
              </span>
            )}
            {selectedBrand !== "all" && (
              <span className="bg-slate-100 text-[#2196F3] border border-slate-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                Brand: {selectedBrand}
                <button onClick={() => setSelectedBrand("all")}><X size={12} /></button>
              </span>
            )}
            {selectedAge !== "all" && (
              <span className="bg-slate-100 text-[#FF9800] border border-slate-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                Age: {selectedAge}
                <button onClick={() => setSelectedAge("all")}><X size={12} /></button>
              </span>
            )}
            {maxPrice < 6000 && (
              <span className="bg-purple-50 text-[#9C27B0] border border-purple-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                Under ₹{maxPrice}
                <button onClick={() => setMaxPrice(6000)}><X size={12} /></button>
              </span>
            )}
            {minPrice > 0 && (
              <span className="bg-amber-50 text-[#FF9800] border border-amber-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                Above ₹{minPrice}
                <button onClick={() => setMinPrice(0)}><X size={12} /></button>
              </span>
            )}
            {onSaleOnly && (
              <span className="bg-slate-100 text-[#F7255A] border border-slate-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                On Sale
                <button onClick={() => setOnSaleOnly(false)}><X size={12} /></button>
              </span>
            )}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-[#D90429] hover:underline ml-2 cursor-pointer"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#D90429]"
            >
              <option value="popular">Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>

        {/* Main Grid: Filters Sidebar + Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8 items-stretch">
          
          {/* SIDEBAR FILTERS */}
          <aside className={`lg:block h-full ${mobileFilterOpen ? 'fixed inset-0 z-50 bg-black/50 flex justify-end backdrop-blur-xs' : 'hidden'}`}>
            <div className={`bg-white rounded-3xl p-6 shadow-md border border-slate-200 lg:w-full w-80 h-full flex flex-col justify-between ${mobileFilterOpen ? 'p-6 rounded-l-3xl rounded-r-none overflow-y-auto' : ''}`}>
              
              <div className="space-y-6">
                {mobileFilterOpen && (
                  <div className="flex justify-between items-center pb-4 border-b border-slate-200 lg:hidden">
                    <h3 className="font-black text-[#202124] text-lg">Filter Products</h3>
                    <button onClick={() => setMobileFilterOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                )}

                {/* Sidebar Header */}
                <div className="hidden lg:flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-[#D90429]" />
                    <h3 className="font-black text-[#202124] text-sm tracking-wide">Filters &amp; Sort</h3>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-[11px] font-bold text-[#D90429] hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Sort Order */}
                <div>
                  <h4 className="font-extrabold text-[#202124] text-xs uppercase tracking-wider mb-2.5">
                    Sort Order
                  </h4>
                  <div className="space-y-1">
                    {[
                      { id: "popular", label: "🌟 Most Popular" },
                      { id: "newest", label: "✨ Newest Arrivals" },
                      { id: "price_asc", label: "💵 Price: Low to High" },
                      { id: "price_desc", label: "💎 Price: High to Low" },
                      { id: "rating", label: "⭐ Highest Rated" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSortBy(s.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          sortBy === s.id
                            ? "bg-[#D90429] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-50 hover:text-[#202124]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="font-extrabold text-[#202124] text-xs uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Categories</span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">({allCategoriesList.length + 1})</span>
                  </h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        selectedCategory === "all" ? "bg-[#D90429] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50 hover:text-[#202124]"
                      }`}
                    >
                      <span>All Categories</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        selectedCategory === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {products.filter(p => p.status === "APPROVED" && p.isActive !== false).length}
                      </span>
                    </button>
                    {allCategoriesList.map((cat, idx) => {
                      const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                      const count = products.filter((p) => {
                        if (p.status !== "APPROVED" || p.isActive === false) return false;
                        const c = (typeof p.category === "string" ? p.category : p.category?.name || "").toLowerCase();
                        const t = cat.name.toLowerCase();
                        return c === t || (t.length > 3 && c.includes(t)) || (c.length > 3 && t.includes(c));
                      }).length;

                      return (
                        <button
                          key={`cat-btn-${cat.id}-${idx}`}
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                            isSelected ? "bg-[#D90429] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50 hover:text-[#202124]"
                          }`}
                        >
                          <span className="truncate pr-2">{cat.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Brand Filter */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="font-extrabold text-[#202124] text-xs uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Brands</span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">({allBrandsList.length + 1})</span>
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    <button
                      onClick={() => setSelectedBrand("all")}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        selectedBrand === "all" ? "bg-[#D90429] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50 hover:text-[#202124]"
                      }`}
                    >
                      <span>All Brands</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        selectedBrand === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {products.filter(p => p.status === "APPROVED" && p.isActive !== false).length}
                      </span>
                    </button>
                    {allBrandsList.map((brand, idx) => {
                      const isSelected = selectedBrand.toLowerCase() === brand.name.toLowerCase();
                      const count = products.filter((p) => {
                        if (p.status !== "APPROVED" || p.isActive === false) return false;
                        const b = (p.brand || "").toLowerCase();
                        const t = brand.name.toLowerCase();
                        return b === t || (t.length > 3 && b.includes(t)) || (b.length > 3 && t.includes(b));
                      }).length;

                      return (
                        <button
                          key={`brand-btn-${brand.id}-${idx}`}
                          onClick={() => setSelectedBrand(brand.name)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                            isSelected ? "bg-[#D90429] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50 hover:text-[#202124]"
                          }`}
                        >
                          <span className="truncate pr-2">{brand.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Filter */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="font-extrabold text-[#202124] text-xs uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Max Price</span>
                    <span className="text-[#D90429] font-black">₹{maxPrice}</span>
                  </h4>
                  <input
                    type="range"
                    min="100"
                    max="6000"
                    step="100"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-[#D90429] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                    <span>₹100</span>
                    <span>₹6000+</span>
                  </div>
                </div>
              </div>

              {mobileFilterOpen && (
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full mt-6 bg-[#D90429] text-white py-3 rounded-2xl font-extrabold text-sm"
                >
                  Apply Filters ({filteredProducts.length})
                </button>
              )}
            </div>
          </aside>

          {/* PRODUCTS GRID */}
          <main className="lg:col-span-3 xl:col-span-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-4 border border-slate-200 animate-pulse h-80 flex flex-col justify-between">
                    <div className="bg-slate-100 h-40 rounded-2xl w-full"></div>
                    <div className="space-y-2">
                      <div className="bg-slate-100 h-4 rounded w-3/4"></div>
                      <div className="bg-slate-100 h-4 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-[#D90429] mb-4 text-3xl">
                  🧸
                </div>
                <h3 className="text-xl font-black text-[#202124] mb-2">No Toys Found</h3>
                <p className="text-slate-500 text-sm max-w-md mb-6">
                  We couldn't find any toys matching your current filters. Try relaxing your search criteria or resetting filters!
                </p>
                <button
                  onClick={clearAllFilters}
                  className="bg-[#D90429] text-white font-bold px-6 py-2.5 rounded-full text-sm shadow-md"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                  const hasDiscount = (product.salePrice && product.salePrice < product.basePrice) || (product.discount && product.discount > 0);
                  const price = product.salePrice || product.price || product.basePrice;
                  const originalPrice = product.basePrice || product.price;
                  const discountPercent = product.discount || (hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0);
                  const isWish = isInWishlist(product.id);
                  const prodImg = typeof product.images?.[0] === 'object' ? product.images[0].url : (product.image || (product as any).img || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=400&q=80");
                  const catNameStr = typeof product.category === 'string' ? product.category : product.category?.name || "Toys";

                  return (
                    <motion.div
                      key={product.id}
                      whileHover={{ y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-[24px] border border-slate-200 hover:border-[#D90429]/40 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group relative"
                    >
                      {/* Image & Badges */}
                      <div className="relative w-full pt-[100%] bg-slate-50 overflow-hidden">
                        <Link href={`/products/${product.id}`}>
                          <img
                            src={prodImg}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                          {hasDiscount && (
                            <span className="bg-[#16803C] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">
                              {discountPercent}% OFF
                            </span>
                          )}
                          {product.isBestSeller && (
                            <span className="bg-[#FF9800] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">
                              BESTSELLER
                            </span>
                          )}
                        </div>

                        {/* Wishlist Button */}
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 flex items-center justify-center transition-all z-10 cursor-pointer shadow-xs ${
                            isWish ? "text-[#F7255A]" : "text-slate-400 hover:text-[#F7255A]"
                          }`}
                        >
                          <Heart size={16} fill={isWish ? "currentColor" : "none"} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-400 mb-1">
                            <span className="uppercase tracking-wider truncate">{product.brand || "PLAY PETAL"}</span>
                            <div className="flex items-center gap-0.5 text-amber-500 shrink-0 font-bold">
                              <Star size={12} fill="currentColor" />
                              <span>{product.rating || 4.8}</span>
                            </div>
                          </div>

                          <Link href={`/products/${product.id}`}>
                            <h3 className="font-extrabold text-[#202124] text-sm leading-snug line-clamp-2 hover:text-[#D90429] transition-colors mb-2">
                              {product.name}
                            </h3>
                          </Link>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                          <div>
                            <div className="text-base font-black text-[#202124]">
                              ₹{price}
                            </div>
                            {hasDiscount && (
                              <div className="text-[11px] font-bold text-slate-400 line-through">
                                ₹{originalPrice}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => addToCart({
                              id: product.id,
                              name: product.name,
                              price,
                              originalPrice,
                              img: prodImg,
                              category: catNameStr,
                              brand: product.brand,
                              ageGroup: product.ageGroup,
                              vendorId: product.vendorId,
                              vendorName: product.vendorName,
                              sku: product.sku
                            })}
                            className="bg-[#D90429] hover:bg-[#B7092B] text-white p-2.5 rounded-full transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                            title="Add to Cart"
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
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFFDF9] p-8 text-center text-[#202124] font-bold">Loading Toy Wonderland...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
