import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes, { paymentWebhookHandler } from './routes/paymentRoutes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');
const configuredOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'https://tubegrowth.zone.id',
  'https://www.tubegrowth.zone.id',
  'https://nani25-tech.github.io',
  'https://nani25-tech.github.io/TubeGrowth',
  ...(process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : []),
];

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.github.io');
  } catch (error) {
    return false;
  }
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://pagead2.googlesyndication.com', 'https://checkout.razorpay.com', 'https://fonts.googleapis.com', 'https://www.googleapis.com'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", 'https://pagead2.googlesyndication.com', 'https://checkout.razorpay.com', 'https://www.googleapis.com', 'https://maps.googleapis.com'],
      frameSrc: ["'self'", 'https://checkout.razorpay.com'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
// Webhook endpoint requires raw body for signature verification
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes BEFORE static files (so /api/* doesn't get caught by static middleware)
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Diagnostic endpoint (for debugging only)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      connected: true,
    },
    uptime: process.uptime(),
  });
});

// Static files AFTER API routes
app.use(express.static(publicDir));

app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

// Favicon route
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(publicDir, 'favicon.svg');
  res.type('image/svg+xml').sendFile(faviconPath, { fallback: (err) => res.status(204).send() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
  });
});

export default app;
