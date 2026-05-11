import express from 'express';
import * as authController from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/channel-login', authController.channelLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/refresh', authController.refreshToken);

// One-time admin initialization
router.post('/init-admin', async (req, res) => {
  try {
    let adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      // Update password to ensure it's correct
      adminExists.password = 'Admin@25';
      adminExists.emailVerified = true;
      await adminExists.save();
      return res.json({ 
        message: 'Admin user already exists. Password updated.',
        email: adminExists.email 
      });
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
