import express from 'express';
import * as taskController from '../controllers/taskController.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.get('/', taskController.listTasks);
router.post('/:id/complete', authRequired, taskController.completeTask);
router.post('/:id/verify', authRequired, taskController.verifyTask);
router.get('/leaderboard', taskController.getLeaderboard);

export default router;
