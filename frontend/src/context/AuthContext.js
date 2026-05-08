import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '../utils/api';
import { authStorage } from '../utils/storage';

const AuthContext = createContext(null);

// Guest user for demo/public access
const GUEST_USER = {
  id: 'guest',
  name: 'Guest User',
  email: 'guest@tubegrowth.com',
  credits: 1000,
  isGuest: true,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(GUEST_USER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = authStorage.getUser();

    if (!storedUser) {
      setLoading(false);
      return;
    }

    setUser(storedUser);

    const syncStoredUser = async () => {
      try {
        const response = await userAPI.getProfile();
        if (response.data?.user) {
          authStorage.setUser(response.data.user);
          setUser(response.data.user);
        }
      } catch (error) {
        // Keep cached user if the profile refresh fails.
      } finally {
        setLoading(false);
      }
    };

    syncStoredUser();
  }, []);

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
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user,
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
