"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  MapPin,
  Package,
  Heart,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Star,
  AlertCircle,
  Loader2,
  X
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LocationPickerMap, { SelectedLocation, DEFAULT_MAP_LOCATION } from "../../components/LocationPickerMap";

export interface Address {
  id: string;
  userId: string;
  title: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt?: string;
}

function ProfileContent() {
  const { user, authLoading, logout, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = searchParams.get("tab") || (searchParams.get("required") === "true" ? "addresses" : "account");
  const isRequiredMode = searchParams.get("required") === "true";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Phone Modal State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(isRequiredMode);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "Home",
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    latitude: "",
    longitude: "",
    isDefault: false,
  });

  // Map Picker State
  const [isMapOpen, setIsMapOpen] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Protected route check: redirect when auth check completes and user is null
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // Pre-fill default user name/phone if available
  useEffect(() => {
    if (user && !formData.name) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
        phone: user.phone || "",
      }));
    }
  }, [user]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPhone(true);
    setPhoneError(null);

    const clean = phoneInput.trim().replace(/\s+/g, "");
    const is10Digit = /^[6-9]\d{9}$/.test(clean);
    const isPlus91 = /^\+91[6-9]\d{9}$/.test(clean);

    if (!is10Digit && !isPlus91) {
      setPhoneError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      setIsSavingPhone(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/customers/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: clean }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        updateUser({ phone: data.customer.phone });
        setSuccessMsg("Phone number updated successfully!");
        setIsPhoneModalOpen(false);
      } else {
        setPhoneError(data.message || data.error || "Failed to update phone number.");
      }
    } catch (err) {
      setPhoneError("Network error updating phone number.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Fetch customer saved addresses
  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/customers/addresses`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to load addresses.");
      }
    } catch (err: any) {
      console.error("Fetch addresses error:", err);
      setError("Network error loading saved addresses.");
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (activeTab === "addresses") {
      fetchAddresses();
    }
  }, [activeTab]);

  const handleOpenAddForm = () => {
    setEditingAddressId(null);
    setFormData({
      title: "Home",
      name: user?.name || "",
      phone: user?.phone || "",
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      latitude: "",
      longitude: "",
      isDefault: addresses.length === 0,
    });
    setIsFormOpen(true);
  };

  const handleEditAddress = (addr: Address) => {
    setEditingAddressId(addr.id);
    setFormData({
      title: addr.title || "Home",
      name: addr.name || "",
      phone: addr.phone || "",
      street: addr.street || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      country: addr.country || "India",
      latitude: addr.latitude !== undefined && addr.latitude !== null ? String(addr.latitude) : "",
      longitude: addr.longitude !== undefined && addr.longitude !== null ? String(addr.longitude) : "",
      isDefault: addr.isDefault,
    });
    setIsFormOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError(null);
    setSuccessMsg(null);

    if (!formData.name.trim() || !formData.phone.trim() || !formData.street.trim() || !formData.city.trim() || !formData.state.trim() || !formData.pincode.trim()) {
      setError("Please fill out all required address fields.");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingAddressId
        ? `${API_URL}/customers/addresses/${editingAddressId}`
        : `${API_URL}/customers/addresses`;
      const method = editingAddressId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError(data.message || data.error || "Failed to save address.");
        }
        return;
      }

      setSuccessMsg(editingAddressId ? "Address updated successfully!" : "Address added successfully!");
      setIsFormOpen(false);
      fetchAddresses();

      if (isRequiredMode) {
        router.push("/");
      }
    } catch (err: any) {
      console.error("Save address error:", err);
      setError("Network error saving address. Is the backend API running?");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    setError(null);
    try {
      const res = await fetch(`${API_URL}/customers/addresses/${addressId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setSuccessMsg("Address deleted successfully.");
        fetchAddresses();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to delete address.");
      }
    } catch (err) {
      setError("Network error deleting address.");
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/customers/addresses/${addressId}/default`, {
        method: "PUT",
        credentials: "include",
      });
      if (res.ok) {
        setSuccessMsg("Default address updated!");
        fetchAddresses();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to set default address.");
      }
    } catch (err) {
      setError("Network error setting default address.");
    }
  };

  const handleSelectMapLocation = (location: SelectedLocation) => {
    setFormData((prev) => ({
      ...prev,
      street: location.street || prev.street,
      city: location.city || prev.city,
      state: location.state || prev.state,
      pincode: location.pincode || prev.pincode,
      country: location.country || prev.country || "India",
      latitude: String(location.latitude),
      longitude: String(location.longitude),
    }));
    setSuccessMsg("Location coordinates & address pre-filled from map pin!");
  };

  return (
    <div className="min-h-[85vh] bg-[#FFFDF9] text-[#202124] flex flex-col pt-8 pb-20 px-4">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#D90429] text-white flex items-center justify-center text-2xl font-black shadow-md">
              {user ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#202124]">My Profile</h1>
              <p className="text-slate-600 font-medium text-sm">
                Manage your Play Petal account settings and saved delivery addresses.
              </p>
            </div>
          </div>
        </div>

        {/* Mandate Warning Banner if Google Sign-In with no address */}
        {isRequiredMode && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center gap-3 text-amber-900 shadow-sm animate-pulse">
            <AlertCircle size={24} className="text-amber-600 shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Google Sign-In Successful!</h3>
              <p className="text-xs font-medium">Please add a delivery address before continuing.</p>
            </div>
          </div>
        )}

        {/* Global Feedback Banners */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-2 h-max">
            <button
              onClick={() => {
                setActiveTab("account");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer text-left ${
                activeTab === "account"
                  ? "bg-[#D90429] text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#D90429]"
              }`}
            >
              <User size={18} /> Account Info
            </button>

            <button
              onClick={() => {
                setActiveTab("addresses");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer text-left ${
                activeTab === "addresses"
                  ? "bg-[#D90429] text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#D90429]"
              }`}
            >
              <div className="flex items-center gap-3">
                <MapPin size={18} /> Saved Addresses
              </div>
              {addresses.length > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                    activeTab === "addresses" ? "bg-white text-[#D90429]" : "bg-red-100 text-[#D90429]"
                  }`}
                >
                  {addresses.length}
                </span>
              )}
            </button>

            <Link
              href="/orders"
              className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-[#D90429] rounded-xl font-bold text-sm transition-colors"
            >
              <Package size={18} /> My Orders
            </Link>

            <Link
              href="/wishlist"
              className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-[#D90429] rounded-xl font-bold text-sm transition-colors"
            >
              <Heart size={18} /> Wishlist
            </Link>

            <Link
              href="/rewards"
              className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-[#D90429] rounded-xl font-bold text-sm transition-colors"
            >
              <SparkleIcon /> Play Points ({user?.playPoints || 0})
            </Link>

            {user && (
              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors text-left mt-4 cursor-pointer"
              >
                <LogOut size={18} /> Log Out
              </button>
            )}
          </div>

          {/* Main Workspace Area */}
          <div className="md:col-span-3">
            {/* Account Info Tab */}
            {activeTab === "account" && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-black text-[#202124] mb-6 flex items-center gap-2">
                  <User size={22} className="text-[#D90429]" /> Customer Account Overview
                </h2>
                <div className="space-y-4 max-w-lg">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Full Name
                    </label>
                    <p className="text-base font-bold text-slate-800">{user?.name || "Customer"}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Email Address
                    </label>
                    <p className="text-base font-bold text-slate-800">{user?.email}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Phone Number
                      </label>
                      <p className="text-base font-bold text-slate-800">
                        {user?.phone ? user.phone : "No phone number added"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPhoneInput(user?.phone || "");
                        setPhoneError(null);
                        setIsPhoneModalOpen(true);
                      }}
                      className="px-4 py-2 bg-white border border-slate-200 hover:border-[#D90429] text-[#D90429] text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                    >
                      {user?.phone ? "Edit" : "Add Phone Number"}
                    </button>
                  </div>

                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-red-600 uppercase tracking-wider block">
                        Play Points Balance
                      </label>
                      <p className="text-2xl font-black text-[#D90429]">{user?.playPoints || 0} pts</p>
                    </div>
                    <span className="text-3xl">🎁</span>
                  </div>
                </div>
              </div>
            )}

            {/* Saved Addresses Tab */}
            {activeTab === "addresses" && (
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-[#202124] flex items-center gap-2">
                      <MapPin size={22} className="text-[#D90429]" /> Address Book
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      Manage delivery addresses for seamless store checkout.
                    </p>
                  </div>

                  {!isFormOpen && (
                    <button
                      onClick={handleOpenAddForm}
                      className="bg-[#D90429] hover:bg-[#B7092B] text-white px-5 py-2.5 rounded-full font-bold text-xs shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <Plus size={16} /> Add New Address
                    </button>
                  )}
                </div>

                {/* Add / Edit Address Form */}
                {isFormOpen ? (
                  <form onSubmit={handleSaveAddress} className="bg-[#FFFDF9] p-6 rounded-2xl border border-slate-200 mb-8 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <h3 className="font-black text-sm text-[#202124] flex items-center gap-2">
                        {editingAddressId ? <Edit2 size={16} /> : <Plus size={16} />}
                        {editingAddressId ? "Edit Saved Address" : "Add New Address"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-full cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Interactive Map Picker Trigger */}
                    <div className="p-4 bg-red-50/70 rounded-2xl border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-xs text-[#D90429] flex items-center gap-1.5">
                          <MapPin size={16} /> Interactive Map Picker Available
                        </h4>
                        <p className="text-xs text-slate-600 font-medium">
                          Click or drag pin on OpenStreetMap to auto-detect your location & pincode.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        className="bg-white hover:bg-red-50 text-[#D90429] border border-[#D90429] px-4 py-2 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <MapPin size={14} /> Pick Location on Map
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Address Label / Title</label>
                        <select
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#D90429]"
                        >
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D90429]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Phone Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 9876543210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D90429]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">PIN Code *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 400001"
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D90429]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">
                        Street Address / Flat No / Landmark *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Flat 402, Sunshine Apartments, MG Road"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D90429]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">City *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Mumbai"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D90429]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">State *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Maharashtra"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D90429]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Country</label>
                        <input
                          type="text"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D90429]"
                        />
                      </div>
                    </div>

                    {/* Coordinates Read-only / Optional preview */}
                    {formData.latitude && formData.longitude && (
                      <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] font-mono text-slate-600 flex items-center justify-between">
                        <span>📍 Map Coordinates Linked: ({formData.latitude}, {formData.longitude})</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, latitude: "", longitude: "" })}
                          className="text-red-600 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="isDefaultCheckbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="w-4 h-4 accent-[#D90429] rounded-sm cursor-pointer"
                      />
                      <label htmlFor="isDefaultCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                        Set as my default shipping address
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-5 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 bg-[#D90429] hover:bg-[#B7092B] text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Saving...
                          </>
                        ) : (
                          "Save Address"
                        )}
                      </button>
                    </div>
                  </form>
                ) : null}

                {/* Loading Spinner */}
                {loadingAddresses ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 size={24} className="animate-spin text-[#D90429]" />
                    <span className="text-xs font-bold">Loading Saved Addresses...</span>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-300 p-6">
                    <MapPin size={40} className="text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-700 text-sm mb-1">No Saved Addresses Found</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                      Add a delivery address to ensure fast & reliable toy deliveries.
                    </p>
                    <button
                      onClick={handleOpenAddForm}
                      className="bg-[#D90429] hover:bg-[#B7092B] text-white px-5 py-2.5 rounded-full font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus size={16} /> Add Address Now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                          addr.isDefault
                            ? "bg-red-50/40 border-[#D90429] shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider">
                              {addr.title || "Home"}
                            </span>
                            {addr.isDefault && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#D90429] text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                                <Star size={10} className="fill-white" /> Default Address
                              </span>
                            )}
                          </div>

                          <h4 className="font-black text-sm text-[#202124] mb-1">{addr.name}</h4>
                          <p className="text-xs text-slate-600 font-medium mb-1">{addr.street}</p>
                          <p className="text-xs text-slate-600 font-medium mb-1">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-xs font-bold text-slate-500 mb-2">📞 {addr.phone}</p>
                          {addr.latitude && addr.longitude && (
                            <p className="text-[10px] font-mono text-slate-400">
                              📍 ({addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)})
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs font-bold">
                          {!addr.isDefault ? (
                            <button
                              onClick={() => handleSetDefault(addr.id)}
                              className="text-[#D90429] hover:underline cursor-pointer"
                            >
                              Set as Default
                            </button>
                          ) : (
                            <span className="text-emerald-600 text-[11px] flex items-center gap-1">
                              <CheckCircle2 size={12} /> Active Default
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditAddress(addr)}
                              className="p-1.5 text-slate-500 hover:text-[#D90429] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Address"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Address"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phone Edit Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-black text-base text-[#202124]">
                {user?.phone ? "Edit Phone Number" : "Add Phone Number"}
              </h3>
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            {phoneError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{phoneError}</span>
              </div>
            )}

            <form onSubmit={handleSavePhone} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Mobile Phone Number (10 digits) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#202124] focus:outline-none focus:border-[#D90429] transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  disabled={isSavingPhone}
                  className="flex-1 py-2.5 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPhone}
                  className="flex-1 py-2.5 rounded-full bg-[#D90429] hover:bg-[#B7092B] text-white text-xs font-black shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingPhone ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Phone"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Location Picker Map Modal Component */}
      <LocationPickerMap
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelectLocation={handleSelectMapLocation}
        initialLat={formData.latitude ? parseFloat(formData.latitude) : DEFAULT_MAP_LOCATION.lat}
        initialLng={formData.longitude ? parseFloat(formData.longitude) : DEFAULT_MAP_LOCATION.lng}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[85vh] flex items-center justify-center bg-[#FFFDF9]">
        <Loader2 size={32} className="animate-spin text-[#D90429]" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
  );
}
