const dotenv = require('dotenv');
dotenv.config();

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason instanceof Error ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.stack || err.message || err);
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

const hasPlaceholder = (val) => !val || val.startsWith('YOUR_') || val.startsWith('your_');

const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
const missing = REQUIRED_ENV.filter((k) => hasPlaceholder(process.env[k]));
if (missing.length > 0) {
  console.error('FATAL: Missing required environment variables:', missing.join(', '));
  console.error('  Set these in backend/.env before starting the server.');
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 10) {
  console.error('FATAL: JWT_SECRET is missing or too short (min 10 chars)');
  process.exit(1);
}

const checkPlaceholder = (val, label) => {
  if (val && (val.includes('YOUR_') || val.includes('your_'))) {
    console.warn('  ⚠', label, 'has placeholder credentials — update in .env');
    return false;
  }
  return !!val;
};

const OPTIONAL_SERVICES = [
  { key: 'GOOGLE_CLIENT_ID', label: 'Google OAuth', check: (e) => checkPlaceholder(e.GOOGLE_CLIENT_ID, 'Google OAuth') },
  { key: 'SMTP_PASS', label: 'SMTP Email', check: (e) => e.SMTP_PASS && !hasPlaceholder(e.SMTP_PASS) },
  { key: 'CLOUDINARY_CLOUD_NAME', label: 'Cloudinary', check: (e) => e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && !hasPlaceholder(e.CLOUDINARY_CLOUD_NAME) },
  { key: 'REDIS_URL', label: 'Redis Cache', check: (e) => e.REDIS_URL && !hasPlaceholder(e.REDIS_URL) },
  { key: 'ADMIN_EMAIL', label: 'Admin Auth', check: (e) => e.ADMIN_EMAIL && !hasPlaceholder(e.ADMIN_EMAIL) },
];

for (const svc of OPTIONAL_SERVICES) {
  if (svc.check(process.env)) {
    console.log('✓', svc.label, 'Loaded');
  } else {
    console.log('  ⚠', svc.label, 'not configured — feature disabled');
  }
}

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

setupSocket(server);

app.use(compression());
app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));
app.use(mongoSanitize());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);
const allowedOrigins = [
  process.env.FRONTEND_URL,

  // Local Development
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:5000',

  // Local Network (LAN)
  'http://192.168.29.55:3000',
  'http://192.168.29.55:5173',

  // Production - Render
  'https://prakurthi-bags.onrender.com',
  'https://prakruthi-bags.onrender.com',
  'https://prakurthi-bags-1-frontend.onrender.com',
  'https://prakruthi-bags-frontend.onrender.com',

  // Production - Vercel / Netlify
  'https://prakruthi-bags.vercel.app',
  'https://prakruthi-bags.netlify.app',
  /\.prakruthi-bags\.vercel\.app$/,
  /\.onrender\.com$/,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || process.env.NODE_ENV === 'development') return callback(null, true);
      const allowed = allowedOrigins.some((o) => {
        if (typeof o === 'string') return origin === o;
        if (o instanceof RegExp) return o.test(origin);
        return false;
      });
      if (allowed) {
        callback(null, true);
      } else {
        console.warn('[CORS] Blocked origin:', origin);
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

app.use('/api/', dbCheck);


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

// Explicit 404 for any unmatched /api route so the frontend never receives
// a stray HTML page (which would surface as "Cannot POST" / parse errors).
app.use('/api', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err.message || err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

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

app.use('/admin', express.static(adminDist));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(adminDist, 'index.html'));
});
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminDist, 'index.html'));
});

app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  if (req.path === '/favicon.ico') {
    return res.status(204).end();
  }
  const indexHtml = path.join(frontendBuild, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else if (fs.existsSync(path.join(adminDist, 'index.html'))) {
    res.sendFile(path.join(adminDist, 'index.html'));
  } else {
    res.status(404).json({ message: 'Build not found. Run npm run build in frontend or admin-dashboard.' });
  }
});

const desiredPort = parseInt(process.env.PORT || '5000', 10);

const startServer = (port) => {
  server.listen(port, () => {
    console.log('✓ Server Running on port ' + port);
    console.log('✓ Health: http://localhost:' + port + '/api/health');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('Port ' + port + ' is already in use.');
      const nextPort = port + 1;
      if (nextPort - desiredPort < 10) {
        console.log('Trying port ' + nextPort + '...');
        startServer(nextPort);
      } else {
        console.error('Could not find an available port. Please free a port and restart.');
        process.exit(1);
      }
    } else {
      console.error('Server error:', err.message);
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
};

startServer(desiredPort);

connectDB().then(async () => {
  const Review = mongoose.model('Review');
  const User = mongoose.model('User');
  const Product = mongoose.model('Product');

  // Clean up any seed/fake data from previous seed.js runs
  const seedUserPattern = /seed\.customer\.\d+@parkuthi\.local/;
  const seedUsers = await User.find({ email: { $regex: seedUserPattern } }).lean();
  const seedUserIds = seedUsers.map(u => u._id);

  if (seedUserIds.length > 0) {
    const deletedReviews = await Review.deleteMany({ user: { $in: seedUserIds } });
    console.log('  ✓ Cleaned', deletedReviews.deletedCount, 'fake reviews from seed.js');
    await User.deleteMany({ _id: { $in: seedUserIds } });
    console.log('  ✓ Removed', seedUserIds.length, 'fake seed users');
  } else {
    // Also clean reviews belonging to removed seed users (never delete legitimate customer reviews)
    if (seedUserIds.length === 0) {
      console.log('  ✓ No orphan reviews to clean (purchase-gated reviews always carry an order reference)');
    }
  }

  // Deduplicate reviews (keep only the latest per user+product) so the
  // unique (user, product) index can be enforced and no duplicates appear.
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

  Promise.all([
    Product.countDocuments().catch(() => 0),
    mongoose.model('Order').countDocuments().catch(() => 0),
    mongoose.model('Coupon').countDocuments().catch(() => 0),
    Review.countDocuments().catch(() => 0),
  ]).then(([products, orders, coupons, reviews]) => {
    console.log('  Collection counts:', JSON.stringify({
      Products: products,
      Orders: orders,
      Coupons: coupons,
      Reviews: reviews,
    }));
  }).catch(() => {});

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
    console.log('✓ Auto-seeded default + milestone coupons');
  }

  // Seed default CMS pages (settings + policy pages requested by the frontend).
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
  console.log('✓ Ensured default CMS pages exist');
}).catch(() => {
  console.log('  Server running in limited mode — database features unavailable');
});
