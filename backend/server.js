const dotenv = require('dotenv');
dotenv.config();

const logger = require('./utils/logger');

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason instanceof Error ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err.stack || err.message || err);
});

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const compression = require('compression');
const http = require('http');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');
const returnRoutes = require('./routes/returnRoutes');
const pageRoutes = require('./routes/pageRoutes');
const faqRoutes = require('./routes/faqRoutes');
const teamRoutes = require('./routes/teamRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const testimonialRoutes = require('./routes/testimonialRoutes');
const productRoutes = require('./routes/productRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const couponRoutes = require('./routes/couponRoutes');
const orderRoutes = require('./routes/orderRoutes');
const supportRoutes = require('./routes/supportRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const policyRoutes = require('./routes/policyRoutes');
const contactInfoRoutes = require('./routes/contactInfoRoutes');
const addressRoutes = require('./routes/addressRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const { protect, adminOnly } = require('./middleware/authMiddleware');
const { setupSocket } = require('./socket/socketHandler');

// ---------------------------------------------------------------------------
// Validate required env vars (hard fail)
// ---------------------------------------------------------------------------
const hasPlaceholder = (val) => !val || val.startsWith('YOUR_') || val.startsWith('your_');

// Support MONGODB_URI as an alias for MONGO_URI (common on Render/Heroku).
if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
  process.env.MONGO_URI = process.env.MONGODB_URI;
}

const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
const missing = REQUIRED_ENV.filter((k) => hasPlaceholder(process.env[k]));
if (missing.length > 0) {
  logger.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  logger.error('  Set these in backend/.env (or the Render dashboard) before starting the server.');
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 10) {
  logger.error('FATAL: JWT_SECRET is missing or too short (min 10 chars)');
  process.exit(1);
}

// Validate Google OAuth env vars (warn, don't hard-fail — login degrades
// gracefully, but we make the misconfiguration obvious at startup).
if (!process.env.GOOGLE_CLIENT_ID || hasPlaceholder(process.env.GOOGLE_CLIENT_ID)) {
  logger.warn('GOOGLE_CLIENT_ID is not set — Google login will be disabled. Set it in backend/.env / Render dashboard.');
} else if (!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(process.env.GOOGLE_CLIENT_ID)) {
  logger.error('FATAL: GOOGLE_CLIENT_ID is not a valid Web OAuth client ID (expected format <digits>-<hash>.apps.googleusercontent.com). Google login will fail with invalid_client.');
  process.exit(1);
}
if (!process.env.GOOGLE_CLIENT_SECRET || hasPlaceholder(process.env.GOOGLE_CLIENT_SECRET)) {
  logger.warn('GOOGLE_CLIENT_SECRET is not set — Google login falls back to id-token verification only (still works for most setups).');
}

// Validate FRONTEND_URL so CORS works in production.
if (!process.env.FRONTEND_URL) {
  logger.warn('FRONTEND_URL is not set — CORS may block the deployed frontend. Set it to your frontend origin (e.g. https://prakurthi-bags-frontend.onrender.com).');
}

// ---------------------------------------------------------------------------
// Optional service status (debug only)
// ---------------------------------------------------------------------------
const OPTIONAL_SERVICES = [
  { label: 'Google OAuth', ok: !!process.env.GOOGLE_CLIENT_ID && !hasPlaceholder(process.env.GOOGLE_CLIENT_ID) },
  { label: 'SMTP Email', ok: !!(process.env.SMTP_PASS || process.env.EMAIL_PASS) && !hasPlaceholder(process.env.SMTP_PASS || process.env.EMAIL_PASS) },
  { label: 'Cloudinary', ok: !!process.env.CLOUDINARY_CLOUD_NAME && !hasPlaceholder(process.env.CLOUDINARY_CLOUD_NAME) },
  { label: 'Redis Cache', ok: !!process.env.REDIS_URL && !hasPlaceholder(process.env.REDIS_URL) },
  { label: 'Admin Auth', ok: !!process.env.ADMIN_EMAIL && !hasPlaceholder(process.env.ADMIN_EMAIL) },
];

const enabledServices = OPTIONAL_SERVICES.filter((s) => s.ok).map((s) => s.label);
const disabledServices = OPTIONAL_SERVICES.filter((s) => !s.ok).map((s) => s.label);
if (disabledServices.length > 0) {
  logger.warn(`Optional services not configured: ${disabledServices.join(', ')}`);
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

setupSocket(server);

app.use(compression());
// Cross-Origin headers: keep resource policy open (so images/uploads load
// cross-origin) and DO NOT set Cross-Origin-Opener-Policy, otherwise Google
// Login's popup window.postMessage is blocked ("origin_mismatch"-like error).
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://accounts.google.com',
          'https://apis.google.com',
          'https://ssl.gstatic.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://accounts.google.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://fonts.googleapis.com',
          'data:',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:',
          'http:',
        ],
        connectSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://oauth2.googleapis.com',
          'https://www.googleapis.com',
          'https://*.onrender.com',
          ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.replace(/\/+$/, '')] : []),
          ...(process.env.ADMIN_URL ? [process.env.ADMIN_URL.replace(/\/+$/, '')] : []),
        ],
        frameSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://apis.google.com',
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
app.use(mongoSanitize());

// Force COOP/COEP to unsafe-none on EVERY response. Render's edge proxy
// injects `Cross-Origin-Opener-Policy: same-origin` by default, which BLOCKS
// Google's `window.postMessage` credential hand-off ("Cross-Origin-Opener-Policy
// policy would block the window.postMessage call") and silently breaks Google
// Login / OTP popups. Setting it explicitly here overrides that default so the
// Google Identity popup can deliver the id_token via postMessage.
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:5000',
  'https://prakurthi-bags.onrender.com',
  'https://prakruthi-bags.onrender.com',
  'https://prakurthi-bags-1-frontend.onrender.com',
  'https://prakruthi-bags-frontend.onrender.com',
  /\.onrender\.com$/,
].filter(Boolean);

// De-duplicate string entries, keep regex
const uniqueStrings = [...new Set(allowedOrigins.filter((o) => typeof o === 'string'))];
allowedOrigins.length = 0;
uniqueStrings.forEach((o) => allowedOrigins.push(o));
allowedOrigins.push(/\.onrender\.com$/);

logger.debug(`CORS allowed: ${uniqueStrings.join(', ')}`);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      // Normalize: strip trailing slash so "http://localhost:5000/" matches
      const normalized = origin.replace(/\/+$/, '');
      const allowed = allowedOrigins.some((o) => {
        if (typeof o === 'string') return normalized === o;
        if (o instanceof RegExp) return o.test(normalized) || o.test(origin);
        return false;
      });
      if (allowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const dbCheck = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database is not connected. Please try again in a moment.' });
  }
  next();
};

app.get('/api/health', (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: mongoState === 1 ? 'OK' : 'ERROR',
    timestamp: new Date().toISOString(),
    mongodb: stateMap[mongoState] || 'unknown',
    node: process.version,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
  });
});

// Email service health probe (does not require DB).
app.get('/api/email-health', async (req, res) => {
  try {
    const { verifyTransporter } = require('./utils/mailer');
    const result = await verifyTransporter();
    if (result.ok) {
      return res.json({ status: 'OK', email: 'connected', timestamp: new Date().toISOString() });
    }
    return res.status(503).json({
      status: 'ERROR',
      email: result.reason || 'SMTP_ERROR',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: 'ERROR',
      email: 'UNKNOWN',
      message: err?.message || 'Email health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api/', dbCheck);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/contact-info', contactInfoRoutes);
app.use('/api/addresses', addressRoutes);

// Explicit 404 for unmatched /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error.';
  let code = err.code || 'SERVER_ERROR';

  const errMsg = err.message || '';
  if (statusCode === 500) {
    if (/ECONNREFUSED|ETIMEDOUT|ESOCKET|ECONNRESET|getaddrinfo|network/i.test(errMsg) || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      statusCode = 503; message = 'Service temporarily unavailable. Please try again shortly.'; code = 'NETWORK_ERROR';
    } else if (/Cast to ObjectId failed|CastError/i.test(errMsg)) {
      statusCode = 400; message = 'Invalid identifier provided.'; code = 'INVALID_ID';
    } else if (/duplicate key|E11000/i.test(errMsg)) {
      statusCode = 409; message = 'A record with this value already exists.'; code = 'DUPLICATE';
    } else if (/validation failed|ValidationError/i.test(errMsg)) {
      statusCode = 400; message = 'Validation failed. Please check your input.'; code = 'VALIDATION_ERROR';
    } else if (/jwt|token/i.test(errMsg)) {
      statusCode = 401; message = 'Invalid or expired token.'; code = 'INVALID_TOKEN';
    }
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${statusCode} ${code}`, err.stack || err.message);
  } else {
    logger.debug(`${req.method} ${req.originalUrl} -> ${statusCode} ${code}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode: code,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Static files + SPA fallback
// ---------------------------------------------------------------------------
const faviconPath = path.join(__dirname, '..', 'frontend', 'public', 'favicon.ico');
if (fs.existsSync(faviconPath)) {
  app.get('/favicon.ico', (req, res) => res.sendFile(faviconPath));
} else {
  app.get('/favicon.ico', (req, res) => {
    res.set('Content-Type', 'image/x-icon');
    res.status(204).end();
  });
}

const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
const adminDist = path.join(__dirname, '..', 'admin-dashboard', 'dist');
const frontendPublic = path.join(__dirname, '..', 'frontend', 'public');

app.use('/admin', express.static(adminDist));
app.get('/admin', (req, res) => {
  const adminIndex = path.join(adminDist, 'index.html');
  if (fs.existsSync(adminIndex)) return res.sendFile(adminIndex);
  res.status(404).send('Admin dashboard not built. Run: cd admin-dashboard && npm run build');
});
app.get('/admin/*', (req, res) => {
  const adminIndex = path.join(adminDist, 'index.html');
  if (fs.existsSync(adminIndex)) return res.sendFile(adminIndex);
  res.status(404).send('Admin dashboard not built.');
});

app.use(express.static(frontendBuild, {
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  },
}));
app.use(express.static(frontendPublic));

// SPA catch-all (MUST be last non-error route)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  if (req.path === '/favicon.ico') {
    const favicon = path.join(frontendPublic, 'favicon.ico');
    if (fs.existsSync(favicon)) return res.sendFile(favicon);
    return res.status(204).end();
  }
  const indexHtml = path.join(frontendBuild, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.sendFile(indexHtml);
  }
  logger.error(`SPA fallback: index.html not found at ${indexHtml}`);
  res.status(200).send(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/"></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:system-ui"><p>Reloading... <a href="/">Click here</a></p></body></html>'
  );
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const desiredPort = parseInt(process.env.PORT || '5000', 10);

const startServer = (port) => {
  server.listen(port, () => {
    const apiBase = process.env.FRONTEND_URL || `http://localhost:${port}`;
    logger.info(`Server running on port ${port}`);
    logger.info(`Health: ${apiBase}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} in use, trying ${port + 1}...`);
      const nextPort = port + 1;
      if (nextPort - desiredPort < 10) {
        startServer(nextPort);
      } else {
        logger.error('Could not find an available port. Please free a port and restart.');
        process.exit(1);
      }
    } else {
      logger.error('Server error:', err.message);
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
};

startServer(desiredPort);

// ---------------------------------------------------------------------------
// Post-startup SMTP health check
// ---------------------------------------------------------------------------
setTimeout(async () => {
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  if (!smtpUser || !smtpPass) {
    logger.debug('SMTP not configured — forgot-password emails will not be sent');
    return;
  }
  try {
    const { verifyTransporter } = require('./utils/mailer');
    const result = await verifyTransporter();
    if (result.ok) {
      logger.debug('SMTP connected successfully');
    } else {
      logger.warn(`SMTP not connected: ${result.reason || 'unknown'} — OTP emails will fail`);
    }
  } catch (e) {
    logger.error('SMTP startup check failed:', e.message);
  }
}, 3000);

// ---------------------------------------------------------------------------
// Database init + seed data
// ---------------------------------------------------------------------------
connectDB().then(async () => {
  const Review = mongoose.model('Review');
  const User = mongoose.model('User');
  const Product = mongoose.model('Product');

  // Clean up seed/fake data from previous seed.js runs
  const seedUserPattern = /seed\.customer\.\d+@prakruthi\.local/;
  const seedUsers = await User.find({ email: { $regex: seedUserPattern } }).lean();
  const seedUserIds = seedUsers.map((u) => u._id);

  if (seedUserIds.length > 0) {
    const deletedReviews = await Review.deleteMany({ user: { $in: seedUserIds } });
    logger.debug(`Cleaned ${deletedReviews.deletedCount} fake reviews, removed ${seedUserIds.length} seed users`);
    await User.deleteMany({ _id: { $in: seedUserIds } });
  }

  // Deduplicate reviews (keep only the latest per user+product)
  const dupGroups = await Review.aggregate([
    { $group: { _id: { user: '$user', product: '$product' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  for (const g of dupGroups) {
    const keep = g.ids[g.ids.length - 1];
    await Review.deleteMany({ _id: { $in: g.ids.filter((id) => !id.equals(keep)) } }).catch(() => {});
  }
  await Review.syncIndexes().catch(() => {});

  // Recalculate product ratings after cleanup
  const allProducts = await Product.find({}, { _id: 1 }).lean();
  for (const p of allProducts) {
    await Review.recalculateProductRating(p._id).catch(() => {});
  }

  // Seed default coupons if none exist
  const Coupon = mongoose.model('Coupon');
  const existing = await Coupon.countDocuments().catch(() => 0);
  if (existing === 0) {
    await Coupon.insertMany([
      { code: 'WELCOME10', title: 'Welcome Discount', description: '10% off for your first order!', discountType: 'percentage', discountValue: 10, minimumOrderAmount: 1000, maximumDiscount: 200, active: true, usageLimit: 1000, usedCount: 0, featured: true, autoApply: false, isWelcomeCoupon: true, startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 86400000) },
      { code: 'SAVE10', title: 'Save 10%', description: '10% OFF on orders above ₹1000', discountType: 'percentage', discountValue: 10, minimumOrderAmount: 1000, maximumDiscount: 200, active: true, usageLimit: 500, usedCount: 0, featured: true, autoApply: false, startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 86400000) },
      { code: 'SAVE20', title: 'Save 20%', description: '20% OFF on orders above ₹2000', discountType: 'percentage', discountValue: 20, minimumOrderAmount: 2000, maximumDiscount: 500, active: true, usageLimit: 300, usedCount: 0, featured: true, autoApply: false, startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 86400000) },
      { code: 'SAVE30', title: 'Save 30%', description: '30% OFF on orders above ₹3000', discountType: 'percentage', discountValue: 30, minimumOrderAmount: 3000, maximumDiscount: 1000, active: true, usageLimit: 200, usedCount: 0, featured: true, autoApply: false, startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 86400000) },
      { code: 'FREESHIP', title: 'Free Shipping', description: 'Free shipping on orders above ₹499', discountType: 'fixed', discountValue: 49, minimumOrderAmount: 499, maximumDiscount: 49, active: true, usageLimit: 9999, usedCount: 0, featured: false, autoApply: false, startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 86400000) },
      { code: 'UNLOCK100', title: 'Cart Milestone ₹100 OFF', description: 'You unlocked ₹100 OFF', discountType: 'fixed', discountValue: 100, minimumOrderAmount: 1000, maximumDiscount: 100, active: true, usageLimit: 0, usedCount: 0, featured: false, autoApply: false, isMilestone: true, unlockEmoji: '🎉', unlockTitle: 'Congratulations!', unlockGradient: 'from-purple-600 via-purple-500 to-pink-500', startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 86400000) },
      { code: 'UNLOCK250', title: 'Cart Milestone ₹250 OFF', description: 'You unlocked ₹250 OFF', discountType: 'fixed', discountValue: 250, minimumOrderAmount: 2000, maximumDiscount: 250, active: true, usageLimit: 0, usedCount: 0, featured: false, autoApply: false, isMilestone: true, unlockEmoji: '🎊', unlockTitle: 'Amazing!', unlockGradient: 'from-red-500 to-pink-500', startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 86400000) },
      { code: 'UNLOCK500', title: 'Cart Milestone ₹500 OFF', description: 'You unlocked ₹500 OFF', discountType: 'fixed', discountValue: 500, minimumOrderAmount: 3000, maximumDiscount: 500, active: true, usageLimit: 0, usedCount: 0, featured: false, autoApply: false, isMilestone: true, unlockEmoji: '🔥', unlockTitle: 'Awesome!', unlockGradient: 'from-amber-500 via-orange-500 to-red-500', startDate: new Date(), expiryDate: new Date(Date.now() + 365 * 86400000) },
    ]);
    logger.debug('Seeded default coupons');
  }

  // Seed default CMS pages
  const PageContent = mongoose.model('PageContent');
  const defaultPages = [
    {
      page: 'settings',
      title: 'Site Settings',
      content: '',
      published: true,
      meta: {
        companyName: 'Prakruthi Bags',
        instagram: 'https://www.instagram.com/prakruthi_jutebags',
        facebook: 'https://facebook.com',
        twitter: 'https://twitter.com',
        linkedin: 'https://linkedin.com',
        email: 'support@prakruthi.com',
        phone: '+91 90000 00000',
        address: 'Visakhapatnam, Andhra Pradesh, India',
        footerText: 'Crafted with care for the planet.',
      },
    },
    { page: 'about', title: 'About Us', content: 'Prakruthi Bags crafts eco-friendly jute and cotton bags.', published: true, meta: {} },
    { page: 'privacy-policy', title: 'Privacy Policy', content: 'Our privacy policy.', published: true, meta: {} },
    { page: 'terms', title: 'Terms & Conditions', content: 'Our terms and conditions.', published: true, meta: {} },
    { page: 'shipping-policy', title: 'Shipping Policy', content: 'Our shipping policy.', published: true, meta: {} },
  ];
  for (const p of defaultPages) {
    await PageContent.updateOne(
      { page: p.page },
      { $setOnInsert: p },
      { upsert: true }
    ).catch(() => {});
  }
  logger.debug('Ensured default CMS pages exist');
}).catch(() => {
  logger.warn('Server running in limited mode — database features unavailable');
});
