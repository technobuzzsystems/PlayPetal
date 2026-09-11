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

export const defaultProducts: ProductItem[] = [
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
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    rating: 4.9,
    salesCount: 142,
    image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&h=600&fit=crop',
    images: [
      { url: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&h=600&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&h=600&fit=crop' }
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
    createdAt: '2026-02-01T10:00:00.000Z'
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
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: true,
    rating: 5.0,
    salesCount: 88,
    image: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&h=600&fit=crop',
    images: [
      { url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&h=600&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=600&fit=crop' }
    ],
    shortDescription: 'Smart interactive educational robot that teaches visual block coding and obstacle navigation.',
    description: 'Empowers children to build problem-solving skills with intuitive scratch-style drag-and-drop mobile app coding, voice recognition, and ultrasonic path navigation.',
    specifications: {
      'Connectivity': 'Bluetooth 5.0 App Controlled',
      'Sensors': 'Infrared & Ultrasonic sensors',
      'Power': 'Rechargeable USB-C lithium cell',
      'Compatibility': 'iOS and Android tablets & phones'
    },
    features: ['Obstacle avoidance', 'Customizable dance & voice routines', '30+ coding learning missions', 'Scratch visual programming'],
    createdAt: '2026-02-10T11:30:00.000Z'
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
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    rating: 4.8,
    salesCount: 210,
    image: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=600&h=600&fit=crop',
    images: [
      { url: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=600&h=600&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=600&fit=crop' }
    ],
    shortDescription: 'Super soft hypoallergenic organic cotton huggable teddy bear with silky plush fur.',
    description: 'Crafted with premium organic cotton and child-safe stitched safety eyes. Perfect bedtime companion that provides soothing warmth and emotional comfort for toddlers and kids.',
    specifications: {
      'Height': '60 cm / 24 inches',
      'Filling': '100% Recycled Polyfill',
      'Care': 'Machine washable gentle cycle',
      'Safety': 'EN71 & BIS certified non-toxic'
    },
    features: ['Ultra-soft velvety touch', 'Child-safe embroidered eyes', 'Washable cover', 'Hypoallergenic fabric'],
    createdAt: '2026-02-15T09:15:00.000Z'
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
    createdAt: '2026-02-18T10:00:00.000Z'
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
    createdAt: '2026-02-20T12:00:00.000Z'
  }
];

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
          products: parsed.products && parsed.products.length > 0 ? this.enrichExistingProducts(parsed.products) : defaultProducts,
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
          products: defaultProducts,
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
        products: defaultProducts,
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

    const rawImageUrls: string[] = [];
    if (item.image) rawImageUrls.push(item.image);
    if (Array.isArray(item.images)) {
      item.images.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) rawImageUrls.push(img.trim());
        else if (img && typeof img === 'object' && (img.url || img.src)) rawImageUrls.push((img.url || img.src).trim());
      });
    }
    if (Array.isArray((item as any).additionalImages)) {
      (item as any).additionalImages.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) rawImageUrls.push(img.trim());
      });
    }

    const uniqueUrls = Array.from(new Set(rawImageUrls.filter(Boolean)));
    const resolvedImages = uniqueUrls.length > 0
      ? uniqueUrls.map((url, idx) => ({ id: String(idx + 1), url, alt: `Angle ${idx + 1}` }))
      : [{ id: '1', url: item.image || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80', alt: 'Main Photo' }];

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
      image: uniqueUrls[0] || item.image || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80',
      images: resolvedImages,
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

    let updatedImages = existing.images;
    if (updates.images || updates.image || (updates as any).additionalImages) {
      const rawUpdateUrls: string[] = [];
      if (updates.image) rawUpdateUrls.push(updates.image);
      if (Array.isArray(updates.images)) {
        updates.images.forEach((img: any) => {
          if (typeof img === 'string' && img.trim()) rawUpdateUrls.push(img.trim());
          else if (img && typeof img === 'object' && (img.url || img.src)) rawUpdateUrls.push((img.url || img.src).trim());
        });
      }
      if (Array.isArray((updates as any).additionalImages)) {
        (updates as any).additionalImages.forEach((img: any) => {
          if (typeof img === 'string' && img.trim()) rawUpdateUrls.push(img.trim());
        });
      }
      const uniqueUpdateUrls = Array.from(new Set(rawUpdateUrls.filter(Boolean)));
      if (uniqueUpdateUrls.length > 0) {
        updatedImages = uniqueUpdateUrls.map((url, idx) => ({ id: String(idx + 1), url, alt: `Angle ${idx + 1}` }));
      }
    }

    const updated: ProductItem = {
      ...existing,
      ...updates,
      status: newStatus,
      isActive: newIsActive,
      isBestSeller: updates.isBestSeller !== undefined ? Boolean(updates.isBestSeller) : existing.isBestSeller,
      isNewArrival: updates.isNewArrival !== undefined ? Boolean(updates.isNewArrival) : existing.isNewArrival,
      isFeatured: updates.isFeatured !== undefined ? Boolean(updates.isFeatured) : existing.isFeatured,
      image: updates.image || updatedImages[0]?.url || existing.image,
      images: updatedImages,
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
    return this.data.orders;
  }

  getVendorOrders(vendorId: string): OrderItem[] {
    // Return orders containing items belonging to this vendor, filtered to vendor items
    return this.data.orders
      .filter((order) => order.items.some((it) => it.vendorId === vendorId))
      .map((order) => {
        const vendorItems = order.items.filter((it) => it.vendorId === vendorId);
        const vendorSubtotal = vendorItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
        return {
          ...order,
          items: vendorItems,
          totalAmount: vendorSubtotal,
        };
      });
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

    const newOrder: OrderItem = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
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

  // --- BANNERS ---
  getBanners(): BannerItem[] {
    return this.data.banners;
  }

  // --- REVIEWS ---
  getReviews(): ReviewItem[] {
    return this.data.reviews || [];
  }

  getVendorReviews(vendorId: string): ReviewItem[] {
    const vendorProds = this.getVendorProducts(vendorId).map((p) => String(p.id));
    const prodSet = new Set(vendorProds);
    return (this.data.reviews || []).filter(
      (r) => String(r.vendorId) === String(vendorId) || prodSet.has(String(r.productId))
    );
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
