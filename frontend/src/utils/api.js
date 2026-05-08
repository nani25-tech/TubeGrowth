import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only refresh if authenticated user
    if (error.response?.status === 401 && !originalRequest._retry && localStorage.getItem('accessToken')) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', response.data.accessToken);
        api.defaults.headers.Authorization = `Bearer ${response.data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email, password, name) =>
    api.post('/auth/register', { email, password, name }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  googleLogin: (token) =>
    api.post('/auth/google-login', { token }),
  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) =>
    api.post('/auth/verify-email', { token }),
  refreshToken: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),
};

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  getDashboard: () => api.get('/user/dashboard'),
  getWallet: () => api.get('/user/wallet'),
  getReferrals: () => api.get('/user/referrals'),
  getEarnHistory: () => api.get('/user/earn-history'),
  recordEarnAction: (data) => api.post('/user/earn', data),
  updateProfile: (data) => api.put('/user/profile', data),
  buyCredits: (data) => api.post('/user/buy', data),
  createPaymentOrder: (data) => api.post('/user/payment/create-order', data),
  verifyPayment: (data) => api.post('/user/payment/verify', data),
  getLeaderboard: () => api.get('/user/leaderboard'),
  getYouTubeAuthUrl: () => api.get('/user/youtube/auth-url'),
  syncYouTubeStats: () => api.post('/user/youtube/sync'),
  getPaymentHistory: () => api.get('/user/payments'),
};

export const campaignAPI = {
  createCampaign: (data) => api.post('/campaigns/create', data),
  listCampaigns: (page = 1, limit = 10) =>
    api.get('/campaigns/list', { params: { page, limit } }),
  getCampaignDetails: (id) => api.get(`/campaigns/${id}`),
  updateCampaign: (id, data) => api.put(`/campaigns/${id}`, data),
  pauseCampaign: (id) => api.post(`/campaigns/${id}/pause`),
  resumeCampaign: (id) => api.post(`/campaigns/${id}/resume`),
  deleteCampaign: (id) => api.delete(`/campaigns/${id}`),
  getAnalytics: (id) => api.get(`/campaigns/${id}/analytics`),
};

export const taskAPI = {
  listTasks: () => api.get('/tasks'),
  completeTask: (id) => api.post(`/tasks/${id}/complete`),
  verifyTask: (id, data) => api.post(`/tasks/${id}/verify`, data),
  getLeaderboard: () => api.get('/tasks/leaderboard'),
};

export const adminAPI = {
  getUsers: (page = 1, limit = 20) =>
    api.get('/admin/users', { params: { page, limit } }),
  banUser: (userId) => api.post(`/admin/users/${userId}/ban`),
  unbanUser: (userId) => api.post(`/admin/users/${userId}/unban`),
  editUserCredits: (userId, credits) =>
    api.patch(`/admin/users/${userId}/credits`, { credits }),
  getCampaigns: (page = 1, limit = 20) =>
    api.get('/admin/campaigns', { params: { page, limit } }),
  approveCampaign: (id) => api.post(`/admin/campaigns/${id}/approve`),
  removeCampaign: (id) => api.delete(`/admin/campaigns/${id}`),
  getAnalytics: () => api.get('/admin/analytics'),
  getSystemStats: () => api.get('/admin/stats'),
  getPayments: (page = 1, limit = 20) =>
    api.get('/admin/payments', { params: { page, limit } }),
};

export default api;
