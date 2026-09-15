import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { dbStore } from '../data/dbStore';
import { sessionStore } from '../data/sessionStore';
import { requireAuth, requireRole, COOKIE_NAME, getCookieOptions } from '../middleware/auth';
import { loginRateLimiter, logSecurityEvent, sanitizeSystemUser } from '../utils/security';

const router = Router();

// POST /api/admin/login
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, identifier, username, password } = req.body;
    const rawId = String(email || identifier || username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (!rawId || !cleanPass) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    const systemUsers = await dbStore.getSystemUsers();
    const user = systemUsers.find(
      (u) =>
        u.email.toLowerCase() === rawId ||
        (rawId === 'admin' && (u.email === 'admin@playpetal.com' || u.email === 'admin@kidsplaystore.com'))
    );

    if (!user) {
      logSecurityEvent('LOGIN_FAILURE', {
        email: rawId,
        role: 'ADMIN',
        ip: req.ip,
        status: 'FAILURE',
        reason: 'Admin user not found',
      });
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid admin credentials.' });
    }

    if (user.status !== 'ACTIVE') {
      logSecurityEvent('LOGIN_FAILURE', {
        userId: user.id,
        email: user.email,
        role: 'ADMIN',
        ip: req.ip,
        status: 'FAILURE',
        reason: `Admin account is ${user.status}`,
      });
      return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: `Account is currently ${user.status}.` });
    }

    const matches = await bcrypt.compare(cleanPass, user.passwordHash);
    if (!matches) {
      logSecurityEvent('LOGIN_FAILURE', {
        userId: user.id,
        email: user.email,
        role: 'ADMIN',
        ip: req.ip,
        status: 'FAILURE',
        reason: 'Password mismatch',
      });
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid admin credentials.' });
    }

    // Update last login timestamp
    await dbStore.updateSystemUser(user.id, { lastLoginAt: new Date().toISOString() });

    // Create secure server-managed session
    const session = await sessionStore.create({
      userId: user.id,
      email: user.email,
      role: 'ADMIN',
      status: user.status,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Set HttpOnly SameSite cookie
    res.cookie(COOKIE_NAME, session.id, getCookieOptions());

    logSecurityEvent('ADMIN_LOGIN', {
      userId: user.id,
      email: user.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      reason: 'Admin authentication successful',
    });

    res.json({
      success: true,
      message: 'Admin authentication successful',
      user: sanitizeSystemUser(user),
      sessionId: session.id, // For fallback non-browser API clients only
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An internal error occurred during login.' });
  }
});

// GET /api/admin/me
router.get('/me', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const user = await dbStore.getSystemUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Admin profile not found.' });
    }
    res.json({
      success: true,
      user: sanitizeSystemUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve admin profile.' });
  }
});

// POST /api/admin/change-password
router.post('/change-password', requireAuth, requireRole('ADMIN', 'CATALOG_MANAGER', 'ORDER_MANAGER', 'FINANCE_MANAGER', 'SUPPORT_AGENT'), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, email, username } = req.body;
    const cleanCurrentPass = String(currentPassword || '').trim();
    const cleanNewPass = String(newPassword || '').trim();
    const cleanEmail = String(email || username || '').trim().toLowerCase();

    if (!cleanCurrentPass) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Current password is required.' });
    }

    const userId = req.user!.userId;
    const user = await dbStore.getSystemUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Admin profile not found.' });
    }

    const matches = await bcrypt.compare(cleanCurrentPass, user.passwordHash);
    if (!matches) {
      logSecurityEvent('LOGIN_FAILURE', {
        userId: user.id,
        email: user.email,
        role: 'ADMIN',
        ip: req.ip,
        status: 'FAILURE',
        reason: 'Admin password change attempt with invalid current password',
      });
      return res.status(400).json({ error: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect.' });
    }

    const updateData: { email?: string; passwordHash?: string } = {};

    if (cleanEmail && cleanEmail !== user.email.toLowerCase()) {
      updateData.email = cleanEmail;
    }

    if (cleanNewPass) {
      const saltRounds = 12;
      updateData.passwordHash = await bcrypt.hash(cleanNewPass, saltRounds);
    }

    if (Object.keys(updateData).length > 0) {
      const updatedUser = await dbStore.updateSystemUser(user.id, updateData);
      if (!updatedUser) {
        return res.status(500).json({ error: 'UPDATE_FAILED', message: 'Failed to update admin profile in database.' });
      }
      logSecurityEvent('ADMIN_LOGIN', {
        userId: user.id,
        email: updatedUser.email,
        role: 'ADMIN',
        ip: req.ip,
        status: 'SUCCESS',
        reason: 'Admin password/credentials changed successfully',
      });
    }

    res.json({
      success: true,
      message: 'Admin credentials updated successfully.',
    });
  } catch (error) {
    console.error('Error changing admin password:', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to update admin password.' });
  }
});

// POST /api/admin/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    if (req.sessionId) {
      await sessionStore.destroy(req.sessionId);
    }
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    logSecurityEvent('LOGOUT', {
      userId: req.user?.userId,
      email: req.user?.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      reason: 'Admin logged out successfully',
    });

    res.json({ success: true, message: 'Admin logged out successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error during logout.' });
  }
});

export default router;
