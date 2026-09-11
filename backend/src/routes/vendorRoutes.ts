import { Router, Request, Response } from 'express';
import { dbStore } from '../data/dbStore';

const router = Router();

// GET all vendors
router.get('/', (req: Request, res: Response) => {
  try {
    const vendors = dbStore.getVendors();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// POST Register new shopkeeper/vendor
router.post('/register', (req: Request, res: Response) => {
  try {
    const { name, ownerName, shopName, email, phone, city, address, description, password } = req.body;
    const finalOwnerName = (name || ownerName || shopName || '').trim();
    const finalShopName = (shopName || name || 'Kids Toy Store').trim();
    const finalEmail = (email || '').trim().toLowerCase();

    if (!finalOwnerName || !finalShopName || !finalEmail) {
      return res.status(400).json({ error: 'Shop name, owner name, and email are required.' });
    }

    const existing = dbStore.getVendors().find(v => v.email.toLowerCase() === finalEmail);
    if (existing) {
      return res.status(400).json({ error: 'A shopkeeper with this email already exists.' });
    }

    const created = dbStore.createVendor({
      name: finalOwnerName,
      shopName: finalShopName,
      email: finalEmail,
      phone: phone || '',
      city: city || 'Mumbai',
      address: address || '',
      description: description || '',
    });

    res.status(201).json({
      success: true,
      message: 'Shopkeeper account registered successfully! You can now start adding toys.',
      vendor: created,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register vendor' });
  }
});

// POST Login shopkeeper
router.post('/login', (req: Request, res: Response) => {
  try {
    const { identifier, email, username, emailOrPhone, password } = req.body;
    const rawId = identifier || email || username || emailOrPhone || '';
    const cleanId = String(rawId).trim().toLowerCase();

    if (!cleanId) {
      return res.status(400).json({ error: 'Email, phone, or shopkeeper ID is required.' });
    }

    const vendor = dbStore.getVendors().find(
      v =>
        v.email.toLowerCase() === cleanId ||
        v.id.toLowerCase() === cleanId ||
        v.name.toLowerCase() === cleanId ||
        v.shopName.toLowerCase() === cleanId ||
        (v.phone && v.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, ''))
    );

    if (!vendor) {
      return res.status(401).json({ error: 'No shopkeeper found with this email or username.' });
    }

    res.json({
      success: true,
      message: 'Shopkeeper login successful!',
      vendor,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET single vendor
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const vendor = dbStore.getVendorById(id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// GET vendor products
router.get('/:vendorId/products', (req: Request, res: Response) => {
  try {
    const vendorId = String(req.params.vendorId);
    const products = dbStore.getVendorProducts(vendorId);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor products' });
  }
});

// POST new product by vendor (creates as PENDING)
router.post('/:vendorId/products', (req: Request, res: Response) => {
  try {
    const vendorId = String(req.params.vendorId);
    const vendor = dbStore.getVendorById(vendorId);
    const productData = {
      ...req.body,
      vendorId,
      vendorName: vendor ? vendor.shopName : 'Vendor Partner',
      status: 'PENDING' as const,
      isActive: false,
    };
    const created = dbStore.createProduct(productData);
    res.status(201).json({
      success: true,
      message: 'Product submitted successfully and is awaiting Admin review.',
      product: created,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor product' });
  }
});

// GET vendor orders
router.get('/:vendorId/orders', (req: Request, res: Response) => {
  try {
    const vendorId = String(req.params.vendorId);
    const orders = dbStore.getVendorOrders(vendorId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor orders' });
  }
});

// Update vendor order status (Accept / Reject)
const updateVendorOrderStatus = (req: Request, res: Response) => {
  try {
    const orderId = String(req.params.orderId);
    const { status } = req.body;
    const updated = dbStore.updateOrderStatus(orderId, status);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

router.patch('/:vendorId/orders/:orderId/status', updateVendorOrderStatus);
router.put('/:vendorId/orders/:orderId/status', updateVendorOrderStatus);

// GET vendor reviews
router.get('/:vendorId/reviews', (req: Request, res: Response) => {
  try {
    const vendorId = String(req.params.vendorId);
    const reviews = dbStore.getVendorReviews(vendorId);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor reviews' });
  }
});

export default router;
