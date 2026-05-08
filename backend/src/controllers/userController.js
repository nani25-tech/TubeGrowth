import User from '../models/User.js';
import EarnAction from '../models/EarnAction.js';
import { fetchChannelDetails } from '../utils/youtube.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const getCreditsForAmount = (amountINR) => {
  if (amountINR === 10) return 100;
  if (amountINR === 50) return 500;
  if (amountINR === 100) return 1000;
  return Math.max(0, Math.floor(amountINR));
};

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const getProfile = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.json({
        user: {
          id: 'guest',
          name: 'Guest User',
          email: 'guest@tubegrowth.com',
          credits: 1000,
          subscribers: 0,
          watchTimeHours: 0,
          youtubeConnected: false,
          isGuest: true,
        },
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        subscribers: user.subscribers,
        watchTimeHours: user.watchTimeHours,
        referralCode: user.referralCode,
        youtubeChannelId: user.youtubeChannelId,
        youtubeChannelTitle: user.youtubeChannelTitle,
        youtubeConnected: !!user.youtubeChannelId,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDashboard = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.json({
        dashboard: {
          totalCredits: 1000,
          subscribers: 0,
          watchTimeHours: 0,
          youtubeConnected: false,
          tasksCompleted: 0,
          subscribedChannels: 0,
          referralEarnings: 0,
        },
      });
    }

    const user = await User.findById(req.user.userId)
      .populate('completedTasks');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      dashboard: {
        totalCredits: user.credits,
        subscribers: user.subscribers,
        watchTimeHours: user.watchTimeHours,
        youtubeConnected: !!user.youtubeChannelId,
        tasksCompleted: user.completedTasks.length,
        subscribedChannels: user.subscribedChannels.length,
        referralEarnings: user.referralEarnings,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getWallet = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.json({
        wallet: {
          balance: 1000,
          subscribers: 0,
          watchTimeHours: 0,
          youtubeConnected: false,
          totalEarned: 0,
          lastUpdated: new Date(),
        },
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      wallet: {
        balance: user.credits,
        subscribers: user.subscribers,
        watchTimeHours: user.watchTimeHours,
        youtubeConnected: !!user.youtubeChannelId,
        totalEarned: user.referralEarnings,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const recordEarnAction = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(400).json({ message: 'Please login to store earn actions' });
    }

    const { taskKey, taskType, taskName, channelName, reward } = req.body;

    if (!taskKey || !taskType || !taskName || !channelName) {
      return res.status(400).json({
        message: 'taskKey, taskType, taskName, and channelName are required',
      });
    }

    const normalizedReward = Number(reward || 0);
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingAction = await EarnAction.findOne({ user: user._id, taskKey });
    if (existingAction) {
      return res.status(409).json({ message: 'Task already completed', action: existingAction });
    }

    const action = new EarnAction({
      user: user._id,
      taskKey,
      taskType,
      taskName,
      channelName,
      reward: normalizedReward,
    });

    user.credits += normalizedReward;

    if (taskType === 'subscribe' && !user.subscribedChannels.includes(channelName)) {
      user.subscribedChannels.push(channelName);
    }

    await action.save();
    await user.save();

    res.status(201).json({
      message: 'Earn action stored successfully',
      action,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        subscribedChannels: user.subscribedChannels,
        youtubeConnected: !!user.youtubeChannelId,
      },
    });
  } catch (error) {
    console.error('Record earn action error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEarnHistory = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.json({ actions: [] });
    }

    const actions = await EarnAction.find({ user: req.user.userId }).sort({ createdAt: -1 });

    res.json({ actions });
  } catch (error) {
    console.error('Get earn history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReferrals = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      referral: {
        code: user.referralCode,
        earnings: user.referralEarnings,
      },
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, youtubeChannelId } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (youtubeChannelId !== undefined) {
      const trimmedChannelId = String(youtubeChannelId || '').trim();

      if (trimmedChannelId) {
        const channelDetails = await fetchChannelDetails(trimmedChannelId);

        user.youtubeChannelId = channelDetails.id;
        user.youtubeChannelTitle = channelDetails.name;
        user.subscribers = channelDetails.subscriberCount;

        if (!user.youtubeConnectedAt) {
          user.youtubeConnectedAt = new Date();
        }
      } else {
        user.youtubeChannelId = '';
        user.youtubeChannelTitle = '';
      }
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        youtubeChannelId: user.youtubeChannelId,
        youtubeChannelTitle: user.youtubeChannelTitle,
        youtubeConnected: !!user.youtubeChannelId,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const buyCredits = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(403).json({ message: 'Please login to buy credits' });
    }

    const { amountINR } = req.body;
    const amount = Number(amountINR || 0);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const creditsToAdd = getCreditsForAmount(amount);
    user.credits = (user.credits || 0) + creditsToAdd;

    await user.save();

    res.json({
      message: 'Credits purchased successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        subscribers: user.subscribers,
        watchTimeHours: user.watchTimeHours,
        youtubeChannelId: user.youtubeChannelId,
        youtubeChannelTitle: user.youtubeChannelTitle,
        youtubeConnected: !!user.youtubeChannelId,
      },
    });
  } catch (error) {
    console.error('Buy credits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCreditOrder = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(403).json({ message: 'Please login to buy credits' });
    }

    const amount = Number(req.body?.amountINR || 0);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const razorpay = getRazorpayClient();
    const creditsToAdd = getCreditsForAmount(amount);
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `tg_${Date.now()}`,
      notes: {
        userId: String(user._id),
        creditsToAdd: String(creditsToAdd),
      },
    });

    await PaymentTransaction.create({
      user: user._id,
      orderId: order.id,
      amountINR: amount,
      creditsToAdd,
      status: 'created',
    });

    return res.json({
      message: 'Order created',
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
      creditsToAdd,
    });
  } catch (error) {
    console.error('Create credit order error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const verifyCreditPayment = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(403).json({ message: 'Please login to verify payment' });
    }

    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment verification details' });
    }

    const tx = await PaymentTransaction.findOne({
      orderId,
      user: req.user.userId,
    });

    if (!tx) {
      return res.status(404).json({ message: 'Order not found for user' });
    }

    if (tx.status === 'paid') {
      const existingUser = await User.findById(req.user.userId);
      return res.json({
        message: 'Payment already verified',
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          credits: existingUser.credits,
          subscribers: existingUser.subscribers,
          watchTimeHours: existingUser.watchTimeHours,
          youtubeChannelId: existingUser.youtubeChannelId,
          youtubeChannelTitle: existingUser.youtubeChannelTitle,
          youtubeConnected: !!existingUser.youtubeChannelId,
        },
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      tx.status = 'failed';
      tx.paymentId = paymentId;
      await tx.save();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.credits = (user.credits || 0) + (tx.creditsToAdd || 0);
    await user.save();

    tx.status = 'paid';
    tx.paymentId = paymentId;
    tx.verifiedAt = new Date();
    await tx.save();

    return res.json({
      message: 'Payment verified and credits added',
      creditsAdded: tx.creditsToAdd,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        subscribers: user.subscribers,
        watchTimeHours: user.watchTimeHours,
        youtubeChannelId: user.youtubeChannelId,
        youtubeChannelTitle: user.youtubeChannelTitle,
        youtubeConnected: !!user.youtubeChannelId,
      },
    });
  } catch (error) {
    console.error('Verify credit payment error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const topUsers = await User.find()
      .select('name credits referralEarnings subscribers watchTimeHours')
      .sort({ credits: -1 })
      .limit(100);

    res.json({
      leaderboard: topUsers.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        credits: user.credits,
        earnings: user.referralEarnings,
        subscribers: user.subscribers,
        watchTimeHours: user.watchTimeHours,
      })),
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
