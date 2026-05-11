import express from 'express';
import * as authController from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/refresh', authController.refreshToken);

// One-time admin initialization
router.post('/init-admin', async (req, res) => {
  try {
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      return res.status(400).json({ message: 'Admin user already exists' });
    }

    const user = new User({
      name: 'Admin',
      email: 'admin@tubegrowth.tg',
      password: 'Admin@25',
      isAdmin: true,
      emailVerified: true,
    });

    user.generateReferralCode();
    await user.save();

    res.json({ 
      message: 'Admin user created successfully',
      email: user.email 
    });
  } catch (error) {
    console.error('Init admin error:', error);
    res.status(500).json({ message: 'Failed to create admin user' });
  }
});

export default router;
