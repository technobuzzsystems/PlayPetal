import { Router, Request, Response } from 'express';
import { dbStore } from '../data/dbStore';
import { sessionStore } from '../data/sessionStore';
import { COOKIE_NAME, getCookieOptions } from '../middleware/auth';

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
router.post('/register', async (req: Request, res: Response) => {
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

    const newVendor = dbStore.addVendor({
      name: finalOwnerName,
      shopName: finalShopName,
      email: finalEmail,
      phone: phone || '',
      city: city || 'Mumbai',
      address: address || '',
      description: description || 'Verified toy merchant partner on Play Petal Marketplace.',
    });

    const session = await sessionStore.create({
      userId: newVendor.id,
      email: newVendor.email,
      role: 'VENDOR',
      vendorId: newVendor.id,
      name: newVendor.name,
    });

    res.cookie(COOKIE_NAME, session.id, getCookieOptions());

    res.status(201).json({
      success: true,
      message: 'Shopkeeper registered and logged in successfully!',
      token: session.id,
      vendor: newVendor,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register shopkeeper' });
  }
});

// POST Login shopkeeper
router.post('/login', async (req: Request, res: Response) => {
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

    const session = await sessionStore.create({
      userId: vendor.id,
      email: vendor.email,
      role: 'VENDOR',
      vendorId: vendor.id,
      name: vendor.name,
    });

    res.cookie(COOKIE_NAME, session.id, getCookieOptions());

    res.json({
      success: true,
      message: 'Shopkeeper login successful!',
      token: session.id,
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

// GET vendor dashboard metrics
router.get('/:vendorId/dashboard', (req: Request, res: Response) => {
  try {
    const vendorId = String(req.params.vendorId);
    if (req.user && req.user.role === 'VENDOR') {
      const userVendorId = req.user.vendorId || req.user.userId;
      if (userVendorId && userVendorId !== vendorId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: Cannot view another vendor\'s dashboard.' });
      }
    }
    const summary = dbStore.getVendorDashboardSummary(vendorId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor dashboard summary' });
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

import { shippingService, ShippingActor } from '../services/shippingService';

// GET vendor orders
router.get('/:vendorId/orders', (req: Request, res: Response) => {
  try {
    const vendorId = String(req.params.vendorId);
    if (req.user && req.user.role === 'VENDOR') {
      const userVendorId = req.user.vendorId || req.user.userId;
      if (userVendorId && userVendorId !== vendorId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: Cannot view another vendor\'s orders.' });
      }
    }
    const orders = dbStore.getVendorOrders(vendorId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor orders' });
  }
});

// GET vendor order delivery tracking
router.get('/:vendorId/orders/:suborderId/tracking', async (req: Request, res: Response) => {
  try {
    const vendorId = String(req.params.vendorId);
    const suborderId = String(req.params.suborderId);

    if (req.user && req.user.role === 'VENDOR') {
      const userVendorId = req.user.vendorId || req.user.userId;
      if (userVendorId && userVendorId !== vendorId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: Cannot track another vendor\'s shipments.' });
      }
    }

    const actor: ShippingActor = req.user
      ? {
          id: req.user.userId || req.user.id,
          role: req.user.role,
          vendorId: req.user.vendorId || vendorId,
          email: req.user.email,
        }
      : {
          id: vendorId,
          role: 'VENDOR',
          vendorId: vendorId,
        };

    const tracking = await shippingService.getShipmentTracking(suborderId, actor);
    res.json(tracking);
  } catch (error: any) {
    if (error.message && error.message.includes('FORBIDDEN')) {
      return res.status(403).json({ error: 'FORBIDDEN', message: error.message });
    }
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: 'NOT_FOUND', message: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to retrieve vendor order tracking.' });
  }
});

// PATCH vendor order status (Vendor Decision with Atomic Guards)
router.patch('/:vendorId/orders/:orderId/status', (req: Request, res: Response) => {
  try {
    const vendorId = String(req.params.vendorId);
    const orderId = String(req.params.orderId);
    const { status, reason } = req.body;

    if (req.user && req.user.role === 'VENDOR') {
      const userVendorId = req.user.vendorId || req.user.userId;
      if (userVendorId && userVendorId !== vendorId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: Cannot modify another vendor\'s order.' });
      }
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const result = dbStore.updateVendorOrderStatus(vendorId, orderId, status, reason);
    if (!result.success) {
      if (result.code === 'FORBIDDEN') {
        return res.status(403).json({ error: 'FORBIDDEN', message: result.message });
      }
      if (result.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'NOT_FOUND', message: result.message });
      }
      if (result.code === 'ALREADY_FINAL') {
        return res.status(409).json({ error: 'ALREADY_FINAL', message: result.message, order: result.order });
      }
      return res.status(400).json({ error: result.message });
    }

    res.json({ success: true, message: result.message, order: result.order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor order status' });
  }
});

export default router;
