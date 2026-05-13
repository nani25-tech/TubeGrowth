import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/src/models/User.js';
import connectDB from './backend/src/config/db.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tubegrowth';

async function listUsers() {
  await connectDB(MONGODB_URI);
  const users = await User.find({}, { email: 1, isAdmin: 1, youtubeChannelId: 1, youtubeChannelTitle: 1, credits: 1 });
  console.log('All users:');
  users.forEach(u => {
    console.log({
      id: u._id,
      email: u.email,
      isAdmin: u.isAdmin,
      youtubeChannelId: u.youtubeChannelId,
      youtubeChannelTitle: u.youtubeChannelTitle,
      credits: u.credits
    });
  });
  process.exit(0);
}

listUsers();
