import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Store,
  Package,
  FolderTree,
  SlidersHorizontal,
  Layers,
  Boxes,
  ShoppingCart,
  Users,
  Image as ImageIcon,
  Sparkles,
  TicketPercent,
  LayoutTemplate,
  Images,
  Star,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Flame,
  PackagePlus,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';

interface NavSubItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface NavGroup {
  name: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavSubItem[];
  badge?: string | number;
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isVendor = user?.role === 'VENDOR';

  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    orders,
    reviews,
    products,
  } = useAdmin();

  // Keep track of which menu groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Catalog: true,
    Marketing: false,
    Content: false,
  });

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const pendingOrdersCount = orders.filter((o) => o.status === 'Pending').length;
  const pendingReviewsCount = reviews.filter((r) => r.status === 'Pending').length;
  const bestSellersCount = products.filter((p) => p.isBestSeller).length;
  const newArrivalsCount = products.filter((p) => p.isNewArrival).length;

  // 🏬 SHOPKEEPER ONLY NAVIGATION
  const vendorNavItems: NavGroup[] = [
    {
      name: 'Shop Dashboard',
      path: '/vendor-portal',
      icon: <Store className="w-4.5 h-4.5 text-[#D90429]" />,
    },
    {
      name: 'My Products',
      path: '/vendor-portal?tab=products',
      icon: <Package className="w-4.5 h-4.5 text-[#2196F3]" />,
    },
    {
      name: 'Add New Toy',
      path: '/vendor-portal?tab=add',
      icon: <PackagePlus className="w-4.5 h-4.5 text-[#F7255A]" />,
      badge: 'Upload Photo',
    },
    {
      name: 'My Orders & Customers',
      path: '/vendor-portal?tab=orders',
      icon: <ShoppingCart className="w-4.5 h-4.5 text-[#16803C]" />,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      name: 'Shop Profile & Settings',
      path: '/vendor-portal?tab=profile',
      icon: <Settings className="w-4.5 h-4.5 text-[#9C27B0]" />,
    },
  ];

  // 👑 SUPER ADMIN NAVIGATION
  const adminNavItems: NavGroup[] = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: <LayoutDashboard className="w-4.5 h-4.5 text-[#D90429]" />,
    },
    {
      name: 'Approvals Queue',
      path: '/admin/approvals',
      icon: <ShieldAlert className="w-4.5 h-4.5 text-[#FF9800]" />,
      badge: products.filter((p: any) => p.status === 'PENDING').length || undefined,
    },
    {
      name: 'Catalog',
      icon: <Package className="w-4.5 h-4.5 text-[#2196F3]" />,
      children: [
        { name: 'All Products', path: '/admin/products', icon: <Package className="w-4 h-4 text-slate-400" /> },
        { name: 'Add New Product', path: '/admin/products/new', icon: <PackagePlus className="w-4 h-4 text-[#D90429]" /> },
        { name: 'Best Sellers', path: '/admin/products/best-sellers', icon: <Flame className="w-4 h-4 text-[#FF9800]" />, badge: bestSellersCount },
        { name: 'New Arrivals', path: '/admin/products/new-arrivals', icon: <Sparkles className="w-4 h-4 text-[#2196F3]" />, badge: newArrivalsCount },
        { name: 'Categories', path: '/admin/categories', icon: <FolderTree className="w-4 h-4 text-slate-400" /> },
        { name: 'Attributes', path: '/admin/attributes', icon: <SlidersHorizontal className="w-4 h-4 text-slate-400" /> },
        { name: 'Variants', path: '/admin/variants', icon: <Layers className="w-4 h-4 text-slate-400" /> },
      ],
    },
    {
      name: 'Inventory',
      path: '/admin/inventory',
      icon: <Boxes className="w-4.5 h-4.5 text-[#9C27B0]" />,
    },
    {
      name: 'Orders',
      path: '/admin/orders',
      icon: <ShoppingCart className="w-4.5 h-4.5 text-[#16803C]" />,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      name: 'Vendors / Sellers',
      path: '/admin/vendors',
      icon: <Store className="w-4.5 h-4.5 text-[#2196F3]" />,
    },
    {
      name: 'Customers',
      path: '/admin/customers',
      icon: <Users className="w-4.5 h-4.5 text-[#43B94A]" />,
    },
    {
      name: 'Marketing',
      icon: <Sparkles className="w-4.5 h-4.5 text-[#F7255A]" />,
      children: [
        { name: 'Banners', path: '/admin/banners', icon: <ImageIcon className="w-4 h-4 text-slate-400" /> },
        { name: 'Collections', path: '/admin/collections', icon: <Sparkles className="w-4 h-4 text-slate-400" /> },
        { name: 'Coupons & Deals', path: '/admin/coupons', icon: <TicketPercent className="w-4 h-4 text-slate-400" /> },
      ],
    },
    {
      name: 'Content & CMS',
      icon: <LayoutTemplate className="w-4.5 h-4.5 text-[#FF9800]" />,
      children: [
        { name: 'Homepage Sections', path: '/admin/homepage', icon: <LayoutTemplate className="w-4 h-4 text-slate-400" /> },
        { name: 'Media Library', path: '/admin/media', icon: <Images className="w-4 h-4 text-slate-400" /> },
        { name: 'Reviews', path: '/admin/reviews', icon: <Star className="w-4 h-4 text-slate-400" />, badge: pendingReviewsCount },
      ],
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: <Settings className="w-4.5 h-4.5 text-slate-500" />,
    },
  ];

  const navItems = isVendor ? vendorNavItems : adminNavItems;

  const isLinkActive = (path: string) => {
    if (isVendor) {
      if (path.includes('tab=products')) return location.search.includes('tab=products');
      if (path.includes('tab=add')) return location.search.includes('tab=add');
      if (path.includes('tab=orders')) return location.search.includes('tab=orders');
      if (path.includes('tab=profile')) return location.search.includes('tab=profile');
      if (path === '/vendor-portal') {
        return location.pathname === '/vendor-portal' && (!location.search || location.search === '' || location.search === '?tab=products');
      }
    }
    if (path === '/admin/dashboard' && (location.pathname === '/' || location.pathname === '/admin' || location.pathname === '/admin/dashboard')) {
      return true;
    }
    if (path === '/admin/products') {
      return location.pathname === '/admin/products' || location.pathname === '/products';
    }
    return location.pathname === path;
  };

  const isGroupActive = (children?: NavSubItem[]) => {
    if (!children) return false;
    return children.some((c) => isLinkActive(c.path));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 text-[#202124] transition-all duration-300 ease-in-out select-none ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand section */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 bg-white">
          <NavLink to={isVendor ? "/vendor-portal" : "/admin/dashboard"} className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#D90429] flex items-center justify-center text-white font-black shrink-0 shadow-xs">
              <span className="text-white text-base font-extrabold">{isVendor ? "S" : "P"}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-black text-[#202124] tracking-tight leading-tight truncate max-w-[145px]">
                  {isVendor ? (user?.shopName || 'Toy Shop') : 'Play Petal Admin'}
                </span>
                <span className="text-[9px] uppercase font-black tracking-widest text-[#D90429]">
                  {isVendor ? 'Shopkeeper Portal' : 'Admin Panel'}
                </span>
              </div>
            )}
          </NavLink>

          {/* Close for mobile */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navItems.map((item) => {
            if (item.children) {
              const groupActive = isGroupActive(item.children);
              const isOpen = openGroups[item.name] || groupActive;

              if (sidebarCollapsed) {
                return (
                  <div key={item.name} className="relative group py-1">
                    <button
                      onClick={() => setSidebarCollapsed(false)}
                      className={`w-full h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                        groupActive
                          ? 'bg-[#D90429] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-[#202124]'
                      }`}
                      title={item.name}
                    >
                      {item.icon}
                    </button>
                  </div>
                );
              }

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      groupActive
                        ? 'text-[#202124] bg-slate-50 border border-slate-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#202124]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={groupActive ? 'text-[#D90429]' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="pl-6 pr-1 space-y-1 border-l-2 border-slate-200 ml-4 my-1">
                      {item.children.map((sub) => {
                        const active = isLinkActive(sub.path);
                        return (
                          <NavLink
                            key={sub.name}
                            to={sub.path}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all relative ${
                              active
                                ? 'bg-[#D90429] text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-[#202124] font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={active ? 'text-white' : 'text-slate-400'}>
                                {sub.icon}
                              </span>
                              <span>{sub.name}</span>
                            </div>
                            {sub.badge !== undefined && (
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#D90429] border border-slate-200'
                                }`}
                              >
                                {sub.badge}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = isLinkActive(item.path || '');
            return (
              <NavLink
                key={item.name}
                to={item.path || '#'}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all relative ${
                  active
                    ? 'bg-[#D90429] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#202124] font-semibold'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className={active ? 'text-white' : 'text-[#D90429]'}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </div>

                {!sidebarCollapsed && item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-[#D90429] border border-slate-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-white hidden lg:flex items-center justify-between">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-slate-500 hover:text-[#202124] hover:bg-slate-50 transition-colors text-xs font-bold cursor-pointer"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4.5 h-4.5" />
            ) : (
              <>
                <PanelLeftClose className="w-4.5 h-4.5" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
