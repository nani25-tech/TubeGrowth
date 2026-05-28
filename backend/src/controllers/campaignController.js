import Campaign from '../models/Campaign.js';
import User from '../models/User.js';
import { fetchChannelDetailsWithFallback } from '../utils/youtube.js';
import creditOps from '../utils/creditOps.js';
import mongoose from 'mongoose';

const CAMPAIGN_TYPE_MAP = {
  subs: 'subscribers',
  subscriber: 'subscribers',
  subscribers: 'subscribers',
  like: 'likes',
  likes: 'likes',
  view: 'views',
  views: 'views',
  comment: 'comments',
  comments: 'comments',
};

// Credit cost rates for each promotion type
const PROMOTION_COSTS = {
  subscribers: 2,   // 2 credits per subscriber
  likes: 1,         // 1 credit per like
  views: 0.6,       // 0.6 credits per minute (5 min watchtime = 3 credits)
  comments: 3,      // 3 credits per comment
};

function normalizeCampaignType(type) {
  return CAMPAIGN_TYPE_MAP[String(type || '').trim().toLowerCase()] || null;
}

function calculateCampaignCost(normalizedType, targetCount) {
  const costPerUnit = PROMOTION_COSTS[normalizedType] || 1;
  return Math.ceil(targetCount * costPerUnit);
}

export const createCampaign = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.user.isGuest) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Please login to create campaigns' });
    }

    const { channelUrl, type, targetCount } = req.body;
    const userId = req.user.userId;
    const normalizedType = normalizeCampaignType(type);
    const normalizedTargetCount = Number(targetCount);

    if (!channelUrl || !normalizedType || !Number.isInteger(normalizedTargetCount) || normalizedTargetCount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Missing required fields or invalid targetCount (must be positive integer)',
      });
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    // Try fetching channel details from YouTube, but keep campaign creation resilient
    let channelDetails;
    try {
      channelDetails = await fetchChannelDetailsWithFallback(channelUrl);
    } catch (error) {
      const fallbackChannelId = String(user.youtubeChannelId || channelUrl || '').trim();
      const fallbackChannelName = String(user.youtubeChannelTitle || user.name || 'Unknown Channel').trim();
      channelDetails = {
        id: fallbackChannelId,
        name: fallbackChannelName,
        thumbnail: '',
      };
    }

    // Calculate cost based on promotion type and quantity
    const cost = calculateCampaignCost(normalizedType, normalizedTargetCount);

    // Check if user has enough credits
    if (user.credits < cost) {
      await session.abortTransaction();
      return res.status(400).json({ message: `Insufficient credits: have ${user.credits}, need ${cost}` });
    }

    // Create campaign
    const campaign = new Campaign({
      user: userId,
      channelId: channelDetails.id,
      channelName: channelDetails.name,
      channelThumbnail: channelDetails.thumbnail,
      type: normalizedType,
      targetCount: normalizedTargetCount,
      cost,
    });

    await campaign.save({ session });

    // Deduct credits with transaction logging
    try {
      const deductResult = await creditOps.deductCredits(
        userId,
        cost,
        'campaign_spend',
        'Campaign',
        campaign._id.toString(),
        `Campaign created: ${normalizedTargetCount} ${normalizedType}`,
        session
      );

      await session.commitTransaction();

      res.status(201).json({
        message: 'Campaign created successfully',
        credits: deductResult.user.credits,
        campaign: {
          id: campaign._id,
          channelName: campaign.channelName,
          type: campaign.type,
          targetCount: campaign.targetCount,
          cost: campaign.cost,
          status: campaign.status,
        },
      });
    } catch (creditError) {
      await session.abortTransaction();
      // Clean up campaign if credit deduction failed
      await Campaign.deleteOne({ _id: campaign._id });
      throw creditError;
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('Create campaign error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  } finally {
    await session.endSession();
  }
};

export const listCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Guest users see public campaigns, others see their own
    const query = req.user.isGuest ? {} : { user: req.user.userId };

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Campaign.countDocuments(query);

    res.json({
      campaigns,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('List campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCampaignDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ campaign });
  } catch (error) {
    console.error('Get campaign details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetCount } = req.body;

    // Optional reCAPTCHA verification: only if RECAPTCHA_SECRET is configured
    const recaptchaSecret = process.env.RECAPTCHA_SECRET;
    const recaptchaToken = req.body?.recaptchaToken;
    if (recaptchaSecret) {
      if (!recaptchaToken) {
        return res.status(400).json({ message: 'reCAPTCHA token missing' });
      }

      try {
        const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(recaptchaSecret)}&response=${encodeURIComponent(recaptchaToken)}`,
        });
        const verifyJson = await verifyRes.json();
        if (!verifyJson.success) {
          return res.status(400).json({ message: 'reCAPTCHA verification failed' });
        }
      } catch (err) {
        console.error('reCAPTCHA verification error', err);
        return res.status(500).json({ message: 'reCAPTCHA verification error' });
      }
    }

    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { targetCount },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({
      message: 'Campaign updated',
      campaign,
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { status: 'paused' },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Campaign paused', campaign });
  } catch (error) {
    console.error('Pause campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resumeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { status: 'active' },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Campaign resumed', campaign });
  } catch (error) {
    console.error('Resume campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCampaign = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate id is a Mongo ObjectId — local-only numeric IDs should be treated as not found
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = await Campaign.findById(id).session(session);

    if (!campaign) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Verify ownership
    if (campaign.user.toString() !== userId && !req.user.isAdmin) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'You cannot delete this campaign' });
    }

    // Delete campaign without refunding credits per current policy
    await Campaign.findByIdAndDelete(id).session(session);

    await session.commitTransaction();

    res.json({
      message: 'Campaign deleted (no refund)',
      deletedCampaignId: id,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Delete campaign error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  } finally {
    await session.endSession();
  }
};
