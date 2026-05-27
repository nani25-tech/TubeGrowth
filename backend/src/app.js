import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes, { paymentWebhookHandler } from './routes/paymentRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';

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
  'https://tubegrowth.me',
  'https://www.tubegrowth.me',
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
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://pagead2.googlesyndication.com', 'https://checkout.razorpay.com', 'https://www.googleapis.com'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://pagead2.googlesyndication.com', 'https://checkout.razorpay.com', 'https://www.googleapis.com', 'https://maps.googleapis.com'],
      frameSrc: ["'self'", 'https://checkout.razorpay.com'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  // Do not configure a permissionsPolicy here — leaving it out avoids
  // sending a restrictive Permissions-Policy header that can trigger
  // noisy browser violations for sensor APIs the frontend doesn't use.
}));

// Add stricter security headers to prevent third-party access
app.use((req, res, next) => {
  // Prevent third-party scripts from accessing sensitive APIs
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Temporarily allow all origins to avoid CORS blocking when frontend is
// served from a different host (e.g., GitHub Pages). Revert to stricter
// configuration once DNS is pointed to Render or proper origins configured.
// Explicit CORS headers + quick preflight handling to ensure OPTIONS
// requests receive the proper response when frontend is served from
// a different host (temporary during DNS migration).
// Use the cors middleware with dynamic origin checking so preflight
// (OPTIONS) requests are handled correctly and include the required
// Access-Control-Allow-* headers. This is more robust than manually
// setting headers and ensures middleware handles preflight responses.
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g., curl, server-to-server)
    if (!origin) return cb(null, true);
    try {
      if (isAllowedOrigin(origin)) return cb(null, origin);
      return cb(new Error('Not allowed by CORS'));
    } catch (err) {
      return cb(null, false);
    }
  },
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  exposedHeaders: ['x-rtb-fingerprint-id', 'request-id']
}));

// Ensure we explicitly handle OPTIONS preflight for all routes
app.options('*', cors());
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
app.use('/api/feedback', feedbackRoutes);

// Health check with DB state
app.get('/health', (req, res) => {
  const mongoState = mongoose && mongoose.connection ? mongoose.connection.readyState : null;
  const mongoStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: 'OK',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      state: mongoStateMap[mongoState] || 'unknown',
      readyState: mongoState,
    }
  });
});

// Diagnostic endpoint (for debugging and monitoring)
app.get('/api/health', (req, res) => {
  const mongoState = mongoose && mongoose.connection ? mongoose.connection.readyState : null;
  const mongoStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      state: mongoStateMap[mongoState] || 'unknown',
      readyState: mongoState,
    },
    uptime: process.uptime(),
  });
});

// Static files AFTER API routes with cache-control headers
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    try {
      if (/\.html?$/.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (/\.(?:js|css|svg|png|jpg|jpeg|gif|webp|woff2?)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
      res.setHeader('Vary', 'Accept-Encoding');
    } catch (e) {
      // ignore
    }
  }
}));

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
