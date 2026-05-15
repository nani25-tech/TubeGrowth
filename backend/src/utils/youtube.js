import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5000/api/user/youtube/callback';
const YOUTUBE_ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2';

export const getYouTubeOAuthClient = () => {
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    throw new Error('YouTube OAuth is not configured');
  }

  return new OAuth2Client(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI);
};

export const buildYouTubeAuthUrl = (state) => {
  const oauthClient = getYouTubeOAuthClient();

  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ],
    state,
  });
};

export const exchangeYouTubeCode = async (code) => {
  const oauthClient = getYouTubeOAuthClient();
  const { tokens } = await oauthClient.getToken(code);

  return { oauthClient, tokens };
};

export const fetchConnectedChannelStats = async (oauthClient) => {
  const { token } = await oauthClient.getAccessToken();
  if (!token) {
    throw new Error('Unable to obtain a YouTube access token');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  let channel;
  try {
    const channelResponse = await axios.get(`${YOUTUBE_API_URL}/channels`, {
      params: {
        part: 'snippet,statistics',
        mine: true,
      },
      headers,
    });

    channel = channelResponse.data.items?.[0];
    if (!channel) {
      throw new Error('No connected YouTube channel was found');
    }
  } catch (error) {
    const message = error.response?.data?.error?.message || error.message;
    console.error('YouTube OAuth channel fetch error:', message);
    throw new Error(`YouTube OAuth channel fetch failed: ${message}`);
  }

  let minutesWatched = 0;
  try {
    const endDate = new Date().toISOString().slice(0, 10);
    const analyticsResponse = await axios.get(`${YOUTUBE_ANALYTICS_URL}/reports`, {
      params: {
        ids: 'channel==MINE',
        startDate: '2000-01-01',
        endDate,
        metrics: 'estimatedMinutesWatched',
        dimensions: 'day',
      },
      headers,
    });

    minutesWatched = (analyticsResponse.data.rows || []).reduce((total, row) => {
      const rowMinutes = Number(row?.[0] || 0);
      return total + (Number.isNaN(rowMinutes) ? 0 : rowMinutes);
    }, 0);
  } catch (error) {
    const message = error.response?.data?.error?.message || error.message;
    console.warn('YouTube Analytics fetch failed, watch time unavailable:', message);
    minutesWatched = 0;
  }

  return {
    channelId: channel.id,
    channelTitle: channel.snippet?.title || '',
    thumbnail: channel.snippet?.thumbnails?.default?.url || channel.snippet?.thumbnails?.high?.url || '',
    subscriberCount: parseInt(channel.statistics?.subscriberCount || 0, 10),
    watchTimeHours: minutesWatched / 60,
  };
};

export const fetchChannelDetails = async (channelIdOrUrl) => {
  try {
    let channelId = channelIdOrUrl;

    // If URL is provided, extract channel ID
    if (channelIdOrUrl.includes('youtube.com') || channelIdOrUrl.includes('youtu.be')) {
      if (channelIdOrUrl.includes('/channel/')) {
        channelId = channelIdOrUrl.split('/channel/')[1].split('?')[0];
      } else if (channelIdOrUrl.includes('/@')) {
        const username = channelIdOrUrl.split('/@')[1].split('?')[0];
        // Search for channel by username
        const searchRes = await axios.get(`${YOUTUBE_API_URL}/search`, {
          params: {
            part: 'snippet',
            q: username,
            type: 'channel',
            key: YOUTUBE_API_KEY,
          },
        });
        if (searchRes.data.items.length > 0) {
          channelId = searchRes.data.items[0].id.channelId;
        } else {
          throw new Error('Channel not found');
        }
      }
    }

    if (!YOUTUBE_API_KEY) {
      // Log once to avoid noisy repeated errors in production logs
      if (!global.__youtubeApiKeyMissingLogged) {
        console.warn('YouTube API key is not configured. Set YOUTUBE_API_KEY in your environment to enable YouTube API features.');
        global.__youtubeApiKeyMissingLogged = true;
      }

      // Return minimal fallback information instead of throwing so the app can continue functioning
      let fallbackId = channelId;
      if (!fallbackId && channelIdOrUrl && typeof channelIdOrUrl === 'string') {
        if (channelIdOrUrl.includes('/channel/')) fallbackId = channelIdOrUrl.split('/channel/')[1].split('?')[0];
        else if (channelIdOrUrl.includes('/@')) fallbackId = channelIdOrUrl.split('/@')[1].split('?')[0];
        else fallbackId = channelIdOrUrl;
      }

      return {
        id: fallbackId || 'unknown',
        name: 'YouTube Channel',
        description: '',
        thumbnail: '',
        subscriberCount: 0,
        viewCount: 0,
        videoCount: 0,
        _isFallback: true,
      };
    }

    // Validate channel ID format
    if (!channelId || typeof channelId !== 'string' || channelId.trim().length === 0) {
      throw new Error('Invalid channel ID format');
    }

    const response = await axios.get(`${YOUTUBE_API_URL}/channels`, {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: YOUTUBE_API_KEY,
      },
      timeout: 5000, // 5 second timeout
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Channel not found in YouTube');
    }

    const channel = response.data.items[0];
    if (!channel.snippet || !channel.statistics) {
      throw new Error('Invalid channel data from YouTube');
    }

    return {
      id: channel.id,
      name: channel.snippet.title || 'Unknown',
      description: channel.snippet.description || '',
      thumbnail: channel.snippet.thumbnails?.default?.url || channel.snippet.thumbnails?.high?.url || '',
      subscriberCount: parseInt(channel.statistics.subscriberCount || 0, 10),
      viewCount: parseInt(channel.statistics.viewCount || 0, 10),
      videoCount: parseInt(channel.statistics.videoCount || 0, 10),
    };
  } catch (error) {
    // Log as warning and return a safe fallback so callers can continue
    console.warn('YouTube API warning:', error.message);
    return {
      id: channelId || channelIdOrUrl || 'unknown',
      name: 'YouTube Channel',
      description: '',
      thumbnail: '',
      subscriberCount: 0,
      viewCount: 0,
      videoCount: 0,
      _isFallback: true,
      _error: error.message,
    };
  }
};

/**
 * Fetch channel details with fallback - doesn't throw on API errors
 * Returns basic info even if API fails
 */
export const fetchChannelDetailsWithFallback = async (channelIdOrUrl) => {
  try {
    return await fetchChannelDetails(channelIdOrUrl);
  } catch (error) {
    // If API fails, extract channel ID and return minimal data
    console.warn('YouTube API fallback triggered:', error.message);
    
    let channelId = channelIdOrUrl;
    
    // Try to extract channel ID from URL
    if (channelIdOrUrl && channelIdOrUrl.includes('/channel/')) {
      channelId = channelIdOrUrl.split('/channel/')[1].split('?')[0];
    } else if (channelIdOrUrl && channelIdOrUrl.includes('/@')) {
      channelId = channelIdOrUrl.split('/@')[1].split('?')[0];
    }
    
    // Return minimal fallback data with what we have
    return {
      id: channelId || 'unknown',
      name: 'YouTube Channel',
      description: '',
      thumbnail: '',
      subscriberCount: 0,
      viewCount: 0,
      videoCount: 0,
      _isFallback: true,
      _error: error.message,
    };
  }
};

export const fetchVideoDetails = async (videoUrl) => {
  try {
    let videoId = videoUrl;

    // Extract video ID from URL
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      if (videoUrl.includes('v=')) {
        videoId = videoUrl.split('v=')[1].split('&')[0];
      } else if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      }
    }

    const response = await axios.get(`${YOUTUBE_API_URL}/videos`, {
      params: {
        part: 'snippet,statistics',
        id: videoId,
        key: YOUTUBE_API_KEY,
      },
    });

    if (response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    return {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.default.url,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      viewCount: parseInt(video.statistics.viewCount || 0),
      likeCount: parseInt(video.statistics.likeCount || 0),
      commentCount: parseInt(video.statistics.commentCount || 0),
      duration: video.contentDetails.duration,
    };
  } catch (error) {
    console.error('YouTube API error:', error.message);
    throw new Error(`Failed to fetch video: ${error.message}`);
  }
};

export const validateChannelSubscription = async (channelId) => {
  try {
    const response = await axios.get(`${YOUTUBE_API_URL}/channels`, {
      params: {
        part: 'snippet',
        id: channelId,
        key: YOUTUBE_API_KEY,
      },
    });

    return response.data.items.length > 0;
  } catch (error) {
    console.error('YouTube API error:', error.message);
    return false;
  }
};
