const authStatus = document.getElementById('authStatus');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const usersTable = document.getElementById('usersTable');

const TOKEN_KEY = 'adminAccessToken';
let currentUsers = [];

function getApiBase() {
  const host = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  if (protocol === 'file:' || host === '' || host === 'localhost' || host === '127.0.0.1' || port === '5000') {
    return 'http://localhost:5000/api';
  }
  
  return 'https://tubegrowth.me/api';
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

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getUserIdentityKey(user) {
  return (user.youtubeChannelId || user.email || user._id || '').toString().trim().toLowerCase();
}

function dedupeUsers(users) {
  const seen = new Set();
  const uniqueUsers = [];

  users.forEach((user) => {
    const key = getUserIdentityKey(user);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    uniqueUsers.push(user);
  });

  return uniqueUsers;
}

function renderUsers(users) {
  usersTable.innerHTML = '';
  const uniqueUsers = dedupeUsers(users);

  if (!uniqueUsers.length) {
    usersTable.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
    return;
  }

  uniqueUsers.forEach((user) => {
    const channelTitle = user.youtubeChannelTitle || '—';
    const userName = user.name || '—';
    const channelName = user.name && user.youtubeChannelTitle && user.name !== user.youtubeChannelTitle
      ? `${user.name} (${user.youtubeChannelTitle})`
      : (user.name || user.youtubeChannelTitle || '—');
    const channelId = user.youtubeChannelId || '—';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatValue(channelName)}</td>
      <td>${formatValue(channelId)}</td>
      <td>${formatValue(user.credits)}</td>
      <td>
        <button class="edit-btn" data-id="${escapeAttr(user._id)}" data-name="${escapeAttr(user.name || '')}" data-channel-name="${escapeAttr(channelTitle)}" data-channel-id="${escapeAttr(channelId)}" data-credits="${escapeAttr(user.credits)}">Edit</button>
        <button class="delete-btn" data-id="${escapeAttr(user._id)}" data-channel-name="${escapeAttr(channelName)}">Delete</button>
      </td>
    `;
    usersTable.appendChild(row);
  });

  // Add event listeners for edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name') || '';
      const channelName = btn.getAttribute('data-channel-name');
      const channelId = btn.getAttribute('data-channel-id');
      const credits = btn.getAttribute('data-credits');
      openEditModal(id, name, channelName, channelId, credits);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const channelName = btn.getAttribute('data-channel-name') || 'this user';
      const confirmed = window.confirm(`Delete ${channelName}? This cannot be undone.`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteUser(id);
        setMessage('User deleted!', 'success');
        loadUsers();
      } catch (error) {
        setMessage(error.message || 'Failed to delete user', 'error');
      }
    });
  });
}

// Modal logic
const editUserModal = document.getElementById('editUserModal');
const closeEditModalBtn = document.getElementById('closeEditModal');
const editUserForm = document.getElementById('editUserForm');
const editUserId = document.getElementById('editUserId');
const editName = document.getElementById('editName');
const editChannelName = document.getElementById('editChannelName');
const editChannelId = document.getElementById('editChannelId');
const editCredits = document.getElementById('editCredits');

function openEditModal(id, name, channelName, channelId, credits) {
  const normalizedName = String(name || '').trim();
  const normalizedChannelName = String(channelName || '').trim();
  const normalizedChannelId = String(channelId || '').trim();
  editUserId.value = id;
  editName.value = normalizedName;
  editChannelName.value = normalizedChannelName;
  editChannelId.value = normalizedChannelId;
  editCredits.value = credits;
  editUserForm.dataset.origName = normalizedName;
  editUserForm.dataset.origChannelName = normalizedChannelName;
  editUserForm.dataset.origChannelId = normalizedChannelId;
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
  const name = editName.value.trim();
  const channelTitle = editChannelName.value.trim();
  const channelId = editChannelId.value.trim();
  const payload = {
    credits: Number(editCredits.value),
  };

  if (!name) {
    setMessage('Name cannot be empty', 'error');
    return;
  }

  if (!Number.isFinite(payload.credits) || payload.credits < 0) {
    setMessage('Credits must be a non-negative number', 'error');
    return;
  }

  if (name !== (editUserForm.dataset.origName || '')) {
    payload.name = name;
  }

  if (channelTitle !== (editUserForm.dataset.origChannelName || '')) {
    payload.youtubeChannelTitle = channelTitle;
  }

  if (channelId !== (editUserForm.dataset.origChannelId || '')) {
    payload.youtubeChannelId = channelId;
  }

  try {
    await updateUserDetails(id, payload);
    setMessage('User details updated!', 'success');
    editUserModal.style.display = 'none';
    loadUsers();
  } catch (err) {
    setMessage(err.message || 'Failed to update user details', 'error');
  }
}

async function updateUserDetails(userId, payload) {
  const token = getToken();
  const apiBase = getApiBase();
  const hasProfileFieldChanges = ['name', 'youtubeChannelTitle', 'youtubeChannelId']
    .some((field) => Object.prototype.hasOwnProperty.call(payload, field));
  let response = await fetch(`${apiBase}/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status === 404) {
    if (hasProfileFieldChanges) {
      throw new Error('Backend update required: deploy latest server to edit name/channel fields');
    }

    // Backward compatibility for servers that have only credits-update route.
    response = await fetch(`${apiBase}/admin/users/${userId}/credits`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ credits: payload.credits }),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update user details');
  }

  if (data.user?._id) {
    currentUsers = currentUsers.map((user) => (user._id === data.user._id ? data.user : user));
    renderUsers(currentUsers);
  }

  return data;
}

async function deleteUser(userId) {
  const token = getToken();
  const apiBase = getApiBase();
  const requestOptions = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  let response = await fetch(`${apiBase}/admin/users/${userId}/ban`, {
    method: 'POST',
    ...requestOptions,
  });

  if (!response.ok) {
    response = await fetch(`${apiBase}/admin/users/${userId}`, {
      method: 'DELETE',
      ...requestOptions,
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete user');
  }

  return data;
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

  return (data.users || []).filter((user) => !user.isBanned);
}

async function loadUsers() {
  setMessage('Loading users...');
  try {
    const users = await fetchAdminUsers();
    currentUsers = users;
    renderUsers(currentUsers);
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
  usersTable.innerHTML = '<tr><td colspan="4">Sign in to load users.</td></tr>';
});

refreshBtn?.addEventListener('click', loadUsers);

updateAuthStatus();
if (getToken()) {
  loadUsers();
}
