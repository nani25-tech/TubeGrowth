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
    usersTable.innerHTML = '<tr><td colspan="3">No users found.</td></tr>';
    return;
  }

  users.forEach((user) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatValue(user.youtubeChannelTitle)}</td>
      <td>${formatValue(user.youtubeChannelId)}</td>
      <td>${formatValue(user.credits)}</td>
      <td><button class="edit-btn" data-id="${user._id}" data-channel-name="${user.youtubeChannelTitle}" data-channel-id="${user.youtubeChannelId}" data-credits="${user.credits}">Edit</button></td>
    `;
    usersTable.appendChild(row);
  });

  // Add event listeners for edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      const channelName = btn.getAttribute('data-channel-name');
      const channelId = btn.getAttribute('data-channel-id');
      const credits = btn.getAttribute('data-credits');
      openEditModal(id, channelName, channelId, credits);
    });
  });
}

// Modal logic
const editUserModal = document.getElementById('editUserModal');
const closeEditModalBtn = document.getElementById('closeEditModal');
const editUserForm = document.getElementById('editUserForm');
const editUserId = document.getElementById('editUserId');
const editChannelName = document.getElementById('editChannelName');
const editChannelId = document.getElementById('editChannelId');
const editCredits = document.getElementById('editCredits');

function openEditModal(id, channelName, channelId, credits) {
  editUserId.value = id;
  editChannelName.value = channelName;
  editChannelId.value = channelId;
  editCredits.value = credits;
  editUserModal.style.display = 'block';
}

closeEditModalBtn.onclick = function() {
  editUserModal.style.display = 'none';
}

window.onclick = function(event) {
  if (event.target === editUserModal) {
    editUserModal.style.display = 'none';
  }
}

editUserForm.onsubmit = async function(e) {
  e.preventDefault();
  const id = editUserId.value;
  const credits = editCredits.value;
  try {
    await updateUserCredits(id, credits);
    setMessage('Credits updated!', 'success');
    editUserModal.style.display = 'none';
    loadUsers();
  } catch (err) {
    setMessage('Failed to update credits', 'error');
  }
}

async function updateUserCredits(userId, credits) {
  const token = getToken();
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/admin/users/${userId}/credits`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ credits }),
  });
  if (!response.ok) {
    throw new Error('Failed to update credits');
  }
  return response.json();
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
