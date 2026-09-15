import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin or any localhost port
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(
  express.json({
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
import { authenticate } from './middleware/auth';

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(authenticate);

// Routes
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import bannerRoutes from './routes/bannerRoutes';
import vendorRoutes from './routes/vendorRoutes';
import reviewRoutes from './routes/reviewRoutes';
import { brandRouter, ageGroupRouter, offerRouter } from './routes/metaRoutes';

// Root Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Multi-Vendor Kids Toy E-Commerce Connected API is running!',
    endpoints: {
      products: '/api/products',
      categories: '/api/categories',
      vendors: '/api/vendors',
      brands: '/api/brands',
      ageGroups: '/api/age-groups',
      offers: '/api/offers',
      orders: '/api/orders',
      banners: '/api/banners',
      approvals: '/api/products/pending',
    },
    ports: {
      website: 'http://localhost:3000',
      admin: 'http://localhost:5173',
      api: `http://localhost:${PORT}`,
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
import customerRoutes from './routes/customerRoutes';
import vendorDeliveryRoutes from './routes/vendorDeliveryRoutes';
import checkoutRoutes from './routes/checkoutRoutes';
import shippingRoutes from './routes/shippingRoutes';
import paymentRoutes from './routes/paymentRoutes';
import newsletterRoutes from './routes/newsletterRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import { adminMarketplaceRouter } from './routes/adminMarketplaceRoutes';

app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/marketplace', adminMarketplaceRouter);
app.use('/api/customers', customerRoutes);
app.use('/api/customer', shippingRoutes);
app.use('/api/vendor/delivery-pincodes', vendorDeliveryRoutes);
app.use('/api/vendors/delivery-pincodes', vendorDeliveryRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/brands', brandRouter);
app.use('/api/age-groups', ageGroupRouter);
app.use('/api/offers', offerRouter);
app.use('/api/orders', orderRoutes);
app.use('/api/banners', bannerRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Multi-Vendor Kids Toy API Server running on port ${PORT}`);
  console.log(`📦 Admin & Vendor Dashboard: http://localhost:5173`);
  console.log(`🛍️ Customer Storefront: http://localhost:3000`);
});
