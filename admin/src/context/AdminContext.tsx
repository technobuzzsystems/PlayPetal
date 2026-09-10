import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Product,
  Category,
  Attribute,
  InventoryItem,
  Order,
  OrderStatus,
  PaymentStatus,
  Customer,
  Banner,
  Collection,
  Coupon,
  CMSSection,
  MediaItem,
  Review,
  StoreSettings,
  StockHistoryEntry,
  NotificationItem,
} from '../types';

import { initialProducts } from '../data/products';
import { initialCategories } from '../data/categories';
import { initialAttributes } from '../data/attributes';
import { sampleStockHistory } from '../data/inventory';
import { initialOrders } from '../data/orders';
import { initialCustomers } from '../data/customers';
import { initialBanners, initialCollections, initialCoupons } from '../data/marketing';
import { initialCMSSections } from '../data/cms';
import { initialMedia } from '../data/media';

import { initialSettings } from '../data/settings';
import { initialNotifications } from '../data/notifications';

interface AdminContextType {
  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'salesCount'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Categories
  categories: Category[];
  addCategory: (category: Omit<Category, 'id' | 'itemCount'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Attributes
  attributes: Attribute[];
  addAttribute: (name: string, initialValues: string[]) => void;
  addAttributeValue: (attributeId: string, value: string) => void;
  removeAttributeValue: (attributeId: string, value: string) => void;
  deleteAttribute: (id: string) => void;

  // Inventory
  inventory: InventoryItem[];
  stockHistory: Record<string, StockHistoryEntry[]>;
  adjustStock: (inventoryId: string, newStock: number, reason: string) => void;
  refreshProducts: () => Promise<void>;

  // Orders
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderPayment: (orderId: string, paymentStatus: PaymentStatus) => void;

  // Customers
  customers: Customer[];
  toggleCustomerStatus: (customerId: string) => void;

  // Marketing
  banners: Banner[];
  addBanner: (banner: Omit<Banner, 'id'>) => void;
  updateBanner: (id: string, banner: Partial<Banner>) => void;
  deleteBanner: (id: string) => void;

  collections: Collection[];
  addCollection: (col: Omit<Collection, 'id'>) => void;
  updateCollection: (id: string, updated: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  toggleCollectionStatus: (id: string) => void;
  addProductToCollection: (collectionId: string, productId: string) => void;
  removeProductFromCollection: (collectionId: string, productId: string) => void;

  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id' | 'usageCount'>) => void;
  deleteCoupon: (id: string) => void;

  // CMS
  cmsSections: CMSSection[];
  toggleCMSSection: (id: string) => void;
  moveCMSSection: (id: string, direction: 'up' | 'down') => void;

  // Media
  mediaItems: MediaItem[];
  addMediaItem: (item: Omit<MediaItem, 'id' | 'uploadedDate'>) => void;
  deleteMediaItem: (id: string) => void;

  // Reviews
  reviews: Review[];
  updateReviewStatus: (id: string, status: Review['status']) => void;
  deleteReview: (id: string) => void;

  // Settings
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;

  // Notifications
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // UI state
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [attributes, setAttributes] = useState<Attribute[]>(initialAttributes);
  const [stockHistory, setStockHistory] = useState<Record<string, StockHistoryEntry[]>>(() => {
    try {
      const saved = localStorage.getItem('toyjoy_admin_stock_history');
      return saved ? JSON.parse(saved) : sampleStockHistory;
    } catch {
      return sampleStockHistory;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('toyjoy_admin_stock_history', JSON.stringify(stockHistory));
    } catch {
      // ignore
    }
  }, [stockHistory]);

  // Derived Inventory directly from live catalog products
  const inventory: InventoryItem[] = React.useMemo(() => {
    const items: InventoryItem[] = [];
    for (const prod of products) {
      if (prod.variants && prod.variants.length > 0) {
        prod.variants.forEach((v: any, idx: number) => {
          const vStock = Number(v.stock !== undefined && v.stock !== null ? v.stock : prod.stock);
          items.push({
            id: `inv-${prod.id}-${v.id || v.sku || idx}`,
            productId: prod.id,
            productName: prod.name,
            sku: v.sku || `${prod.sku}-${idx + 1}`,
            variant: v.color || v.size || v.name || 'Standard',
            currentStock: vStock,
            minThreshold: 10,
            status: vStock > 10 ? 'In Stock' : vStock > 0 ? 'Low Stock' : 'Out of Stock',
            lastRestocked: prod.createdAt || 'Recent',
            image: prod.image,
            price: Number(v.price || prod.salePrice || prod.price || 0),
          });
        });
      } else {
        const stock = Number(prod.stock ?? 0);
        items.push({
          id: `inv-${prod.id}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku || `SKU-${prod.id}`,
          variant: 'Standard',
          currentStock: stock,
          minThreshold: 10,
          status: stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock',
          lastRestocked: prod.createdAt || 'Recent',
          image: prod.image,
          price: Number(prod.salePrice || prod.price || 0),
        });
      }
    }
    return items;
  }, [products]);

  const refreshProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products?allStatus=true');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const backendMapped: Product[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          slug: item.slug || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : item.id),
          sku: item.sku || `SKU-${item.id}`,
          category: typeof item.category === 'string' ? item.category : (item.category?.name || 'Toys'),
          subCategory: item.subCategory || '',
          price: Number(item.basePrice || item.price || 999),
          salePrice: item.salePrice ? Number(item.salePrice) : undefined,
          discount: Number(item.discount || 0),
          stock: item.stock !== undefined && item.stock !== null ? Number(item.stock) : 20,
          status: item.status === 'APPROVED' || item.status === 'Active' ? 'Active' : (item.status === 'PENDING' ? 'Draft' : 'Active'),
          featured: Boolean(item.isFeatured || item.featured),
          isBestSeller: Boolean(item.isBestSeller),
          isNewArrival: Boolean(item.isNewArrival),
          image: item.image || item.images?.[0]?.url || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=300&auto=format&fit=crop&q=60',
          galleryImages: Array.isArray(item.images) ? item.images.map((img: any) => typeof img === 'string' ? img : img?.url || '') : [],
          shortDescription: item.shortDescription || '',
          description: item.description || '',
          rating: Number(item.rating || 5.0),
          salesCount: Number(item.salesCount || 0),
          attributes: item.attributes || {},
          variants: item.variants || [],
          createdAt: item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        }));
        setProducts(backendMapped);
      }
    } catch (err) {
      console.warn('Failed to refresh products from backend API:', err);
    }
  };
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [cmsSections, setCMSSections] = useState<CMSSection[]>(initialCMSSections);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialMedia);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  // Fetch orders and customers
  React.useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    // Fetch orders
    fetch(`${API_BASE}/orders`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data.map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            customer: { name: o.customerName || 'Customer', email: o.customerEmail || '', phone: o.customerPhone || '' },
            items: o.items || [],
            subtotal: o.totalAmount,
            tax: 0,
            shippingTotal: 0,
            total: o.totalAmount,
            status: o.status || 'pending',
            paymentStatus: o.paymentStatus || 'pending',
            paymentMethod: o.paymentMethod || 'card',
            shippingAddress: {
              street: o.shippingAddress || '',
              city: '', state: '', zipCode: '', country: ''
            },
            billingAddress: {
              street: o.shippingAddress || '',
              city: '', state: '', zipCode: '', country: ''
            },
            createdAt: o.date || new Date().toISOString()
          })));
        }
      }).catch(err => console.error(err));

    // Fetch customers
    fetch(`${API_BASE}/customers`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCustomers(data.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone || '',
            avatar: '',
            status: 'active',
            totalOrders: c.totalOrders || 0,
            totalSpent: c.totalSpent || 0,
            lastOrderDate: '',
            createdAt: c.createdAt || new Date().toISOString(),
            addresses: []
          })));
        }
      }).catch(err => console.error(err));
  }, []);


  // Fetch real data from backend
  React.useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    // Fetch products
    fetch(`${API_BASE}/products?allStatus=true`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      }).catch(err => console.error(err));

    // Fetch orders
    fetch(`${API_BASE}/orders`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data.map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            customer: { name: o.customerName || 'Customer', email: o.customerEmail || '', phone: o.customerPhone || '' },
            items: o.items || [],
            subtotal: o.totalAmount,
            tax: 0,
            shippingTotal: 0,
            total: o.totalAmount,
            status: o.status || 'pending',
            paymentStatus: o.paymentStatus || 'pending',
            paymentMethod: o.paymentMethod || 'card',
            shippingAddress: {
              street: o.shippingAddress || '',
              city: '', state: '', zipCode: '', country: ''
            },
            billingAddress: {
              street: o.shippingAddress || '',
              city: '', state: '', zipCode: '', country: ''
            },
            createdAt: o.date || new Date().toISOString()
          })));
        }
      }).catch(err => console.error(err));

    // Fetch customers
    fetch(`${API_BASE}/customers`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCustomers(data.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone || '',
            avatar: '',
            status: 'active',
            totalOrders: c.totalOrders || 0,
            totalSpent: c.totalSpent || 0,
            lastOrderDate: '',
            createdAt: c.createdAt || new Date().toISOString(),
            addresses: []
          })));
        }
      }).catch(err => console.error(err));
  }, []);


  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const unreadNotificationsCount = notifications.filter((n) => n.unread).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };


  // Load initial products and categories from backend API
  useEffect(() => {
    refreshProducts();

    fetch('http://localhost:5000/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: Category[] = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            slug: item.slug || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : item.id),
            description: item.description || '',
            parentId: item.parentId || null,
            status: item.status === 'Inactive' || item.isActive === false ? 'Inactive' : 'Active',
            featured: Boolean(item.featured || item.isFeatured),
            sortOrder: Number(item.sortOrder || 1),
            image: item.image || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200&h=200&fit=crop',
            itemCount: Number(item.itemCount ?? 0),
            children: Array.isArray(item.children) ? item.children.map((ch: any) => ({
              id: ch.id,
              name: ch.name,
              slug: ch.slug || ch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              description: ch.description || '',
              parentId: item.id,
              status: ch.status === 'Inactive' ? 'Inactive' : 'Active',
              featured: Boolean(ch.featured),
              sortOrder: Number(ch.sortOrder || 1),
              image: ch.image || item.image,
              itemCount: Number(ch.itemCount ?? 0),
            })) : undefined,
          }));
          setCategories(mapped);
        }
      })
      .catch((err) => {
        console.warn('Failed to load categories from backend API:', err);
      });
  }, []);

  // Products CRUD
  const addProduct = (prodData: Omit<Product, 'id' | 'createdAt' | 'salesCount'>) => {
    const tempId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...prodData,
      id: tempId,
      createdAt: new Date().toISOString().split('T')[0],
      salesCount: 0,
    };
    setProducts((prev) => [newProduct, ...prev]);

    // Persist to backend database
    fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tempId,
        name: newProduct.name,
        slug: newProduct.slug,
        sku: newProduct.sku,
        category: newProduct.category,
        subCategory: newProduct.subCategory,
        basePrice: newProduct.price,
        salePrice: newProduct.salePrice || newProduct.price,
        price: newProduct.salePrice || newProduct.price,
        discount: newProduct.discount,
        stock: newProduct.stock,
        status: newProduct.status === 'Active' ? 'APPROVED' : newProduct.status,
        isActive: newProduct.status === 'Active',
        isFeatured: Boolean(newProduct.featured),
        isBestSeller: Boolean(newProduct.isBestSeller),
        isNewArrival: Boolean(newProduct.isNewArrival),
        image: newProduct.image,
        images: (newProduct.galleryImages && newProduct.galleryImages.length > 0)
          ? newProduct.galleryImages.map((url) => ({ url }))
          : [{ url: newProduct.image }],
        shortDescription: newProduct.shortDescription,
        description: newProduct.description,
        attributes: newProduct.attributes,
        variants: newProduct.variants,
      }),
    })
      .then((res) => res.json())
      .then((saved) => {
        if (saved && saved.id) {
          setProducts((prev) =>
            prev.map((p) => (p.id === tempId ? { ...p, id: saved.id } : p))
          );
        }
      })
      .catch((err) => console.error('Failed to persist product to backend:', err));
  };

  const updateProduct = async (id: string, updated: Partial<Product>) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      setProducts((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
      );
    } catch (err) {
      console.error('Failed to update product', err);
    }
  };
    if (updated.isActive !== undefined) backendUpdates.isActive = updated.isActive;
    if (updated.price !== undefined) backendUpdates.basePrice = updated.price;
    if (updated.salePrice !== undefined) backendUpdates.salePrice = updated.salePrice;
    if (updated.stock !== undefined) backendUpdates.stock = updated.stock;
    if (updated.status !== undefined) {
      backendUpdates.status = updated.status === 'Active' ? 'APPROVED' : updated.status;
      backendUpdates.isActive = updated.status === 'Active';
    }
    if (updated.featured !== undefined) backendUpdates.isFeatured = updated.featured;
    if (updated.isBestSeller !== undefined) {
      backendUpdates.isBestSeller = Boolean(updated.isBestSeller);
      if (updated.isBestSeller) {
        backendUpdates.status = 'APPROVED';
        backendUpdates.isActive = true;
      }
    }
    if (updated.isNewArrival !== undefined) {
      backendUpdates.isNewArrival = Boolean(updated.isNewArrival);
      if (updated.isNewArrival) {
        backendUpdates.status = 'APPROVED';
        backendUpdates.isActive = true;
      }
    }
    if (updated.galleryImages) {
      backendUpdates.images = updated.galleryImages.map((url) => ({ url }));
    }

    fetch(`http://localhost:5000/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendUpdates),
    }).catch((err) => console.error('Failed to update product in backend:', err));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));

    fetch(`http://localhost:5000/api/products/${id}`, {
      method: 'DELETE',
    }).catch((err) => console.error('Failed to delete product from backend:', err));
  };

  // Categories CRUD
  const addCategory = (catData: Omit<Category, 'id' | 'itemCount'>) => {
    const tempId = `cat-${Date.now()}`;
    const newCat: Category = {
      ...catData,
      id: tempId,
      itemCount: 0,
    };

    if (newCat.parentId) {
      // Add as child
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id === newCat.parentId) {
            return {
              ...cat,
              children: [...(cat.children || []), newCat],
            };
          }
          return cat;
        })
      );
    } else {
      setCategories((prev) => [...prev, newCat]);
    }

    // Persist to backend database
    fetch('http://localhost:5000/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tempId,
        name: newCat.name,
        slug: newCat.slug,
        description: newCat.description,
        parentId: newCat.parentId,
        status: newCat.status,
        featured: Boolean(newCat.featured),
        image: newCat.image,
      }),
    })
      .then((res) => res.json())
      .then((saved) => {
        if (saved && saved.id) {
          const updateIdRecursive = (cats: Category[]): Category[] => {
            return cats.map((c) => {
              if (c.id === tempId) return { ...c, id: saved.id };
              if (c.children) return { ...c, children: updateIdRecursive(c.children) };
              return c;
            });
          };
          setCategories((prev) => updateIdRecursive(prev));
        }
      })
      .catch((err) => console.error('Failed to persist category to backend:', err));
  };

  const updateCategory = (id: string, updated: Partial<Category>) => {
    const updateRecursive = (cats: Category[]): Category[] => {
      return cats.map((cat) => {
        if (cat.id === id) {
          return { ...cat, ...updated };
        }
        if (cat.children && cat.children.length > 0) {
          return { ...cat, children: updateRecursive(cat.children) };
        }
        return cat;
      });
    };
    setCategories((prev) => updateRecursive(prev));

    fetch(`http://localhost:5000/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch((err) => console.error('Failed to update category in backend:', err));
  };

  const deleteCategory = (id: string) => {
    const deleteRecursive = (cats: Category[]): Category[] => {
      return cats
        .filter((cat) => cat.id !== id)
        .map((cat) => ({
          ...cat,
          children: cat.children ? deleteRecursive(cat.children) : undefined,
        }));
    };
    setCategories((prev) => deleteRecursive(prev));

    fetch(`http://localhost:5000/api/categories/${id}`, {
      method: 'DELETE',
    }).catch((err) => console.error('Failed to delete category in backend:', err));
  };

  // Attributes CRUD
  const addAttribute = (name: string, initialValues: string[]) => {
    const newAttr: Attribute = {
      id: `attr-${Date.now()}`,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      values: initialValues,
    };
    setAttributes((prev) => [...prev, newAttr]);
  };

  const addAttributeValue = (attributeId: string, value: string) => {
    setAttributes((prev) =>
      prev.map((attr) =>
        attr.id === attributeId && !attr.values.includes(value)
          ? { ...attr, values: [...attr.values, value] }
          : attr
      )
    );
  };

  const removeAttributeValue = (attributeId: string, value: string) => {
    setAttributes((prev) =>
      prev.map((attr) =>
        attr.id === attributeId
          ? { ...attr, values: attr.values.filter((v) => v !== value) }
          : attr
      )
    );
  };

  const deleteAttribute = (id: string) => {
    setAttributes((prev) => prev.filter((attr) => attr.id !== id));
  };

  // Inventory adjustment
  const adjustStock = (inventoryId: string, newStock: number, reason: string) => {
    const targetItem = inventory.find((i) => i.id === inventoryId);
    if (!targetItem) return;

    const safeStock = Math.max(0, Math.floor(newStock));
    const diff = safeStock - targetItem.currentStock;
    const historyEntry: StockHistoryEntry = {
      id: `h-${Date.now()}`,
      date: new Date().toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      adjustment: diff,
      reason,
      adjustedBy: 'Store Admin',
      newStock: safeStock,
    };

    setStockHistory((prev) => ({
      ...prev,
      [inventoryId]: [historyEntry, ...(prev[inventoryId] || [])],
    }));

    // Sync product stock in local state
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== targetItem.productId) return prod;
        let updatedVariants = prod.variants;
        if (prod.variants && prod.variants.length > 0) {
          updatedVariants = prod.variants.map((v: any, idx: number) => {
            const vId = `inv-${prod.id}-${v.id || v.sku || idx}`;
            if (vId === inventoryId) {
              return { ...v, stock: safeStock };
            }
            return v;
          });
        }
        return {
          ...prod,
          stock: safeStock,
          variants: updatedVariants,
          status: safeStock === 0 ? 'Out of Stock' : (prod.status === 'Out of Stock' ? 'Active' : prod.status),
        };
      })
    );

    // Persist stock adjustment to backend database
    fetch(`http://localhost:5000/api/products/${targetItem.productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: safeStock }),
    }).catch((err) => console.error('Failed to persist stock adjustment to backend:', err));
  };

  // Orders
  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const newTimelineItem = {
            status,
            timestamp: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            description: `Status updated to ${status} by Admin`,
          };
          return {
            ...ord,
            status,
            timeline: [...ord.timeline, newTimelineItem],
          };
        }
        return ord;
      })
    );
  };

  const updateOrderPayment = (orderId: string, paymentStatus: PaymentStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, paymentStatus } : ord))
    );
  };

  // Customers
  const toggleCustomerStatus = (customerId: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' }
          : c
      )
    );
  };

  // Marketing
  const addBanner = (bData: Omit<Banner, 'id'>) => {
    const newBanner: Banner = { ...bData, id: `ban-${Date.now()}` };
    setBanners((prev) => [...prev, newBanner]);
  };

  const updateBanner = (id: string, updated: Partial<Banner>) => {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
  };

  const deleteBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const addCollection = (colData: Omit<Collection, 'id'>) => {
    const newCol: Collection = { ...colData, id: `col-${Date.now()}` };
    setCollections((prev) => [...prev, newCol]);
  };

  const updateCollection = (id: string, updated: Partial<Collection>) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  };

  const deleteCollection = (id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleCollectionStatus = (id: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } : c))
    );
  };

  const addProductToCollection = (collectionId: string, productId: string) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id !== collectionId) return c;
        const currentIds = c.productIds || [];
        if (currentIds.includes(productId)) return c;
        const newIds = [...currentIds, productId];
        return {
          ...c,
          productIds: newIds,
          productCount: newIds.length,
        };
      })
    );
  };

  const removeProductFromCollection = (collectionId: string, productId: string) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id !== collectionId) return c;
        const newIds = (c.productIds || []).filter((pid) => pid !== productId);
        return {
          ...c,
          productIds: newIds,
          productCount: newIds.length,
        };
      })
    );
  };

  const addCoupon = (cData: Omit<Coupon, 'id' | 'usageCount'>) => {
    const newCoupon: Coupon = { ...cData, id: `coup-${Date.now()}`, usageCount: 0 };
    setCoupons((prev) => [newCoupon, ...prev]);
  };

  const deleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  // CMS
  const toggleCMSSection = (id: string) => {
    setCMSSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, enabled: !sec.enabled } : sec))
    );
  };

  const moveCMSSection = (id: string, direction: 'up' | 'down') => {
    setCMSSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;

      return copy.map((sec, i) => ({ ...sec, order: i + 1 }));
    });
  };

  // Media
  const addMediaItem = (itemData: Omit<MediaItem, 'id' | 'uploadedDate'>) => {
    const newItem: MediaItem = {
      ...itemData,
      id: `med-${Date.now()}`,
      uploadedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    };
    setMediaItems((prev) => [newItem, ...prev]);
  };

  const deleteMediaItem = (id: string) => {
    setMediaItems((prev) => prev.filter((m) => m.id !== id));
  };

  // Reviews
  const updateReviewStatus = (id: string, status: Review['status']) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  const deleteReview = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  // Settings
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Dynamically calculate live product count for each category and auto-include real product categories
  const enrichedCategories: Category[] = React.useMemo(() => {
    const countProductForCategory = (cat: Category): number => {
      const directCount = products.filter(
        (p) =>
          (p.category && p.category.trim().toLowerCase() === cat.name.trim().toLowerCase()) ||
          (p as any).categoryId === cat.id
      ).length;
      const childrenCount = (cat.children || []).reduce(
        (sum, child) => sum + countProductForCategory(child),
        0
      );
      return directCount + childrenCount;
    };

    const enrichTree = (cats: Category[]): Category[] => {
      return cats.map((cat) => ({
        ...cat,
        itemCount: countProductForCategory(cat),
        children: cat.children ? enrichTree(cat.children) : undefined,
      }));
    };

    const enriched = enrichTree(categories);

    // Auto-discover any categories used on real products not already in categories tree
    const existingNames = new Set<string>();
    const collectNames = (cats: Category[]) => {
      cats.forEach((c) => {
        existingNames.add(c.name.trim().toLowerCase());
        if (c.children) collectNames(c.children);
      });
    };
    collectNames(categories);

    const extraCategories: Category[] = [];
    products.forEach((p) => {
      const catName = p.category?.trim();
      if (catName && !existingNames.has(catName.toLowerCase())) {
        existingNames.add(catName.toLowerCase());
        const count = products.filter(
          (prod) => prod.category?.trim().toLowerCase() === catName.toLowerCase()
        ).length;
        extraCategories.push({
          id: (p as any).categoryId || `cat-${catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: catName,
          slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: `${catName} collection`,
          parentId: null,
          status: 'Active',
          featured: false,
          sortOrder: 10,
          image: p.image || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200&h=200&fit=crop',
          itemCount: count,
        });
      }
    });

    return [...enriched, ...extraCategories];
  }, [categories, products]);

  return (
    <AdminContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        categories: enrichedCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        attributes,
        addAttribute,
        addAttributeValue,
        removeAttributeValue,
        deleteAttribute,
        inventory,
        stockHistory,
        adjustStock,
        refreshProducts,
        orders,
        updateOrderStatus,
        updateOrderPayment,
        customers,
        toggleCustomerStatus,
        banners,
        addBanner,
        updateBanner,
        deleteBanner,
        collections,
        addCollection,
        updateCollection,
        deleteCollection,
        toggleCollectionStatus,
        addProductToCollection,
        removeProductFromCollection,
        coupons,
        addCoupon,
        deleteCoupon,
        cmsSections,
        toggleCMSSection,
        moveCMSSection,
        mediaItems,
        addMediaItem,
        deleteMediaItem,
        reviews,
        updateReviewStatus,
        deleteReview,
        settings,
        updateSettings,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        dismissNotification,
        clearAllNotifications,
        searchQuery,
        setSearchQuery,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileSidebarOpen,
        setMobileSidebarOpen,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
