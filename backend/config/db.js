const mongoose = require('mongoose');
const logger = require('../utils/logger');

let dbConnected = false;

const MONGO_RETRY_ATTEMPTS = 3;
const MONGO_RETRY_DELAY_MS = 5000;

const connectDB = async (attempt = 1) => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      logger.error('MONGO_URI not set — running without database');
      return null;
    }
    logger.debug(`MongoDB connecting (attempt ${attempt}/${MONGO_RETRY_ATTEMPTS})`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
    });
    dbConnected = true;
    logger.info(`MongoDB connected to ${conn.connection.db.databaseName}`);

    conn.connection.on('error', (err) => {
      logger.error('MongoDB runtime error:', err.message);
      dbConnected = false;
    });

    conn.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
      dbConnected = false;
    });

    conn.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      dbConnected = true;
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed (attempt ${attempt}/${MONGO_RETRY_ATTEMPTS}):`, error.message);
    if (attempt < MONGO_RETRY_ATTEMPTS) {
      logger.debug(`Retrying in ${MONGO_RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, MONGO_RETRY_DELAY_MS));
      return connectDB(attempt + 1);
    }
    logger.error('Database features will be unavailable');
    dbConnected = false;
    return null;
  }
};

const isDBConnected = () => dbConnected || mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
