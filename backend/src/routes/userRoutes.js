import express from 'express';
import * as userController from '../controllers/userController.js';
import * as youtubeController from '../controllers/youtubeController.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authRequired, userController.getProfile);
router.get('/dashboard', authRequired, userController.getDashboard);
router.get('/wallet', authRequired, userController.getWallet);
router.get('/referrals', authRequired, userController.getReferrals);
router.get('/earn-history', authRequired, userController.getEarnHistory);
router.post('/earn', authRequired, userController.recordEarnAction);
router.post('/credits/sync', authRequired, userController.syncCredits);
router.get('/leaderboard', userController.getLeaderboard);
router.get('/payments', authRequired, userController.getPaymentHistory);
router.put('/profile', authRequired, userController.updateProfile);
router.post('/buy', authRequired, userController.buyCredits);
router.post('/payment/create-order', authRequired, userController.createCreditOrder);
router.post('/payment/verify', authRequired, userController.verifyCreditPayment);
router.get('/youtube/auth-url', authRequired, youtubeController.getAuthUrl);
router.get('/youtube/callback', youtubeController.youtubeCallback);
router.post('/youtube/sync', authRequired, youtubeController.syncYouTubeStats);

export default router;
