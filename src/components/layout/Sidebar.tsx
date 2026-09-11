import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Store,
  Building2,
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
  UserCheck,
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



  const pendingOrdersCount = orders.filter((o) => o.status === 'Pending').length;
  const pendingReviewsCount = reviews.filter((r) => r.status === 'Pending').length;
  const bestSellersCount = products.filter((p) => p.isBestSeller).length;
  const newArrivalsCount = products.filter((p) => p.isNewArrival).length;

  // 🏬 SHOPKEEPER ONLY NAVIGATION
  const vendorNavItems: NavGroup[] = [
    {
      name: 'Shop Dashboard',
      path: '/vendor-portal',
      icon: <Store className="w-4.5 h-4.5 text-amber-500" />,
    },
    {
      name: 'My Products',
      path: '/vendor-portal?tab=products',
      icon: <Package className="w-4.5 h-4.5 text-sky-500" />,
    },
    {
      name: 'Add New Toy',
      path: '/vendor-portal?tab=add',
      icon: <PackagePlus className="w-4.5 h-4.5 text-rose-500" />,
      badge: 'Upload Photo',
    },
    {
      name: 'My Orders & Customers',
      path: '/vendor-portal?tab=orders',
      icon: <ShoppingCart className="w-4.5 h-4.5 text-emerald-500" />,
    },
    {
      name: 'Shop Profile',
      path: '/vendor-portal?tab=profile',
      icon: <UserCheck className="w-4.5 h-4.5 text-pink-500" />,
    },
  ];

  // 🛡️ SUPER ADMIN ONLY NAVIGATION (No Vendor Portal here!)
  const adminNavItems: NavGroup[] = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: <LayoutDashboard className="w-4.5 h-4.5" />,
    },
    {
      name: 'Catalog',
      icon: <Package className="w-4.5 h-4.5" />,
      children: [
        {
          name: 'Product Approvals',
          path: '/admin/approvals',
          icon: <ShieldAlert className="w-4 h-4 text-amber-500" />,
          badge: 'Review',
        },
        { name: 'Products', path: '/admin/products', icon: <Package className="w-4 h-4" /> },
        {
          name: 'Best Sellers',
          path: '/admin/products/best-sellers',
          icon: <Flame className="w-4 h-4 text-amber-500" />,
          badge: bestSellersCount,
        },
        {
          name: 'New Arrivals',
          path: '/admin/products/new-arrivals',
          icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
          badge: newArrivalsCount,
        },
        { name: 'Categories', path: '/admin/categories', icon: <FolderTree className="w-4 h-4" /> },
        { name: 'Attributes', path: '/admin/attributes', icon: <SlidersHorizontal className="w-4 h-4" /> },
        { name: 'Variants', path: '/admin/variants', icon: <Layers className="w-4 h-4" /> },
        { name: 'Inventory', path: '/admin/inventory', icon: <Boxes className="w-4 h-4" /> },
      ],
    },
    {
      name: 'Orders',
      path: '/admin/orders',
      icon: <ShoppingCart className="w-4.5 h-4.5" />,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      name: 'Vendors',
      path: '/admin/vendors',
      icon: <Building2 className="w-4.5 h-4.5 text-sky-500" />,
    },
    {
      name: 'Customers',
      path: '/admin/customers',
      icon: <Users className="w-4.5 h-4.5" />,
    },
    {
      name: 'Marketing',
      icon: <Sparkles className="w-4.5 h-4.5" />,
      children: [
        { name: 'Banners', path: '/admin/banners', icon: <ImageIcon className="w-4 h-4" /> },
        { name: 'Collections', path: '/admin/collections', icon: <Sparkles className="w-4 h-4" /> },
        { name: 'Coupons', path: '/admin/coupons', icon: <TicketPercent className="w-4 h-4" /> },
      ],
    },
    {
      name: 'Content',
      icon: <LayoutTemplate className="w-4.5 h-4.5" />,
      children: [
        { name: 'Homepage', path: '/admin/homepage', icon: <LayoutTemplate className="w-4 h-4" /> },
        { name: 'Media Library', path: '/admin/media', icon: <Images className="w-4 h-4" /> },
      ],
    },
    {
      name: 'Reviews',
      path: '/admin/reviews',
      icon: <Star className="w-4.5 h-4.5" />,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: <Settings className="w-4.5 h-4.5" />,
    },
  ];

  const navItems = isVendor ? vendorNavItems : adminNavItems;

  const isLinkActive = (path: string) => {
    if (isVendor) {
      if (path.includes('?tab=')) {
        const tabVal = path.split('?tab=')[1];
        return location.pathname === '/vendor-portal' && location.search.includes(`tab=${tabVal}`);
      }
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

  // Keep track of which menu groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      Catalog: true,
      Marketing: false,
      'Content & CMS': false,
    };
    adminNavItems.forEach((item) => {
      if (item.children && isGroupActive(item.children)) {
        initial[item.name] = true;
      }
    });
    return initial;
  });

  // Track route changes: auto-expand the parent group when a child route is visited
  const prevPathnameRef = React.useRef(location.pathname);
  React.useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      adminNavItems.forEach((item) => {
        if (item.children && isGroupActive(item.children)) {
          setOpenGroups((prev) => ({ ...prev, [item.name]: true }));
        }
      });
    }
  }, [location.pathname]);

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
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
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col ${
          isVendor ? 'bg-[#fffaf0] border-r border-amber-200' : 'bg-[#fff0f7] border-r border-[#ffd4ea]'
        } transition-all duration-300 ease-in-out select-none ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand section */}
        <div className={`h-16 flex items-center justify-between px-5 border-b ${
          isVendor ? 'border-amber-200 bg-amber-100/50' : 'border-[#ffd4ea] bg-[#ffe3f5]/50'
        }`}>
          <NavLink to={isVendor ? "/vendor-portal" : "/admin/dashboard"} className="flex items-center gap-3 overflow-hidden">
            {isVendor ? (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Store className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff91db] to-[#ffa3e4] flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
                <span className="text-white text-base font-extrabold">K</span>
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate max-w-[145px]">
                  {isVendor ? (user?.shopName || 'Toy Shop') : 'KidsPlay'}
                </span>
                <span className={`text-[9px] uppercase font-black tracking-widest ${
                  isVendor ? 'text-amber-700' : 'text-[#ff91db]'
                }`}>
                  {isVendor ? 'Shopkeeper Portal' : 'Admin Panel'}
                </span>
              </div>
            )}
          </NavLink>

          {/* Close for mobile */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navItems.map((item) => {
            if (item.children) {
              const groupActive = isGroupActive(item.children);
              const isOpen = !!openGroups[item.name];

              if (sidebarCollapsed) {
                // Collapsed view with tooltip
                return (
                  <div key={item.name} className="relative group py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarCollapsed(false);
                        setOpenGroups((prev) => ({ ...prev, [item.name]: true }));
                      }}
                      className={`w-full h-10 rounded-xl flex items-center justify-center transition-colors ${
                        groupActive
                          ? 'bg-[#ff91db] text-white shadow-xs'
                          : 'text-[#733557] hover:bg-[#ffe0f1] hover:text-[#451630]'
                      }`}
                      title={item.name}
                    >
                      {item.icon}
                    </button>
                  </div>
                );
              }

              // Expanded group
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                      groupActive
                        ? 'text-[#451630] bg-[#ffe0f1]/60 font-black'
                        : 'text-[#733557] hover:bg-[#ffe0f1]/40 hover:text-[#451630]'
                    }`}
                  >
                    <div className="flex items-center gap-3 pointer-events-none">
                      <span className={groupActive ? 'text-[#ff91db]' : 'text-[#ff91db]/70'}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-[#9c537b] pointer-events-none" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#9c537b] pointer-events-none" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="pl-6 pr-1 space-y-1 border-l-2 border-[#ffd0ef] ml-4 my-1">
                      {item.children.map((sub) => {
                        const active = isLinkActive(sub.path);
                        return (
                          <NavLink
                            key={sub.name}
                            to={sub.path}
                            onClick={() => setMobileSidebarOpen(false)}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all relative ${
                              active
                                ? 'bg-[#ff91db] text-white font-bold shadow-xs'
                                : 'text-[#733557] hover:bg-[#ffe0f1] hover:text-[#451630] font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={active ? 'text-white' : 'text-[#9c537b]'}>
                                {sub.icon}
                              </span>
                              <span>{sub.name}</span>
                            </div>
                            {sub.badge !== undefined && (
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  active ? 'bg-white text-[#ff91db]' : 'bg-[#ffe3f5] text-[#ff91db]'
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

            // Single item (no children)
            const active = isLinkActive(item.path || '');
            return (
              <NavLink
                key={item.name}
                to={item.path || '#'}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all relative ${
                  active
                    ? isVendor
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-[#ff91db] text-white shadow-xs'
                    : isVendor
                    ? 'text-amber-900 hover:bg-amber-100 hover:text-amber-950 font-semibold'
                    : 'text-[#733557] hover:bg-[#ffe0f1] hover:text-[#451630] font-medium'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className={active ? 'text-white' : isVendor ? 'text-amber-600' : 'text-[#ff91db]'}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </div>

                {!sidebarCollapsed && item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    active
                      ? 'bg-white text-slate-900'
                      : isVendor
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-[#ff91db] text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {active && !sidebarCollapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer / Collapse toggle button */}
        <div className={`p-3 border-t hidden lg:flex items-center justify-between ${
          isVendor ? 'border-amber-200 bg-amber-50/50' : 'border-[#ffd4ea] bg-[#ffe3f5]/30'
        }`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors text-xs font-semibold cursor-pointer"
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
