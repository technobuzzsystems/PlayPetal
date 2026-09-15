import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma/client';
import { authenticate, requireAuth, getCookieOptions, extractSessionId } from '../middleware/auth';
import { sessionStore } from '../data/sessionStore';

const router = Router();

const DATA_DIR = path.join(__dirname, '../../data');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CUSTOMERS_FILE)) {
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify([]));
}

const getCustomers = () => {
  try {
    const data = fs.readFileSync(CUSTOMERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const saveCustomers = (customers: any[]) => {
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
};

// POST Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const customers = getCustomers();
    
    if (customers.find((c: any) => c.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    let dbUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password,
          name,
          role: 'CUSTOMER'
        }
      });
    }

    const newCustomer = {
      id: dbUser.id,
      name,
      email: email.toLowerCase(),
      password,
      playPoints: 50,
      createdAt: new Date().toISOString()
    };

    customers.push(newCustomer);
    saveCustomers(customers);

    const session = await sessionStore.create({
      userId: dbUser.id,
      email: dbUser.email,
      role: 'CUSTOMER',
      status: 'ACTIVE'
    });

    res.cookie('pp_session', session.id, getCookieOptions());

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      customer: { id: dbUser.id, name: dbUser.name || name, email: dbUser.email, playPoints: 50, hasAddress: false, addressesCount: 0 }
    });
  } catch (error) {
    console.error('[Register API] Error:', error);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// POST Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const customers = getCustomers();
    const customer = customers.find((c: any) => c.email === email.toLowerCase() && c.password === password);

    if (!customer) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let dbUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password,
          name: customer.name || email.split('@')[0],
          role: 'CUSTOMER'
        }
      });
    }

    const session = await sessionStore.create({
      userId: dbUser.id,
      email: dbUser.email,
      role: 'CUSTOMER',
      status: 'ACTIVE'
    });

    const addressesCount = await prisma.address.count({ where: { userId: dbUser.id } });

    res.cookie('pp_session', session.id, getCookieOptions());

    res.json({
      success: true,
      message: 'Login successful!',
      customer: {
        id: dbUser.id,
        name: dbUser.name || customer.name,
        email: dbUser.email,
        phone: dbUser.phone || null,
        playPoints: customer.playPoints || 50,
        hasAddress: addressesCount > 0,
        addressesCount
      }
    });
  } catch (error) {
    console.error('[Login API] Error:', error);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

// POST Google Login with Server-Side ID Token Verification & Address Check
router.post('/google-login', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google ID token credential is required.' });
    }

    let payload: any = null;

    // DEV Google Mode Handling - Strict Production Rejection
    if (credential === 'dev_google_token') {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction && process.env.ALLOW_DEV_AUTH !== 'true') {
        return res.status(403).json({
          error: 'DEV_AUTH_FORBIDDEN',
          message: 'Development Google token simulation is disabled in production environments.'
        });
      }
      payload = {
        sub: 'dev_google_sub_12345',
        email: 'google.user@example.com',
        name: 'Google Account User (Dev)',
      };
    } else {
      const googleClientId = process.env.GOOGLE_CLIENT_ID || '187700950056-nnjsjv31g3icca81cin2rgj22kcgdqb0.apps.googleusercontent.com';
      try {
        const { OAuth2Client } = await import('google-auth-library');
        const client = new OAuth2Client(googleClientId);
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: googleClientId,
        });
        payload = ticket.getPayload();
      } catch (verifyErr: any) {
        console.error('[Google SSO] Token verification failed:', verifyErr.message);
        return res.status(401).json({
          error: 'INVALID_GOOGLE_TOKEN',
          message: `Google token verification failed: ${verifyErr.message || 'Invalid signature or audience.'}`
        });
      }
    }

    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ error: 'Google payload missing required sub or email claims.' });
    }

    const googleSub = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || 'Google User';

    let dbUser = await prisma.user.findFirst({
      where: { OR: [{ googleSub }, { email }] }
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email,
          googleSub,
          name,
          password: `google_oauth_${googleSub}`,
          role: 'CUSTOMER'
        }
      });
    } else if (!dbUser.googleSub || !dbUser.password) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          googleSub: dbUser.googleSub || googleSub,
          password: dbUser.password || `google_oauth_${googleSub}`
        }
      });
    }

    const customers = getCustomers();
    let customer = customers.find((c: any) => c.googleSub === googleSub || c.email === email);
    if (!customer) {
      customer = {
        id: dbUser.id,
        name,
        email,
        googleSub,
        password: `google_oauth_${googleSub}`,
        playPoints: 100,
        createdAt: new Date().toISOString()
      };
      customers.push(customer);
    } else {
      customer.id = dbUser.id;
      customer.googleSub = googleSub;
    }
    saveCustomers(customers);

    const session = await sessionStore.create({
      userId: dbUser.id,
      email: dbUser.email,
      role: 'CUSTOMER',
      status: 'ACTIVE'
    });

    const addressesCount = await prisma.address.count({ where: { userId: dbUser.id } });

    res.cookie('pp_session', session.id, getCookieOptions());

    res.json({
      success: true,
      message: 'Google login verified and authenticated successfully!',
      customer: {
        id: dbUser.id,
        name: dbUser.name || name,
        email: dbUser.email,
        phone: dbUser.phone || null,
        playPoints: customer.playPoints || 100,
        hasAddress: addressesCount > 0,
        addressesCount
      }
    });
  } catch (error: any) {
    console.error('[Google SSO] Unexpected error during google-login:', error);
    res.status(500).json({ error: 'Server error during Google authentication.' });
  }
});

// GET /api/customers/me - Fetch authoritative authenticated customer profile
router.get('/me', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
      return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'User not found or session expired.' });
    }

    const customers = getCustomers();
    const customer = customers.find((c: any) => c.id === dbUser.id || c.email === dbUser.email);
    const addressesCount = await prisma.address.count({ where: { userId: dbUser.id } });

    res.json({
      success: true,
      customer: {
        id: dbUser.id,
        name: dbUser.name || (customer ? customer.name : dbUser.email.split('@')[0]),
        email: dbUser.email,
        phone: dbUser.phone || (customer ? customer.phone : null) || null,
        playPoints: customer ? (customer.playPoints || 50) : 50,
        hasAddress: addressesCount > 0,
        addressesCount,
      },
    });
  } catch (error: any) {
    console.error('[Customer Me API] Error:', error);
    res.status(500).json({ error: 'Failed to resolve user session.' });
  }
});

// POST /api/customers/logout - Invalidate server session and clear auth cookie
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sessionId = extractSessionId(req);
    if (sessionId) {
      await sessionStore.destroy(sessionId);
    }
    res.clearCookie('pp_session', getCookieOptions());
    res.clearCookie('pp_token', getCookieOptions());
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    console.error('[Customer Logout API] Error:', error);
    res.status(500).json({ error: 'Failed to logout session.' });
  }
});

// PUT /api/customers/profile - Session-authenticated customer profile update (name & phone)
router.put('/profile', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, phone } = req.body;

    let cleanPhone: string | null = null;
    if (phone !== undefined && phone !== null && phone !== '') {
      const p = String(phone).trim().replace(/\s+/g, '');
      const is10Digit = /^[6-9]\d{9}$/.test(p);
      const isPlus91 = /^\+91[6-9]\d{9}$/.test(p);

      if (!is10Digit && !isPlus91) {
        return res.status(400).json({
          error: 'INVALID_PHONE',
          message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
        });
      }
      cleanPhone = isPlus91 ? p : `+91 ${p.slice(-10)}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && typeof name === 'string' && name.trim().length >= 2 ? { name: name.trim() } : {}),
        ...(cleanPhone !== null ? { phone: cleanPhone } : {}),
      },
    });

    // Sync in-memory JSON data
    const customers = getCustomers();
    const customer = customers.find((c: any) => c.id === userId || c.email === updatedUser.email);
    if (customer) {
      if (name) customer.name = updatedUser.name;
      if (cleanPhone) customer.phone = cleanPhone;
      saveCustomers(customers);
    }

    const addressesCount = await prisma.address.count({ where: { userId } });

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      customer: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        playPoints: customer ? (customer.playPoints || 50) : 50,
        hasAddress: addressesCount > 0,
        addressesCount,
      },
    });
  } catch (error: any) {
    console.error('[Customer Profile API] Error:', error);
    res.status(500).json({ error: 'Failed to update profile.', message: error.message });
  }
});

// GET /api/customers/addresses
router.get('/addresses', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });
    res.json({ success: true, addresses });
  } catch (error: any) {
    console.error('[Addresses API] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses.' });
  }
});

// POST /api/customers/addresses
router.post('/addresses', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { title, name, phone, street, city, state, pincode, country, latitude, longitude, isDefault } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Full name (at least 2 characters) is required.' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Valid phone number is required.' });
    }
    if (!street || typeof street !== 'string' || street.trim().length < 3) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Street address is required.' });
    }
    if (!city || typeof city !== 'string' || city.trim().length < 2) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'City is required.' });
    }
    if (!state || typeof state !== 'string' || state.trim().length < 2) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'State is required.' });
    }
    if (!pincode || typeof pincode !== 'string' || pincode.trim().length < 3) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'PIN code is required.' });
    }

    let lat: number | null = null;
    let lng: number | null = null;
    if (latitude !== undefined && latitude !== null && latitude !== '') {
      const parsed = parseFloat(latitude);
      if (isNaN(parsed) || parsed < -90 || parsed > 90) {
        return res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Latitude must be between -90 and 90.' });
      }
      lat = parsed;
    }
    if (longitude !== undefined && longitude !== null && longitude !== '') {
      const parsed = parseFloat(longitude);
      if (isNaN(parsed) || parsed < -180 || parsed > 180) {
        return res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Longitude must be between -180 and 180.' });
      }
      lng = parsed;
    }

    const count = await prisma.address.count({ where: { userId } });
    const markDefault = Boolean(isDefault) || count === 0;

    const address = await prisma.$transaction(async (tx) => {
      if (markDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }
      return tx.address.create({
        data: {
          userId,
          title: title || 'Home',
          name: name.trim(),
          phone: phone.trim(),
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: country ? country.trim() : 'India',
          latitude: lat,
          longitude: lng,
          isDefault: markDefault
        }
      });
    });

    res.status(201).json({ success: true, message: 'Address created successfully!', address });
  } catch (error: any) {
    console.error('[Addresses API] Creation failed:', error);
    res.status(500).json({ error: 'Failed to create address.', message: error.message });
  }
});

// PUT /api/customers/addresses/:addressId
router.put('/addresses/:addressId', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { addressId } = req.params;

    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing || existing.userId !== userId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied. You do not own this address.' });
    }

    const { title, name, phone, street, city, state, pincode, country, latitude, longitude, isDefault } = req.body;

    let lat: number | null = existing.latitude;
    let lng: number | null = existing.longitude;
    if (latitude !== undefined && latitude !== null && latitude !== '') {
      const parsed = parseFloat(latitude);
      if (isNaN(parsed) || parsed < -90 || parsed > 90) {
        return res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Latitude must be between -90 and 90.' });
      }
      lat = parsed;
    }
    if (longitude !== undefined && longitude !== null && longitude !== '') {
      const parsed = parseFloat(longitude);
      if (isNaN(parsed) || parsed < -180 || parsed > 180) {
        return res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Longitude must be between -180 and 180.' });
      }
      lng = parsed;
    }

    const updatedAddress = await prisma.$transaction(async (tx) => {
      if (isDefault && !existing.isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }
      return tx.address.update({
        where: { id: addressId },
        data: {
          title: title !== undefined ? title : existing.title,
          name: name !== undefined ? name.trim() : existing.name,
          phone: phone !== undefined ? phone.trim() : existing.phone,
          street: street !== undefined ? street.trim() : existing.street,
          city: city !== undefined ? city.trim() : existing.city,
          state: state !== undefined ? state.trim() : existing.state,
          pincode: pincode !== undefined ? pincode.trim() : existing.pincode,
          country: country !== undefined ? country.trim() : existing.country,
          latitude: lat,
          longitude: lng,
          isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault
        }
      });
    });

    res.json({ success: true, message: 'Address updated successfully!', address: updatedAddress });
  } catch (error: any) {
    console.error('[Addresses API] Update failed:', error);
    res.status(500).json({ error: 'Failed to update address.' });
  }
});

// DELETE /api/customers/addresses/:addressId
router.delete('/addresses/:addressId', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { addressId } = req.params;

    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing || existing.userId !== userId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied. You do not own this address.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });
      if (existing.isDefault) {
        const remaining = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });
        if (remaining) {
          await tx.address.update({
            where: { id: remaining.id },
            data: { isDefault: true }
          });
        }
      }
    });

    res.json({ success: true, message: 'Address deleted successfully.' });
  } catch (error: any) {
    console.error('[Addresses API] Delete failed:', error);
    res.status(500).json({ error: 'Failed to delete address.' });
  }
});

// PUT /api/customers/addresses/:addressId/default
router.put('/addresses/:addressId/default', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { addressId } = req.params;

    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing || existing.userId !== userId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied. You do not own this address.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true }
      });
    });

    res.json({ success: true, message: 'Default address updated!', address: updated });
  } catch (error: any) {
    console.error('[Addresses API] Default setting failed:', error);
    res.status(500).json({ error: 'Failed to set default address.' });
  }
});

// GET all customers for Admin Panel
router.get('/', (req: Request, res: Response) => {
  try {
    res.json(getCustomers());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

export default router;
