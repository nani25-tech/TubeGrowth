#!/usr/bin/env node
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tubegrowth';

async function createAdmin(email, password) {
  try {
    await connectDB(MONGODB_URI);

    let user = await User.findOne({ email });

    if (user) {
      user.isAdmin = true;
      if (password) user.password = password;
      await user.save();
      console.log(`Promoted existing user to admin: ${email}`);
    } else {
      user = new User({
        name: 'Admin',
        email,
        password,
        isAdmin: true,
        emailVerified: true,
      });
      user.generateReferralCode();
      await user.save();
      console.log(`Created new admin user: ${email}`);
    }

    console.log('Done. You can now log in with the provided credentials.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const email = args[0] || 'admin@tubegrowth.tg';
const password = args[1] || 'Admin@25';

createAdmin(email, password);
