import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired, adminRequired);

router.get('/users', adminController.getUsers);
router.post('/users/:userId/ban', adminController.banUser);
router.post('/users/:userId/unban', adminController.unbanUser);
router.patch('/users/:userId/credits', adminController.editUserCredits);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/campaigns', adminController.getCampaigns);
router.post('/campaigns/:id/approve', adminController.approveCampaign);
router.delete('/campaigns/:id', adminController.removeCampaign);
router.get('/analytics', adminController.getAnalytics);
router.get('/stats', adminController.getSystemStats);
router.get('/payments', adminController.getPayments);

export default router;
