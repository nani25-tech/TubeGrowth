// Login or register with channel ID and channel name only
export const channelLogin = async (req, res) => {
  try {
    const { youtubeChannelId, youtubeChannelTitle } = req.body;
    const canonicalChannelId = String(youtubeChannelId || '').trim();
    const canonicalTitle = String(youtubeChannelTitle || '').trim();

    if (!canonicalChannelId || !canonicalTitle) {
      return res.status(400).json({ message: 'Channel ID and Channel Name are required' });
    }

    const dummyEmail = `${canonicalChannelId}@channel.tubegrowth`;
    let user = await User.findOne({ youtubeChannelId: canonicalChannelId });

    if (!user) {
      user = await User.findOne({ email: dummyEmail });
    }

    if (!user) {
      user = await User.findOne({
        youtubeChannelId: { $regex: `^${canonicalChannelId}$`, $options: 'i' },
      });
    }

    if (!user) {
      user = new User({
        name: canonicalTitle,
        youtubeChannelId: canonicalChannelId,
        youtubeChannelTitle: canonicalTitle,
        email: dummyEmail,
        password: canonicalChannelId, // Not used, but required by schema
        credits: 0,
        isAdmin: false,
      });
      user.generateReferralCode?.();
    } else {
      user.name = canonicalTitle;
      user.youtubeChannelId = canonicalChannelId;
      user.youtubeChannelTitle = canonicalTitle;
      if (!user.email || user.email.endsWith('@channel.tubegrowth')) {
        user.email = dummyEmail;
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = signAccessToken({ userId: user._id });
    const refreshToken = signRefreshToken({ userId: user._id });
    res.json({
      message: 'Channel login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        credits: user.credits,
        youtubeChannelId: user.youtubeChannelId,
        youtubeChannelTitle: user.youtubeChannelTitle,
      },
    });
  } catch (error) {
    console.error('Channel login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
import User from '../models/User.js';
import { signAccessToken, signRefreshToken } from '../utils/tokens.js';
import { sendWelcomeEmail } from '../utils/email.js';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
    });

    user.generateReferralCode();
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(email, name);
    } catch (error) {
      console.error('Welcome email error:', error);
    }

    // Generate tokens
    const accessToken = signAccessToken({ userId: user._id });
    const refreshToken = signRefreshToken({ userId: user._id });

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
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
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[AUTH] Login attempt with non-existent email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log(`[AUTH] Login attempt with invalid password for: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBanned) {
      console.log(`[AUTH] Login attempt with banned account: ${email}`);
      return res.status(403).json({ message: 'Account is banned' });
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = signAccessToken({ userId: user._id });
    const refreshToken = signRefreshToken({ userId: user._id });

    console.log(`[AUTH] Successful login: ${email} (${user._id})`);
    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        subscribers: user.subscribers,
        watchTimeHours: user.watchTimeHours,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode,
        youtubeChannelId: user.youtubeChannelId,
        youtubeChannelTitle: user.youtubeChannelTitle,
        youtubeConnected: !!user.youtubeChannelId,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // In a real app, verify the Google token here
    // For now, we'll just use a mock verification

    let user = await User.findOne({ googleId: token });

    if (!user) {
      // Create new user from Google token
      user = new User({
        name: 'Google User',
        email: `google_${Date.now()}@tubegrowth.com`,
        googleId: token,
      });
      user.generateReferralCode();
      await user.save();
    }

    const accessToken = signAccessToken({ userId: user._id });
    const refreshToken = signRefreshToken({ userId: user._id });

    res.json({
      message: 'Google login successful',
      accessToken,
      refreshToken,
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
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify refresh token (implementation depends on your token strategy)
    const accessToken = signAccessToken({ userId: 'userId' });

    res.json({
      accessToken,
      message: 'Token refreshed',
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If email exists, reset link will be sent' });
    }

    // In a real app, generate a reset token and send email
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    // Verify token and reset password
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify email token
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
