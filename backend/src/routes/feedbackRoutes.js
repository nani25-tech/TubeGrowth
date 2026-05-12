import express from 'express';
import { createFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

// Public feedback endpoint — accepts guest feedback
router.post('/', createFeedback);

export default router;
