import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/user/youtube/callback';
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

  const channelResponse = await axios.get(`${YOUTUBE_API_URL}/channels`, {
    params: {
      part: 'snippet,statistics',
      mine: true,
    },
    headers,
  });

  const channel = channelResponse.data.items?.[0];
  if (!channel) {
    throw new Error('No connected YouTube channel was found');
  }

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

  const minutesWatched = (analyticsResponse.data.rows || []).reduce((total, row) => {
    const rowMinutes = Number(row?.[0] || 0);
    return total + (Number.isNaN(rowMinutes) ? 0 : rowMinutes);
  }, 0);

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

    const response = await axios.get(`${YOUTUBE_API_URL}/channels`, {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: YOUTUBE_API_KEY,
      },
    });

    if (response.data.items.length === 0) {
      throw new Error('Channel not found');
    }

    const channel = response.data.items[0];
    return {
      id: channel.id,
      name: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.default.url,
      subscriberCount: parseInt(channel.statistics.subscriberCount || 0),
      viewCount: parseInt(channel.statistics.viewCount || 0),
      videoCount: parseInt(channel.statistics.videoCount || 0),
    };
  } catch (error) {
    console.error('YouTube API error:', error.message);
    throw new Error(`Failed to fetch channel: ${error.message}`);
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
