import User from '../models/User.js';
import { signAccessToken, verifyToken } from '../utils/tokens.js';
import {
  buildYouTubeAuthUrl,
  exchangeYouTubeCode,
} from '../utils/youtube.js';
import { encryptValue } from '../utils/crypto.js';
import { syncSingleUserYouTubeStats } from '../services/youtubeSync.js';

const buildUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  credits: user.credits,
  subscribers: user.subscribers,
  watchTimeHours: user.watchTimeHours,
  referralCode: user.referralCode,
  youtubeChannelId: user.youtubeChannelId || '',
  youtubeChannelTitle: user.youtubeChannelTitle || '',
  youtubeConnected: !!user.youtubeChannelId,
});

export const getAuthUrl = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(403).json({ message: 'Please log in to connect YouTube' });
    }

    const state = signAccessToken({
      userId: req.user.userId,
      purpose: 'youtube-connect',
    });

    const authUrl = buildYouTubeAuthUrl(state);

    res.json({ authUrl });
  } catch (error) {
    console.error('Get YouTube auth URL error:', error);
    res.status(500).json({ message: error.message || 'Failed to create YouTube auth URL' });
  }
};

export const youtubeCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://tubegrowth.zone.id'}?youtube=error`);
    }

    if (!code || !state) {
      return res.status(400).json({ message: 'Code and state are required' });
    }

    const decodedState = verifyToken(state);
    if (!decodedState || decodedState.purpose !== 'youtube-connect') {
      return res.status(400).json({ message: 'Invalid YouTube connection state' });
    }

    const user = await User.findById(decodedState.userId).select(
      '+youtubeAccessToken +youtubeRefreshToken +youtubeTokenExpiry'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { oauthClient, tokens } = await exchangeYouTubeCode(code);
    oauthClient.setCredentials(tokens);

    user.youtubeAccessToken = encryptValue(tokens.access_token || user.youtubeAccessToken || '');
    user.youtubeRefreshToken = encryptValue(tokens.refresh_token || user.youtubeRefreshToken || '');
    user.youtubeTokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : user.youtubeTokenExpiry;
    await user.save();

    await syncSingleUserYouTubeStats(user._id);

    return res.redirect(`${process.env.FRONTEND_URL || 'https://tubegrowth.zone.id'}/dashboard?youtube=connected`);
  } catch (error) {
    console.error('YouTube callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'https://tubegrowth.zone.id'}/dashboard?youtube=error`);
  }
};

export const syncYouTubeStats = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(403).json({ message: 'Please log in to sync YouTube stats' });
    }

    const result = await syncSingleUserYouTubeStats(req.user.userId);

    res.json({
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    console.error('Sync YouTube stats error:', error);
    res.status(500).json({ message: error.message || 'Failed to sync YouTube stats' });
  }
};