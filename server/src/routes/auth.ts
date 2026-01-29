import express, { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/db';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

// schemas
const registerSchema = z.object({
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string().min(8)
});

const loginSchema = z.object({
    username: z.string(),
    password: z.string()
});

const usernameSchema = z.object({
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
});

// Rate limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 attempts per 15 minutes
    message: 'Too many attempts, please try again later.'
});

// Auth Middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        (req as any).user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// POST /auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
    try {
        const { username, password } = registerSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const passwordHash = await argon2.hash(password);

        // Create User
        const user = await prisma.user.create({
            data: {
                username,
                password_hash: passwordHash,
            }
        });

        // Login immediately
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ user: { id: user.id, username: user.username } });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues.map(e => e.message).join(', ') });
        }
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
    try {
        const { username, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await argon2.verify(user.password_hash, password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check 2FA
        if (user.is_2fa_enabled) {
            // Issue temp token
            const tempToken = jwt.sign({ userId: user.id, purpose: '2fa_auth' }, JWT_SECRET, { expiresIn: '5m' });
            return res.json({ status: '2fa_required', tempToken });
        }

        // Success (No 2FA)
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ status: 'success', user: { id: user.id, username: user.username } });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues.map(e => e.message).join(', ') });
        }
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /auth/username
router.patch('/username', requireAuth, async (req: Request, res: Response) => {
    try {
        const { username } = usernameSchema.parse(req.body);
        const userId = (req as any).user.userId;

        // Check if username is already taken
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        // Update username
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { username },
            select: { id: true, username: true }
        });

        res.json({ user: updatedUser });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues.map(e => e.message).join(', ') });
        }
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

export default router;
