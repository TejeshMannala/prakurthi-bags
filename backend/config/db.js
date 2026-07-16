const mongoose = require('mongoose');

let dbConnected = false;

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('✗ MONGO_URI not set — running without database');
      return null;
    }
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    dbConnected = true;
    console.log('✓ MongoDB Connected');
    console.log('  Database:', conn.connection.db.databaseName);

    conn.connection.on('error', (err) => {
      console.error('MongoDB runtime error:', err.message);
      dbConnected = false;
    });

    conn.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
      dbConnected = false;
    });

    conn.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      dbConnected = true;
    });

    return conn;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    console.error('  The server will start but database features will be unavailable.');
    dbConnected = false;
    return null;
  }
};

const isDBConnected = () => dbConnected || mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
