import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { startYouTubeSyncJob } from './services/youtubeSync.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tubegrowth';

const startServer = async () => {
  try {
    console.log('[SERVER] Starting TubeGrowth backend...');
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SERVER] Port: ${PORT}`);
    console.log(`[SERVER] MongoDB URI: ${MONGODB_URI.replace(/mongodb\+srv:\/\/.*@/, 'mongodb+srv://***@')}`);
    
    // Connect to MongoDB
    await connectDB(MONGODB_URI);

    // Start server
    app.listen(PORT, () => {
      console.log(`[SERVER] ✅ Server running on port ${PORT}`);
      console.log(`[SERVER] Ready to accept requests`);
      startYouTubeSyncJob();
    });
  } catch (error) {
    console.error('[SERVER] ❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
