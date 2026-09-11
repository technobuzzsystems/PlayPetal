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
  Eye,
  FileText,
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
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);

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
    additionalImages: [] as string[],
    shortDescription: '',
    description: '',
  });

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    const existingImages = Array.isArray(p.images) ? p.images.map((img: any) => (typeof img === 'string' ? img : img.url)) : [];
    const mainImg = p.image || existingImages[0] || '';
    const addImgs = existingImages.length > 1 ? existingImages.slice(1) : (p.additionalImages || []);

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
      image: mainImg,
      additionalImages: addImgs,
      shortDescription: p.shortDescription || '',
      description: p.description || '',
    });
    setEditImageFileName(mainImg ? 'Current Product Image' : '');
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
      setEditFormData((prev) => {
        if (!prev.image) {
          return { ...prev, image: dataUrl };
        } else {
          return { ...prev, additionalImages: [...(prev.additionalImages || []), dataUrl] };
        }
      });
      setEditImageFileName(file.name);
      setEditImageFileSize(formattedSize);
      showToast(`Photo angle "${file.name}" added to edit list! 📸`, 'success');
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
    const allUrls = [editFormData.image, ...(editFormData.additionalImages || [])].filter(Boolean);
    const imagesList = allUrls.map((url, idx) => ({ id: String(idx + 1), url, alt: `Angle ${idx + 1}` }));

    const updatedData = {
      ...editFormData,
      basePrice: Number(editFormData.basePrice),
      salePrice: editFormData.salePrice ? Number(editFormData.salePrice) : null,
      price: editFormData.salePrice ? Number(editFormData.salePrice) : Number(editFormData.basePrice),
      stock: Number(editFormData.stock),
      isBestSeller: Boolean(editFormData.isBestSeller),
      isNewArrival: Boolean(editFormData.isNewArrival),
      image: allUrls[0] || editFormData.image,
      images: imagesList,
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

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${currentVendorId}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => {});

      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => {});

      setVendorOrders((prev) =>
        prev.map((ord) => (ord.id === orderId || ord.orderNumber === orderId ? { ...ord, status: newStatus } : ord))
      );

      if (newStatus === 'Accepted' || newStatus === 'Processing') {
        showToast(`Order "${orderId}" Accepted! 🟢 Customer order is now in progress.`, 'success');
      } else if (newStatus === 'Rejected') {
        showToast(`Order "${orderId}" Rejected! 🔴 Customer order has been rejected.`, 'error');
      } else {
        showToast(`Order "${orderId}" status updated to ${newStatus}.`, 'info');
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      setVendorOrders((prev) =>
        prev.map((ord) => (ord.id === orderId || ord.orderNumber === orderId ? { ...ord, status: newStatus } : ord))
      );
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
    additionalImages: [] as string[],
    shortDescription: '',
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchVendorData = async () => {
    setLoading(true);
    try {
      const [prodsRes, ordersRes, reviewsRes, vendorReviewsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${currentVendorId}/products`),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${currentVendorId}/orders`),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reviews`),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${currentVendorId}/reviews`).catch(() => null),
      ]);

      let prodsList: any[] = [];
      if (prodsRes.ok) {
        prodsList = await prodsRes.json();
        setVendorProducts(prodsList);
      } else if (adminProducts && adminProducts.length > 0) {
        const filtered = adminProducts.filter((p: any) => p.vendorId === currentVendorId || !p.vendorId);
        prodsList = filtered.length > 0 ? filtered : adminProducts;
        setVendorProducts(prodsList);
      }

      if (ordersRes.ok) {
        const ords = await ordersRes.json();
        setVendorOrders(ords);
      }

      // Populate Vendor Product Reviews
      let fetchedReviews: any[] = [];
      if (vendorReviewsRes && vendorReviewsRes.ok) {
        fetchedReviews = await vendorReviewsRes.json();
      }
      
      if (!Array.isArray(fetchedReviews) || fetchedReviews.length === 0) {
        if (reviewsRes.ok) {
          const allRevs = await reviewsRes.json();
          if (Array.isArray(allRevs)) {
            const prodIds = new Set(prodsList.map((p: any) => String(p.id)));
            fetchedReviews = allRevs.filter((r: any) =>
              String(r.vendorId) === String(currentVendorId) || prodIds.has(String(r.productId))
            );
          }
        }
      }
      setVendorReviews(Array.isArray(fetchedReviews) ? fetchedReviews : []);
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
      setFormData((prev) => {
        if (!prev.image) {
          return { ...prev, image: dataUrl, additionalImages: prev.additionalImages || [] };
        } else {
          return { ...prev, additionalImages: [...(prev.additionalImages || []), dataUrl] };
        }
      });
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
      Array.from(e.dataTransfer.files).forEach((file) => processImageFile(file));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => processImageFile(file));
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => {
      if (prev.additionalImages && prev.additionalImages.length > 0) {
        const [nextMain, ...rest] = prev.additionalImages;
        return { ...prev, image: nextMain, additionalImages: rest };
      }
      return { ...prev, image: '', additionalImages: [] };
    });
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
    const allUrls = [formData.image, ...(formData.additionalImages || [])].filter(Boolean);
    const imagesList = allUrls.map((url, idx) => ({ id: String(idx + 1), url, alt: `Angle ${idx + 1}` }));

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
          image: allUrls[0] || formData.image,
          images: imagesList,
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
          additionalImages: [],
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
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'products'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Package size={14} /> My Products ({vendorProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('add')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'add'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
          }`}
        >
          <PackagePlus size={14} /> + Add New Toy Product
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShoppingBag size={14} /> My Orders &amp; Customers ({vendorOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Store size={14} /> Shop Profile
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
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

            {/* DRAG & DROP MULTI-PHOTO ANGLE UPLOADER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-rose-500" />
                  <span>Product Photos &amp; Multiple Angles (Front, Back, Side, Packaging) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseUrlInput(!useUrlInput)}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline flex items-center gap-1 cursor-pointer"
                >
                  <LinkIcon size={12} />
                  {useUrlInput ? 'Switch to Drag & Drop Upload' : 'Enter Web Image URL Instead'}
                </button>
              </div>

              {!useUrlInput ? (
                <div className="space-y-3">
                  <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        Array.from(e.dataTransfer.files).forEach((file) => processImageFile(file));
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
                      isDragging
                        ? 'border-rose-500 bg-rose-50 scale-[1.01]'
                        : formData.image
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          Array.from(e.target.files).forEach((file) => processImageFile(file));
                        }
                      }}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center gap-2 py-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-rose-500 shadow-xs">
                        <UploadCloud size={24} />
                      </div>
                      <div className="font-black text-xs text-slate-800">
                        Drag &amp; drop multiple photo angles here, or <span className="text-rose-600 underline">browse files</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Upload front view, back view, side angles, or box package images (select multiple files)
                      </div>
                    </div>
                  </div>

                  {/* Multi-Photo Angles Thumbnails Display */}
                  {formData.image && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Uploaded Product Photo Angles ({1 + (formData.additionalImages?.length || 0)} photos):</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) fileInputRef.current.click();
                          }}
                          className="text-[11px] font-black text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <PackagePlus size={13} /> + Add Another Angle Photo
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {/* Primary Angle Photo */}
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xs bg-white group">
                          <img src={formData.image} alt="Angle 1" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[9px] font-black text-center py-0.5 uppercase tracking-wider">
                            Main Angle
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow opacity-90 hover:opacity-100 cursor-pointer"
                            title="Remove main photo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Additional Angles */}
                        {formData.additionalImages?.map((url, idx) => (
                          <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-300 shadow-xs bg-white group">
                            <img src={url} alt={`Angle ${idx + 2}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-slate-800/80 text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-wider">
                              Angle #{idx + 2}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  additionalImages: prev.additionalImages.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow opacity-90 hover:opacity-100 cursor-pointer"
                              title="Remove this angle"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder="Main photo URL: https://example.com/toy-front.jpg"
                    value={formData.image}
                    onChange={(e) => {
                      setFormData({ ...formData, image: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />

                  {/* Add Extra Angle URL */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="url"
                      id="extraAngleUrlInput"
                      placeholder="Add another angle URL: https://example.com/toy-back.jpg"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('extraAngleUrlInput') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          setFormData((prev) => ({
                            ...prev,
                            additionalImages: [...(prev.additionalImages || []), input.value.trim()],
                          }));
                          showToast('Added additional angle URL! 📷', 'success');
                          input.value = '';
                        }
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      + Add Angle
                    </button>
                  </div>

                  {formData.additionalImages && formData.additionalImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {formData.additionalImages.map((u, i) => (
                        <div key={i} className="flex items-center gap-1 text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          <span className="truncate max-w-[160px]">Angle #{i + 2}: {u}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                additionalImages: prev.additionalImages.filter((_, idx) => idx !== i),
                              }));
                            }}
                            className="text-rose-600 hover:text-rose-800 font-bold ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{ord.orderNumber}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderDetails(ord)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye size={12} /> View Customer &amp; Product Info
                        </button>
                      </div>
                      <div className="text-xs text-slate-400">Date: {new Date(ord.createdAt || Date.now()).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-slate-900">Your Earnings: ₹{ord.totalAmount}</div>
                      <div className="text-xs font-bold text-emerald-600">{ord.status}</div>
                    </div>
                  </div>

                  {/* Customer Information Card (Clickable) */}
                  <div
                    onClick={() => setSelectedOrderDetails(ord)}
                    className="p-3.5 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs cursor-pointer transition-all group"
                    title="Click to view full customer delivery details"
                  >
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
                      <span className="text-indigo-600 font-black text-[11px] underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <Eye size={12} /> View Details
                      </span>
                    </div>
                  </div>

                  {/* Items list (Clickable product rows) */}
                  <div className="space-y-2">
                    {ord.items.map((it: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => setSelectedOrderDetails(ord)}
                        className="flex items-center justify-between text-xs bg-slate-50 hover:bg-indigo-50/60 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group"
                        title="Click to view product information and customer address"
                      >
                        <div className="flex items-center gap-3">
                          <img src={it.image} alt="" className="w-11 h-11 object-cover rounded-lg bg-white border border-slate-200 group-hover:scale-105 transition-transform" />
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors flex items-center gap-1.5">
                              <span>{it.name}</span>
                              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100/80 px-2 py-0.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity">
                                👁️ View Info
                              </span>
                            </div>
                            <div className="text-slate-400 text-[10px]">Quantity: {it.quantity} unit(s)</div>
                          </div>
                        </div>
                        <div className="font-black text-slate-900 text-sm">₹{it.price * it.quantity}</div>
                      </div>
                    ))}
                  </div>

                  {/* Shopkeeper Accept / Reject & Status Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 p-3.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Order Decision:</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(ord.id || ord.orderNumber, 'Accepted')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          ord.status === 'Accepted' || ord.status === 'Processing'
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 size={14} /> Accept Order 🟢
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(ord.id || ord.orderNumber, 'Rejected')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          ord.status === 'Rejected'
                            ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/40'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300'
                        }`}
                      >
                        <XCircle size={14} /> Reject Order 🔴
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Update Status:</span>
                      <select
                        value={ord.status || 'Pending'}
                        onChange={(e) => handleUpdateOrderStatus(ord.id || ord.orderNumber, e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="Pending">Pending Review</option>
                        <option value="Accepted">Accepted 🟢</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped 🚚</option>
                        <option value="Delivered">Delivered 🎉</option>
                        <option value="Rejected">Rejected 🔴</option>
                      </select>
                    </div>
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
                {vendorReviews.map((r) => {
                  const matchingProd = vendorProducts.find((p) => String(p.id) === String(r.productId));
                  const prodImage = r.productImage || matchingProd?.image || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200&q=80';
                  const prodTitle = r.productName || matchingProd?.name || 'Toy Product';

                  return (
                    <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-start">
                      <img src={prodImage} alt={prodTitle} className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{prodTitle}</h4>
                          <span className="text-xs text-slate-400 font-medium">{r.date || 'Recent'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400 my-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={13} className={i < Number(r.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                          ))}
                          <span className="text-xs font-black text-slate-700 ml-1.5">{r.rating || 5}.0</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 italic leading-relaxed">
                          "{r.comment || 'Great product!'}"
                        </p>
                        <div className="text-xs text-slate-500 font-medium pt-1">
                          Reviewer: <span className="font-bold text-slate-800">{r.customerName || 'Verified Customer'}</span>
                          {r.customerEmail && <span className="text-slate-400 ml-1">({r.customerEmail})</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

              {/* Multi-Photo Uploader for Edit Modal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-amber-600" />
                    <span>Product Photos &amp; Multiple Angles *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditUseUrlInput(!editUseUrlInput)}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <LinkIcon size={12} />
                    {editUseUrlInput ? 'Switch to File Upload' : 'Enter Image URL Instead'}
                  </button>
                </div>

                {!editUseUrlInput ? (
                  <div className="space-y-3">
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
                            {editImageFileName || 'Product Photo Gallery'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Select photos to append additional angles to this toy catalog item
                          </div>
                        </div>
                      </div>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            Array.from(e.target.files).forEach((file) => processEditImageFile(file));
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                      >
                        + Add Photo Angle
                      </button>
                    </div>

                    {/* Edit Modal Thumbnails */}
                    {editFormData.image && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="text-xs font-bold text-slate-700">
                          Product Angle Photos ({1 + (editFormData.additionalImages?.length || 0)} photos):
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Main image */}
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xs bg-white">
                            <img src={editFormData.image} alt="Main Angle" className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[8px] font-black text-center py-0.5 uppercase">
                              Main
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditFormData((prev) => {
                                  if (prev.additionalImages && prev.additionalImages.length > 0) {
                                    const [nextMain, ...rest] = prev.additionalImages;
                                    return { ...prev, image: nextMain, additionalImages: rest };
                                  }
                                  return { ...prev, image: '', additionalImages: [] };
                                });
                              }}
                              className="absolute top-1 right-1 bg-rose-600 text-white p-0.5 rounded-full shadow hover:opacity-100 opacity-90 cursor-pointer"
                              title="Remove main photo"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>

                          {/* Additional angles */}
                          {editFormData.additionalImages?.map((url, idx) => (
                            <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-300 shadow-xs bg-white">
                              <img src={url} alt={`Angle ${idx + 2}`} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-slate-800/80 text-white text-[8px] font-bold text-center py-0.5 uppercase">
                                Angle #{idx + 2}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    additionalImages: prev.additionalImages.filter((_, i) => i !== idx),
                                  }));
                                }}
                                className="absolute top-1 right-1 bg-rose-600 text-white p-0.5 rounded-full shadow hover:opacity-100 opacity-90 cursor-pointer"
                                title="Remove angle photo"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://example.com/toy-photo.jpg"
                      value={editFormData.image}
                      onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        id="editExtraAngleUrl"
                        placeholder="Add extra angle URL: https://example.com/toy-side.jpg"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('editExtraAngleUrl') as HTMLInputElement;
                          if (el && el.value.trim()) {
                            setEditFormData((prev) => ({
                              ...prev,
                              additionalImages: [...(prev.additionalImages || []), el.value.trim()],
                            }));
                            showToast('Added additional photo URL!', 'success');
                            el.value = '';
                          }
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        + Add Angle
                      </button>
                    </div>
                  </div>
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

      {/* Customer & Product Information Modal for Shopkeeper */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 my-auto animate-in zoom-in-95 duration-150 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Order Details #{selectedOrderDetails.orderNumber || selectedOrderDetails.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Placed on {new Date(selectedOrderDetails.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Customer Information Card */}
            <div className="bg-amber-50/80 border border-amber-200 p-4.5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wider">
                <User size={16} className="text-amber-600" />
                <span>Customer Contact &amp; Delivery Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Name</span>
                  <span className="font-black text-slate-900 text-sm">{selectedOrderDetails.customerName}</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                  <span className="font-bold text-slate-800">{selectedOrderDetails.customerEmail || 'N/A'}</span>
                </div>

                {selectedOrderDetails.shippingAddress?.phone && (
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                      <Phone size={13} className="text-amber-600" />
                      {selectedOrderDetails.shippingAddress.phone}
                    </span>
                  </div>
                )}

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Address</span>
                  <div className="font-semibold text-slate-800 mt-0.5 leading-snug">
                    {selectedOrderDetails.shippingAddress?.street && <div>{selectedOrderDetails.shippingAddress.street}</div>}
                    <div>
                      {selectedOrderDetails.shippingAddress?.city || 'Mumbai'}, {selectedOrderDetails.shippingAddress?.state || 'Maharashtra'} {selectedOrderDetails.shippingAddress?.zipCode || selectedOrderDetails.shippingAddress?.pincode || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchased Product Details */}
            <div className="space-y-3">
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={15} className="text-rose-500" />
                <span>Ordered Toy Products ({selectedOrderDetails.items?.length || 0})</span>
              </div>

              <div className="space-y-3">
                {selectedOrderDetails.items?.map((item: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.name}</h4>
                        <div className="text-xs text-slate-500 font-semibold mt-0.5">
                          Unit Price: <span className="font-bold text-slate-800">₹{item.price}</span> • Quantity: <span className="font-bold text-indigo-600">{item.quantity} unit(s)</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                      <div className="text-xs text-slate-400 font-medium">Subtotal Earnings</div>
                      <div className="text-base font-black text-slate-900">₹{item.price * item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Earnings & Order Status Bar */}
            <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Order Earnings</div>
                <div className="text-xl font-black text-slate-900">₹{selectedOrderDetails.totalAmount}</div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Current Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  selectedOrderDetails.status === 'Accepted' || selectedOrderDetails.status === 'Delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedOrderDetails.status === 'Rejected'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedOrderDetails.status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Quick Accept/Reject & Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 p-4 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Action:</span>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrderDetails.id || selectedOrderDetails.orderNumber, 'Accepted');
                    setSelectedOrderDetails((prev: any) => prev ? { ...prev, status: 'Accepted' } : null);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedOrderDetails.status === 'Accepted' || selectedOrderDetails.status === 'Processing'
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                  }`}
                >
                  <CheckCircle2 size={14} /> Accept Order 🟢
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrderDetails.id || selectedOrderDetails.orderNumber, 'Rejected');
                    setSelectedOrderDetails((prev: any) => prev ? { ...prev, status: 'Rejected' } : null);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedOrderDetails.status === 'Rejected'
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/40'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300'
                  }`}
                >
                  <XCircle size={14} /> Reject Order 🔴
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
