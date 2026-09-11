import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  ExternalLink,
  Store,
  CheckCheck,
  X,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const isVendor = user?.role === 'VENDOR';

  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    setMobileSidebarOpen,
    searchQuery,
    setSearchQuery,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    dismissNotification,
    clearAllNotifications,
  } = useAdmin();

  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute readable page title from route
  const getPageTitle = () => {
    if (isVendor) {
      if (location.search.includes('tab=products')) return 'My Toy Products';
      if (location.search.includes('tab=add')) return 'Add New Toy Product';
      if (location.search.includes('tab=orders')) return 'My Orders & Customers';
      if (location.search.includes('tab=profile')) return 'My Shop Profile';
      return user?.shopName || 'Shopkeeper Dashboard';
    }

    const path = location.pathname;
    if (path === '/' || path === '/admin' || path === '/admin/dashboard') return 'Super Admin Dashboard';
    if (path.includes('/approvals')) return 'Product Approvals Queue';
    if (path.includes('/products/new')) return 'Add New Product';
    if (path.includes('/products/best-sellers')) return 'Best Sellers Catalog';
    if (path.includes('/products/new-arrivals')) return 'New Arrivals Catalog';
    if (path.includes('/products') && path.includes('/edit')) return 'Edit Product';
    if (path.includes('/products')) return 'Products Management';
    if (path.includes('/categories')) return 'Categories Management';
    if (path.includes('/attributes')) return 'Product Attributes';
    if (path.includes('/variants')) return 'Product Variants';
    if (path.includes('/inventory')) return 'Global Inventory';
    if (path.includes('/orders')) return 'Platform Orders';
    if (path.includes('/vendors')) return 'Vendors Management';
    if (path.includes('/customers')) return 'Customers';
    if (path.includes('/banners')) return 'Marketing Banners';
    if (path.includes('/collections')) return 'Collections';
    if (path.includes('/coupons')) return 'Coupons & Discounts';
    if (path.includes('/homepage')) return 'Homepage CMS';
    if (path.includes('/media')) return 'Media Library';
    if (path.includes('/reviews')) return 'Customer Reviews';
    if (path.includes('/settings')) return 'Store Settings';
    return 'Admin Panel';
  };

  return (
    <header className="h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md border-b bg-[#D90429] border-red-700 text-white">
      {/* Left section: Hamburger / Page Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile toggle */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden p-2 text-white hover:bg-[#EF233C] rounded-xl transition-colors cursor-pointer"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop collapse button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex p-2 text-white hover:bg-[#EF233C] rounded-xl transition-colors cursor-pointer"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight flex items-center gap-2">
            {isVendor && <Store className="w-4 h-4 text-[#FFD43B] hidden sm:inline" />}
            <span>{getPageTitle()}</span>
          </h1>
          <span className="hidden sm:inline text-[11px] font-bold text-white/80">
            {isVendor
              ? `Shopkeeper Partner Portal • ${user?.shopName || 'Toy Store'}`
              : 'Play Petal Administration'}
          </span>
        </div>
      </div>

      {/* Right section: Search, Notifications, User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Global search input */}
        <div className="relative hidden md:block w-56 lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isVendor ? "Search my toys, orders..." : "Search catalog, orders, SKUs..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#202124] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFD43B] transition-all shadow-xs"
          />
        </div>

        {/* View Storefront Link */}
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#D90429] bg-white hover:bg-slate-100 transition-all shadow-xs"
          title="Open Live Customer Storefront"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Live Store</span>
        </a>

        {/* Notifications Dropdown */}
        {!isVendor && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-xl text-white hover:bg-[#EF233C] relative transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFD43B]" />
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-[#202124]">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                      Notifications
                    </span>
                    {unreadNotificationsCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#D90429] border border-red-200">
                        {unreadNotificationsCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsAsRead()}
                        className="text-[11px] font-semibold text-[#2196F3] hover:underline cursor-pointer flex items-center gap-1"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-[#16803C]" />
                        <span>Mark all read</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearAllNotifications()}
                        className="text-[11px] font-semibold text-slate-400 hover:text-red-600 hover:underline cursor-pointer flex items-center gap-1"
                        title="Ignore all"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Ignore all</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      <CheckCheck className="w-6 h-6 mx-auto mb-2 text-[#16803C]" />
                      <p className="font-bold text-[#202124]">No notifications</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.unread) markNotificationAsRead(n.id);
                          if (n.link) {
                            navigate(n.link);
                            setNotificationsOpen(false);
                          }
                        }}
                        className={`p-3 text-xs transition-colors flex items-start justify-between gap-2.5 ${
                          n.link ? 'cursor-pointer' : ''
                        } ${
                          n.unread ? 'bg-red-50/50 hover:bg-red-50' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {n.unread ? (
                              <span className="w-2 h-2 rounded-full bg-[#D90429] shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-transparent shrink-0" />
                            )}
                            <p className="font-bold text-[#202124] text-xs truncate">{n.title}</p>
                          </div>
                          <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">
                            {n.desc}
                          </p>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                            {n.time}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(n.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile */}
        <div className="relative ml-1">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 text-white hover:bg-white/15 p-1.5 rounded-xl transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 text-white flex items-center justify-center font-black text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <span className="text-xs font-bold hidden md:inline max-w-[100px] truncate">{user?.name || 'Admin'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50 text-[#202124]">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-black text-[#202124]">{user?.name || 'Admin User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@playpetal.com'}</p>
                <span className="mt-1 inline-block px-2 py-0.5 bg-red-50 text-[#D90429] border border-red-200 rounded text-[10px] font-bold">
                  {user?.role || 'SUPER_ADMIN'}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate(isVendor ? '/vendor-portal?tab=profile' : '/settings');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#D90429] font-semibold cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>{isVendor ? 'Shop Settings' : 'Admin Settings'}</span>
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                    showToast('Logged out successfully', 'info');
                    navigate(isVendor ? '/vendor/auth' : '/login');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
