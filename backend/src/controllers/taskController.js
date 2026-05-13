import Task from '../models/Task.js';
import User from '../models/User.js';
import CreditTransaction from '../models/CreditTransaction.js';
import creditOps from '../utils/creditOps.js';
import mongoose from 'mongoose';

export const listTasks = async (req, res) => {
  try {
    const { type } = req.query;

    const query = {};
    if (type) query.type = type;

    const tasks = await Task.find(query).limit(20);

    res.json({ tasks });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const completeTask = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(400).json({ message: 'Please login to complete tasks' });
    }

    const { id } = req.params;
    const userId = req.user.userId;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Mark as completed
    task.completed = true;
    await task.save();

    res.json({
      message: 'Task marked as completed. Pending verification.',
      task,
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyTask = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.user.isGuest) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Please login to verify tasks' });
    }

    const { id } = req.params;
    const userId = req.user.userId;

    const task = await Task.findById(id).session(session);
    if (!task) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Task not found' });
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    // Idempotency check: if already verified for this user, return existing result
    if (task.verifiedAt) {
      // Check if user already claimed this task's reward
      const existingTransaction = await CreditTransaction.findOne({
        user: userId,
        source: 'task_verify',
        relatedId: task._id,
        status: 'completed',
      }).session(session);

      if (existingTransaction) {
        await session.abortTransaction();
        return res.status(409).json({
          message: 'This task has already been verified for your account',
          creditsAwarded: 0,
          newBalance: user.credits,
        });
      }
    }

    // Prevent duplicate in completedTasks array
    if (user.completedTasks.includes(task._id)) {
      await session.abortTransaction();
      return res.status(409).json({
        message: 'Task already completed by this user',
        creditsAwarded: 0,
        newBalance: user.credits,
      });
    }

    // Validate reward
    if (!Number.isInteger(task.reward) || task.reward < 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Invalid task reward: must be non-negative integer, got ${task.reward}`,
      });
    }

    // Award credits with transaction logging
    try {
      const creditResult = await creditOps.addCredits(
        userId,
        task.reward,
        'task_verify',
        'Task',
        task._id.toString(),
        `Task verified: ${task.type || 'Unknown'} task`,
        session
      );

      // Mark task as verified
      task.verifiedAt = new Date();
      await task.save({ session });

      // Add to completed tasks
      user.completedTasks.push(task._id);
      await user.save({ session });

      await session.commitTransaction();

      res.json({
        message: 'Task verified! Credits awarded.',
        creditsAwarded: task.reward,
        newBalance: creditResult.user.credits,
      });
    } catch (creditError) {
      await session.abortTransaction();
      throw creditError;
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('Verify task error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  } finally {
    await session.endSession();
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const topEarners = await User.find()
      .select('name completedTasks credits')
      .sort({ credits: -1 })
      .limit(50);

    res.json({
      leaderboard: topEarners.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        tasksCompleted: user.completedTasks.length,
        credits: user.credits,
      })),
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
