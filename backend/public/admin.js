const authStatus = document.getElementById('authStatus');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const usersTable = document.getElementById('usersTable');

const TOKEN_KEY = 'accessToken';

function getApiBase() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return 'https://tubegrowth.onrender.com/api';
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setMessage(text, type = '') {
  loginMessage.textContent = text || '';
  loginMessage.className = `message ${type}`.trim();
}

function updateAuthStatus() {
  authStatus.textContent = getToken() ? 'Signed in' : 'Not signed in';
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function renderUsers(users) {
  usersTable.innerHTML = '';

  if (!users.length) {
    usersTable.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
    return;
  }

  users.forEach((user) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatValue(user.name)}</td>
      <td>${formatValue(user.youtubeChannelTitle)}</td>
      <td>${formatValue(user.youtubeChannelId)}</td>
      <td>${formatValue(user.credits)}</td>
      <td>${formatValue(user.email)}</td>
      <td>${formatValue(user.isAdmin)}</td>
      <td>${formatValue(user.isBanned)}</td>
    `;
    usersTable.appendChild(row);
  });
}

async function fetchAdminUsers() {
  const token = getToken();
  if (!token) {
    throw new Error('Please sign in with an admin account first.');
  }

  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/admin/users?limit=1000&page=1`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data.users || [];
}

async function loadUsers() {
  setMessage('Loading users...');
  try {
    const users = await fetchAdminUsers();
    renderUsers(users);
    setMessage(`Loaded ${users.length} users.`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Signing in...');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (!data.user?.isAdmin) {
      throw new Error('This account is not an admin account.');
    }

    localStorage.setItem(TOKEN_KEY, data.accessToken);
    updateAuthStatus();
    await loadUsers();
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  updateAuthStatus();
  setMessage('Logged out.');
  usersTable.innerHTML = '<tr><td colspan="7">Sign in to load users.</td></tr>';
});

refreshBtn?.addEventListener('click', loadUsers);

updateAuthStatus();
if (getToken()) {
  loadUsers();
}
