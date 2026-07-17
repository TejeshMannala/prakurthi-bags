const mongoose = require('mongoose');

let dbConnected = false;

const MONGO_RETRY_ATTEMPTS = 3;
const MONGO_RETRY_DELAY_MS = 5000;

const connectDB = async (attempt = 1) => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('✗ MONGO_URI not set — running without database');
      return null;
    }
    console.log(`[DB] Connecting to MongoDB (attempt ${attempt}/${MONGO_RETRY_ATTEMPTS})...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
    });
    dbConnected = true;
    console.log('✓ MongoDB Connected');
    console.log('  Database:', conn.connection.db.databaseName);

    conn.connection.on('error', (err) => {
      console.error('[DB] MongoDB runtime error:', err.message);
      dbConnected = false;
    });

    conn.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB disconnected. Attempting to reconnect...');
      dbConnected = false;
    });

    conn.connection.on('reconnected', () => {
      console.log('[DB] MongoDB reconnected');
      dbConnected = true;
    });

    return conn;
  } catch (error) {
    console.error(`[DB] MongoDB connection failed (attempt ${attempt}/${MONGO_RETRY_ATTEMPTS}):`, error.message);
    if (attempt < MONGO_RETRY_ATTEMPTS) {
      console.log(`[DB] Retrying in ${MONGO_RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, MONGO_RETRY_DELAY_MS));
      return connectDB(attempt + 1);
    }
    console.error('  The server will start but database features will be unavailable.');
    dbConnected = false;
    return null;
  }
};

const isDBConnected = () => dbConnected || mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
