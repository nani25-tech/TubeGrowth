import User from '../models/User.js';
import Campaign from '../models/Campaign.js';
import PaymentTransaction from '../models/PaymentTransaction.js';

export const getUsers = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { page = 1, limit = 20 } = req.query;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments();

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const banUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { isBanned: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User banned', user });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const unbanUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { isBanned: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User unbanned', user });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const editUserCredits = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { userId } = req.params;
    const { credits } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { credits },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Credits updated', user });
  } catch (error) {
    console.error('Edit user credits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCampaigns = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { page = 1, limit = 20 } = req.query;

    const campaigns = await Campaign.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Campaign.countDocuments();

    res.json({
      campaigns,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveCampaign = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { id } = req.params;
    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { status: 'active' },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Campaign approved', campaign });
  } catch (error) {
    console.error('Approve campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeCampaign = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { id } = req.params;
    const campaign = await Campaign.findByIdAndDelete(id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Campaign removed' });
  } catch (error) {
    console.error('Remove campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const totalUsers = await User.countDocuments();
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: 'active' });

    res.json({
      analytics: {
        totalUsers,
        totalCampaigns,
        activeCampaigns,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSystemStats = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const totalUsers = await User.countDocuments();
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const totalCreditsInSystem = (await User.aggregate([
      { $group: { _id: null, total: { $sum: '$credits' } } },
    ]))[0]?.total || 0;

    res.json({
      stats: {
        totalUsers,
        bannedUsers,
        totalCreditsInSystem,
      },
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPayments = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { page = 1, limit = 20 } = req.query;

    const transactions = await PaymentTransaction.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('user orderId paymentId amountINR creditsToAdd status verifiedAt createdAt');

    const total = await PaymentTransaction.countDocuments();

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
