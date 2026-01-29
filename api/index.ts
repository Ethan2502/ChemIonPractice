import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from '../server/src/routes/auth';
import twoFactorRoutes from '../server/src/routes/2fa';
import scoreRoutes from '../server/src/routes/scores';
import userRoutes from '../server/src/routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Request logger for debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
const allowedOrigins = [
    'http://localhost:5174',
    'https://chem-ion-practice.vercel.app',
    process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        // Or if the origin is in our allowed list
        if (!origin || allowedOrigins.some(ao => origin.includes(ao.replace('https://', '').replace('http://', '')))) {
            callback(null, true);
        } else {
            console.log('Origin not allowed by CORS:', origin);
            callback(null, true); // Temporarily allow all for debugging
        }
    },
    credentials: true
}));

import { prisma } from '../server/src/lib/db';

const apiRouter = express.Router();

apiRouter.get('/health', async (req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'OK', database: 'connected' });
    } catch (err: any) {
        res.status(500).json({ status: 'ERROR', database: 'failed', error: err.message });
    }
});

// Mount routes on the apiRouter
apiRouter.use('/auth', authRoutes);
apiRouter.use('/2fa', twoFactorRoutes);
apiRouter.use('/scores', scoreRoutes);
apiRouter.use('/users', userRoutes);

// Use the apiRouter for any request (the Vercel rewrite handles the /api prefix)
app.use('/', apiRouter);

// 404 handler for the apiRouter
apiRouter.use((req, res) => {
    res.status(404).json({
        error: `Path ${req.originalUrl} not found on this server`,
        path: req.path,
        originalUrl: req.originalUrl
    });
});

// Keep top-level health check for direct verification
app.get('/health', (req: Request, res: Response) => {
    res.send('OK');
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Server Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Only listen if run directly (local development with ts-node)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default app;
