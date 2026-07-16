require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const couponRoutes = require('./routes/coupons');
const orderRoutes = require('./routes/orders');
const analyticsRoutes = require('./routes/analytics');
const wishlistRoutes = require('./routes/wishlist');
const cartRoutes = require('./routes/cart');
const addressRoutes = require('./routes/addresses');
const reviewRoutes = require('./routes/reviews');
const bannerRoutes = require('./routes/banners');

const app = express();
app.set('trust proxy', 1);
const desiredPort = parseInt(process.env.PORT, 10) || 5000;

app.use(cors({
  origin: [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/banners', bannerRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

let server;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  await startOnAvailablePort(desiredPort);
}

function startOnAvailablePort(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    function tryPort(port, attempt) {
      if (attempt >= maxAttempts) {
        console.error(`No available port found (tried ${startPort}-${startPort + maxAttempts - 1})`);
        process.exit(1);
        return;
      }

      const srv = app.listen(port, () => {
        server = srv;
        console.log(`Server running on port ${port}`);
        if (port !== desiredPort) {
          console.warn(`Port ${desiredPort} was in use — fell back to port ${port}`);
        }
        resolve();
      });

      srv.on('error', (err) => {
        srv.close(() => {
          if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} in use, trying ${port + 1}...`);
            tryPort(port + 1, attempt + 1);
          } else {
            console.error('Server error:', err.message);
            reject(err);
            process.exit(1);
          }
        });
      });
    }

    tryPort(startPort, 0);
  });
}

function gracefulShutdown(signal) {
  return async () => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    if (server) {
      server.close(() => {
        console.log('HTTP server closed.');
      });
    }
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
    }
    process.exit(0);
  };
}

process.on('SIGINT', gracefulShutdown('SIGINT'));
process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', gracefulShutdown('SIGUSR2'));

start();
