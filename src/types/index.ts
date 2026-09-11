export type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

export interface ProductVariant {
  id: string;
  sku: string;
  color?: string;
  size?: string;
  age?: string;
  material?: string;
  price: number;
  stock: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: string;
  subCategory?: string;
  price: number;
  salePrice?: number;
  discount?: number;
  stock: number;
  status: ProductStatus;
  featured: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isActive?: boolean;
  vendorId?: string;
  vendorName?: string;
  brand?: string;
  ageGroup?: string;
  image: string;
  galleryImages: string[];
  shortDescription: string;
  description: string;
  rating: number;
  salesCount: number;
  attributes: Record<string, string[]>;
  variants?: ProductVariant[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  status: 'Active' | 'Inactive';
  featured: boolean;
  sortOrder: number;
  image: string;
  itemCount: number;
  children?: Category[];
}

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  values: string[];
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  variant?: string;
  currentStock: number;
  minThreshold: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastRestocked: string;
  image: string;
  price: number;
}

export interface StockHistoryEntry {
  id: string;
  date: string;
  adjustment: number;
  reason: string;
  adjustedBy: string;
  newStock: number;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  variant?: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. #ORD-1001
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  productSummary: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  date: string;
  timeline: {
    status: OrderStatus;
    timestamp: string;
    description: string;
  }[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  totalOrders: number;
  totalSpent: number;
  status: 'Active' | 'Inactive';
  joinedDate: string;
  address: string;
  recentOrderId?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  desktopImage: string;
  mobileImage: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Scheduled' | 'Expired';
  sortOrder: number;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
  status: 'Active' | 'Inactive';
  featured: boolean;
  productIds?: string[];
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder: number;
  maximumDiscount?: number;
  usageLimit: number;
  usageCount: number;
  perUserLimit: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired' | 'Disabled';
}

export interface CMSSection {
  id: string;
  name: string;
  type: 'hero' | 'categories' | 'featured_products' | 'new_arrivals' | 'best_sellers' | 'shop_by_age' | 'promo';
  title: string;
  subtitle?: string;
  enabled: boolean;
  order: number;
  itemsCount?: number;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  size: string;
  dimensions?: string;
  uploadedDate: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  comment: string;
  date: string;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Hidden';
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  contactEmail: string;
  supportPhone: string;
  currency: string;
  currencySymbol: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  primaryColor: string;
  enableStockAlerts: boolean;
  lowStockThreshold: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'order' | 'stock' | 'system' | 'customer';
  link?: string;
  unread: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  role?: 'ADMIN' | 'VENDOR';
  vendorId?: string;
  shopName?: string;
}

export interface Vendor {
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
