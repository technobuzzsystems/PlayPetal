const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  description: string;
  shortDescription?: string;
  categoryId: string;
  category?: string | { id: string; name: string };
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
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'Active';
  isActive?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  rating: number;
  salesCount: number;
  image: string;
  images: Array<{ id?: string; url: string; alt?: string }>;
  specifications?: Record<string, string>;
  features?: string[];
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  itemCount?: number;
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
  badge?: string;
  icon?: string;
  description?: string;
}

export interface Offer {
  id: string;
  title: string;
  discountPercent: number;
  code: string;
  description: string;
  tag?: string;
  category?: string;
}

export interface Order {
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
  shippingAddress: any;
  status: 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Paid' | 'Pending' | 'Failed';
  paymentMethod: string;
  createdAt: string;
}

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: '4WD Rock Crawler RC Monster Truck',
    slug: '4wd-rock-crawler-rc-monster-truck',
    sku: 'RC-TRUCK-4WD',
    category: 'Cars & Vehicles',
    categoryId: 'cat-2',
    brand: 'Hot Wheels',
    ageGroup: '6 - 8 Years',
    vendorId: 'vendor-2',
    vendorName: 'Kids World Collectibles',
    vendorRating: 4.8,
    basePrice: 1999,
    salePrice: 1499,
    price: 1499,
    discount: 25,
    stock: 28,
    status: 'APPROVED',
    isActive: true,
    rating: 4.9,
    salesCount: 142,
    image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&h=600&fit=crop',
    images: [
      { url: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&h=600&fit=crop' }
    ],
    shortDescription: 'Heavy-duty 4WD all-terrain monster crawler with 2.4GHz anti-interference controller.',
    description: 'Equipped with dual high-torque motors, realistic spring suspensions, and non-slip rubber tires designed to climb over grass, sand, and pebbles with ease.',
    specifications: {
      'Scale': '1:16 High Speed',
      'Battery': 'Rechargeable 7.4V Li-ion (included)',
      'Range': 'Up to 50 meters',
      'Material': 'Durable ABS alloy plastic'
    },
    features: ['2.4GHz remote control', 'Independent 4-wheel suspension', 'Shock-resistant bumpers', 'USB fast charging'],
  },
  {
    id: 'prod-2',
    name: 'RoboSmart Programmable AI Coding Robot',
    slug: 'robosmart-programmable-ai-coding-robot',
    sku: 'STEM-ROBO-01',
    category: 'STEM & Robotics',
    categoryId: 'cat-3',
    brand: 'LEGO',
    ageGroup: '9 - 12 Years',
    vendorId: 'vendor-1',
    vendorName: 'ABC Toys Wonderland',
    vendorRating: 4.9,
    basePrice: 3499,
    salePrice: 2799,
    price: 2799,
    discount: 20,
    stock: 15,
    status: 'APPROVED',
    isActive: true,
    rating: 5.0,
    salesCount: 88,
    image: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&h=600&fit=crop',
    images: [
      { url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&h=600&fit=crop' }
    ],
    shortDescription: 'Smart interactive educational robot that teaches visual block coding and obstacle navigation.',
    description: 'Empowers children to build problem-solving skills with intuitive scratch-style drag-and-drop mobile app coding, voice recognition, and ultrasonic path navigation.',
    specifications: {
      'Connectivity': 'Bluetooth 5.0 App Controlled',
      'Sensors': 'Infrared & Ultrasonic sensors',
      'Power': 'Rechargeable USB-C lithium cell'
    },
    features: ['Obstacle avoidance', 'Customizable dance & voice routines', '30+ coding learning missions', 'Scratch visual programming'],
  },
  {
    id: 'prod-3',
    name: 'Jumbo Cuddle Golden Bear Plushie (60cm)',
    slug: 'jumbo-cuddle-golden-bear-plushie',
    sku: 'PLUSH-BEAR-60',
    category: 'Soft Toys',
    categoryId: 'cat-1',
    brand: 'Melissa & Doug',
    ageGroup: '0 - 2 Years',
    vendorId: 'vendor-3',
    vendorName: 'Toy Planet & Hobbies',
    vendorRating: 4.7,
    basePrice: 1499,
    salePrice: 999,
    price: 999,
    discount: 33,
    stock: 35,
    status: 'APPROVED',
    isActive: true,
    rating: 4.8,
    salesCount: 210,
    image: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=600&h=600&fit=crop',
    images: [
      { url: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=600&h=600&fit=crop' }
    ],
    shortDescription: 'Super soft hypoallergenic organic cotton huggable teddy bear with silky plush fur.',
    description: 'Crafted with premium organic cotton and child-safe stitched safety eyes. Perfect bedtime companion that provides soothing warmth and emotional comfort for toddlers and kids.',
    specifications: {
      'Height': '60 cm / 24 inches',
      'Filling': '100% Recycled Polyfill',
      'Care': 'Machine washable gentle cycle'
    },
    features: ['Ultra-soft velvety touch', 'Child-safe embroidered eyes', 'Washable cover', 'Hypoallergenic fabric'],
  },
  {
    id: 'prod-4',
    name: 'Wooden Alphabet & Number Puzzle Board',
    slug: 'wooden-alphabet-number-puzzle-board',
    sku: 'WOOD-PUZZLE-01',
    category: 'Toys',
    categoryId: 'cat-1',
    brand: 'Melissa & Doug',
    ageGroup: '3 - 5 Years',
    vendorId: 'vendor-1',
    vendorName: 'ABC Toys Wonderland',
    vendorRating: 4.9,
    basePrice: 899,
    salePrice: 499,
    price: 499,
    discount: 44,
    stock: 40,
    status: 'APPROVED',
    isActive: true,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: true,
    rating: 4.8,
    salesCount: 165,
    image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&h=600&fit=crop',
    images: [
      { url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&h=600&fit=crop' }
    ],
    shortDescription: 'Colorful eco-friendly wooden puzzle board with chunky smooth-edge alphabet pieces.',
    description: 'Helps toddlers develop motor skills, letter recognition, and hand-eye coordination with non-toxic natural wood finishes.',
    features: ['Chunky wooden letters', 'Smooth non-toxic edges', 'Bright educational colors'],
  },
  {
    id: 'prod-5',
    name: 'Speedy Friction-Powered Stunt Racing Car',
    slug: 'speedy-friction-powered-stunt-racing-car',
    sku: 'RACE-STUNT-02',
    category: 'Cars & Vehicles',
    categoryId: 'cat-2',
    brand: 'Hot Wheels',
    ageGroup: '3 - 5 Years',
    vendorId: 'vendor-2',
    vendorName: 'Kids World Collectibles',
    vendorRating: 4.8,
    basePrice: 1199,
    salePrice: 799,
    price: 799,
    discount: 33,
    stock: 50,
    status: 'APPROVED',
    isActive: true,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    rating: 4.7,
    salesCount: 220,
    image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&h=600&fit=crop',
    images: [
      { url: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&h=600&fit=crop' }
    ],
    shortDescription: 'High-velocity 360-degree push-and-go friction stunt car with shock-proof bumpers.',
    description: 'Runs on push power with zero batteries required. Flips and rolls over obstacles smoothly on high-grip rubber tires.',
    features: ['360-degree flip stunts', 'Zero battery friction motor', 'High-grip rubber tires'],
  }
];

export const api = {
  async getProducts(params?: Record<string, any>): Promise<Product[]> {
    try {
      const cleanParams: Record<string, string> = {};
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            cleanParams[k] = String(v);
          }
        });
      }
      const qs = Object.keys(cleanParams).length > 0 ? '?' + new URLSearchParams(cleanParams).toString() : '';
      const res = await fetch(`${API_BASE}/products${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API fetch failed');
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : FALLBACK_PRODUCTS;
    } catch (err) {
      console.warn('Using fallback products due to fetch failure:', err);
      return FALLBACK_PRODUCTS;
    }
  },

  async getProductById(id: string): Promise<Product | null> {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch (err) {
      const fallback = FALLBACK_PRODUCTS.find(p => p.id === id || p.slug === id);
      return fallback || null;
    }
  },

  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${API_BASE}/categories`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch (err) {
      return [];
    }
  },

  async getBrands(): Promise<Brand[]> {
    try {
      const res = await fetch(`${API_BASE}/brands`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch (err) {
      return [
        {
          id: 'brand-1',
          name: 'LEGO',
          slug: 'lego',
          logo: '/brands/lego.svg',
          description: 'Creative building blocks and robotics',
          featured: true,
        },
        {
          id: 'brand-2',
          name: 'Hot Wheels',
          slug: 'hot-wheels',
          logo: '/brands/hot-wheels.svg',
          description: 'Diecast cars and stunt loops',
          featured: true,
        },
        {
          id: 'brand-3',
          name: 'Barbie',
          slug: 'barbie',
          logo: '/brands/barbie.svg',
          description: 'Fashion dolls and playsets',
          featured: true,
        },
        {
          id: 'brand-4',
          name: 'Fisher-Price',
          slug: 'fisher-price',
          logo: '/brands/fisher-price.svg',
          description: 'Early learning and infant toys',
          featured: true,
        },
        {
          id: 'brand-5',
          name: 'Nerf',
          slug: 'nerf',
          logo: '/brands/nerf.svg',
          description: 'Safe foam target blasters',
          featured: true,
        },
        {
          id: 'brand-6',
          name: 'Melissa & Doug',
          slug: 'melissa-and-doug',
          logo: '/brands/melissa-doug.svg',
          description: 'Wooden educational puzzles',
          featured: true,
        },
      ];
    }
  },

  async getAgeGroups(): Promise<AgeGroup[]> {
    try {
      const res = await fetch(`${API_BASE}/age-groups`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch (err) {
      return [
        { id: 'age-0-2', label: '0 - 2 Years', subtitle: 'Babies & Toddlers', minAge: 0, maxAge: 2, icon: '🧸', description: 'Sensory rattles & cuddly plushies' },
        { id: 'age-3-5', label: '3 - 5 Years', subtitle: 'Pre-Schoolers', minAge: 3, maxAge: 5, icon: '🎨', description: 'Pretend play sets & chunky puzzles' },
        { id: 'age-6-8', label: '6 - 8 Years', subtitle: 'Early Explorers', minAge: 6, maxAge: 8, icon: '🚀', description: 'RC cars, building blocks & board games' },
        { id: 'age-9-12', label: '9 - 12 Years', subtitle: 'Young Innovators', minAge: 9, maxAge: 12, icon: '⚡', description: 'Robotics kits & coding tech' },
        { id: 'age-13-plus', label: '13+ Years', subtitle: 'Teens & Hobbyists', minAge: 13, maxAge: 99, icon: '🎮', description: 'Advanced mechanical LEGO & drones' },
      ];
    }
  },

  async getOffers(): Promise<Offer[]> {
    try {
      const res = await fetch(`${API_BASE}/offers`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch (err) {
      return [
        { id: 'offer-1', title: 'Super Saver Toy Festival', discountPercent: 25, code: 'FESTIVAL25', description: 'Flat 25% discount on all LEGO, STEM Robotics, and educational toys.', tag: 'Limited Time' },
        { id: 'offer-2', title: 'Mega Weekend Action Deal', discountPercent: 30, code: 'WEEKEND30', description: 'Get up to 30% off on all RC Cars, Drones, and Outdoor Blasters.', tag: 'Weekend Special' },
        { id: 'offer-3', title: 'Toddler Care Welcome Treat', discountPercent: 20, code: 'TODDLER20', description: 'Enjoy 20% off on premium organic plush soft toys.', tag: 'Top Rated' },
        { id: 'offer-4', title: 'Free Express Shipping', discountPercent: 15, code: 'FREESHIP', description: 'Free express doorstep delivery on all orders above ₹999 across India.', tag: 'Storewide' },
      ];
    }
  },

  async createOrder(orderData: any): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to create order: ${errBody}`);
    }
    return await res.json();
  },

  async getOrders(): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE}/orders`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return await res.json();
    } catch (err) {
      return [];
    }
  },
  async getReviews(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/reviews`, { cache: 'no-store' });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },
  async submitReview(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to submit review');
    return await res.json();
  },
};
