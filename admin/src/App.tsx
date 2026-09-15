import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import { ToastProvider } from './context/ToastContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { ProductForm } from './pages/ProductForm';
import { Categories } from './pages/Categories';
import { Attributes } from './pages/Attributes';
import { Variants } from './pages/Variants';
import { Inventory } from './pages/Inventory';
import { Orders } from './pages/Orders';
import { Customers } from './pages/Customers';
import { Banners } from './pages/Banners';
import { Collections } from './pages/Collections';
import { Coupons } from './pages/Coupons';
import { NewsletterSubscribers } from './pages/NewsletterSubscribers';
import { HomepageCMS } from './pages/HomepageCMS';
import { MediaLibrary } from './pages/MediaLibrary';
import { Reviews } from './pages/Reviews';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { ProductApprovals } from './pages/ProductApprovals';
import { VendorAuth } from './pages/VendorAuth';
import { Vendors } from './pages/Vendors';
import { VendorPortal } from './pages/VendorPortal';

// Root redirect based on role
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (user.role === 'VENDOR') {
    return <Navigate to="/vendor-portal" replace />;
  }
  return <Navigate to="/admin/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AdminProvider>
            <Routes>
              {/* Public Authentication Screens */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/vendor/login" element={<VendorAuth />} />
              <Route path="/vendor/register" element={<VendorAuth />} />
              <Route path="/vendor-auth" element={<VendorAuth />} />
              <Route path="/login" element={<Login />} />

              {/* Root route redirect based on role */}
              <Route path="/" element={<RootRedirect />} />

              {/* 🛡️ SUPER ADMIN ONLY ROUTES */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="/admin/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* Moderation Queue */}
                  <Route path="/admin/approvals" element={<ProductApprovals />} />
                  <Route path="/approvals" element={<ProductApprovals />} />

                  {/* All Products Management */}
                  <Route path="/admin/products" element={<Products />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/admin/products/best-sellers" element={<Products />} />
                  <Route path="/products/best-sellers" element={<Products />} />
                  <Route path="/admin/products/new-arrivals" element={<Products />} />
                  <Route path="/products/new-arrivals" element={<Products />} />
                  <Route path="/admin/products/new" element={<ProductForm />} />
                  <Route path="/products/new" element={<ProductForm />} />
                  <Route path="/admin/products/:id/edit" element={<ProductForm />} />
                  <Route path="/products/:id/edit" element={<ProductForm />} />

                  {/* Taxonomy */}
                  <Route path="/admin/categories" element={<Categories />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/admin/attributes" element={<Attributes />} />
                  <Route path="/attributes" element={<Attributes />} />
                  <Route path="/admin/variants" element={<Variants />} />
                  <Route path="/variants" element={<Variants />} />
                  <Route path="/admin/inventory" element={<Inventory />} />
                  <Route path="/inventory" element={<Inventory />} />

                  {/* Platform Orders & Vendors */}
                  <Route path="/admin/orders" element={<Orders />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/admin/orders/:id" element={<Orders />} />
                  <Route path="/admin/vendors" element={<Vendors />} />
                  <Route path="/vendors" element={<Vendors />} />
                  <Route path="/admin/customers" element={<Customers />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/admin/customers/:id" element={<Customers />} />

                  {/* Marketing & Content CMS */}
                  <Route path="/admin/banners" element={<Banners />} />
                  <Route path="/banners" element={<Banners />} />
                  <Route path="/admin/collections" element={<Collections />} />
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/admin/coupons" element={<Coupons />} />
                  <Route path="/coupons" element={<Coupons />} />
                  <Route path="/admin/newsletter" element={<NewsletterSubscribers />} />
                  <Route path="/newsletter" element={<NewsletterSubscribers />} />
                  <Route path="/newsletter-subscribers" element={<NewsletterSubscribers />} />
                  <Route path="/admin/homepage" element={<HomepageCMS />} />
                  <Route path="/homepage" element={<HomepageCMS />} />
                  <Route path="/admin/media" element={<MediaLibrary />} />
                  <Route path="/media" element={<MediaLibrary />} />
                  <Route path="/admin/reviews" element={<Reviews />} />
                  <Route path="/reviews" element={<Reviews />} />
                  <Route path="/admin/settings" element={<Settings />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              {/* 🏬 SHOPKEEPER & VENDOR PORTAL ROUTES */}
              <Route element={<ProtectedRoute allowedRoles={['VENDOR', 'ADMIN']} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/vendor-portal" element={<VendorPortal />} />
                  <Route path="/vendor/dashboard" element={<VendorPortal />} />
                  <Route path="/admin/vendor-portal" element={<VendorPortal />} />
                </Route>
              </Route>

              {/* Fallback for invalid path */}
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </AdminProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
