import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Phone, MapPin, Star, RefreshCw, Package, ChevronRight } from 'lucide-react';
import { VendorProductsModal } from './VendorProductsModal';

interface VendorItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  shopName: string;
  rating: number;
  totalProducts: number;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  joinedAt: string;
  logo?: string;
  description?: string;
  address?: string;
  city?: string;
}

export const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<VendorItem | null>(null);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors`);
      if (res.ok) {
        const data = await res.json();
        setVendors(data);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Multi-Vendor Marketplace
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Registered Shopkeepers &amp; Vendors</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage partner toy stores and view registered vendor profiles.
          </p>
        </div>
        <button
          onClick={fetchVendors}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh ({vendors.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 font-bold border border-slate-200">
          Loading Registered Vendors...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedVendor(v)}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between hover:border-sky-400 hover:shadow-md transition-all duration-200 space-y-4 cursor-pointer group"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 group-hover:scale-105 transition-transform">
                    <img
                      src={v.logo || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=120&h=120&fit=crop'}
                      alt={v.shopName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-sky-600 transition-colors">{v.shopName}</h3>
                    <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <ShieldCheck size={13} className="text-sky-500" />
                      <span>{v.name}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400" />
                    <span>{v.email}</span>
                  </div>
                  {v.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400" />
                      <span>{v.phone}</span>
                    </div>
                  )}
                  {v.city && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400" />
                      <span>{v.city}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-3 line-clamp-2">{v.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs font-black text-slate-800">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span>{v.rating}</span>
                </div>

                <div className="flex items-center gap-2">
                  {v.status && (
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      v.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : v.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      {v.status}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVendor(v);
                    }}
                    className="bg-sky-50 group-hover:bg-sky-600 text-sky-700 group-hover:text-white px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Package size={12} />
                    <span>View Products</span>
                    <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVendor && (
        <VendorProductsModal
          vendor={selectedVendor}
          isOpen={!!selectedVendor}
          onClose={() => setSelectedVendor(null)}
        />
      )}
    </div>
  );
};
