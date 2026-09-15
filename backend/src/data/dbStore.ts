import fs from 'fs';
import path from 'path';

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

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  featured?: boolean;
}

export interface AgeGroup {
  id: string;
  label: string;
  subtitle: string;
  minAge: number;
  maxAge: number;
  icon?: string;
  badge?: string;
  description?: string;
}

export interface Offer {
  id: string;
  title: string;
  discountPercent: number;
  code: string;
  description: string;
  bannerUrl?: string;
  validUntil?: string;
  tag?: string;
  category?: string;
}


export interface ReviewItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  vendorId: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  comment: string;
  date: string;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Hidden';
}

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string;
  categoryId: string;
  category?: string | { id: string; name: string };
  subCategory?: string;
  brand: string;
  ageGroup: string;
  vendorId: string;
  vendorName: string;
  vendorRating?: number;
  basePrice: number;
  salePrice?: number | null;
  price: number;
  discount?: number;
  stock: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'Active';
  rejectionReason?: string;
  isActive?: boolean;
  rating: number;
  salesCount: number;
  image: string;
  images: Array<{ id?: string; url: string; alt?: string }>;
  specifications?: Record<string, string>;
  features?: string[];
  attributes?: Record<string, any>;
  variants?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  status?: string;
  isActive?: boolean;
  featured?: boolean;
  image?: string;
  itemCount?: number;
  children?: CategoryItem[];
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    vendorId?: string;
    vendorName?: string;
    sku?: string;
  }>;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  totalAmount: number;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | string;
  status: 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Paid' | 'Pending' | 'Failed';
  paymentMethod: string;
  createdAt: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  highlight?: string;
  ctaText?: string;
  ctaLink?: string;
  image: string;
  color?: string;
  isActive: boolean;
}

interface StoreSchema {
  vendors: Vendor[];
  brands: Brand[];
  ageGroups: AgeGroup[];
  offers: Offer[];
  products: ProductItem[];
  categories: CategoryItem[];
  orders: OrderItem[];
  reviews: ReviewItem[];
  banners: BannerItem[];
}

const DATA_DIR = path.join(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

export const defaultVendors: Vendor[] = [
  {
    id: 'vendor-1',
    name: 'Rajesh Sharma',
    email: 'vendor1@abctoys.com',
    phone: '+91 98765 43210',
    shopName: 'ABC Toys Wonderland',
    rating: 4.9,
    totalProducts: 8,
    status: 'ACTIVE',
    joinedAt: '2025-01-15T00:00:00.000Z',
    logo: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=120&h=120&fit=crop',
    description: 'Premier destination for premium wooden, educational, and STEM robotics toys in India.',
    address: 'Shop 14, Galaxy Mall, Andheri West',
    city: 'Mumbai',
  },
  {
    id: 'vendor-2',
    name: 'Priya Patel',
    email: 'vendor2@kidsworld.com',
    phone: '+91 98112 34567',
    shopName: 'Kids World Collectibles',
    rating: 4.8,
    totalProducts: 6,
    status: 'ACTIVE',
    joinedAt: '2025-02-10T00:00:00.000Z',
    logo: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=120&h=120&fit=crop',
    description: 'Specializing in authentic die-cast racing cars, remote-control action toys, and outdoor playsets.',
    address: 'Sector 18, Commercial Plaza',
    city: 'Bangalore',
  },
  {
    id: 'vendor-3',
    name: 'Amit Verma',
    email: 'vendor3@toyplanet.com',
    phone: '+91 98234 56789',
    shopName: 'Toy Planet & Hobbies',
    rating: 4.7,
    totalProducts: 5,
    status: 'ACTIVE',
    joinedAt: '2025-03-01T00:00:00.000Z',
    logo: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=120&h=120&fit=crop',
    description: 'Fun, soft plush toys, creative puzzles, and pretend-play doctor and kitchen sets for young minds.',
    address: 'CP Block B, Connaught Place',
    city: 'New Delhi',
  },
];

export const defaultBrands: Brand[] = [
  {
    id: 'brand-1',
    name: 'LEGO',
    slug: 'lego',
    logo: '/brands/lego.svg',
    description: 'World-renowned creative building blocks and mechanical marvels.',
    featured: true,
  },
  {
    id: 'brand-2',
    name: 'Hot Wheels',
    slug: 'hot-wheels',
    logo: '/brands/hot-wheels.svg',
    description: 'High-speed die-cast cars, extreme gravity loops, and stunt tracks.',
    featured: true,
  },
  {
    id: 'brand-3',
    name: 'Barbie',
    slug: 'barbie',
    logo: '/brands/barbie.svg',
    description: 'Inspiring storytelling, fashion dolls, and creative dreamhouses.',
    featured: true,
  },
  {
    id: 'brand-4',
    name: 'Fisher-Price',
    slug: 'fisher-price',
    logo: '/brands/fisher-price.svg',
    description: 'Sensory and early childhood learning toys safe for toddlers.',
    featured: true,
  },
  {
    id: 'brand-5',
    name: 'Nerf',
    slug: 'nerf',
    logo: '/brands/nerf.svg',
    description: 'Safe foam blasters and active energetic outdoor target games.',
    featured: true,
  },
  {
    id: 'brand-6',
    name: 'Melissa & Doug',
    slug: 'melissa-and-doug',
    logo: '/brands/melissa-doug.svg',
    description: 'Timeless wooden puzzles, pretend play sets, and creative crafts.',
    featured: true,
  },
];

export const defaultAgeGroups: AgeGroup[] = [
  {
    id: 'age-0-2',
    label: '0 - 2 Years',
    subtitle: 'Babies & Toddlers',
    minAge: 0,
    maxAge: 2,
    badge: 'Infants & Toddlers',
    icon: '🧸',
    description: 'Sensory rattles, soft plushies, teether rings, and colorful musical gyms.',
  },
  {
    id: 'age-3-5',
    label: '3 - 5 Years',
    subtitle: 'Pre-Schoolers',
    minAge: 3,
    maxAge: 5,
    badge: 'Pre-School',
    icon: '🎨',
    description: 'Pretend play sets, chunky wooden puzzles, clay craft, and beginner tricycles.',
  },
  {
    id: 'age-6-8',
    label: '6 - 8 Years',
    subtitle: 'Early Explorers',
    minAge: 6,
    maxAge: 8,
    badge: 'Primary Kids',
    icon: '🚀',
    description: 'Building blocks, simple robotics kits, RC monster trucks, and board games.',
  },
  {
    id: 'age-9-12',
    label: '9 - 12 Years',
    subtitle: 'Young Innovators',
    minAge: 9,
    maxAge: 12,
    badge: 'Tweens',
    icon: '⚡',
    description: 'Advanced STEM experiments, coding kits, drone flyers, and strategy board games.',
  },
  {
    id: 'age-13-plus',
    label: '13+ Years',
    subtitle: 'Teens & Hobbyists',
    minAge: 13,
    maxAge: 99,
    badge: 'Teens & Collectors',
    icon: '🎮',
    description: 'Complex LEGO Technic, RC acrobatic drones, 3D mechanical wooden puzzles.',
  },
];

export const defaultOffers: Offer[] = [
  {
    id: 'offer-1',
    title: 'Super Saver Toy Festival',
    discountPercent: 25,
    code: 'FESTIVAL25',
    description: 'Flat 25% discount on all LEGO, STEM Robotics, and educational toys.',
    tag: 'Limited Time',
    category: 'STEM & Robotics',
  },
  {
    id: 'offer-2',
    title: 'Mega Weekend Action Deal',
    discountPercent: 30,
    code: 'WEEKEND30',
    description: 'Get up to 30% off on all RC Cars, Drones, and Outdoor Blasters.',
    tag: 'Weekend Special',
    category: 'Cars & Vehicles',
  },
  {
    id: 'offer-3',
    title: 'Toddler Care Welcome Treat',
    discountPercent: 20,
    code: 'TODDLER20',
    description: 'Enjoy 20% off on premium organic plush soft toys and nursery gear.',
    tag: 'Top Rated',
    category: 'Soft Toys',
  },
  {
    id: 'offer-4',
    title: 'Free Express Shipping',
    discountPercent: 15,
    code: 'FREESHIP',
    description: 'Free express doorstep delivery on all orders above ₹999 across India.',
    tag: 'Storewide',
  },
];

export const defaultCategories: CategoryItem[] = [
  {
    id: 'cat-1',
    name: 'Soft Toys',
    slug: 'soft-toys',
    description: 'Plush cuddly animals, bedtime companions, and organic cloth dolls.',
    status: 'Active',
    isActive: true,
    featured: true,
    image: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=400&h=400&fit=crop',
    itemCount: 42,
  },
  {
    id: 'cat-2',
    name: 'Cars & Vehicles',
    slug: 'cars-and-vehicles',
    description: 'Fast RC monster trucks, die-cast speedsters, and racing circuits.',
    status: 'Active',
    isActive: true,
    featured: true,
    image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=400&h=400&fit=crop',
    itemCount: 56,
  },
  {
    id: 'cat-3',
    name: 'STEM & Robotics',
    slug: 'stem-and-robotics',
    description: 'Hands-on DIY coding, science experiments, electronic building blocks.',
    status: 'Active',
    isActive: true,
    featured: true,
    image: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=400&h=400&fit=crop',
    itemCount: 38,
  },
  {
    id: 'cat-4',
    name: 'Dolls & Playsets',
    slug: 'dolls-and-playsets',
    description: 'Interactive fashion dolls, dream dollhouses, and role-play doctor sets.',
    status: 'Active',
    isActive: true,
    featured: true,
    image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&h=400&fit=crop',
    itemCount: 29,
  },
  {
    id: 'cat-5',
    name: 'Puzzles & Board Games',
    slug: 'puzzles-and-board-games',
    description: 'Family brain teasers, strategy games, and jigsaw challenges.',
    status: 'Active',
    isActive: true,
    featured: true,
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&h=400&fit=crop',
    itemCount: 34,
  },
  {
    id: 'cat-6',
    name: 'Outdoor & Sports',
    slug: 'outdoor-and-sports',
    description: 'Foam blasters, scooters, soccer balls, and energetic active gear.',
    status: 'Active',
    isActive: true,
    featured: true,
    image: 'https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?w=400&h=400&fit=crop',
    itemCount: 24,
  },
];

export const defaultProducts: ProductItem[] = [];

export const defaultBanners: BannerItem[] = [
  {
    id: 'banner-1',
    title: 'Kids Play Festival 2026',
    subtitle: 'Flat 25% Off on STEM Robotics, Building Kits & Plush Toys',
    highlight: 'LIMITED TIME FESTIVAL OFFER',
    ctaText: 'Shop All Toys',
    ctaLink: '/products',
    image: '/hero-play.jpg',
    color: '#FF6B6B',
    isActive: true,
  },
  {
    id: 'banner-2',
    title: 'Explore Toy Wonderland',
    subtitle: 'Top Brands: LEGO, Hot Wheels, Barbie & Melissa and Doug',
    highlight: 'VERIFIED MULTI-VENDOR MARKETPLACE',
    ctaText: 'Explore Categories',
    ctaLink: '/products',
    image: '/hero-wonderland.jpg',
    color: '#4ECDC4',
    isActive: true,
  },
  {
    id: 'banner-3',
    title: 'Big Adventures for Little Minds',
    subtitle: 'Curated by Age: 0-2, 3-5, 6-8, 9-12 and 13+ Years',
    highlight: 'FAST DOORSTEP DELIVERY',
    ctaText: 'Discover Deals',
    ctaLink: '/products',
    image: '/hero-adventures.jpg',
    color: '#FFD93D',
    isActive: true,
  },
];

class LocalDbStore {
  private data: StoreSchema = {
    vendors: [],
    brands: [],
    ageGroups: [],
    offers: [],
    products: [],
    categories: [],
    orders: [],
    reviews: [],
    banners: [],
  };

  constructor() {
    this.initData();
  }

  private initData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = {
          vendors: parsed.vendors && parsed.vendors.length > 0 ? parsed.vendors : defaultVendors,
          brands: parsed.brands && parsed.brands.length > 0 ? parsed.brands : defaultBrands,
          ageGroups: parsed.ageGroups && parsed.ageGroups.length > 0 ? parsed.ageGroups : defaultAgeGroups,
          offers: parsed.offers && parsed.offers.length > 0 ? parsed.offers : defaultOffers,
          products: Array.isArray(parsed.products) ? this.enrichExistingProducts(parsed.products) : [],
          categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : defaultCategories,
          orders: parsed.orders || [],
          reviews: parsed.reviews || [],
          banners: parsed.banners && parsed.banners.length > 0 ? parsed.banners : defaultBanners,
        };
        this.saveData(this.data);
      } else {
        this.data = {
          vendors: defaultVendors,
          brands: defaultBrands,
          ageGroups: defaultAgeGroups,
          offers: defaultOffers,
          products: [],
          categories: defaultCategories,
          orders: [],
          reviews: [],
          banners: defaultBanners,
        };
        this.saveData(this.data);
      }
    } catch (err) {
      console.error('Error initializing dbStore:', err);
      this.data = {
        vendors: defaultVendors,
        brands: defaultBrands,
        ageGroups: defaultAgeGroups,
        offers: defaultOffers,
        products: [],
        categories: defaultCategories,
        orders: [],
        reviews: [],
        banners: defaultBanners,
      };
    }
  }

  private enrichExistingProducts(products: any[]): ProductItem[] {
    return products.map((p, idx) => {
      const vendor = defaultVendors[idx % defaultVendors.length];
      const brand = defaultBrands[idx % defaultBrands.length].name;
      const ageGroup = defaultAgeGroups[idx % defaultAgeGroups.length].label;

      return {
        ...p,
        brand: p.brand || brand,
        ageGroup: p.ageGroup || ageGroup,
        vendorId: p.vendorId || vendor.id,
        vendorName: p.vendorName || vendor.shopName,
        vendorRating: p.vendorRating || vendor.rating,
        status: p.status === 'PENDING' ? 'PENDING' : (p.status === 'REJECTED' && !p.isBestSeller && !p.isNewArrival ? 'REJECTED' : 'APPROVED'),
        isActive: p.status === 'PENDING' ? false : (p.status === 'REJECTED' && !p.isBestSeller && !p.isNewArrival ? false : (p.isActive !== undefined ? p.isActive : true)),
        isBestSeller: Boolean(p.isBestSeller),
        isNewArrival: Boolean(p.isNewArrival),
        isFeatured: Boolean(p.isFeatured),
        price: p.salePrice || p.price || p.basePrice || 999,
        sku: p.sku || `SKU-${p.id}`,
      };
    });
  }

  private saveData(data: StoreSchema) {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing to store.json:', err);
    }
  }

  // --- PRODUCTS ---
  getProducts(filter?: {
    allStatus?: boolean; // If true, returns all (e.g. for admin catalog), otherwise only APPROVED & active
    status?: string;
    categoryId?: string;
    category?: string;
    brand?: string;
    ageGroup?: string;
    search?: string;
    onSale?: boolean;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    vendorId?: string;
    isFeatured?: boolean;
    isNewArrival?: boolean;
    isBestSeller?: boolean;
    sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'popular' | 'newest';
  }): ProductItem[] {
    let list = [...this.data.products];

    // Customer storefront rule: only show approved & active products unless explicitly requested
    if (!filter?.allStatus) {
      list = list.filter((p) => (p.status === 'APPROVED' || p.status === 'Active') && p.isActive !== false);
    } else if (filter?.status) {
      list = list.filter((p) => p.status === filter.status);
    } else {
      list = list.filter((p) => p.status !== 'REJECTED');
    }

    if (!filter) return list;

    if (filter.vendorId) {
      list = list.filter((p) => p.vendorId === filter.vendorId);
    }

    if (filter.categoryId) {
      list = list.filter((p) => p.categoryId === filter.categoryId || (typeof p.category === 'object' && p.category?.id === filter.categoryId));
    }

    if (filter.category) {
      const catLower = filter.category.toLowerCase();
      list = list.filter((p) => {
        const cName = typeof p.category === 'string' ? p.category : p.category?.name || '';
        return cName.toLowerCase() === catLower || p.categoryId?.toLowerCase() === catLower;
      });
    }

    if (filter.brand) {
      const brandLower = filter.brand.toLowerCase();
      list = list.filter((p) => p.brand && p.brand.toLowerCase() === brandLower);
    }

    if (filter.ageGroup) {
      const ageLower = filter.ageGroup.toLowerCase();
      list = list.filter((p) => p.ageGroup && p.ageGroup.toLowerCase().includes(ageLower.replace('years', '').trim()));
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.vendorName && p.vendorName.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    if (filter.onSale) {
      list = list.filter((p) => (p.salePrice && p.salePrice < p.basePrice) || (p.discount && p.discount > 0));
    }

    if (filter.minPrice !== undefined) {
      list = list.filter((p) => (p.salePrice || p.price || p.basePrice) >= filter.minPrice!);
    }

    if (filter.maxPrice !== undefined) {
      list = list.filter((p) => (p.salePrice || p.price || p.basePrice) <= filter.maxPrice!);
    }

    if (filter.inStock) {
      list = list.filter((p) => (p.stock || 0) > 0);
    }

    if (filter.isFeatured !== undefined) {
      list = list.filter((p) => Boolean(p.isFeatured) === filter.isFeatured);
    }

    if (filter.isNewArrival !== undefined) {
      list = list.filter((p) => Boolean(p.isNewArrival) === filter.isNewArrival);
    }

    if (filter.isBestSeller !== undefined) {
      list = list.filter((p) => Boolean(p.isBestSeller) === filter.isBestSeller);
    }

    // Sorting
    if (filter.sortBy) {
      switch (filter.sortBy) {
        case 'price_asc':
          list.sort((a, b) => (a.salePrice || a.price || a.basePrice) - (b.salePrice || b.price || b.basePrice));
          break;
        case 'price_desc':
          list.sort((a, b) => (b.salePrice || b.price || b.basePrice) - (a.salePrice || a.price || a.basePrice));
          break;
        case 'rating':
          list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'popular':
          list.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
          break;
        case 'newest':
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          break;
      }
    }

    return list;
  }

  getProductById(id: string): ProductItem | null {
    const found = this.data.products.find((p) => p.id === id || p.slug === id);
    if (!found || found.status === 'REJECTED') return null;
    return found;
  }

  // Admin Approval Queue
  getPendingProducts(): ProductItem[] {
    return this.data.products.filter((p) => p.status === 'PENDING');
  }

  approveProduct(id: string): ProductItem | null {
    const p = this.data.products.find((prod) => prod.id === id);
    if (!p) return null;
    p.status = 'APPROVED';
    p.isActive = true;
    p.updatedAt = new Date().toISOString();
    this.saveData(this.data);
    return p;
  }

  rejectProduct(id: string, reason: string): ProductItem | null {
    const p = this.data.products.find((prod) => prod.id === id);
    if (!p) return null;
    p.status = 'REJECTED';
    p.isActive = false;
    p.rejectionReason = reason || 'Does not meet product safety or quality guidelines.';
    p.updatedAt = new Date().toISOString();
    this.saveData(this.data);
    return p;
  }

  // Vendor Portal
  getVendorProducts(vendorId: string): ProductItem[] {
    return this.data.products.filter((p) => p.vendorId === vendorId);
  }

  createProduct(item: Partial<ProductItem>): ProductItem {
    const newId = `prod-${Date.now()}`;
    const vendor = this.data.vendors.find(v => v.id === item.vendorId) || this.data.vendors[0];

    const isApprovedStatus = item.status === 'APPROVED' || item.status === 'Active' || (!item.status && !item.vendorId);
    const resolvedStatus = (item.status === 'Active' || item.status === 'APPROVED') ? 'APPROVED' : (item.status || (item.vendorId ? 'PENDING' : 'APPROVED'));
    const resolvedActive = item.isActive !== undefined ? item.isActive : isApprovedStatus;

    const newProduct: ProductItem = {
      id: item.id || newId,
      name: item.name || 'New Toy Product',
      slug: item.slug || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : newId),
      sku: item.sku || `SKU-${Date.now().toString().slice(-6)}`,
      category: item.category || 'Toys',
      categoryId: item.categoryId || 'cat-1',
      brand: item.brand || 'LEGO',
      ageGroup: item.ageGroup || '3 - 5 Years',
      vendorId: item.vendorId || vendor.id,
      vendorName: item.vendorName || vendor.shopName,
      vendorRating: vendor.rating || 4.9,
      basePrice: Number(item.basePrice || item.price || 999),
      salePrice: item.salePrice ? Number(item.salePrice) : null,
      price: item.salePrice ? Number(item.salePrice) : Number(item.basePrice || 999),
      discount: item.discount || (item.basePrice && item.salePrice ? Math.round(((item.basePrice - item.salePrice) / item.basePrice) * 100) : 0),
      stock: item.stock !== undefined ? Number(item.stock) : 20,
      // Status & active rules: vendor submitted products require admin approval, admin additions are approved immediately
      status: resolvedStatus,
      isActive: resolvedActive,
      isFeatured: Boolean(item.isFeatured),
      isNewArrival: Boolean(item.isNewArrival),
      isBestSeller: Boolean(item.isBestSeller),
      rating: item.rating || 5.0,
      salesCount: item.salesCount || 0,
      image: item.image || (item.images && item.images[0]?.url) || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80',
      images: item.images || [{ url: item.image || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80' }],
      shortDescription: item.shortDescription || '',
      description: item.description || '',
      specifications: item.specifications || {},
      features: item.features || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Auto-register product category if not already in categories
    const rawCat = newProduct.category;
    const catName = typeof rawCat === 'string' ? rawCat : (rawCat as any)?.name;
    if (catName && typeof catName === 'string' && !this.data.categories.some(c => c.name.toLowerCase() === catName.toLowerCase())) {
      const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const uniqueCatId = this.data.categories.some(c => c.id === newProduct.categoryId)
        ? `cat-${catSlug}`
        : (newProduct.categoryId || `cat-${catSlug}`);

      this.data.categories.push({
        id: uniqueCatId,
        name: catName,
        slug: catSlug,
        description: `${catName} toys`,
        status: 'Active',
        isActive: true,
        featured: true,
        image: newProduct.image || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200&h=200&fit=crop',
        itemCount: 1,
      });
    }

    this.data.products.unshift(newProduct);
    this.saveData(this.data);
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<ProductItem>): ProductItem | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const existing = this.data.products[idx];

    // If an item is being marked as Best Seller or New Arrival or status is Active/APPROVED, ensure it is APPROVED and active
    const willBeApproved = updates.status === 'Active' || updates.status === 'APPROVED' || updates.isBestSeller === true || updates.isNewArrival === true;
    const newStatus = willBeApproved ? 'APPROVED' : (updates.status ?? existing.status);
    const newIsActive = willBeApproved ? true : (updates.isActive ?? (newStatus === 'APPROVED' ? true : existing.isActive));

    const updated: ProductItem = {
      ...existing,
      ...updates,
      status: newStatus,
      isActive: newIsActive,
      isBestSeller: updates.isBestSeller !== undefined ? Boolean(updates.isBestSeller) : existing.isBestSeller,
      isNewArrival: updates.isNewArrival !== undefined ? Boolean(updates.isNewArrival) : existing.isNewArrival,
      isFeatured: updates.isFeatured !== undefined ? Boolean(updates.isFeatured) : existing.isFeatured,
      updatedAt: new Date().toISOString(),
    };
    this.data.products[idx] = updated;
    this.saveData(this.data);
    return updated;
  }

  deleteProduct(id: string): boolean {
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    if (this.data.products.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- VENDORS ---
  getVendors(): Vendor[] {
    return this.data.vendors;
  }

  getVendorById(id: string): Vendor | null {
    return this.data.vendors.find(v => v.id === id || v.email === id || v.name.toLowerCase() === id.toLowerCase()) || null;
  }

  createVendor(item: Partial<Vendor>): Vendor {
    const newId = `vendor-${Date.now()}`;
    const newVendor: Vendor = {
      id: item.id || newId,
      name: item.name || 'Shopkeeper',
      email: item.email || `vendor${Date.now()}@example.com`,
      phone: item.phone || '',
      shopName: item.shopName || 'Kids Toy Shop',
      rating: 5.0,
      totalProducts: 0,
      status: 'ACTIVE',
      joinedAt: new Date().toISOString(),
      logo: item.logo || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=120&h=120&fit=crop',
      description: item.description || 'Verified toy merchant partner on Play Petal Marketplace.',
      address: item.address || '',
      city: item.city || 'Mumbai',
    };
    this.data.vendors.push(newVendor);
    this.saveData(this.data);
    return newVendor;
  }

  // --- BRANDS ---
  getBrands(): Brand[] {
    return this.data.brands;
  }

  // --- AGE GROUPS ---
  getAgeGroups(): AgeGroup[] {
    return this.data.ageGroups;
  }

  // --- OFFERS ---
  getOffers(): Offer[] {
    return this.data.offers;
  }

  // --- CATEGORIES ---
  getCategories(): CategoryItem[] {
    const existingNames = new Set(this.data.categories.map((c) => c.name.toLowerCase()));
    let hasAdded = false;

    this.data.products.forEach((p) => {
      const catName = typeof p.category === 'string' ? p.category : (p.category as any)?.name;
      if (catName && catName.trim() && !existingNames.has(catName.trim().toLowerCase())) {
        existingNames.add(catName.trim().toLowerCase());
        this.data.categories.push({
          id: p.categoryId || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: catName.trim(),
          slug: catName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: `${catName.trim()} toys and games`,
          status: 'Active',
          isActive: true,
          featured: true,
          image: p.image || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200&h=200&fit=crop',
          itemCount: 0,
        });
        hasAdded = true;
      }
    });

    if (hasAdded) {
      this.saveData(this.data);
    }

    // Dynamic item count computed from real products
    return this.data.categories.map((c) => {
      const count = this.data.products.filter((p) => {
        const pCatName = typeof p.category === 'string' ? p.category : (p.category as any)?.name;
        const pCatId = p.categoryId;
        return (
          (pCatId && pCatId === c.id) ||
          (pCatName && pCatName.trim().toLowerCase() === c.name.trim().toLowerCase())
        );
      }).length;
      return {
        ...c,
        itemCount: count,
      };
    });
  }

  createCategory(item: Partial<CategoryItem>): CategoryItem {
    const newId = `cat-${Date.now()}`;
    const newCat: CategoryItem = {
      id: item.id || newId,
      name: item.name || 'Untitled Category',
      slug: item.slug || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : newId),
      description: item.description || '',
      parentId: item.parentId || null,
      status: item.status || 'Active',
      isActive: item.status !== 'Inactive',
      featured: Boolean(item.featured),
      image: item.image || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=200&h=200&fit=crop',
      itemCount: item.itemCount || 0,
    };
    this.data.categories.push(newCat);
    this.saveData(this.data);
    return newCat;
  }

  updateCategory(id: string, updates: Partial<CategoryItem>): CategoryItem | null {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.saveData(this.data);
    return this.data.categories[idx];
  }

  deleteCategory(id: string): boolean {
    const initialLen = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    if (this.data.categories.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- ORDERS ---
  getOrders(): OrderItem[] {
    return this.data.orders.map((order) => {
      const sellerId = (order.items && order.items[0]?.vendorId) || 'vendor-1';
      const subId = (order as any).suborderId || (order as any).suborders?.[0]?.id || `subord-${order.id}`;
      const defaultPaymentMethod = order.paymentMethod || 'Cash on Delivery';
      const defaultPaymentStatus = order.paymentStatus || (String(order.status || '').toUpperCase() === 'CONFIRMED' || String(order.status || '').toUpperCase() === 'PAID' ? 'Paid' : 'Pending');

      return {
        ...order,
        paymentMethod: defaultPaymentMethod,
        paymentStatus: defaultPaymentStatus,
        suborderId: subId,
        suborders: (order as any).suborders || [
          {
            id: subId,
            suborderNumber: `${order.orderNumber || order.id}-S1`,
            orderId: order.id,
            sellerId,
            status: String(order.status || 'PENDING').toUpperCase() === 'ACCEPTED' ? 'ACCEPTED' : (order.status || 'PENDING'),
            shipment: (order as any).shipment || null,
          },
        ],
      };
    });
  }

  getVendorOrders(vendorId: string): OrderItem[] {
    // Return orders containing items belonging to this vendor, filtered to vendor items
    return this.data.orders
      .filter((order) => order.items.some((it) => it.vendorId === vendorId))
      .map((order) => {
        const vendorItems = order.items.filter((it) => it.vendorId === vendorId);
        const vendorSubtotal = vendorItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const matchedSub = (order as any).suborders?.find((s: any) => s.sellerId === vendorId);
        const subId = matchedSub?.id || (order as any).suborderId || `subord-${order.id}`;
        const defaultPaymentMethod = order.paymentMethod || 'Cash on Delivery';
        const defaultPaymentStatus = order.paymentStatus || (String(order.status || '').toUpperCase() === 'CONFIRMED' || String(order.status || '').toUpperCase() === 'PAID' ? 'Paid' : 'Pending');

        return {
          ...order,
          paymentMethod: defaultPaymentMethod,
          paymentStatus: defaultPaymentStatus,
          items: vendorItems,
          totalAmount: vendorSubtotal,
          suborderId: subId,
          suborders: (order as any).suborders || [
            {
              id: subId,
              suborderNumber: `${order.orderNumber || order.id}-S1`,
              orderId: order.id,
              sellerId: vendorId,
              status: String(order.status || 'PENDING').toUpperCase() === 'ACCEPTED' ? 'ACCEPTED' : (order.status || 'PENDING'),
              shipment: (order as any).shipment || null,
            },
          ],
        };
      });
  }

  getVendorDashboardSummary(vendorId: string) {
    const vendorProducts = this.getVendorProducts(vendorId);
    const vendorOrders = this.getVendorOrders(vendorId);
    const allReviews = this.data.reviews || [];
    const vendorProductIds = new Set(vendorProducts.map((p) => String(p.id)));
    const vendorReviews = allReviews.filter(
      (r: any) => String(r.vendorId) === String(vendorId) || vendorProductIds.has(String(r.productId))
    );

    let pendingOrders = 0;
    let acceptedOrders = 0;
    let processingOrders = 0;
    let readyToShipOrders = 0;
    let shippedOrders = 0;
    let deliveredOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let rejectedOrders = 0;

    let totalGrossSales = 0;

    vendorOrders.forEach((o) => {
      const status = String(o.status || 'Pending').toLowerCase();
      totalGrossSales += Number(o.totalAmount) || 0;

      if (status === 'pending') pendingOrders++;
      else if (status === 'accepted') acceptedOrders++;
      else if (status === 'confirmed' || status === 'processing') processingOrders++;
      else if (status === 'ready_to_ship') readyToShipOrders++;
      else if (status === 'shipped' || status === 'in_transit' || status === 'out_for_delivery') shippedOrders++;
      else if (status === 'delivered') deliveredOrders++;
      else if (status === 'completed') completedOrders++;
      else if (status === 'cancelled') cancelledOrders++;
      else if (status === 'rejected') rejectedOrders++;
    });

    const totalProducts = vendorProducts.length;
    const lowStockProducts = vendorProducts.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10).length;
    const outOfStockProducts = vendorProducts.filter((p) => (p.stock ?? 0) === 0).length;

    const shipmentDistribution: Record<string, number> = {
      CREATED: 0,
      AWB_ASSIGNED: 0,
      PICKUP_SCHEDULED: 0,
      PICKED_UP: 0,
      IN_TRANSIT: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      FAILED: 0,
      RTO: 0,
      CANCELLED: 0,
    };

    let activeShipments = 0;
    vendorOrders.forEach((o) => {
      const statusUpper = String(o.status || 'PENDING').toUpperCase();
      if (['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'READY_TO_SHIP'].includes(statusUpper)) {
        activeShipments++;
      }
      if (shipmentDistribution[statusUpper] !== undefined) {
        shipmentDistribution[statusUpper]++;
      }
    });

    const availablePayout = vendorOrders
      .filter((o) => ['completed', 'delivered'].includes(String(o.status || '').toLowerCase()))
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const reservedPayout = vendorOrders
      .filter((o) => ['pending', 'accepted', 'processing', 'confirmed', 'shipped', 'ready_to_ship'].includes(String(o.status || '').toLowerCase()))
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const buildSalesTrend = (days: number) => {
      const now = new Date();
      const trendMap: Record<string, { date: string; revenue: number; orders: number }> = {};

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        trendMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
      }

      vendorOrders.forEach((o) => {
        const orderDateStr = (o.createdAt || o.date || '').split('T')[0];
        if (trendMap[orderDateStr]) {
          trendMap[orderDateStr].revenue += Number(o.totalAmount || 0);
          trendMap[orderDateStr].orders += 1;
        }
      });

      return Object.values(trendMap);
    };

    const topProducts = [...vendorProducts]
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0) || (b.price || 0) - (a.price || 0))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image || (p.images && p.images[0]?.url) || '',
        unitsSold: p.salesCount || 0,
        revenue: (p.salesCount || 0) * (p.price || p.basePrice || 0),
        stock: p.stock ?? 0,
      }));

    const inventoryAlerts = vendorProducts
      .filter((p) => (p.stock ?? 0) <= 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock ?? 0,
        status: (p.stock ?? 0) === 0 ? 'Out of Stock' : 'Low Stock',
      }));

    const totalReviews = vendorReviews.length;
    const avgRating = totalReviews > 0
      ? Number((vendorReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / totalReviews).toFixed(1))
      : 5.0;

    const ratingBreakdown = {
      5: vendorReviews.filter((r) => Math.round(Number(r.rating || 0)) === 5).length,
      4: vendorReviews.filter((r) => Math.round(Number(r.rating || 0)) === 4).length,
      3: vendorReviews.filter((r) => Math.round(Number(r.rating || 0)) === 3).length,
      2: vendorReviews.filter((r) => Math.round(Number(r.rating || 0)) === 2).length,
      1: vendorReviews.filter((r) => Math.round(Number(r.rating || 0)) === 1).length,
    };

    const recentOrders = vendorOrders.slice(0, 8).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber || `#ORD-${o.id}`,
      date: (o.date || o.createdAt || '').slice(0, 10),
      customerName: o.customerName || 'Customer',
      productSummary: o.productSummary || (o.items && o.items[0]?.productName) || 'Items',
      totalAmount: Number(o.totalAmount || 0),
      status: o.status || 'Pending',
      shipmentStatus: o.shipment?.status || (['Shipped', 'DELIVERED'].includes(o.status) ? 'IN_TRANSIT' : 'CREATED'),
      suborderId: (o as any).suborders?.[0]?.id || `subord-${o.id}`,
    }));

    return {
      kpi: {
        totalOrders: vendorOrders.length,
        pendingOrders,
        acceptedOrders,
        processingOrders,
        readyToShipOrders,
        shippedOrders,
        deliveredOrders,
        completedOrders,
        cancelledOrders,
        rejectedOrders,
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        activeShipments,
        totalGrossSales,
        pendingPayout: availablePayout,
        reservedPayout,
        paidPayout: 0,
        failedPayout: 0,
        totalReviews,
        averageRating: avgRating,
      },
      salesTrends: {
        '7d': buildSalesTrend(7),
        '30d': buildSalesTrend(30),
        '90d': buildSalesTrend(90),
        '1y': buildSalesTrend(365),
      },
      lifecycle: {
        new: pendingOrders,
        acceptedProcessing: acceptedOrders + processingOrders,
        readyToShip: readyToShipOrders,
        shippedInTransit: shippedOrders,
        delivered: deliveredOrders,
        completed: completedOrders,
        cancelledRejected: cancelledOrders + rejectedOrders,
        returnRefund: 0,
      },
      shipments: shipmentDistribution,
      financials: {
        available: availablePayout,
        reserved: reservedPayout,
        paid: 0,
        failed: 0,
      },
      recentOrders,
      topProducts,
      inventoryAlerts,
      reviews: {
        totalReviews,
        averageRating: avgRating,
        ratingBreakdown,
        recentReviews: vendorReviews.slice(0, 5),
      },
    };
  }

  createOrder(order: Partial<OrderItem>): OrderItem {
    const items = (order.items || []).map((item) => {
      // Enrich with vendor details if missing and deduct real stock
      const matchedProd = this.data.products.find(p => p.id === item.id);
      if (matchedProd) {
        matchedProd.stock = Math.max(0, (matchedProd.stock ?? 20) - (item.quantity || 1));
        matchedProd.salesCount = (matchedProd.salesCount || 0) + (item.quantity || 1);
      }
      return {
        ...item,
        vendorId: item.vendorId || matchedProd?.vendorId || 'vendor-1',
        vendorName: item.vendorName || matchedProd?.vendorName || 'ABC Toys Wonderland',
        sku: item.sku || matchedProd?.sku || `SKU-${item.id}`,
      };
    });

    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const discount = order.discount || (subtotal > 2000 ? Math.round(subtotal * 0.1) : 0);
    const deliveryFee = subtotal > 999 ? 0 : 99;
    const totalAmount = order.totalAmount || (subtotal - discount + deliveryFee);

    const newOrder: OrderItem & { userId?: string; customerId?: string } = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: order.userId || order.customerId,
      customerId: order.customerId || order.userId,
      customerName: order.customerName || 'Happy Customer',
      customerEmail: order.customerEmail || 'customer@example.com',
      customerPhone: order.customerPhone || '+91 98765 00000',
      items,
      subtotal,
      discount,
      deliveryFee,
      totalAmount,
      shippingAddress: order.shippingAddress || '123 Play Street, Joy City, 400001',
      status: order.status || 'Pending',
      paymentStatus: order.paymentStatus || 'Paid',
      paymentMethod: order.paymentMethod || 'Online UPI',
      createdAt: new Date().toISOString(),
    };

    this.data.orders.unshift(newOrder);
    this.saveData(this.data);
    return newOrder;
  }

  updateOrderStatus(id: string, status: OrderItem['status']): OrderItem | null {
    const ord = this.data.orders.find((o) => o.id === id || o.orderNumber === id);
    if (!ord) return null;
    ord.status = status;
    this.saveData(this.data);
    return ord;
  }

  updateOrderPaymentStatus(id: string, paymentStatus: string): OrderItem | null {
    const ord = this.data.orders.find((o) => o.id === id || o.orderNumber === id);
    if (!ord) return null;
    ord.paymentStatus = paymentStatus;
    this.saveData(this.data);
    return ord;
  }

  updateVendorOrderStatus(
    vendorId: string,
    orderId: string,
    status: string,
    reason?: string
  ): { success: boolean; code?: string; message: string; order: OrderItem | null } {
    const ord = this.data.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!ord) {
      return { success: false, code: 'NOT_FOUND', message: 'Order not found.', order: null };
    }

    // Verify vendor ownership
    const hasVendorItems = ord.items.some((it) => (it.vendorId || 'vendor-1') === vendorId);
    if (!hasVendorItems && vendorId !== 'admin') {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied: You do not own items in this order.', order: null };
    }

    const current = String(ord.status || 'Pending').toLowerCase();
    const target = String(status || '').toLowerCase();

    // Atomic State Transition Guard:
    // If order is already Accepted, Processing, Shipped, Delivered, or Rejected, Accept/Reject actions must not mutate state.
    if (current === 'accepted' || current === 'processing' || current === 'shipped' || current === 'delivered') {
      if (target === 'accepted' || target === 'rejected') {
        return {
          success: false,
          code: 'ALREADY_FINAL',
          message: `Order is already ${ord.status} and cannot be modified.`,
          order: ord,
        };
      }
    }

    if (current === 'rejected') {
      if (target === 'accepted' || target === 'rejected') {
        return {
          success: false,
          code: 'ALREADY_FINAL',
          message: 'Order was rejected and cannot be modified.',
          order: ord,
        };
      }
    }

    const formattedStatus =
      target === 'accepted' ? 'Accepted' : target === 'rejected' ? 'Rejected' : status;
    ord.status = formattedStatus;
    if (reason && (target === 'rejected' || formattedStatus === 'Rejected')) {
      (ord as any).rejectionReason = reason;
    }
    this.saveData(this.data);

    return {
      success: true,
      message: `Order status updated to ${formattedStatus}`,
      order: ord,
    };
  }

  // --- BANNERS ---
  getBanners(): BannerItem[] {
    return this.data.banners;
  }

  // --- REVIEWS ---
  getReviews(): ReviewItem[] {
    return this.data.reviews || [];
  }

  addReview(review: ReviewItem): ReviewItem {
    if (!this.data.reviews) {
      this.data.reviews = [];
    }
    this.data.reviews.unshift(review);
    this.saveData(this.data);
    return review;
  }

  deleteReview(id: string): boolean {
    if (!this.data.reviews) return false;
    const initialLen = this.data.reviews.length;
    this.data.reviews = this.data.reviews.filter((r) => r.id !== id);
    if (this.data.reviews.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }
}

export const dbStore = new LocalDbStore();
