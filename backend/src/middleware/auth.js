import { verifyToken } from '../utils/tokens.js';
import User from '../models/User.js';

export const authRequired = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Allow guest access with demo user
      req.user = {
        userId: 'guest',
        isAdmin: false,
        isGuest: true,
      };
      return next();
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      // Fallback to guest access
      req.user = {
        userId: 'guest',
        isAdmin: false,
        isGuest: true,
      };
      return next();
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      // User deleted, use guest access
      req.user = {
        userId: 'guest',
        isAdmin: false,
        isGuest: true,
      };
      return next();
    }

    req.user = {
      userId: decoded.userId,
      isAdmin: user.isAdmin,
      isGuest: false,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Fallback to guest access on error
    req.user = {
      userId: 'guest',
      isAdmin: false,
      isGuest: true,
    };
    next();
  }
};

export const adminRequired = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};
