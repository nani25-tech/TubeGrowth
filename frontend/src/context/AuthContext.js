import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '../utils/api';
import { authStorage, channelStorage } from '../utils/storage';

const AuthContext = createContext(null);

const createChannelUser = (channelId, channelName) => ({
  id: `channel:${channelId}`,
  name: channelName || channelId,
  email: `${channelId}@tubegrowth.local`,
  credits: 1000,
  subscribers: 0,
  watchTimeHours: 0,
  youtubeChannelId: channelId,
  youtubeConnected: true,
  isGuest: false,
  isChannelLogin: true,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedSession = channelStorage.getSession();

    if (!storedSession?.channelId) {
      setLoading(false);
      return;
    }

    const storedUser = authStorage.getUser();
    const nextUser = storedUser?.youtubeChannelId
      ? {
          ...storedUser,
          youtubeChannelId: storedUser.youtubeChannelId || storedSession.channelId,
          youtubeConnected: true,
          isGuest: false,
          isChannelLogin: true,
        }
      : createChannelUser(storedSession.channelId, storedSession.channelName);

    setUser(nextUser);

    const syncStoredUser = async () => {
      try {
        if (!authStorage.hasAccessToken()) {
          setLoading(false);
          return;
        }

        const response = await userAPI.getProfile();
        if (response.data?.user) {
          const mergedUser = {
            ...response.data.user,
            youtubeChannelId: response.data.user.youtubeChannelId || storedSession.channelId,
            youtubeConnected: true,
            isGuest: false,
            isChannelLogin: true,
          };
          authStorage.setUser(mergedUser);
          setUser(mergedUser);
        }
      } catch (error) {
        // Keep cached user if the profile refresh fails.
      } finally {
        setLoading(false);
      }
    };

    syncStoredUser();
  }, []);

  const channelLogin = (channelId, channelName) => {
    const normalizedChannelId = String(channelId || '').trim();

    if (!normalizedChannelId) {
      throw new Error('Channel ID is required');
    }

    const nextUser = createChannelUser(normalizedChannelId, channelName || normalizedChannelId);
    channelStorage.setSession({ channelId: normalizedChannelId, channelName: channelName || normalizedChannelId });
    authStorage.setUser(nextUser);
    setUser(nextUser);
    return nextUser;
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      const { accessToken, refreshToken, user } = response.data;

      authStorage.setTokens(accessToken, refreshToken);
      authStorage.setUser(user);
      setUser(user);

      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  const register = async (name, email, password) => {
    try {
      setError(null);
      const response = await authAPI.register(email, password, name);
      const { accessToken, refreshToken, user } = response.data;

      authStorage.setTokens(accessToken, refreshToken);
      authStorage.setUser(user);
      setUser(user);

      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };

  const googleLogin = async (token) => {
    try {
      setError(null);
      const response = await authAPI.googleLogin(token);
      const { accessToken, refreshToken, user } = response.data;

      authStorage.setTokens(accessToken, refreshToken);
      authStorage.setUser(user);
      setUser(user);

      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Google login failed');
      throw err;
    }
  };

  const logout = () => {
    authStorage.clearAuth();
    channelStorage.clearSession();
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((currentUser) => {
      const nextUser = {
        ...currentUser,
        ...updates,
      };

      authStorage.setUser(nextUser);
      return nextUser;
    });
  };

  const refreshUser = async () => {
    const response = await userAPI.getProfile();

    if (response.data?.user) {
      authStorage.setUser(response.data.user);
      setUser(response.data.user);
      return response.data.user;
    }

    return null;
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    googleLogin,
    channelLogin,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: Boolean(user?.youtubeChannelId || authStorage.hasAccessToken()),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
