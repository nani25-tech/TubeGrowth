import User from '../models/User.js';
import { decryptValue, encryptValue } from '../utils/crypto.js';
import { fetchChannelDetails, fetchConnectedChannelStats, getYouTubeOAuthClient } from '../utils/youtube.js';

const toUserPayload = (user) => ({
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
  isAdmin: !!user.isAdmin,
});

export const syncSingleUserYouTubeStats = async (userId) => {
  const user = await User.findById(userId).select(
    '+youtubeAccessToken +youtubeRefreshToken +youtubeTokenExpiry'
  );

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.youtubeChannelId) {
    throw new Error('Connect YouTube to sync watch time');
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
    return { message: 'YouTube channel linked from channel ID', user: toUserPayload(user) };
  }

  const oauthClient = getYouTubeOAuthClient();
  oauthClient.setCredentials({
    access_token: decryptValue(user.youtubeAccessToken),
    refresh_token: decryptValue(user.youtubeRefreshToken),
    expiry_date: user.youtubeTokenExpiry ? new Date(user.youtubeTokenExpiry).getTime() : undefined,
  });

  let stats;
  try {
    stats = await fetchConnectedChannelStats(oauthClient);
  } catch (error) {
    console.warn('YouTube connected stats failed, falling back to public channel details:', error.message);
    const fallbackStats = await fetchChannelDetails(user.youtubeChannelId);

    user.youtubeChannelId = fallbackStats.id;
    user.youtubeChannelTitle = fallbackStats.name;
    user.subscribers = fallbackStats.subscriberCount;
    user.watchTimeHours = user.watchTimeHours || 0;

    if (!user.youtubeConnectedAt) {
      user.youtubeConnectedAt = new Date();
    }

    await user.save();
    return { message: 'YouTube stats synced using public channel fallback', user: toUserPayload(user) };
  }

  user.youtubeChannelId = stats.channelId;
  user.youtubeChannelTitle = stats.channelTitle;
  user.subscribers = stats.subscriberCount;
  user.watchTimeHours = Number(stats.watchTimeHours.toFixed(2));

  const credentials = oauthClient.credentials || {};
  user.youtubeAccessToken = encryptValue(credentials.access_token || decryptValue(user.youtubeAccessToken));
  user.youtubeRefreshToken = encryptValue(credentials.refresh_token || decryptValue(user.youtubeRefreshToken));
  user.youtubeTokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : user.youtubeTokenExpiry;

  if (!user.youtubeConnectedAt) {
    user.youtubeConnectedAt = new Date();
  }

  await user.save();

  return { message: 'YouTube stats synced', user: toUserPayload(user) };
};

export const syncAllConnectedYouTubeUsers = async () => {
  const users = await User.find({ youtubeChannelId: { $ne: '' } }).select(
    '+youtubeAccessToken +youtubeRefreshToken +youtubeTokenExpiry'
  );

  const results = [];

  for (const user of users) {
    try {
      const result = await syncSingleUserYouTubeStats(user._id);
      results.push({ userId: user._id, status: 'ok', ...result });
    } catch (error) {
      results.push({ userId: user._id, status: 'error', message: error.message });
    }
  }

  return results;
};

let syncInterval = null;

export const startYouTubeSyncJob = () => {
  if (syncInterval) {
    return syncInterval;
  }

  const intervalMs = Number(process.env.YOUTUBE_SYNC_INTERVAL_MS || 6 * 60 * 60 * 1000);

  const runner = async () => {
    try {
      const results = await syncAllConnectedYouTubeUsers();
      console.log(`YouTube sync job completed for ${results.length} users`);
    } catch (error) {
      console.error('YouTube sync job error:', error);
    }
  };

  syncInterval = setInterval(runner, intervalMs);
  setTimeout(runner, 60_000);
  return syncInterval;
};
