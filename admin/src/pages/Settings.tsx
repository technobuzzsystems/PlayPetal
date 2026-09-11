import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Switch } from '../components/ui/Switch';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Store,
  Phone,
  Globe,
  Share2,
  Palette,
  Sliders,
  Check,
  ShieldCheck,
  Key,
  Lock,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useAdmin();
  const { adminCredentials, updateAdminCredentials } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('store');
  const [formData, setFormData] = useState({ ...settings });

  // Security / Admin credentials state
  const [securityForm, setSecurityForm] = useState({
    username: adminCredentials.username,
    email: adminCredentials.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    showToast('Store settings saved successfully', 'success');
  };

  const handleUpdateSecurity = (e: React.FormEvent) => {
    e.preventDefault();

    if (!securityForm.currentPassword) {
      showToast('Please enter your current password to confirm changes', 'error');
      return;
    }

    if (securityForm.newPassword && securityForm.newPassword !== securityForm.confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }

    const res = updateAdminCredentials({
      username: securityForm.username,
      email: securityForm.email,
      currentPassword: securityForm.currentPassword,
      newPassword: securityForm.newPassword || undefined,
    });

    if (res.success) {
      showToast('Admin credentials updated successfully!', 'success');
      setSecurityForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } else {
      showToast(res.message || 'Failed to update credentials', 'error');
    }
  };

  const tabs = [
    { id: 'store', label: 'Store Info', icon: <Store className="w-3.5 h-3.5" /> },
    { id: 'security', label: 'Admin Security', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'contact', label: 'Contact', icon: <Phone className="w-3.5 h-3.5" /> },
    { id: 'seo', label: 'Search SEO', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'social', label: 'Social Links', icon: <Share2 className="w-3.5 h-3.5" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'general', label: 'General & Alerts', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Security"
        description="Manage your storefront profile, admin password & credentials, branding, and alerts"
        breadcrumbs={[{ label: 'Settings' }]}
        actions={
          activeTab !== 'security' ? (
            <Button onClick={handleSave} leftIcon={<Check className="w-4 h-4" />}>
              Save Changes
            </Button>
          ) : undefined
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-3 sm:px-6 pt-2 bg-slate-50/50 border-b border-slate-200 overflow-x-auto max-w-full scrollbar-none">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
          {/* Store Info */}
          {activeTab === 'store' && (
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Store Display Name *"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                required
              />
              <Input
                label="Store Tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Store Currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  options={[
                    { value: 'INR (₹)', label: 'Indian Rupee (INR ₹)' },
                    { value: 'USD ($)', label: 'US Dollar (USD $)' },
                    { value: 'EUR (€)', label: 'Euro (EUR €)' },
                    { value: 'GBP (£)', label: 'British Pound (GBP £)' },
                  ]}
                />
                <Input
                  label="Currency Symbol"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                />
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" size="sm">
                  Save Store Info
                </Button>
              </div>
            </form>
          )}

          {/* Admin Security & Password */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Credentials Callout Card */}
              <div className="p-4 bg-pink-50/70 border border-pink-100 rounded-xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Admin Panel Access Authority</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    This Admin Panel is protected with your single master credentials. You can update your login username, email, or password below anytime.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                    <span className="text-slate-600">
                      Active Username: <strong className="font-mono text-indigo-600">{adminCredentials.username}</strong>
                    </span>
                    <span className="text-slate-600">
                      Active Email: <strong className="font-mono text-indigo-600">{adminCredentials.email}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Update Credentials Form */}
              <form onSubmit={handleUpdateSecurity} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Admin Username *"
                    value={securityForm.username}
                    onChange={(e) => setSecurityForm({ ...securityForm, username: e.target.value })}
                    required
                  />
                  <Input
                    label="Admin Email *"
                    type="email"
                    value={securityForm.email}
                    onChange={(e) => setSecurityForm({ ...securityForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="border-t border-slate-100 pt-4 mt-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" /> Change Password
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      placeholder="Re-enter new password"
                      value={securityForm.confirmPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <Input
                    label="Current Password * (Required to save changes)"
                    type="password"
                    placeholder="Enter current password (default: admin123)"
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="pt-3 flex justify-end">
                  <Button type="submit" size="sm" leftIcon={<Check className="w-4 h-4" />}>
                    Save Security Credentials
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Contact Information */}
          {activeTab === 'contact' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Customer Support Email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
                <Input
                  label="Support Phone Number"
                  type="tel"
                  value={formData.supportPhone}
                  onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                />
              </div>
              <Input
                label="Store Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
                <Input
                  label="Zip / Postal Code"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                />
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" size="sm">
                  Save Contact Settings
                </Button>
              </div>
            </form>
          )}

          {/* SEO Settings */}
          {activeTab === 'seo' && (
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Meta Title (Storefront Homepage)"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              />
              <Textarea
                label="Meta Description"
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                rows={3}
              />
              <Input
                label="SEO Keywords (comma-separated)"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              />
              <div className="pt-4 flex justify-end">
                <Button type="submit" size="sm">
                  Save SEO Settings
                </Button>
              </div>
            </form>
          )}

          {/* Social Links */}
          {activeTab === 'social' && (
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Instagram Profile URL"
                placeholder="https://instagram.com/kidsplay"
                value={formData.instagramUrl}
                onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
              />
              <Input
                label="Facebook Page URL"
                placeholder="https://facebook.com/kidsplay"
                value={formData.facebookUrl}
                onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
              />
              <Input
                label="YouTube Channel URL"
                placeholder="https://youtube.com/@kidsplay"
                value={formData.youtubeUrl}
                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
              />
              <div className="pt-4 flex justify-end">
                <Button type="submit" size="sm">
                  Save Social Links
                </Button>
              </div>
            </form>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Primary Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {formData.primaryColor}
                  </span>
                  <span className="text-xs text-slate-400">
                    (KidsPlay signature purple accent)
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">Storefront & Admin Theme</p>
                <p>
                  The Admin Panel maintains a clean, minimal white & soft gray SaaS palette to keep focus on sales metrics, orders, and catalog data.
                </p>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" size="sm">
                  Save Appearance
                </Button>
              </div>
            </form>
          )}

          {/* General & Alerts */}
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="space-y-5">
              <Switch
                label="Enable Automatic Low Stock Alerts"
                description="Display warning tags and dashboard alerts when SKU inventory drops below the threshold"
                checked={formData.enableStockAlerts}
                onChange={(checked: boolean) => setFormData({ ...formData, enableStockAlerts: checked })}
              />

              <Input
                type="number"
                label="Default Low Stock Threshold Quantity"
                value={formData.lowStockThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })
                }
                helperText="Units count at which warning badges trigger"
              />
              <div className="pt-4 flex justify-end">
                <Button type="submit" size="sm">
                  Save General Settings
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
