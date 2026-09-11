import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/Badge';
import { useAdmin } from '../context/AdminContext';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../types';
import {
  Search,
  ExternalLink,
  Edit2,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Star,
  Sparkles,
  Flame,
  AlertTriangle,
  Plus,
  RefreshCw
} from 'lucide-react';

export interface VendorItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  shopName: string;
  rating: number;
  totalProducts?: number;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  joinedAt: string;
  logo?: string;
  description?: string;
  address?: string;
  city?: string;
}

interface VendorProductsModalProps {
  vendor: VendorItem;
  isOpen: boolean;
  onClose: () => void;
}

export const VendorProductsModal: React.FC<VendorProductsModalProps> = ({
  vendor,
  isOpen,
  onClose,
}) => {
  const { products: allAdminProducts } = useAdmin();
  const navigate = useNavigate();

  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Approved' | 'Pending'>('All');

  // Fetch products for this specific vendor from API + fallback to AdminContext
  const fetchVendorProducts = async () => {
    setLoading(true);
    try {
      const API_BASE = 'http://localhost:5000/api';
      
      // Try vendor-specific endpoint first
      const res = await fetch(`${API_BASE}/vendors/${vendor.id}/products`);
      let fetched: any[] = [];
      if (res.ok) {
        fetched = await res.json();
      }

      // If empty or offline, fallback to general products filtered by vendorId or shopName
      if (!Array.isArray(fetched) || fetched.length === 0) {
        const prodRes = await fetch(`${API_BASE}/products?vendorId=${vendor.id}&allStatus=true`);
        if (prodRes.ok) {
          fetched = await prodRes.json();
        }
      }

      // Merge with AdminContext products to ensure zero-lag offline display
      const adminMatches = allAdminProducts.filter(
        (p) =>
          p.vendorId === vendor.id ||
          p.vendorName?.toLowerCase() === vendor.shopName.toLowerCase() ||
          p.vendorName?.toLowerCase() === vendor.name.toLowerCase()
      );

      const combinedMap = new Map<string, any>();
      (Array.isArray(fetched) ? fetched : []).forEach((p) => combinedMap.set(p.id, p));
      adminMatches.forEach((p) => {
        if (!combinedMap.has(p.id)) combinedMap.set(p.id, p);
      });

      const list: Product[] = Array.from(combinedMap.values()).map((item: any) => ({
        id: item.id,
        name: item.name,
        slug: item.slug || item.id,
        sku: item.sku || `SKU-${item.id}`,
        category: typeof item.category === 'string' ? item.category : item.category?.name || 'Toys',
        subCategory: item.subCategory || '',
        price: Number(item.basePrice || item.price || 999),
        salePrice: item.salePrice ? Number(item.salePrice) : undefined,
        discount: Number(item.discount || 0),
        stock: item.stock !== undefined && item.stock !== null ? Number(item.stock) : 20,
        status:
          item.status === 'APPROVED' || item.status === 'Active'
            ? 'Active'
            : item.status === 'PENDING'
            ? 'Draft'
            : (item.status as any),
        featured: Boolean(item.isFeatured || item.featured),
        isBestSeller: Boolean(item.isBestSeller),
        isNewArrival: Boolean(item.isNewArrival),
        vendorId: item.vendorId || vendor.id,
        vendorName: item.vendorName || vendor.shopName,
        image:
          item.image ||
          item.images?.[0]?.url ||
          'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=300&auto=format&fit=crop&q=60',
        galleryImages: Array.isArray(item.images)
          ? item.images.map((img: any) => (typeof img === 'string' ? img : img?.url || ''))
          : [],
        shortDescription: item.shortDescription || '',
        description: item.description || '',
        rating: Number(item.rating || 5.0),
        salesCount: Number(item.salesCount || 0),
        attributes: item.attributes || {},
        createdAt: item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      }));

      setVendorProducts(list);
    } catch (err) {
      console.error('Failed to load vendor products:', err);
      const localMatches = allAdminProducts.filter(
        (p) =>
          p.vendorId === vendor.id ||
          p.vendorName?.toLowerCase() === vendor.shopName.toLowerCase() ||
          p.vendorName?.toLowerCase() === vendor.name.toLowerCase()
      );
      setVendorProducts(localMatches);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && vendor?.id) {
      fetchVendorProducts();
    }
  }, [isOpen, vendor?.id]);

  const filteredProducts = useMemo(() => {
    return vendorProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'All' ||
        (selectedStatus === 'Approved' && (p.status === 'Active' || (p.status as string) === 'APPROVED')) ||
        (selectedStatus === 'Pending' && (p.status === 'Draft' || (p.status as string) === 'PENDING'));

      return matchesSearch && matchesStatus;
    });
  }, [vendorProducts, searchTerm, selectedStatus]);

  const stats = useMemo(() => {
    const total = vendorProducts.length;
    const inStock = vendorProducts.filter((p) => p.stock > 0).length;
    const lowStock = vendorProducts.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const totalUnits = vendorProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
    const approved = vendorProducts.filter((p) => p.status === 'Active' || (p.status as string) === 'APPROVED').length;
    const pending = vendorProducts.filter((p) => p.status === 'Draft' || (p.status as string) === 'PENDING').length;
    return { total, inStock, lowStock, totalUnits, approved, pending };
  }, [vendorProducts]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${vendor.shopName} — Products Catalog`}
      description={`Managed by ${vendor.name} • Registered toy partner`}
      size="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-semibold text-slate-500">
            Showing {filteredProducts.length} of {vendorProducts.length} products
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/admin/products/new');
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-[#D90429] hover:bg-[#B7092B] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Toy Product</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-2xs shrink-0">
              <img
                src={vendor.logo || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=120&h=120&fit=crop'}
                alt={vendor.shopName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 leading-tight">{vendor.shopName}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  vendor.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : vendor.status === 'PENDING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {vendor.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                <ShieldCheck size={13} className="text-sky-500 shrink-0" />
                <span className="font-semibold text-slate-700">{vendor.name}</span>
                {vendor.city && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-slate-400" />
                      {vendor.city}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Mail size={12} className="text-slate-400" />
                  {vendor.email}
                </span>
                {vendor.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-slate-400" />
                    {vendor.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span className="text-xs font-black text-slate-800">{vendor.rating}</span>
              <span className="text-[10px] text-slate-400 font-medium">Rating</span>
            </div>
            <button
              onClick={fetchVendorProducts}
              disabled={loading}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Products</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{stats.total}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">In Stock</span>
            <span className="text-xl font-black text-emerald-600 mt-0.5 block">{stats.inStock}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Units</span>
            <span className="text-xl font-black text-blue-600 mt-0.5 block">{stats.totalUnits}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Review</span>
            <span className={`text-xl font-black mt-0.5 block ${stats.pending > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
              {stats.pending}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by toy name, SKU, category..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            {(['All', 'Approved', 'Pending'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={24} className="animate-spin text-sky-600" />
            <span>Loading {vendor.shopName} toys...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="text-4xl mb-2">🧸</div>
            <h4 className="text-base font-bold text-slate-800 mb-1">No Toys Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {searchTerm || selectedStatus !== 'All'
                ? 'No products matched your search or status filter for this vendor.'
                : `No products are currently listed under ${vendor.shopName}. Products will appear here once submitted.`}
            </p>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('All');
                }}
                className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
              >
                Clear Search &amp; Filters
              </button>
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Toy Product</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Stock Units</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredProducts.map((p) => {
                    const priceFormatted = `₹${p.price.toLocaleString('en-IN')}`;
                    const salePriceFormatted = p.salePrice ? `₹${p.salePrice.toLocaleString('en-IN')}` : null;
                    const isLowStock = p.stock > 0 && p.stock <= 10;
                    const isOutOfStock = p.stock <= 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 hover:text-[#D90429] transition-colors truncate max-w-[200px] sm:max-w-xs block">
                                  {p.name}
                                </span>
                                {p.isBestSeller && (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                                    <Flame size={10} className="fill-amber-600 text-amber-600" />
                                    BEST
                                  </span>
                                )}
                                {p.isNewArrival && (
                                  <span className="bg-purple-100 text-purple-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                                    <Sparkles size={10} />
                                    NEW
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                                {p.sku}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px] whitespace-nowrap">
                            {p.category}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {salePriceFormatted ? (
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900">{salePriceFormatted}</span>
                              <span className="text-[10px] text-slate-400 line-through">{priceFormatted}</span>
                            </div>
                          ) : (
                            <span className="font-black text-slate-900">{priceFormatted}</span>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}>
                            {isOutOfStock ? (
                              'Out of Stock'
                            ) : isLowStock ? (
                              <>
                                <AlertTriangle size={10} />
                                {p.stock} left
                              </>
                            ) : (
                              `${p.stock} in stock`
                            )}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={p.status} />
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                onClose();
                                navigate(`/admin/products/${p.id}/edit`);
                              }}
                              title="Edit Product"
                              className="p-1.5 text-slate-500 hover:text-[#D90429] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <a
                              href={`http://localhost:3000/products/${p.id}`}
                              target="_blank"
                              rel="noreferrer"
                              title="View on Storefront"
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
