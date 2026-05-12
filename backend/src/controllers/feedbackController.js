import Feedback from '../models/Feedback.js';
import User from '../models/User.js';

export const createFeedback = async (req, res) => {
  try {
    const { message, email, page } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Feedback message is required' });
    }

    const feedback = new Feedback({
      message: String(message).trim(),
      page: page ? String(page).trim() : undefined,
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || req.connection?.remoteAddress || '',
    });

    // If user is authenticated (middleware sets req.user), attach user
    if (req.user && req.user.userId) {
      feedback.user = req.user.userId;
    } else if (email) {
      feedback.email = String(email).trim();
    }

    await feedback.save();

    // Optional: return created feedback id for debugging
    return res.status(201).json({ message: 'Feedback received', id: feedback._id });
  } catch (error) {
    console.error('Create feedback error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
