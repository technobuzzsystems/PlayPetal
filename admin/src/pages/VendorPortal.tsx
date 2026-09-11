// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Store,
  PackagePlus,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserCheck,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Link as LinkIcon,
  ShieldCheck,
  Phone,
  MapPin,
  Star,
  Edit,
  Power,
  User,
} from 'lucide-react';
import { useAuth, PRESET_VENDORS } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAdmin } from '../context/AdminContext';

export const VendorPortal: React.FC = () => {
  const location = useLocation();
  const { user, switchVendor } = useAuth();
  const { showToast } = useToast();
  const { products: adminProducts, deleteProduct: adminDeleteProduct, updateProduct: adminUpdateProduct } = useAdmin();

  const isVendor = user?.role === 'VENDOR';
  const currentVendorId = user?.vendorId || 'vendor-1';
  const currentShopName = user?.shopName || 'ABC Toys Wonderland';

  const [activeTab, setActiveTab] = useState<'products' | 'add' | 'orders' | 'profile' | 'reviews'>('products');
  const [vendorProducts, setVendorProducts] = useState<any[]>([]);
  const [vendorOrders, setVendorOrders] = useState<any[]>([]);
  const [vendorReviews, setVendorReviews] = useState<any[]>([]);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [deletingProduct, setDeletingProduct] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('Empty Stock (0 Units Left)');
  const [loading, setLoading] = useState(true);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [updatingProduct, setUpdatingProduct] = useState(false);
  const [editUseUrlInput, setEditUseUrlInput] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editImageFileName, setEditImageFileName] = useState('');
  const [editImageFileSize, setEditImageFileSize] = useState('');

  const [editFormData, setEditFormData] = useState({
    name: '',
    category: 'STEM & Robotics',
    brand: 'LEGO',
    ageGroup: '6 - 8 Years',
    basePrice: 1999,
    salePrice: 1599,
    stock: 25,
    isBestSeller: false,
    isNewArrival: false,
    image: '',
    shortDescription: '',
    description: '',
  });

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setEditFormData({
      name: p.name || '',
      category: p.category || 'STEM & Robotics',
      brand: p.brand || 'LEGO',
      ageGroup: p.ageGroup || '6 - 8 Years',
      basePrice: p.basePrice || p.price || 0,
      salePrice: p.salePrice || p.price || 0,
      stock: p.stock ?? 0,
      isBestSeller: Boolean(p.isBestSeller),
      isNewArrival: Boolean(p.isNewArrival),
      image: p.image || '',
      shortDescription: p.shortDescription || '',
      description: p.description || '',
    });
    setEditImageFileName(p.image ? 'Current Product Image' : '');
    setEditImageFileSize('');
  };

  const processEditImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('Image size exceeds 25MB limit.', 'error');
      return;
    }
    const formattedSize =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditFormData((prev) => ({ ...prev, image: dataUrl }));
      setEditImageFileName(file.name);
      setEditImageFileSize(formattedSize);
      showToast(`Updated photo "${file.name}" ready! 📸`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditedProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editFormData.image.trim()) {
      showToast('Please provide a valid product image URL or upload a photo.', 'error');
      return;
    }

    setUpdatingProduct(true);
    const updatedData = {
      ...editFormData,
      basePrice: Number(editFormData.basePrice),
      salePrice: editFormData.salePrice ? Number(editFormData.salePrice) : null,
      price: editFormData.salePrice ? Number(editFormData.salePrice) : Number(editFormData.basePrice),
      stock: Number(editFormData.stock),
      isBestSeller: Boolean(editFormData.isBestSeller),
      isNewArrival: Boolean(editFormData.isNewArrival),
    };

    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${currentVendorId}/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      }).catch(() => {});

      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      }).catch(() => {});

      setVendorProducts((prev) =>
        prev.map((item) => (item.id === editingProduct.id ? { ...item, ...updatedData } : item))
      );

      if (adminUpdateProduct) {
        adminUpdateProduct(editingProduct.id, updatedData);
      }

      showToast(`Product "${updatedData.name}" updated successfully! ✏️`, 'success');
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to update product:', err);
      setVendorProducts((prev) =>
        prev.map((item) => (item.id === editingProduct.id ? { ...item, ...updatedData } : item))
      );
      if (adminUpdateProduct) {
        adminUpdateProduct(editingProduct.id, updatedData);
      }
      showToast(`Product "${updatedData.name}" updated in shop catalog.`, 'success');
      setEditingProduct(null);
    } finally {
      setUpdatingProduct(false);
    }
  };

  // Sync tab with URL search parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'products' || tabParam === 'add' || tabParam === 'orders' || tabParam === 'profile') {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Drag & Drop Image State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageFileName, setImageFileName] = useState('');
  const [imageFileSize, setImageFileSize] = useState('');
  const [useUrlInput, setUseUrlInput] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'STEM & Robotics',
    categoryId: 'cat-3',
    brand: 'LEGO',
    ageGroup: '6 - 8 Years',
    basePrice: 1999,
    salePrice: 1599,
    stock: 25,
    isBestSeller: false,
    isNewArrival: false,
    image: '',
    shortDescription: '',
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchVendorData = async () => {
    setLoading(true);
    try {
      const [prodsRes, ordersRes, reviewsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${currentVendorId}/products`),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${currentVendorId}/orders`),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reviews`),
      ]);
      if (prodsRes.ok) {
        const prods = await prodsRes.json();
        setVendorProducts(prods);
      } else if (adminProducts && adminProducts.length > 0) {
        const filtered = adminProducts.filter((p: any) => p.vendorId === currentVendorId || !p.vendorId);
        setVendorProducts(filtered.length > 0 ? filtered : adminProducts);
      }
      if (ordersRes.ok) {
        const ords = await ordersRes.json();
        setVendorOrders(ords);
      }
    } catch (err) {
      console.error('Failed to load vendor data:', err);
      if (adminProducts && adminProducts.length > 0) {
        const filtered = adminProducts.filter((p: any) => p.vendorId === currentVendorId || !p.vendorId);
        setVendorProducts(filtered.length > 0 ? filtered : adminProducts);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    const prodId = deletingProduct.id;
    const prodName = deletingProduct.name;

    try {
      // API call if backend server is available
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${currentVendorId}/products/${prodId}`, {
        method: 'DELETE',
      }).catch(() => {});

      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/products/${prodId}`, {
        method: 'DELETE',
      }).catch(() => {});

      // Remove from local shopkeeper products state
      setVendorProducts((prev) => prev.filter((p) => p.id !== prodId));

      // Remove from AdminContext
      if (adminDeleteProduct) {
        adminDeleteProduct(prodId);
      }

      showToast(`Product "${prodName}" deleted successfully! 🗑️`, 'success', `Reason: ${deleteReason}`);
    } catch (err) {
      console.error('Failed to delete product:', err);
      setVendorProducts((prev) => prev.filter((p) => p.id !== prodId));
      if (adminDeleteProduct) {
        adminDeleteProduct(prodId);
      }
      showToast(`Product "${prodName}" deleted from shop catalog.`, 'success');
    } finally {
      setDeletingProduct(null);
    }
  };

  useEffect(() => {
    fetchVendorData();
  }, [currentVendorId]);

  // Image Processing Helpers
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('Image size exceeds 25MB limit. Please choose a smaller photo.', 'error');
      return;
    }

    const formattedSize =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({ ...prev, image: dataUrl }));
      setImageFileName(file.name);
      setImageFileSize(formattedSize);
      showToast(`Photo "${file.name}" ready! 📸`, 'success');
    };
    reader.onerror = () => {
      showToast('Failed to read image file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: '' }));
    setImageFileName('');
    setImageFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image.trim()) {
      showToast('Please upload a product photo using the drag-and-drop box.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${currentVendorId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          basePrice: Number(formData.basePrice),
          salePrice: formData.salePrice ? Number(formData.salePrice) : null,
          price: formData.salePrice ? Number(formData.salePrice) : Number(formData.basePrice),
          stock: Number(formData.stock),
          isBestSeller: Boolean(formData.isBestSeller),
          isNewArrival: Boolean(formData.isNewArrival),
        }),
      });

      if (res.ok) {
        showToast('Product submitted for approval! ⏳', 'success', 'It is now in the Admin Approval Queue.');
        // Reset form
        setFormData({
          name: '',
          category: 'STEM & Robotics',
          categoryId: 'cat-3',
          brand: 'LEGO',
          ageGroup: '6 - 8 Years',
          basePrice: 1999,
          salePrice: 1599,
          stock: 25,
          isBestSeller: false,
          isNewArrival: false,
          image: '',
          shortDescription: '',
          description: '',
        });
        setImageFileName('');
        setImageFileSize('');
        setActiveTab('products');
        fetchVendorData();
      } else {
        throw new Error('Failed to submit product');
      }
    } catch (err) {
      showToast('Could not submit product. Please verify API is running.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 text-white ${
        isVendor
          ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600'
          : 'bg-gradient-to-r from-slate-900 to-indigo-950'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-amber-200 text-xs font-black uppercase tracking-wider">
            <Store size={16} /> {isVendor ? 'Shopkeeper Partner Dashboard' : 'Admin Preview: Vendor Dashboard'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">{currentShopName}</h1>
          <p className="text-amber-100 text-xs mt-1">
            Shop Owner: <span className="font-bold text-white">{user?.name || 'Vendor'}</span> • Email: <span className="font-semibold text-white">{user?.email || 'vendor@example.com'}</span>
          </p>
        </div>

        {/* If Super Admin is previewing, allow quick vendor switching; if Shopkeeper is logged in, hide switch completely! */}
        {!isVendor && (
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 space-y-2">
            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
              <UserCheck size={13} className="text-amber-400" /> Admin Preview (Switch Shopkeeper):
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_VENDORS.map((ven) => (
                <button
                  key={ven.id}
                  onClick={() => switchVendor(ven.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    currentVendorId === ven.id
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-white/20 text-slate-200 hover:bg-white/30'
                  }`}
                >
                  {ven.shopName.split(' ')[0]} ({ven.id})
                </button>
              ))}
            </div>
          </div>
        )}

        {isVendor && (
          <div className="bg-white/15 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
            <div className="text-[10px] uppercase tracking-wider text-amber-200 font-black">Account Status</div>
            <div className="text-sm font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /> Verified Shopkeeper
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'products'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Package size={14} /> My Products ({vendorProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'add'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
          }`}
        >
          <PackagePlus size={14} /> + Add New Toy Product
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShoppingBag size={14} /> My Orders &amp; Customers ({vendorOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Store size={14} /> Shop Profile
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'reviews'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Star size={14} /> My Reviews ({vendorReviews.length})
        </button>
      </div>

        {/* TAB 1: MY PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Catalog Inventory</h2>
              <p className="text-xs text-slate-500">Only toys listed under your shopkeeper account appear here.</p>
            </div>
            <button
              onClick={fetchVendorData}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 font-bold border border-slate-200">
              Loading your products...
            </div>
          ) : vendorProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <div className="text-4xl mb-2">📦</div>
              <h3 className="font-bold text-slate-800">No Products Listed Yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Click "Add New Toy Product" to list your first toy with high-res photos.</p>
              <button
                onClick={() => setActiveTab('add')}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                + List First Toy
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendorProducts.map((p) => {
                const isApproved = p.status === 'APPROVED';
                const isPending = p.status === 'PENDING';
                const isRejected = p.status === 'REJECTED';

                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="relative aspect-video bg-slate-100">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                          {isApproved && (
                            <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                              <CheckCircle2 size={12} /> Live on Storefront
                            </span>
                          )}
                          {isPending && (
                            <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                              <Clock size={12} /> Under Admin Review
                            </span>
                          )}
                          {isRejected && (
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                              <XCircle size={12} /> Rejected by Admin
                            </span>
                          )}
                          {(!p.stock || p.stock === 0) && (
                            <span className="bg-rose-700 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 animate-pulse">
                              ⚠️ Empty Stock (0 Units)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {p.brand || 'KidsPlay'} • {p.ageGroup || 'All Ages'}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{p.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2">{p.shortDescription || p.description}</p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-base font-black text-slate-900">₹{p.salePrice || p.price}</div>
                            {p.basePrice && p.basePrice > (p.salePrice || p.price) && (
                              <div className="text-[11px] text-slate-400 line-through">₹{p.basePrice}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-black ${(!p.stock || p.stock === 0) ? 'text-rose-600' : 'text-slate-700'}`}>
                              {p.stock ?? 0} units
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">Available Stock</div>
                          </div>
                        </div>

                        {(!p.stock || p.stock === 0) && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center justify-between gap-2">
                            <span>⚠️ Stock is empty (0 units left).</span>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingProduct(p);
                                setDeleteReason('Empty Stock (0 Units Left)');
                              }}
                              className="text-[11px] font-black text-rose-700 hover:text-rose-900 underline cursor-pointer"
                            >
                              Delete Now
                            </button>
                          </div>
                        )}

                        {p.rejectionReason && (
                          <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                            <strong>Admin Feedback:</strong> {p.rejectionReason}
                          </div>
                        )}

                        {/* Inline Stock Edit Form */}
                        {editingStockId === p.id && (
                          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                              <span>Update Shop Inventory Stock:</span>
                              <span className="text-[10px] text-slate-400">Set 0 for Empty Stock</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={newStock}
                                onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-rose-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setVendorProducts((prev) =>
                                    prev.map((item) => (item.id === p.id ? { ...item, stock: newStock } : item))
                                  );
                                  setEditingStockId(null);
                                  showToast(
                                    newStock === 0
                                      ? `Stock set to 0 (Empty Stock) for "${p.name}". Delete option highlighted!`
                                      : `Stock updated to ${newStock} units for "${p.name}".`,
                                    newStock === 0 ? 'warning' : 'success'
                                  );
                                }}
                                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Save Stock
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStockId(null)}
                                className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar: Edit Details, Edit Stock & Delete Product */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="text-xs font-bold text-amber-900 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Edit toy name, price, photo, category, and badges"
                        >
                          <Edit size={13} className="text-amber-700" /> Edit Toy
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingStockId(editingStockId === p.id ? null : p.id);
                            setNewStock(p.stock || 0);
                          }}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                          title="Quick update available stock units"
                        >
                          Stock
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDeletingProduct(p);
                          setDeleteReason((!p.stock || p.stock === 0) ? 'Empty Stock (0 Units Left)' : 'Out of Stock / Discontinued');
                        }}
                        className={`text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                          (!p.stock || p.stock === 0)
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                        title="Delete product from your shop inventory"
                      >
                        <Trash2 size={13} />
                        <span>{(!p.stock || p.stock === 0) ? 'Delete Empty Stock' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADD NEW PRODUCT */}
      {activeTab === 'add' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 max-w-3xl space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">Add New Toy Product</h2>
            <p className="text-xs text-slate-500">Upload your product photo using drag-and-drop. Newly submitted toys are sent to the Admin queue for quick review.</p>
          </div>

          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Toy Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Speedster RC Remote Control Monster Truck"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  <option value="Action Figures & Playsets">Action Figures</option>
                  <option value="Building & Construction Sets">Building Sets</option>
                  <option value="STEM & Robotics">STEM & Robotics</option>
                  <option value="Arts, Crafts & DIY">Arts & Crafts</option>
                  <option value="Plush & Soft Toys">Plush & Soft Toys</option>
                  <option value="Vehicles, Trains & RC">Vehicles & RC</option>
                  <option value="Outdoor & Sports Play">Outdoor Play</option>
                  <option value="Board Games & Puzzles">Board Games</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Age Group *</label>
                <select
                  value={formData.ageGroup}
                  onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  <option value="0 - 2 Years">0 - 2 Years (Infants)</option>
                  <option value="3 - 5 Years">3 - 5 Years (Pre-School)</option>
                  <option value="6 - 8 Years">6 - 8 Years (Explorers)</option>
                  <option value="9 - 12 Years">9 - 12 Years (Innovators)</option>
                  <option value="13+ Years">13+ Years (Teens)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Brand Name *</label>
                <select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  <option value="LEGO">LEGO</option>
                  <option value="Hot Wheels">Hot Wheels</option>
                  <option value="Barbie">Barbie</option>
                  <option value="Fisher-Price">Fisher-Price</option>
                  <option value="Nerf">Nerf</option>
                  <option value="Melissa & Doug">Melissa & Doug</option>
                  <option value="Play Petal Originals">Play Petal Originals</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">MRP Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Selling / Offer Price (₹)</label>
                <input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Stock Units *</label>
                <input
                  type="number"
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* DRAG & DROP PHOTO UPLOADER */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-rose-500" />
                  <span>Product Image (Drag & Drop or Browse) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseUrlInput(!useUrlInput)}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline flex items-center gap-1"
                >
                  <LinkIcon size={12} />
                  {useUrlInput ? 'Switch to Drag & Drop File Upload' : 'Enter Web Image URL Instead'}
                </button>
              </div>

              {!useUrlInput ? (
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
                    isDragging
                      ? 'border-rose-500 bg-rose-50 scale-[1.01]'
                      : formData.image
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                  }`}
                  onClick={() => {
                    if (!formData.image && fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {formData.image ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-md border-2 border-white">
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage();
                          }}
                          className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow hover:bg-rose-700"
                          title="Remove image"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {imageFileName || 'Selected Product Photo'}
                        {imageFileSize && <span className="text-slate-500 ml-1.5">({imageFileSize})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (fileInputRef.current) fileInputRef.current.click();
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Click to change photo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-rose-500 shadow-sm">
                        <UploadCloud size={28} />
                      </div>
                      <div className="font-bold text-sm text-slate-800">
                        Drag and drop your toy photo here
                      </div>
                      <div className="text-xs text-slate-500">
                        or <span className="text-rose-600 font-bold underline">browse from your computer</span> (PNG, JPG, WEBP)
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        High-resolution photos supported (up to 25MB)
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="url"
                  placeholder="https://example.com/toy-photo.jpg"
                  value={formData.image}
                  onChange={(e) => {
                    setFormData({ ...formData, image: e.target.value });
                    setImageFileName(e.target.value.split('/').pop() || 'Web Photo');
                    setImageFileSize('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Short Summary</label>
              <input
                type="text"
                placeholder="e.g. Beautiful fashion doll with styling accessories"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Description</label>
              <textarea
                rows={3}
                placeholder="Detailed description of features, materials, and safe play instructions..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* CUSTOMER BADGES & ORDERING TAGS */}
            <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Customer Badges &amp; Ordering Tags
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which badges are displayed to customers when viewing or ordering this toy:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Best Seller Checkbox/Card */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    formData.isBestSeller
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.isBestSeller}
                    onChange={(e) =>
                      setFormData({ ...formData, isBestSeller: e.target.checked })
                    }
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      🔥 Best Seller
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                      Shows "Best Seller" badge when customer views and orders this toy
                    </p>
                  </div>
                </label>

                {/* New Arrival Checkbox/Card */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    formData.isNewArrival
                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.isNewArrival}
                    onChange={(e) =>
                      setFormData({ ...formData, isNewArrival: e.target.checked })
                    }
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      ✨ New Arrival
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                      Shows "New Arrival" badge to highlight fresh toys to customers
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {submitting ? 'Submitting to Admin Queue...' : 'Submit Toy for Admin Approval 🚀'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: VENDOR ORDERS & CUSTOMERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Toy Orders & Customers</h2>
              <p className="text-xs text-slate-500">Shows orders and customer delivery info for toys sold by your shop.</p>
            </div>
            <button
              onClick={fetchVendorData}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 font-bold border border-slate-200">
              Loading Orders...
            </div>
          ) : vendorOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <div className="text-4xl mb-2">🛍️</div>
              <h3 className="font-bold text-slate-800">No Orders Received Yet</h3>
              <p className="text-xs text-slate-500 mt-1">When customers order toys sold by your store, they will appear here with customer contact and delivery details.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vendorOrders.map((ord) => (
                <div key={ord.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{ord.orderNumber}</div>
                      <div className="text-xs text-slate-400">Date: {new Date(ord.createdAt || Date.now()).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-slate-900">Your Earnings: ₹{ord.totalAmount}</div>
                      <div className="text-xs font-bold text-emerald-600">{ord.status}</div>
                    </div>
                  </div>

                  {/* Customer Information Card */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <User size={15} className="text-amber-600" />
                      <span className="font-bold text-slate-700">Customer:</span>
                      <span className="font-black text-slate-900">{ord.customerName}</span>
                      {ord.customerEmail && <span className="text-slate-500 font-normal">({ord.customerEmail})</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-slate-600">
                      {ord.shippingAddress?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone size={13} className="text-amber-600" />
                          <span className="font-bold text-slate-800">{ord.shippingAddress.phone}</span>
                        </div>
                      )}
                      {ord.shippingAddress?.city && (
                        <div className="flex items-center gap-1">
                          <MapPin size={13} className="text-amber-600" />
                          <span>{ord.shippingAddress.city}, {ord.shippingAddress.state}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2">
                    {ord.items.map((it: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <img src={it.image} alt="" className="w-11 h-11 object-cover rounded-lg bg-white border border-slate-200" />
                          <div>
                            <div className="font-bold text-slate-900">{it.name}</div>
                            <div className="text-slate-400 text-[10px]">Quantity: {it.quantity} unit(s)</div>
                          </div>
                        </div>
                        <div className="font-black text-slate-900 text-sm">₹{it.price * it.quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
        {/* TAB: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your Product Reviews</h2>
                <p className="text-xs text-slate-500">See what customers are saying about your toys.</p>
              </div>
              <button
                onClick={fetchVendorData}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            
            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-500 font-bold border border-slate-200">
                Loading reviews...
              </div>
            ) : vendorReviews.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-500 font-bold border border-slate-200">
                No reviews yet for your products.
              </div>
            ) : (
              <div className="space-y-3">
                {vendorReviews.map(r => (
                  <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start">
                     <img src={r.productImage} alt={r.productName} className="w-16 h-16 rounded-xl object-cover" />
                     <div className="flex-1">
                        <div className="flex items-center justify-between">
                           <h4 className="font-bold text-sm text-slate-900">{r.productName}</h4>
                           <span className="text-xs text-slate-400">{r.date}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-400 my-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} className={i < r.rating ? 'fill-amber-400' : 'text-slate-200'} />
                          ))}
                        </div>
                        <p className="text-sm text-slate-700 italic mt-2">"{r.comment}"</p>
                        <p className="text-xs text-slate-500 mt-1">- {r.customerName}</p>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SHOP PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 max-w-3xl">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white font-black text-2xl shadow-md">
              <Store size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{currentShopName}</h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  Verified Toy Merchant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vendor ID: <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{currentVendorId}</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Owner Name</div>
              <div className="text-sm font-black text-slate-800 mt-1">{user?.name || 'Shopkeeper'}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Business Email</div>
              <div className="text-sm font-black text-slate-800 mt-1">{user?.email || 'vendor@example.com'}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catalog Size</div>
              <div className="text-sm font-black text-slate-800 mt-1">{vendorProducts.length} Toys Listed</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer Orders</div>
              <div className="text-sm font-black text-slate-800 mt-1">{vendorOrders.length} Orders Received</div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <div className="text-xs font-black text-amber-900 mb-1 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-amber-700" />
              <span>Shopkeeper Partner Guidelines</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Toys listed through your portal are evaluated by the platform Super Administrator to ensure kid safety and genuine brand standards. Once approved, they go live on the storefront with your shopkeeper badge!
            </p>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal for Shopkeeper */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Delete Product from Shop</h3>
                <p className="text-xs text-slate-500">Remove product from your shopkeeper catalog</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1 text-xs">
              <div className="font-bold text-rose-900 line-clamp-1">{deletingProduct.name}</div>
              <div className="text-rose-700">
                SKU: {deletingProduct.sku || 'N/A'} • Price: ₹{deletingProduct.salePrice || deletingProduct.price} • Stock: <span className="font-black">{deletingProduct.stock ?? 0} units</span>
              </div>
              {(!deletingProduct.stock || deletingProduct.stock === 0) && (
                <div className="mt-1 font-bold text-rose-600 flex items-center gap-1">
                  ⚠️ Product has 0 stock (Empty Stock). Deleting will permanently remove it from your inventory.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Reason for Deletion:</label>
              <select
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Empty Stock (0 Units Left)">Empty Stock / Out of Stock (0 units)</option>
                <option value="Discontinued Toy Line">Discontinued Toy Line</option>
                <option value="Uploaded by Mistake / Duplicate">Uploaded by Mistake / Duplicate</option>
                <option value="Other Shopkeeper Reason">Other Reason</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteProduct()}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal for Shopkeeper */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 my-auto animate-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Edit size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Edit Toy Product</h3>
                  <p className="text-xs text-slate-500">Update toy pricing, photos, stock &amp; descriptions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedProduct} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Toy Product Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="Action Figures & Playsets">Action Figures</option>
                    <option value="Building & Construction Sets">Building Sets</option>
                    <option value="STEM & Robotics">STEM & Robotics</option>
                    <option value="Arts, Crafts & DIY">Arts & Crafts</option>
                    <option value="Plush & Soft Toys">Plush & Soft Toys</option>
                    <option value="Vehicles, Trains & RC">Vehicles & RC</option>
                    <option value="Outdoor & Sports Play">Outdoor Play</option>
                    <option value="Board Games & Puzzles">Board Games</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Age Group *</label>
                  <select
                    value={editFormData.ageGroup}
                    onChange={(e) => setEditFormData({ ...editFormData, ageGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="0 - 2 Years">0 - 2 Years (Infants)</option>
                    <option value="3 - 5 Years">3 - 5 Years (Pre-School)</option>
                    <option value="6 - 8 Years">6 - 8 Years (Explorers)</option>
                    <option value="9 - 12 Years">9 - 12 Years (Innovators)</option>
                    <option value="13+ Years">13+ Years (Teens)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Brand Name *</label>
                  <select
                    value={editFormData.brand}
                    onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="LEGO">LEGO</option>
                    <option value="Hot Wheels">Hot Wheels</option>
                    <option value="Barbie">Barbie</option>
                    <option value="Fisher-Price">Fisher-Price</option>
                    <option value="Nerf">Nerf</option>
                    <option value="Melissa & Doug">Melissa & Doug</option>
                    <option value="Play Petal Originals">Play Petal Originals</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">MRP Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editFormData.basePrice}
                    onChange={(e) => setEditFormData({ ...editFormData, basePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={editFormData.salePrice}
                    onChange={(e) => setEditFormData({ ...editFormData, salePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Stock Units *</label>
                  <input
                    type="number"
                    required
                    value={editFormData.stock}
                    onChange={(e) => setEditFormData({ ...editFormData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Photo Uploader for Edit Modal */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-amber-600" />
                    <span>Product Photo *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditUseUrlInput(!editUseUrlInput)}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-bold underline flex items-center gap-1"
                  >
                    <LinkIcon size={12} />
                    {editUseUrlInput ? 'Switch to File Upload' : 'Enter Image URL Instead'}
                  </button>
                </div>

                {!editUseUrlInput ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {editFormData.image ? (
                        <img src={editFormData.image} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                          <ImageIcon size={24} />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">
                          {editImageFileName || 'Product Photo'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Click browse to replace current image
                        </div>
                      </div>
                    </div>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processEditImageFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                    >
                      Browse Photo
                    </button>
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="https://example.com/toy-photo.jpg"
                    value={editFormData.image}
                    onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Short Summary</label>
                <input
                  type="text"
                  value={editFormData.shortDescription}
                  onChange={(e) => setEditFormData({ ...editFormData, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800">Customer Badges &amp; Tags</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isBestSeller}
                      onChange={(e) => setEditFormData({ ...editFormData, isBestSeller: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>🔥 Best Seller</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isNewArrival}
                      onChange={(e) => setEditFormData({ ...editFormData, isNewArrival: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>✨ New Arrival</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProduct}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {updatingProduct ? 'Saving...' : 'Save Product Changes ✏️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
