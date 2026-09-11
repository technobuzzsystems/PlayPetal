import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Store,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAdmin } from '../context/AdminContext';

interface PendingProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  ageGroup: string;
  vendorId: string;
  vendorName: string;
  vendorRating?: number;
  basePrice: number;
  salePrice?: number | null;
  price: number;
  stock: number;
  image: string;
  description: string;
  shortDescription?: string;
  specifications?: Record<string, string>;
  createdAt: string;
}

export const ProductApprovals: React.FC = () => {
  const { showToast } = useToast();
  const { refreshProducts } = useAdmin();
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingProduct, setRejectingProduct] = useState<PendingProduct | null>(null);
  const [rejectReason, setRejectReason] = useState('Product specifications or images need higher clarity.');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/products/pending`);
      if (res.ok) {
        const data = await res.json();
        setPendingProducts(data);
      }
    } catch (err) {
      console.error('Failed to load pending products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/products/${id}/approve`, {
        method: 'PUT',
      });
      if (res.ok) {
        showToast(`Product "${name}" approved and live on storefront! 🎉`, 'success');
        setPendingProducts((prev) => prev.filter((p) => p.id !== id));
        if (refreshProducts) {
          refreshProducts();
        }
      } else {
        throw new Error('Failed to approve');
      }
    } catch (err) {
      showToast('Could not approve product. Make sure backend is running.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingProduct) return;
    setProcessingId(rejectingProduct.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/products/${rejectingProduct.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        showToast(`Product "${rejectingProduct.name}" rejected.`, 'info', rejectReason);
        setPendingProducts((prev) => prev.filter((p) => p.id !== rejectingProduct.id));
        if (refreshProducts) {
          refreshProducts();
        }
        setRejectModalOpen(false);
        setRejectingProduct(null);
      }
    } catch (err) {
      showToast('Could not reject product.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Clock size={12} /> Pending Moderation Queue
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Multi-Vendor Catalog Review</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Product Approval Queue</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review toy products submitted by vendors before they are published to the customer store.
          </p>
        </div>
        <button
          onClick={fetchPending}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Queue ({pendingProducts.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 font-bold">
          Loading Moderation Queue...
        </div>
      ) : pendingProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Queue is Clear!</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
            All vendor-submitted toys have been reviewed. When vendors submit new products, they will appear here for approval.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col lg:flex-row gap-6 items-start justify-between hover:border-slate-300 transition-all"
            >
              <div className="w-full lg:w-48 h-48 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-sky-100 text-sky-800 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                    {p.brand}
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                    Age: {p.ageGroup}
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                    Category: {p.category}
                  </span>
                  <span className="text-slate-400 text-xs ml-auto">SKU: {p.sku}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug">{p.name}</h3>

                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="text-sky-600" size={16} />
                    <span className="text-xs font-bold text-slate-800">
                      Submitted by: <span className="text-sky-700 font-extrabold">{p.vendorName}</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    Vendor Rating: ⭐ {p.vendorRating || 4.9}
                  </span>
                </div>

                <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">{p.description}</p>
              </div>

              <div className="w-full lg:w-56 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 space-y-4">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proposed Price</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">₹{p.salePrice || p.price}</div>
                  {p.basePrice && (
                    <div className="text-xs text-slate-400 line-through">MRP: ₹{p.basePrice}</div>
                  )}
                  <div className="text-xs font-semibold text-emerald-600 mt-1">
                    Stock to list: {p.stock || 20} units
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    disabled={processingId === p.id}
                    onClick={() => handleApprove(p.id, p.name)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve &amp; Publish</span>
                  </button>

                  <button
                    disabled={processingId === p.id}
                    onClick={() => {
                      setRejectingProduct(p);
                      setRejectModalOpen(true);
                    }}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    <span>Reject Product</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {rejectModalOpen && rejectingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Reject Product Submission</h3>
            <p className="text-slate-600 text-xs">
              Provide feedback for <span className="font-bold">{rejectingProduct.name}</span>. The vendor will see this reason in their portal.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
              placeholder="Explain why this toy was rejected..."
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
