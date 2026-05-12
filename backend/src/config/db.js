import mongoose from 'mongoose';

const connectDB = async (uri) => {
  try {
    console.log('[DB] Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`[DB] ✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`[DB] Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[DB] ❌ Connection failed: ${error.message}`);
    throw error;
  }
};

export default connectDB;
