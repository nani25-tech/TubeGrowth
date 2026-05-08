import Task from '../models/Task.js';
import User from '../models/User.js';

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
  try {
    if (req.user.isGuest) {
      return res.status(400).json({ message: 'Please login to verify tasks' });
    }

    const { id } = req.params;
    const userId = req.user.userId;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Award credits
    user.credits += task.reward;
    task.verifiedAt = new Date();
    user.completedTasks.push(task._id);

    await user.save();
    await task.save();

    res.json({
      message: 'Task verified! Credits awarded.',
      creditsAwarded: task.reward,
      newBalance: user.credits,
    });
  } catch (error) {
    console.error('Verify task error:', error);
    res.status(500).json({ message: 'Server error' });
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
