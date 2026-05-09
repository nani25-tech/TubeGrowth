const AUTH_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const CHANNEL_SESSION_KEY = 'channelSession';

export const authStorage = {
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  getAccessToken: () => localStorage.getItem(AUTH_TOKEN_KEY),

  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser: () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  clearAuth: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(CHANNEL_SESSION_KEY);
  },

  isAuthenticated: () => {
    return !!localStorage.getItem(CHANNEL_SESSION_KEY);
  },

  hasAccessToken: () => {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  },
};

export const channelStorage = {
  setSession: (session) => {
    localStorage.setItem(CHANNEL_SESSION_KEY, JSON.stringify(session));
  },

  getSession: () => {
    const session = localStorage.getItem(CHANNEL_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  clearSession: () => {
    localStorage.removeItem(CHANNEL_SESSION_KEY);
  },
};

const CREDITS_KEY = 'credits';

export const creditStorage = {
  setCredits: (credits) => {
    localStorage.setItem(CREDITS_KEY, JSON.stringify(credits));
  },

  getCredits: () => {
    const credits = localStorage.getItem(CREDITS_KEY);
    return credits ? JSON.parse(credits) : 0;
  },

  addCredits: (amount) => {
    const current = creditStorage.getCredits();
    creditStorage.setCredits(current + amount);
  },

  deductCredits: (amount) => {
    const current = creditStorage.getCredits();
    if (current >= amount) {
      creditStorage.setCredits(current - amount);
      return true;
    }
    return false;
  },
};

const COMPLETED_TASKS_KEY = 'completedTasks';

export const taskStorage = {
  getCompletedTasks: () => {
    const tasks = localStorage.getItem(COMPLETED_TASKS_KEY);
    return tasks ? JSON.parse(tasks) : {};
  },

  markTaskComplete: (taskId) => {
    const tasks = taskStorage.getCompletedTasks();
    tasks[taskId] = new Date().toISOString();
    localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(tasks));
  },

  isTaskCompleted: (taskId) => {
    const tasks = taskStorage.getCompletedTasks();
    return !!tasks[taskId];
  },
};
