import User from '../models/User.js';
import EarnAction from '../models/EarnAction.js';
import { fetchChannelDetails, fetchChannelDetailsWithFallback } from '../utils/youtube.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import CreditTransaction from '../models/CreditTransaction.js';
import creditOps from '../utils/creditOps.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { signAccessToken, signRefreshToken } from '../utils/tokens.js';

const getCreditsForAmount = (amountINR) => {
  // Strict: only exact mappings allowed
  const INR_MAP = {
    10: 100,
    50: 500,
    100: 1000,
  };

  // If exact mapping exists, use it
  if (INR_MAP[amountINR]) {
    return INR_MAP[amountINR];
  }

  // Otherwise, strict ratio: 10 INR = 100 credits
  // Only allow if it's a multiple of 10
  if (amountINR % 10 !== 0) {
    throw new Error(
      `Invalid amount: ${amountINR} INR. Must be a multiple of 10. ` +
      `Valid amounts: 10, 50, 100, or multiples of 10.`
    );
  }

  // Calculate: 10 INR = 100 credits, so 1 INR = 10 credits
  const creditsToAdd = Math.floor(amountINR * 10);

  // Ensure result is integer
  if (!Number.isInteger(creditsToAdd)) {
    throw new Error(`Credit calculation failed for ${amountINR} INR`);
  }

  return creditsToAdd;
};

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Razorpay keys are not configured');
    }

    console.warn('Razorpay keys missing — using non-production dev fallback');

    // Return a minimal stub that mimics the parts of the Razorpay client we use.
    return {
      orders: {
        create: async (opts) => ({
          id: `order_fake_${Date.now()}`,
          amount: opts.amount,
          currency: opts.currency,
          receipt: opts.receipt,
          notes: opts.notes,
          status: 'created',
        }),
      },
    };
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
            isAdmin: false,
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
          isAdmin: !!user.isAdmin,
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
            isAdmin: false,
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
          isAdmin: !!user.isAdmin,
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
            isAdmin: false,
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
          isAdmin: !!user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const recordEarnAction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.user.isGuest) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Please login to store earn actions' });
    }

    const { taskKey, taskType, taskName, channelName, reward } = req.body;

    if (!taskKey || !taskType || !taskName || !channelName) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'taskKey, taskType, taskName, and channelName are required',
      });
    }

    // Validate taskType
    const validTypes = ['subscribe', 'like', 'watch', 'comment'];
    if (!validTypes.includes(taskType)) {
      await session.abortTransaction();
      return res.status(400).json({ message: `Invalid taskType. Must be one of: ${validTypes.join(', ')}` });
    }

    // Strict: reward must be integer, no decimals
    const normalizedReward = Number(reward || 0);
    if (!Number.isInteger(normalizedReward) || normalizedReward < 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Reward must be a non-negative integer (no decimals). Got: ${reward}`,
      });
    }

    const user = await User.findById(req.user.userId).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for duplicate with strict locking
    const existingAction = await EarnAction.findOne({ user: user._id, taskKey }).session(session);
    if (existingAction) {
      await session.abortTransaction();
      return res.status(409).json({
        message: 'Task already completed',
        action: existingAction,
      });
    }

    // Create action record first
    const action = new EarnAction({
      user: user._id,
      taskKey,
      taskType,
      taskName,
      channelName,
      reward: normalizedReward,
    });

    await action.save({ session });

    // Add credits with transaction logging
    try {
      const creditResult = await creditOps.addCredits(
        user._id.toString(),
        normalizedReward,
        'task_earn',
        'EarnAction',
        action._id.toString(),
        `Task completed: ${taskName} (${taskType}) on ${channelName}`,
        session
      );

      // Update subscribed channels if applicable
      if (taskType === 'subscribe' && !user.subscribedChannels.includes(channelName)) {
        user.subscribedChannels.push(channelName);
        await user.save({ session });
      }

      await session.commitTransaction();

      res.status(201).json({
        message: 'Earn action stored successfully',
        action,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          credits: creditResult.user.credits,
          subscribedChannels: user.subscribedChannels,
          youtubeConnected: !!user.youtubeChannelId,
        },
      });
    } catch (creditError) {
      await session.abortTransaction();
      // Clean up action if credit add failed
      await EarnAction.deleteOne({ _id: action._id });
      throw creditError;
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('Record earn action error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  } finally {
    await session.endSession();
  }
};

export const syncCredits = async (req, res) => {
  try {
    if (req.user.isGuest) {
      // If an auth attempt was made (invalid/expired token), return 401 so clients can clear stored tokens.
      if (req.authAttempted) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      return res.status(400).json({ message: 'Please login to sync credits' });
    }

    const { credits } = req.body;
    const normalizedCredits = Number(credits);

    if (!Number.isFinite(normalizedCredits) || normalizedCredits < 0) {
      return res.status(400).json({ message: 'Valid credits value is required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.credits = Math.floor(normalizedCredits);
    await user.save();

    res.json({
      message: 'Credits synced successfully',
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
    console.error('Sync credits error:', error);
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
        // Validate channel ID format (must be UC... or @ or URL)
        const isValidChannelId = /^UC[a-zA-Z0-9_-]{10,}$/.test(trimmedChannelId);
        const isValidHandle = /^@[a-zA-Z0-9._-]+$/.test(trimmedChannelId);
        const isValidUrl = trimmedChannelId.includes('youtube.com') || trimmedChannelId.includes('youtu.be');

        if (!isValidChannelId && !isValidHandle && !isValidUrl) {
          return res.status(400).json({
            message: 'Invalid channel ID/URL format. Must be channel ID (UC...), handle (@...), or YouTube URL.',
          });
        }

        try {
          // Try to fetch full channel details from YouTube
          const channelDetails = await fetchChannelDetails(trimmedChannelId);

          user.youtubeChannelId = channelDetails.id;
          user.youtubeChannelTitle = channelDetails.name;
          user.subscribers = channelDetails.subscriberCount;

          if (!user.youtubeConnectedAt) {
            user.youtubeConnectedAt = new Date();
          }
        } catch (youtubeError) {
          // If YouTube API fails, try fallback
          console.warn('YouTube API failed, using fallback:', youtubeError.message);

          const channelDetails = await fetchChannelDetailsWithFallback(trimmedChannelId);

          user.youtubeChannelId = channelDetails.id;
          user.youtubeChannelTitle = channelDetails.name || 'YouTube Channel';
          user.subscribers = channelDetails.subscriberCount || 0;

          if (!user.youtubeConnectedAt) {
            user.youtubeConnectedAt = new Date();
          }

          // Log that we're using fallback data
          if (channelDetails._isFallback) {
            console.info(
              `Channel saved with fallback data (YouTube API unavailable). ` +
              `Channel ID: ${channelDetails.id}, Error: ${channelDetails._error}`
            );
          }
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
    res.status(500).json({
      message: `Failed to update profile: ${error.message}`,
    });
  }
};

export const buyCredits = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(403).json({ message: 'Please login to buy credits' });
    }

    // Restrict to dev mode or admin users only
    if (!req.user.isAdmin && process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        message: 'Direct credit purchase is restricted. Use the payment gateway (createCreditOrder).',
      });
    }

    const amount = Number(req.body?.amount || req.body?.amountINR || 0);
    const currency = String(req.body?.currency || 'INR').toUpperCase();
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let creditsToAdd = 0;
    if (currency === 'USD') {
      const USD_MAP = { 1: 100, 15: 500, 50: 1000 };
      creditsToAdd = USD_MAP[amount];
      if (!creditsToAdd) {
        return res.status(400).json({
          message: `Invalid USD amount: ${amount}. Valid amounts: 1, 15, 50 USD.`,
        });
      }
    } else {
      creditsToAdd = getCreditsForAmount(amount);
    }

    // Strict: creditsToAdd must be integer
    if (!Number.isInteger(creditsToAdd) || creditsToAdd <= 0) {
      return res.status(400).json({
        message: `Credit calculation resulted in invalid amount: ${creditsToAdd}. Must be positive integer.`,
      });
    }

    // Log the dev-mode credit addition
    await CreditTransaction.create({
      user: user._id,
      type: 'purchase',
      amount: creditsToAdd,
      balanceBefore: user.credits,
      balanceAfter: user.credits + creditsToAdd,
      source: 'direct_purchase_dev',
      description: `DEV/ADMIN: Direct credit purchase - ${creditsToAdd} credits for ${amount} ${currency}`,
      status: 'completed',
      metadata: { isDev: process.env.NODE_ENV !== 'production', isAdmin: req.user.isAdmin },
    });

    user.credits = (user.credits || 0) + creditsToAdd;

    await user.save();

    res.json({
      message: `Credits added (${process.env.NODE_ENV === 'production' ? 'ADMIN' : 'DEV'})`,
      isDev: process.env.NODE_ENV !== 'production',
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
    // If guest, allow automatic channel-login when channel info is provided
    let issuedTokens = null;
    if (req.user.isGuest) {
      const { youtubeChannelId, youtubeChannelTitle } = req.body || {};
      if (!youtubeChannelId || !youtubeChannelTitle) {
        return res.status(403).json({ message: 'Please login to buy credits' });
      }

      // Try to find or create a user similar to channelLogin
      const canonicalChannelId = String(youtubeChannelId || '').trim();
      const canonicalTitle = String(youtubeChannelTitle || '').trim();

      let channelUser = await User.findOne({ youtubeChannelId: canonicalChannelId });
      if (!channelUser) channelUser = await User.findOne({ email: `${canonicalChannelId}@channel.tubegrowth` });
      if (!channelUser) channelUser = await User.findOne({
        youtubeChannelId: { $regex: `^${canonicalChannelId}$`, $options: 'i' },
      });

      if (!channelUser) {
        channelUser = new User({
          name: canonicalTitle,
          youtubeChannelId: canonicalChannelId,
          youtubeChannelTitle: canonicalTitle,
          email: `${canonicalChannelId}@channel.tubegrowth`,
          password: canonicalChannelId,
          credits: 0,
          isAdmin: false,
        });
        if (typeof channelUser.generateReferralCode === 'function') channelUser.generateReferralCode();
        await channelUser.save();
      } else {
        channelUser.name = canonicalTitle;
        channelUser.youtubeChannelId = canonicalChannelId;
        channelUser.youtubeChannelTitle = canonicalTitle;
        if (!channelUser.email || channelUser.email.endsWith('@channel.tubegrowth')) {
          channelUser.email = `${canonicalChannelId}@channel.tubegrowth`;
        }
        channelUser.lastLogin = new Date();
        await channelUser.save();
      }

      // Issue tokens for the client so subsequent verify calls succeed
      const accessToken = signAccessToken({ userId: channelUser._id });
      const refreshToken = signRefreshToken({ userId: channelUser._id });
      issuedTokens = { accessToken, refreshToken, user: {
        id: channelUser._id,
        name: channelUser.name,
        email: channelUser.email,
        credits: channelUser.credits,
        subscribers: channelUser.subscribers,
        watchTimeHours: channelUser.watchTimeHours,
        isAdmin: channelUser.isAdmin,
        referralCode: channelUser.referralCode,
        youtubeChannelId: channelUser.youtubeChannelId,
        youtubeChannelTitle: channelUser.youtubeChannelTitle,
        youtubeConnected: !!channelUser.youtubeChannelId,
      } };

      // Mutate req.user so rest of flow uses this user
      req.user = { userId: String(channelUser._id), isAdmin: channelUser.isAdmin, isGuest: false };
    }

    const amount = Number(req.body?.amount || req.body?.amountINR || 0);
    const currency = String(req.body?.currency || 'INR').toUpperCase();
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const razorpay = getRazorpayClient();

    // Determine credits based on currency and amount
    let creditsToAdd = 0;
    if (currency === 'USD') {
      const USD_MAP = { 1: 100, 15: 500, 50: 1000 };
      creditsToAdd = USD_MAP[amount];
      if (!creditsToAdd) {
        return res.status(400).json({
          message: `Invalid USD amount: ${amount}. Valid amounts: 1, 15, 50 USD.`,
        });
      }
    } else {
      creditsToAdd = getCreditsForAmount(amount);
    }

    // Strict validation: creditsToAdd must be a positive integer
    if (!Number.isInteger(creditsToAdd) || creditsToAdd <= 0) {
      return res.status(400).json({
        message: `Credit calculation error: ${creditsToAdd}. Must be positive integer.`,
      });
    }

    // If Razorpay keys are missing and we're not in production, provide a safe dev fallback
    const razorpayKeysMissing = !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;
    const isDevFallback = razorpayKeysMissing && process.env.NODE_ENV !== 'production';

    if (isDevFallback) {
      const fakeOrder = {
        id: `order_fake_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency,
        receipt: `tg_${Date.now()}`,
        notes: { userId: String(user._id), creditsToAdd: String(creditsToAdd), currency },
        status: 'created',
      };

      // Create a transaction and mark it paid immediately (dev fallback)
      await PaymentTransaction.create({
        user: user._id,
        orderId: fakeOrder.id,
        amountValue: amount,
        currency: currency,
        amountINR: currency === 'INR' ? amount : 0,
        creditsToAdd,
        status: 'paid',
        paymentId: `payment_fake_${Date.now()}`,
        verifiedAt: new Date(),
      });

      user.credits = (user.credits || 0) + creditsToAdd;
      await user.save();

      const resp = {
        message: 'Order created (dev fallback) and credits added',
        devMode: true,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_fallback',
        order: fakeOrder,
        creditsToAdd,
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
      };
      if (issuedTokens) Object.assign(resp, issuedTokens);
      return res.json(resp);
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: currency,
      receipt: `tg_${Date.now()}`,
      notes: {
        userId: String(user._id),
        creditsToAdd: String(creditsToAdd),
        currency: currency,
      },
    });

    await PaymentTransaction.create({
      user: user._id,
      orderId: order.id,
      amountValue: amount,
      currency: currency,
      // keep legacy amountINR for INR records
      amountINR: currency === 'INR' ? amount : 0,
      creditsToAdd,
      status: 'created',
    });

    const out = {
      message: 'Order created',
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
      creditsToAdd,
    };
    if (issuedTokens) Object.assign(out, issuedTokens);
    return res.json(out);
  } catch (error) {
    console.error('Create credit order error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const verifyCreditPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.user.isGuest) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Please login to verify payment' });
    }

    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Missing payment verification details' });
    }

    const tx = await PaymentTransaction.findOne({
      orderId,
      user: req.user.userId,
    }).session(session);

    if (!tx) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found for user' });
    }

    // Idempotency: if already paid, return current state
    if (tx.status === 'paid') {
      await session.abortTransaction();
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

    // Allow dev fallback when Razorpay keys are missing (non-production)
    const razorpayKeysMissing = !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;
    const isDevFallback = razorpayKeysMissing && process.env.NODE_ENV !== 'production';

    if (!isDevFallback) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expectedSignature !== signature) {
        tx.status = 'failed';
        tx.paymentId = paymentId;
        await tx.save({ session });
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
    } else {
      console.warn('Dev fallback: bypassing razorpay signature verification');
    }

    const user = await User.findById(req.user.userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    // Add credits with transaction logging
    try {
      const creditResult = await creditOps.addCredits(
        req.user.userId,
        tx.creditsToAdd || 0,
        'purchase',
        'PaymentTransaction',
        tx._id.toString(),
        `Payment verified: ${tx.amountValue} ${tx.currency} → ${tx.creditsToAdd} credits`,
        session
      );

      tx.status = 'paid';
      tx.paymentId = paymentId;
      tx.verifiedAt = new Date();
      await tx.save({ session });

      await session.commitTransaction();

      return res.json({
        message: 'Payment verified and credits added',
        creditsAdded: tx.creditsToAdd,
        user: {
          id: creditResult.user._id,
          name: creditResult.user.name,
          email: creditResult.user.email,
          credits: creditResult.user.credits,
          subscribers: creditResult.user.subscribers,
          watchTimeHours: creditResult.user.watchTimeHours,
          youtubeChannelId: creditResult.user.youtubeChannelId,
          youtubeChannelTitle: creditResult.user.youtubeChannelTitle,
          youtubeConnected: !!creditResult.user.youtubeChannelId,
        },
      });
    } catch (creditError) {
      await session.abortTransaction();
      throw creditError;
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('Verify credit payment error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  } finally {
    await session.endSession();
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

export const getPaymentHistory = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.json({ transactions: [] });
    }

    const transactions = await PaymentTransaction.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('orderId paymentId amountValue currency creditsToAdd status verifiedAt createdAt');

    res.json({ transactions });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get comprehensive credit transaction history with audit trail
 */
export const getCreditTransactionHistory = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.json({ transactions: [] });
    }

    const { type, source, limit = 50, skip = 0 } = req.query;
    const filters = { limit: parseInt(limit), skip: parseInt(skip) };

    if (type) filters.type = type;
    if (source) filters.source = source;

    const transactions = await creditOps.getTransactionHistory(req.user.userId, filters);

    // Get summary stats
    const balance = await creditOps.getBalance(req.user.userId);

    res.json({
      summary: balance,
      transactions,
    });
  } catch (error) {
    console.error('Get credit transaction history error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Get current credit balance and statistics
 */
export const getCreditBalance = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.json({
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        transactionCount: 0,
      });
    }

    const balance = await creditOps.getBalance(req.user.userId);

    res.json(balance);
  } catch (error) {
    console.error('Get credit balance error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
