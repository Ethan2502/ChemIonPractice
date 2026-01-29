import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import twoFactorRoutes from './routes/2fa';
import scoreRoutes from './routes/scores';
import userRoutes from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
const allowedOrigins = [
    'http://localhost:5174',
    process.env.FRONTEND_URL,
    'https://chem-ion-practice.vercel.app', // Update with your actual Vercel URL
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.get('/health', (req, res) => {
    res.send('OK');
});

// Routes
app.use('/auth', authRoutes);
app.use('/2fa', twoFactorRoutes);
app.use('/scores', scoreRoutes);
app.use('/users', userRoutes);

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default app;
