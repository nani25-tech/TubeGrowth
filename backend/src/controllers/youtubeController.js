import User from '../models/User.js';
import { signAccessToken, verifyToken } from '../utils/tokens.js';
import {
  buildYouTubeAuthUrl,
  exchangeYouTubeCode,
  fetchChannelDetails,
  fetchConnectedChannelStats,
  getYouTubeOAuthClient,
} from '../utils/youtube.js';

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
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?youtube=error`);
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

    const stats = await fetchConnectedChannelStats(oauthClient);

    user.youtubeChannelId = stats.channelId;
    user.youtubeChannelTitle = stats.channelTitle;
    user.subscribers = stats.subscriberCount;
    user.watchTimeHours = Number(stats.watchTimeHours.toFixed(2));
    user.youtubeAccessToken = tokens.access_token || user.youtubeAccessToken;
    user.youtubeRefreshToken = tokens.refresh_token || user.youtubeRefreshToken;
    user.youtubeTokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : user.youtubeTokenExpiry;
    user.youtubeConnectedAt = new Date();

    await user.save();

    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?youtube=connected`);
  } catch (error) {
    console.error('YouTube callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?youtube=error`);
  }
};

export const syncYouTubeStats = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(403).json({ message: 'Please log in to sync YouTube stats' });
    }

    const user = await User.findById(req.user.userId).select(
      '+youtubeAccessToken +youtubeRefreshToken +youtubeTokenExpiry'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.youtubeChannelId) {
      return res.status(400).json({ message: 'Connect YouTube to sync watch time' });
    }

    if (!user.youtubeRefreshToken) {
      const stats = await fetchChannelDetails(user.youtubeChannelId);

      user.youtubeChannelId = stats.id;
      user.youtubeChannelTitle = stats.name;
      user.subscribers = stats.subscriberCount;

      if (!user.youtubeConnectedAt) {
        user.youtubeConnectedAt = new Date();
      }

      await user.save();

      return res.json({
        message: 'YouTube channel linked from channel ID',
        user: buildUserPayload(user),
      });
    }

    const oauthClient = getYouTubeOAuthClient();
    oauthClient.setCredentials({
      access_token: user.youtubeAccessToken,
      refresh_token: user.youtubeRefreshToken,
      expiry_date: user.youtubeTokenExpiry ? new Date(user.youtubeTokenExpiry).getTime() : undefined,
    });

    const stats = await fetchConnectedChannelStats(oauthClient);

    user.youtubeChannelId = stats.channelId;
    user.youtubeChannelTitle = stats.channelTitle;
    user.subscribers = stats.subscriberCount;
    user.watchTimeHours = Number(stats.watchTimeHours.toFixed(2));

    const credentials = oauthClient.credentials || {};
    user.youtubeAccessToken = credentials.access_token || user.youtubeAccessToken;
    user.youtubeRefreshToken = credentials.refresh_token || user.youtubeRefreshToken;
    user.youtubeTokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : user.youtubeTokenExpiry;

    await user.save();

    res.json({
      message: 'YouTube stats synced',
      user: buildUserPayload(user),
    });
  } catch (error) {
    console.error('Sync YouTube stats error:', error);
    res.status(500).json({ message: error.message || 'Failed to sync YouTube stats' });
  }
};