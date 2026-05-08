import express from 'express';
import * as campaignController from '../controllers/campaignController.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', authRequired, campaignController.createCampaign);
router.get('/list', authRequired, campaignController.listCampaigns);
router.get('/:id', authRequired, campaignController.getCampaignDetails);
router.put('/:id', authRequired, campaignController.updateCampaign);
router.post('/:id/pause', authRequired, campaignController.pauseCampaign);
router.post('/:id/resume', authRequired, campaignController.resumeCampaign);
router.delete('/:id', authRequired, campaignController.deleteCampaign);

export default router;
