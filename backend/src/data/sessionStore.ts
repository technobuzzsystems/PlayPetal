import crypto from 'crypto';
import { prisma } from '../prisma/client';

export interface Session {
  id: string; // 64-char hex string (256-bit entropy)
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  vendorId?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

const ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const IDLE_TTL_MS = 14 * 24 * 60 * 60 * 1000;     // 14 days

export class SessionStore {
  private cache: Map<string, Session> = new Map();

  constructor() {
    // Background task to prune expired sessions every 15 minutes
    setInterval(() => {
      this.prune().catch((err) => console.error('[SessionStore] Auto prune error:', err));
    }, 15 * 60 * 1000).unref();
  }

  public async create(data: {
    userId: string;
    email: string;
    role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
    vendorId?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    const id = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ABSOLUTE_TTL_MS);

    const session: Session = {
      id,
      userId: data.userId,
      email: data.email.toLowerCase().trim(),
      role: data.role,
      vendorId: data.vendorId,
      status: data.status || 'ACTIVE',
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      createdAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // 1. Cache immediately in memory
    this.cache.set(id, session);

    // 2. Persist to PostgreSQL Session table
    try {
      await prisma.session.create({
        data: {
          id,
          userId: data.userId,
          email: session.email,
          role: session.role,
          vendorId: session.vendorId || null,
          status: session.status,
          userAgent: session.userAgent || null,
          ipAddress: session.ipAddress || null,
          createdAt: now,
          lastActiveAt: now,
          expiresAt,
        },
      });
    } catch (err: any) {
      console.error('[SessionStore] Error persisting session to PostgreSQL:', err.message);
    }

    return session;
  }

  public async get(sessionId: string): Promise<Session | null> {
    if (!sessionId || typeof sessionId !== 'string') return null;

    let session: Session | undefined = this.cache.get(sessionId);

    // If not in cache, query PostgreSQL
    if (!session) {
      try {
        const dbSession = await prisma.session.findUnique({
          where: { id: sessionId },
        });

        if (dbSession) {
          session = {
            id: dbSession.id,
            userId: dbSession.userId,
            email: dbSession.email,
            role: dbSession.role as any,
            vendorId: dbSession.vendorId || undefined,
            status: dbSession.status as any,
            userAgent: dbSession.userAgent || undefined,
            ipAddress: dbSession.ipAddress || undefined,
            createdAt: dbSession.createdAt.toISOString(),
            lastActiveAt: dbSession.lastActiveAt.toISOString(),
            expiresAt: dbSession.expiresAt.toISOString(),
          };
          this.cache.set(sessionId, session);
        }
      } catch (err: any) {
        console.error('[SessionStore] Error fetching session from PostgreSQL:', err.message);
      }
    }

    if (!session) return null;

    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();
    const lastActive = new Date(session.lastActiveAt).getTime();

    // Check expiration or idle timeout
    if (now >= expiresAt || (now - lastActive) >= IDLE_TTL_MS) {
      await this.destroy(sessionId);
      return null;
    }

    return session;
  }

  public touch(sessionId: string): void {
    const session = this.cache.get(sessionId);
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + ABSOLUTE_TTL_MS);
    if (session) {
      session.lastActiveAt = now.toISOString();
      session.expiresAt = newExpiresAt.toISOString();
    }

    // Persist touch asynchronously to PostgreSQL
    prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActiveAt: now,
        expiresAt: newExpiresAt,
      },
    }).catch(() => {
      // Ignored non-fatal background error
    });
  }

  public async updateStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'): Promise<void> {
    for (const session of this.cache.values()) {
      if (session.userId === userId) {
        session.status = status;
      }
    }

    try {
      await prisma.session.updateMany({
        where: { userId },
        data: { status },
      });
    } catch (err: any) {
      console.error('[SessionStore] Error updating session status:', err.message);
    }
  }

  public async destroy(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;
    const existedInCache = this.cache.delete(sessionId);

    try {
      await prisma.session.delete({
        where: { id: sessionId },
      });
      return true;
    } catch {
      return existedInCache;
    }
  }

  public async destroyAllForUser(userId: string): Promise<number> {
    let count = 0;
    for (const [id, session] of this.cache.entries()) {
      if (session.userId === userId) {
        this.cache.delete(id);
        count++;
      }
    }

    try {
      const res = await prisma.session.deleteMany({
        where: { userId },
      });
      return res.count || count;
    } catch {
      return count;
    }
  }

  public async prune(): Promise<number> {
    const now = new Date();
    const idleCutoff = new Date(Date.now() - IDLE_TTL_MS);

    // Prune in-memory cache
    for (const [id, session] of this.cache.entries()) {
      const expiresAt = new Date(session.expiresAt).getTime();
      const lastActive = new Date(session.lastActiveAt).getTime();
      if (now.getTime() >= expiresAt || (now.getTime() - lastActive) >= IDLE_TTL_MS) {
        this.cache.delete(id);
      }
    }

    try {
      const res = await prisma.session.deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: now } },
            { lastActiveAt: { lte: idleCutoff } },
          ],
        },
      });
      return res.count;
    } catch {
      return 0;
    }
  }

  public async clearAll(): Promise<void> {
    this.cache.clear();
    try {
      await prisma.session.deleteMany({});
    } catch (err: any) {
      console.error('[SessionStore] Error clearing sessions:', err.message);
    }
  }
}

export const sessionStore = new SessionStore();
