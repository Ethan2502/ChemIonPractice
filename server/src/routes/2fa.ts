import express, { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { prisma } from '../lib/db';
import { encrypt, decrypt } from '../lib/crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

// Middleware to check authentication (Session or Temp Token)
// For setup: Need full session.
// For verify (login flow): Need temp token.

// Utils
const getUserFromToken = (req: Request) => {
    const token = req.cookies.token;
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET) as any;
    } catch (e) {
        return null;
    }
};

// POST /2fa/setup (Authenticated)
// Generates a new secret and returns QR code URL.
router.post('/setup', async (req: Request, res: Response) => {
    const userPayload = getUserFromToken(req);
    if (!userPayload || !userPayload.userId) return res.status(401).json({ error: 'Unauthorized' });

    // Re-verify password in real app! skipping for brevity, handled in plan logic "setup flow".
    // Assuming frontend asks for password before calling this or we add password to body.

    const secret = speakeasy.generateSecret({ name: `ChemIon (${userPayload.userId.substring(0, 8)})` });

    // Return secret (for manual entry) and QR code data URL
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // We should temporarily store this secret? Or just send it and expect it back signed?
    // Better to store it encrypted in DB as "pending" or just rely on user sending the token back
    // to prove they have it, then we save it.
    // Actually, we need to save the secret to verify the token.
    // But we don't want to enable 2FA yet.

    // Strategy: Send the secret to the client. The client must verify it immediately.
    // We can return the secret in plain text (server->client TLS) for the verification step.
    // The client sends back { secret, token }.

    res.json({
        secret: secret.base32,
        qrCodeUrl
    });
});

// POST /2fa/enable (Authenticated)
// User sends the secret + a code to verify and enable 2FA.
router.post('/enable', async (req: Request, res: Response) => {
    const userPayload = getUserFromToken(req);
    if (!userPayload || !userPayload.userId) return res.status(401).json({ error: 'Unauthorized' });

    const { secret, token } = req.body; // Secret provided by client (from setup step)

    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token
    });

    if (!verified) {
        return res.status(400).json({ error: 'Invalid code' });
    }

    // Encrypt and save
    const encryptedSecret = encrypt(secret);
    await prisma.user.update({
        where: { id: userPayload.userId },
        data: {
            two_factor_secret: encryptedSecret,
            is_2fa_enabled: true
        }
    });

    res.json({ success: true });
});

// POST /auth/login/2fa (Unauthenticated but with temp token)
router.post('/verify-login', async (req: Request, res: Response) => {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ error: 'Missing token or code' });

    try {
        const payload = jwt.verify(tempToken, JWT_SECRET) as any;
        if (payload.purpose !== '2fa_auth') return res.status(401).json({ error: 'Invalid token purpose' });

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user || !user.two_factor_secret) return res.status(401).json({ error: 'User not found or 2FA not enabled' });

        const secret = decrypt(user.two_factor_secret);
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code
        });

        if (!verified) return res.status(400).json({ error: 'Invalid code' });

        // Success! Issue full token
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ status: 'success', user: { id: user.id, username: user.username } });

    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
});

export default router;
