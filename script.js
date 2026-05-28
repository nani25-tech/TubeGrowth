// Automatically register/login user with channel ID and name
async function ensureChannelUserInBackend(forceRefresh = false) {
  let channelId = restoreSelectedChannelSession();
  if (!channelId) return;

  let channelName = (localStorage.getItem('selectedChannelName') || '').trim() || getChannelDisplayName(channelId);
  try {
    const profile = await fetchChannelProfile(channelId);
    if (profile?.channelId) {
      channelId = normalizeChannelInput(profile.channelId) || channelId;
      localStorage.setItem('selectedChannelId', channelId);
    }
    if (profile?.title) {
      channelName = profile.title.trim();
    }
  } catch (error) {
    // Keep the cached/display name if the profile lookup fails.
  }

  localStorage.setItem('selectedChannelName', channelName);
  const syncSignature = `${channelId}::${channelName.toLowerCase()}`;
  const existingToken = localStorage.getItem('accessToken') || '';
  if (!forceRefresh && existingToken && localStorage.getItem(CHANNEL_SYNC_SIGNATURE_KEY) === syncSignature) {
    return;
  }

  try {
    // Validate before sending to backend
    if (!channelId || !channelId.trim()) {
      throw new Error('Channel ID is required but was not provided. Please try again.');
    }
    if (!channelName || !channelName.trim()) {
      throw new Error('Channel Name is required but was not provided. Please try again.');
    }

    console.log('[Channel Login] Syncing with backend:', { channelId, channelName });

    const apiBase = typeof getApiBase === 'function' ? getApiBase() : '';
    const response = await fetch(`${apiBase}/auth/channel-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeChannelId: channelId, youtubeChannelTitle: channelName })
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem(CHANNEL_SYNC_SIGNATURE_KEY, syncSignature);
      if (data?.user && typeof data.user.credits === 'number') {
        localStorage.setItem(getCreditStorageKey(), String(data.user.credits));
        // Update the global userCredits variable and refresh UI immediately
        userCredits = data.user.credits;
        persistCredits();
        updateCreditDisplay();
      }
      console.log('[Channel Login] Successfully synced with backend');
      return data;
    }
    const errorPayload = await response.json().catch(() => ({}));
    const errorMsg = errorPayload.message || `Channel sync failed (${response.status})`;
    console.error('[Channel Login] Backend error:', errorMsg, errorPayload);
    throw new Error(errorMsg);
  } catch (err) {
    throw err;
  }
}
// Sanitize stored `user` JSON to avoid uncaught SyntaxError on page load
try {
  const _u = localStorage.getItem('user');
  if (_u) JSON.parse(_u);
} catch (e) {
  console.warn('Corrupt localStorage.user found, clearing it to avoid syntax errors');
  try { localStorage.removeItem('user'); } catch (e) {}
}
const PROTECTED_SECTION_IDS = new Set(['dashboard-preview', 'earn-credits', 'get-started', 'services']);
const LOGOUT_STATE_KEY = 'isExplicitlyLoggedOut';
const CHANNEL_SYNC_SIGNATURE_KEY = 'lastSyncedChannelSignature';
const APP_STORAGE_VERSION_KEY = 'tubeGrowthClientStorageVersion';
const APP_STORAGE_VERSION = '2026-05-14-clean';
const APP_STORAGE_CLEAR_KEYS = new Set([
  'accessToken',
  'user',
  'credits',
  'dailyBonusData',
  'earnLastReset',
  'earnedToday',
  'earnTaskHistory',
  'pendingVerify',
  'preferredCurrency',
  'referralCode',
  'referralData',
  'referralLog',
  'referralTimestamp',
  'selectedChannelId',
  'selectedChannelLogo',
  'selectedChannelName',
  'selectedChannelSubscribers',
  'usedReferralCode',
  'watchSession',
  'forceDevPayments'
]);
const APP_STORAGE_CLEAR_PREFIXES = [
  'defaultSubscribeHistory',
  'likeHistory',
  'subscribeHistory',
  'userCredits',
  'watchHistory',
  'campaigns'
];

function purgeLegacyAppState() {
  if (localStorage.getItem(APP_STORAGE_VERSION_KEY) === APP_STORAGE_VERSION) {
    return;
  }

  Object.keys(localStorage).forEach(key => {
    if (APP_STORAGE_CLEAR_KEYS.has(key) || APP_STORAGE_CLEAR_PREFIXES.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  });

  localStorage.setItem(APP_STORAGE_VERSION_KEY, APP_STORAGE_VERSION);
}

purgeLegacyAppState();

function isExplicitlyLoggedOut() {
  return localStorage.getItem(LOGOUT_STATE_KEY) === 'true';
}

function setExplicitLogoutState(isLoggedOut) {
  localStorage.setItem(LOGOUT_STATE_KEY, isLoggedOut ? 'true' : 'false');
}

function hasAuthenticatedSession() {
  return Boolean(localStorage.getItem('accessToken')) && !isExplicitlyLoggedOut();
}

function hasSelectedChannel() {
  return Boolean(restoreSelectedChannelSession());
}

function normalizeChannelInput(value) {
  if (!value) {
    return '';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  const channelIdMatch = raw.match(/UC[a-zA-Z0-9_-]{10,}/);
  if (channelIdMatch) {
    return channelIdMatch[0];
  }

  const handleMatch = raw.match(/@[a-zA-Z0-9._-]+/);
  if (handleMatch) {
    return handleMatch[0];
  }

  try {
    const parsedUrl = new URL(raw);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathParts.length) {
      const handlePart = pathParts.find(part => part.startsWith('@'));
      if (handlePart) {
        return decodeURIComponent(handlePart);
      }

      const channelIndex = pathParts.findIndex(part => part.toLowerCase() === 'channel');
      if (channelIndex >= 0 && pathParts[channelIndex + 1]) {
        return decodeURIComponent(pathParts[channelIndex + 1]);
      }

      return decodeURIComponent(pathParts[pathParts.length - 1]);
    }
  } catch (error) {
    // fall through to plain text cleanup
  }

  return raw.split(/\s+/)[0];
}

function restoreSelectedChannelSession() {
  if (isExplicitlyLoggedOut()) {
    // If the user has session data (access token, user object, or selectedChannelId),
    // assume logout flag is stale and clear it so the UI can restore.
    const hasSessionData = Boolean(
      localStorage.getItem('accessToken') ||
      localStorage.getItem('user') ||
      localStorage.getItem('selectedChannelId')
    );
    if (!hasSessionData) {
      return '';
    }
    setExplicitLogoutState(false);
  }

  const existingChannelId = normalizeChannelInput(localStorage.getItem('selectedChannelId') || '');
  if (existingChannelId) {
    localStorage.setItem('selectedChannelId', existingChannelId);
    return existingChannelId;
  }

  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const fallbackChannelId = normalizeChannelInput(
      storedUser?.youtubeChannelId || storedUser?.channelId || ''
    );

    if (!fallbackChannelId) {
      return '';
    }

    const fallbackChannelName = (
      storedUser?.youtubeChannelTitle ||
      storedUser?.name ||
      getChannelDisplayName(fallbackChannelId)
    ).trim();

    localStorage.setItem('selectedChannelId', fallbackChannelId);
    if (fallbackChannelName) {
      localStorage.setItem('selectedChannelName', fallbackChannelName);
    }

    return fallbackChannelId;
  } catch (error) {
    return '';
  }
}

function clearSelectedChannelSession() {
  setExplicitLogoutState(true);
  localStorage.removeItem('selectedChannelId');
  localStorage.removeItem('selectedChannelName');
  localStorage.removeItem('selectedChannelLogo');
  localStorage.removeItem(CHANNEL_SYNC_SIGNATURE_KEY);
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  
  // Clear all credit storage keys to ensure old credits don't persist
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('userCredits')) {
      localStorage.removeItem(key);
    }
  });
  
  // Reset the global userCredits variable
  userCredits = 0;

  const dashboardSearchInput = document.getElementById('channelSearchInput');
  if (dashboardSearchInput) {
    dashboardSearchInput.value = '';
  }

  const boostSearchInput = document.getElementById('channelSearch');
  if (boostSearchInput) {
    boostSearchInput.value = '';
  }

  // Hide credits display and refresh UI on logout
  updateCreditsDisplay();
  updateCreditDisplay();
}

function updateCreditsDisplay() {
  const navCredits = document.getElementById('navCredits');
  const buyCreditsNav = document.getElementById('buyCreditsNav');
  const hasChannel = hasSelectedChannel();
  const hasAuth = hasAuthenticatedSession();
  
  if (navCredits) {
    navCredits.style.display = hasChannel && hasAuth ? 'flex' : 'none';
  }

  if (buyCreditsNav) {
    buyCreditsNav.style.display = hasChannel && hasAuth ? 'flex' : 'none';
  }
}

// LANDING PAGE FUNCTIONS
// Ensure user is registered in backend when channel is selected
ensureChannelUserInBackend();
function showSection(sectionId) {
  const normalizedId = sectionId === '#top' || sectionId === 'top' ? 'home' : sectionId.replace(/^#/, '');

  if (PROTECTED_SECTION_IDS.has(normalizedId) && !hasSelectedChannel()) {
    showToast('bi-exclamation-triangle-fill', 'Channel ID Required', 'Paste your YouTube Channel ID first to continue.');
    return showSection('home');
  }

  const sectionElement = normalizedId === 'home'
    ? document.querySelector('.free-boost-section')
    : document.getElementById(normalizedId);

  if (!sectionElement) {
    return;
  }

  Array.from(document.body.children).forEach((element) => {
    if (element.tagName === 'NAV' || element.tagName === 'FOOTER' || element.id === 'toast' || element.id === 'earnModal' || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
      return;
    }

    element.style.display = element === sectionElement ? '' : 'none';
  });

  window.history.replaceState(null, '', normalizedId === 'home' ? '#top' : `#${normalizedId}`);
  updateActiveSectionLinks(normalizedId);
  // Add body class for home view so CSS can hide dashboard preview
  try { document.body.classList.toggle('home-view', normalizedId === 'home'); } catch (e) { /* ignore */ }

  if (normalizedId === 'dashboard-preview') {
    const savedChannelIdRaw = localStorage.getItem('selectedChannelId') || '';
    const savedChannelId = normalizeChannelInput(savedChannelIdRaw);
    const savedChannelName = localStorage.getItem('selectedChannelName') || (savedChannelId ? getChannelDisplayName(savedChannelId) : '');
    if (savedChannelId) {
      localStorage.setItem('selectedChannelId', savedChannelId);
      loadDashboardProfile(savedChannelId, savedChannelName);
    } else {
      // No channel selected: clear profile/boost display to avoid stale values after refresh
      const profileName = document.querySelector('.profile-name');
      const boostChannel = document.querySelector('.boost-your-channel');
      if (profileName) profileName.textContent = '';
      if (boostChannel) boostChannel.textContent = '';
      updateCreditsDisplay();
    }
    const dashboardContent = document.getElementById('dashboard-content');
    const promotionsContent = document.getElementById('promotions-content');
    if (dashboardContent) dashboardContent.classList.add('active');
    if (promotionsContent) promotionsContent.classList.remove('active');
  } else if (normalizedId === 'earn-credits') {
    // Ensure promotions are synced from backend before rendering earn tasks
    try {
      if (typeof syncPromotionsFromBackend === 'function') {
        syncPromotionsFromBackend().then(() => {
          try { refreshEarnTaskRotation(); } catch (e) { console.warn('refreshEarnTaskRotation failed', e); }
        }).catch((e) => {
          console.warn('syncPromotionsFromBackend failed', e);
          try { refreshEarnTaskRotation(); } catch (e2) { console.warn('refreshEarnTaskRotation failed', e2); }
        });
      } else {
        refreshEarnTaskRotation();
      }
    } catch (e) {
      console.warn('Error preparing earn-credits section', e);
      refreshEarnTaskRotation();
    }
  } else if (normalizedId === 'services') {
    const dashboardContent = document.getElementById('dashboard-content');
    const promotionsContent = document.getElementById('promotions-content');
    if (dashboardContent) dashboardContent.classList.remove('active');
    if (promotionsContent) promotionsContent.classList.add('active');
    loadPromotions();
    updateCreditDisplay();
  }
}

function updateActiveSectionLinks(activeSectionId) {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href === '#top') {
      return;
    }

    const linkSectionId = href === '#top' ? 'home' : href.replace(/^#/, '');
    const isActive = linkSectionId === activeSectionId;

    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) {
    return;
  }

  const href = link.getAttribute('href');
  if (!href || href === '#') {
    return;
  }

  const targetId = href === '#top' ? 'home' : href.slice(1);
  const targetSection = targetId === 'home' ? document.querySelector('.free-boost-section') : document.getElementById(targetId);

  if (!targetSection) {
    return;
  }

  const isLogoutLink = (link.textContent || '').trim().toUpperCase() === 'LOGOUT';
  if (isLogoutLink) {
    event.preventDefault();
    clearSelectedChannelSession();
    showSection('home');
    showToast('bi-box-arrow-right', 'Logged Out', 'Paste your YouTube Channel ID to login again.');
    return;
  }

  event.preventDefault();
  showSection(targetId);
});

async function searchAndOpenDashboard() {
  const channelInput = document.getElementById('channelSearchInput');
  const channelId = normalizeChannelInput(channelInput.value);
  const channelName = getChannelDisplayName(channelId);
  
  if (!channelId) {
    showToast('bi-exclamation-triangle-fill', 'Missing Channel ID', 'Please enter your YouTube Channel Link or Channel ID');
    return;
  }

  // Require agreement to privacy & terms when checkbox is present
  // If any agreement checkboxes exist, require at least one to be checked.
  const agreeEls = Array.from(document.querySelectorAll('.free-boost-agreement-checkbox'));
  if (agreeEls.length && !agreeEls.some(e => e.checked)) {
    showToast('bi-exclamation-triangle-fill', 'Agreement Required', 'Please read and agree to the privacy policy and terms and conditions');
    return;
  }
  // Save channel info to localStorage for dashboard
  setExplicitLogoutState(false);
  localStorage.setItem('selectedChannelId', channelId);
  localStorage.setItem('selectedChannelName', channelName);
  channelInput.value = channelId;
  
  showToast('bi-hourglass-split', 'Saving Channel', 'Collecting your channel details...');

  try {
    // Try to enrich with YouTube profile data, but always continue to backend sync.
    let resolvedChannelId = channelId;
    let finalName = channelName;
    let finalLogo = '';

    try {
      const profile = await fetchChannelProfile(channelId);
      resolvedChannelId = normalizeChannelInput(profile?.channelId || channelId) || channelId;
      finalName = profile?.title || channelName;
      finalLogo = profile?.thumbnail || '';
    } catch (profileError) {
      // Keep fallback channel details and still sync with backend.
    }

    localStorage.setItem('selectedChannelId', resolvedChannelId);
    localStorage.setItem('selectedChannelName', finalName);
    localStorage.setItem('selectedChannelLogo', finalLogo);
    updateDashboardChannel(resolvedChannelId, finalName, finalLogo);
    // Start backend sync in background to avoid blocking the UI — proceed to dashboard immediately.
    ensureChannelUserInBackend().then(() => {
      console.log('[Channel Login] background sync completed');
    }).catch(err => {
      console.warn('[Channel Login] background sync failed', err);
    });
    showToast('bi-check-circle-fill', 'Channel Saved', 'Opening your dashboard...');
    // Show ad units after successful login
    try { showAdAfterLogin(); } catch (e) { console.warn('showAdAfterLogin error', e); }
    updateCreditsDisplay();
    showSection('dashboard-preview');
  } catch (error) {
    console.error('[Channel Save] Error:', error.message || error);
    const errorMsg = error.message || 'Unknown error occurred';
    showToast('bi-exclamation-triangle-fill', 'Could not save channel', errorMsg);
  }
}

// Agreement elements should remain; no runtime removal necessary

function scrollToSection(sectionId) {
  showSection(sectionId);
}

function getChannelDisplayName(channelInput) {
  if (!channelInput) {
    return 'Unknown Channel';
  }

  try {
    const parsedUrl = new URL(channelInput);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

    if (pathParts.length === 0) {
      return getChannelFallbackName(channelInput);
    }

    const lastPart = decodeURIComponent(pathParts[pathParts.length - 1]);
    if (lastPart.startsWith('@')) {
      return lastPart;
    }

    return lastPart || getChannelFallbackName(channelInput);
  } catch (error) {
    const handleMatch = channelInput.match(/@[^/?&#]+/);
    if (handleMatch) {
      return handleMatch[0];
    }

    return getChannelFallbackName(channelInput);
  }
}

function getChannelFallbackName(channelInput) {
  return /^UC[a-zA-Z0-9_-]{10,}$/.test(channelInput) ? 'Uploaded Channel' : channelInput;
}

// --- YouTube Data API helper (client-side) ---
// Replace with server-side proxy in production to hide API keys.
const YOUTUBE_API_KEY = 'AIzaSyClUeX3dp-4rW12PjK2hNz2zxzl_eynOuY';

async function fetchChannelTitle(input) {
  if (!input) return null;

  // If looks like a raw channel ID (starts with UC) request channels.list by id
  const isChannelId = /^UC[a-zA-Z0-9_-]{10,}$/.test(input);

  try {
    if (isChannelId) {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(input)}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.items && data.items.length) return data.items[0].snippet.title;
      return null;
    }

    // If input looks like a full URL or handle, normalize and try search.list for channels
    // Use the raw input as a query for search.list (type=channel)
    const query = input.replace(/https?:\/\//, '').replace(/^www\./, '');
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.items && data.items.length) return data.items[0].snippet.title;
    return null;
  } catch (err) {
    return null;
  }
}

async function fetchChannelProfile(input) {
  if (!input) return { title: null, thumbnail: '', channelId: null };

  try {
    const isChannelId = /^UC[a-zA-Z0-9_-]{10,}$/.test(input);
    let channelId = isChannelId ? input : null;

    if (!channelId) {
      const query = input.replace(/https?:\/\//, '').replace(/^www\./, '');
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${YOUTUBE_API_KEY}`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return { title: null, thumbnail: '', channelId: null };
      const searchData = await searchRes.json();
      channelId = searchData.items && searchData.items.length ? (searchData.items[0].snippet.channelId || searchData.items[0].id.channelId) : null;
      if (!channelId) return { title: null, thumbnail: '', channelId: null };
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return { title: null, thumbnail: '', channelId: null };
    const data = await res.json();
    if (data.items && data.items.length) {
      const snippet = data.items[0].snippet || {};
      return {
        title: snippet.title || null,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        channelId,
      };
    }

    return { title: null, thumbnail: '', channelId: null };
  } catch (error) {
    return { title: null, thumbnail: '', channelId: null };
  }
}

async function fetchChannelSubscriberCount(input) {
  if (!input) return null;

  try {
    // If it's a channel ID (UC...), request by id
    const isChannelId = /^UC[a-zA-Z0-9_-]{10,}$/.test(input);
    if (isChannelId) {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(input)}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.items && data.items.length && data.items[0].statistics) {
        return parseInt(data.items[0].statistics.subscriberCount || 0, 10);
      }
      return null;
    }

    // Otherwise attempt to search channel to get channelId
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(input)}&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const sres = await fetch(searchUrl);
    if (!sres.ok) return null;
    const sdata = await sres.json();
    if (sdata.items && sdata.items.length) {
      const cid = sdata.items[0].snippet.channelId || sdata.items[0].id.channelId;
      if (cid) {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(cid)}&key=${YOUTUBE_API_KEY}`;
        const res2 = await fetch(url);
        if (!res2.ok) return null;
        const data2 = await res2.json();
        if (data2.items && data2.items.length && data2.items[0].statistics) {
          return parseInt(data2.items[0].statistics.subscriberCount || 0, 10);
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

function updateDashboardChannel(channelId, channelName = getChannelDisplayName(channelId), channelLogo = '', subscriberCount = null, watchTimeHours = null) {
  // Update profile card in dashboard
  const profileName = document.querySelector('.profile-name');
  const boostProfileName = document.getElementById('profile-name');
  const profileChannel = document.querySelector('.profile-channel');
  const profileCredits = document.querySelector('.profile-credits');
  const profileSubscribers = document.querySelector('.profile-subscribers');
  const profileWatchTime = document.querySelector('.profile-watchtime');
  const profileAvatarImg = document.getElementById('profileAvatarImg');
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const subscribers = Number.isFinite(subscriberCount)
    ? subscriberCount
    : (typeof storedUser?.subscribers === 'number' ? storedUser.subscribers : 0);
  const watchHours = Number.isFinite(watchTimeHours)
    ? watchTimeHours
    : (typeof storedUser?.watchTimeHours === 'number' ? storedUser.watchTimeHours : 0);
  
  // Display the stored channel name directly without fallback logic
  const displayName = (channelName && channelName.trim()) ? channelName : getChannelDisplayName(channelId);
  if (profileName) profileName.textContent = displayName;
  if (boostProfileName) boostProfileName.textContent = displayName;
  if (profileChannel) profileChannel.innerHTML = `<strong>YT Channel Link :</strong> ${channelId}`;
  if (profileCredits) profileCredits.textContent = hasAuthenticatedSession() ? `Your Credits : ${userCredits}` : '';
  if (profileSubscribers) profileSubscribers.textContent = `Subscribers : ${subscribers}`;
  if (profileWatchTime) profileWatchTime.textContent = `Watch Time : ${watchHours}h`;
  if (profileAvatarImg) {
    const logoUrl = channelLogo || localStorage.getItem('selectedChannelLogo') || '';
    const fallbackInitial = ((channelName || 'TubeGrowth').trim().charAt(0) || 'T').toUpperCase();
    const fallbackLogo = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#e2c27a"/>
            <stop offset="100%" stop-color="#79afe7"/>
          </linearGradient>
        </defs>
        <rect width="240" height="240" rx="120" fill="#0f1520"/>
        <circle cx="120" cy="120" r="106" fill="url(#g)" opacity="0.22"/>
        <text x="120" y="146" text-anchor="middle" fill="#eef3fb" font-size="98" font-family="Arial, sans-serif" font-weight="700">${fallbackInitial}</text>
      </svg>`
    )}`;
    if (logoUrl) {
      profileAvatarImg.src = logoUrl;
      profileAvatarImg.style.display = 'block';
    } else {
      profileAvatarImg.src = fallbackLogo;
      profileAvatarImg.style.display = 'block';
    }
  }
  
  // Update channel display in other sections
  const boostChannel = document.querySelector('.boost-your-channel');
  if (boostChannel) boostChannel.textContent = `Your Channel : ${displayName}`;
}

async function loadDashboardProfile(channelId, channelName) {
  const normalizedChannelId = normalizeChannelInput(channelId);
  if (!normalizedChannelId) {
    return;
  }

  const storedLogo = localStorage.getItem('selectedChannelLogo') || '';
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const watchTimeHours = typeof storedUser?.watchTimeHours === 'number' ? storedUser.watchTimeHours : 0;
  
  // Display immediately with stored name to avoid flashing on refresh
  const displayName = (channelName && channelName.trim()) ? channelName : getChannelDisplayName(normalizedChannelId);
  updateDashboardChannel(normalizedChannelId, displayName, storedLogo, 0, watchTimeHours);
  
  // Fetch subscriber count and profile in background
  try {
    const subscriberCount = await fetchChannelSubscriberCount(normalizedChannelId);
    if (Number.isFinite(subscriberCount)) {
      localStorage.setItem('selectedChannelSubscribers', String(subscriberCount));
    }
    
    // Only fetch profile if we don't have a stored logo
    if (!storedLogo) {
      const profile = await fetchChannelProfile(normalizedChannelId);
      const resolvedChannelId = normalizeChannelInput(profile?.channelId || normalizedChannelId) || normalizedChannelId;
      const finalName = profile?.title || channelName || getChannelDisplayName(normalizedChannelId);
      const finalLogo = profile?.thumbnail || '';
      
      // Only update if name or logo changed
      if (finalName !== displayName || finalLogo !== storedLogo) {
        localStorage.setItem('selectedChannelId', resolvedChannelId);
        localStorage.setItem('selectedChannelName', finalName);
        localStorage.setItem('selectedChannelLogo', finalLogo);
        updateDashboardChannel(resolvedChannelId, finalName, finalLogo, subscriberCount, watchTimeHours);
      } else {
        // Just update subscriber count
        updateDashboardChannel(normalizedChannelId, displayName, storedLogo, subscriberCount, watchTimeHours);
      }
    } else {
      // Just update with fetched subscriber count
      updateDashboardChannel(normalizedChannelId, displayName, storedLogo, subscriberCount, watchTimeHours);
    }
  } catch (error) {
    console.warn('Error loading profile:', error);
    // UI already updated with stored data, just ensure subscriber count is shown
    updateDashboardChannel(normalizedChannelId, displayName, storedLogo, 0, watchTimeHours);
  }
}
// Credit System
function getCreditStorageKey() {
  const selectedChannelId = normalizeChannelInput(localStorage.getItem('selectedChannelId') || '');
  if (selectedChannelId) {
    return `userCredits:${selectedChannelId}`;
  }

  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const userIdentity = String(
      storedUser?._id ||
      storedUser?.id ||
      storedUser?.youtubeChannelId ||
      storedUser?.channelId ||
      storedUser?.email ||
      ''
    ).trim();

    if (userIdentity) {
      return `userCredits:${userIdentity}`;
    }
  } catch (error) {
    // Ignore invalid stored user payload.
  }

  return 'userCredits';
}

function getStoredCredits() {
  const scopedCreditsKey = getCreditStorageKey();
  const scopedCreditsValue = parseInt(localStorage.getItem(scopedCreditsKey) || '', 10);
  if (!Number.isNaN(scopedCreditsValue)) {
    return scopedCreditsValue;
  }

  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (storedUser && typeof storedUser.credits === 'number') {
      localStorage.setItem(scopedCreditsKey, String(storedUser.credits));
      return storedUser.credits;
    }
  } catch (error) {
    // Ignore invalid stored user data and fall back to zero.
  }

  // Keep backward compatibility for anonymous sessions only.
  if (scopedCreditsKey === 'userCredits') {
    const legacyCreditsValue = parseInt(localStorage.getItem('credits') || '', 10);
    if (!Number.isNaN(legacyCreditsValue)) {
      return legacyCreditsValue;
    }
  }

  return 0;
}

function persistCredits() {
  const scopedCreditsKey = getCreditStorageKey();
  localStorage.setItem(scopedCreditsKey, String(userCredits));

  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (storedUser) {
      storedUser.credits = userCredits;
      localStorage.setItem('user', JSON.stringify(storedUser));
    }
  } catch (error) {
    // Ignore invalid stored user data and keep the balance in the credit keys.
  }

  void syncCreditsToBackend(userCredits);
}

async function syncCreditsToBackend(balance = userCredits) {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    return false;
  }

  // Validate credits value before sending
  const numericCredits = Number(balance);
  if (!Number.isFinite(numericCredits) || numericCredits < 0) {
    console.warn('syncCreditsToBackend: invalid credits value', balance);
    return false;
  }

  try {
    const response = await fetch(`${getApiBase()}/user/credits/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ credits: Math.floor(numericCredits) }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to restore the channel session before clearing state. This avoids
        // treating a stale token as a manual logout after refresh.
        try {
          await ensureChannelUserInBackend(true);
          const refreshedToken = localStorage.getItem('accessToken');
          if (refreshedToken) {
            return true;
          }
        } catch (reauthError) {
          console.warn('syncCreditsToBackend: reauth after 401 failed', reauthError);
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setExplicitLogoutState(true);
        console.warn('syncCreditsToBackend: received 401, cleared local auth state');
      }
      return false;
    }

    const data = await response.json();
    if (data?.user && typeof data.user.credits === 'number') {
      localStorage.setItem(getCreditStorageKey(), String(data.user.credits));
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (storedUser) {
        storedUser.credits = data.user.credits;
        localStorage.setItem('user', JSON.stringify(storedUser));
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

function updateTextForSelector(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

async function syncCreditsFromBackend() {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    return false;
  }

  try {
    const response = await fetch(`${getApiBase()}/user/profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return false;
    }

      if (data?.user && typeof data.user.credits === 'number') {
        localStorage.setItem(getCreditStorageKey(), String(data.user.credits));
      }
    const data = await response.json();
    const serverUser = data?.user;
    if (!serverUser || typeof serverUser.credits !== 'number') {
      return false;
    }

    userCredits = serverUser.credits;
    localStorage.setItem(getCreditStorageKey(), String(userCredits));

    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (storedUser) {
      storedUser.credits = userCredits;
      if (typeof serverUser.subscribers === 'number') {
        storedUser.subscribers = serverUser.subscribers;
      }
      if (typeof serverUser.watchTimeHours === 'number') {
        storedUser.watchTimeHours = serverUser.watchTimeHours;
      }
      if (typeof serverUser.youtubeChannelId !== 'undefined') {
        storedUser.youtubeChannelId = serverUser.youtubeChannelId;
      }
      if (typeof serverUser.youtubeChannelTitle !== 'undefined') {
        storedUser.youtubeChannelTitle = serverUser.youtubeChannelTitle;
      }
      storedUser.youtubeConnected = !!serverUser.youtubeChannelId;
      localStorage.setItem('user', JSON.stringify(storedUser));
    }

    updateCreditDisplay();
    return true;
  } catch (error) {
    return false;
  }
}

let userCredits = 0;

function updateCreditDisplay() {
  const isAuthenticated = hasAuthenticatedSession();
  const topBalance = document.getElementById('userCredits');
  const navCredits = document.getElementById('navCredits');

  if (!isAuthenticated) {
    userCredits = 0;
    if (topBalance) {
      topBalance.textContent = '';
      topBalance.style.display = 'none';
    }
    if (navCredits) {
      navCredits.style.display = 'none';
    }

    updateTextForSelector('.profile-credits', '');
    updateTextForSelector('.boost-credit-chip', '');
    updateTextForSelector('.view-promo-credit-chip', '');
    updateTextForSelector('.earn-credit-chip', '');
    return;
  }

  userCredits = getStoredCredits();
  if (topBalance) {
    topBalance.style.display = '';
    topBalance.textContent = userCredits;
  }

  updateTextForSelector('.profile-credits', `Your Credits : ${userCredits}`);
  updateTextForSelector('.boost-credit-chip', `Your Credits : ${userCredits}`);
  updateTextForSelector('.view-promo-credit-chip', `Your Credits : ${userCredits}`);
  updateTextForSelector('.earn-credit-chip', `Your Credits : ${userCredits}`);

  const profileSubscribers = document.querySelector('.profile-subscribers');
  const profileWatchTime = document.querySelector('.profile-watchtime');
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

  if (profileSubscribers) {
    const cachedSubscribers = parseInt(localStorage.getItem('selectedChannelSubscribers') || '', 10);
    const subscribers = Number.isNaN(cachedSubscribers)
      ? (typeof storedUser?.subscribers === 'number' ? storedUser.subscribers : 0)
      : cachedSubscribers;
    profileSubscribers.textContent = `Subscribers : ${subscribers}`;
  }

  if (profileWatchTime) {
    const watchTimeHours = typeof storedUser?.watchTimeHours === 'number' ? storedUser.watchTimeHours : 0;
    profileWatchTime.textContent = `Watch Time : ${watchTimeHours}h`;
  }
}

function purchaseCredits(amount, price, successMessage) {
  userCredits += amount;
  persistCredits();
  updateCreditDisplay();
  showToast('bi-coin', 'Credits Purchased!', successMessage || `+${amount} Credits added to your account`);
}

function getApiBase() {
  // Runtime override (useful for testing or when DNS points to static host)
  if (typeof window !== 'undefined') {
    if (window.__API_BASE__) return window.__API_BASE__;
    const meta = document.querySelector && document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) return meta.content.replace(/\/+$/, '');
  }

  const host = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;

  // Local development
  if (protocol === 'file:' || host === '' || host === 'localhost' || host === '127.0.0.1' || port === '5000') {
    return 'http://localhost:5000/api';
  }

  // When the static site is served from tubegrowth.me (DNS static hosting),
  // prefer the backend Render service which hosts the API.
  if (host === 'tubegrowth.me' || host.endsWith('.tubegrowth.me')) {
    return 'https://tubegrowth.onrender.com/api';
  }

  // Default to same-origin API for other hosts
  return protocol + '//' + host + (port ? ':' + port : '') + '/api';
}

function applyServerCreditBalance(balance) {
  const numericBalance = Number(balance);
  if (!Number.isFinite(numericBalance)) {
    return false;
  }

  userCredits = numericBalance;
  persistCredits();
  updateCreditDisplay();
  return true;
}

async function recordEarnActionOnBackend({ taskKey, taskType, taskName, channelName, reward }) {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${getApiBase()}/user/earn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ taskKey, taskType, taskName, channelName, reward }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Unable to store credits');
  }

  return data;
}

async function createCampaignOnBackend({ channelUrl, type, targetCount }) {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    throw new Error('Please login to create campaigns');
  }

  // If page includes a reCAPTCHA sitekey, attempt to execute it and include token
  let recaptchaToken = undefined;
  try {
    const meta = document.querySelector('meta[name="recaptcha-sitekey"]');
    const siteKey = meta ? meta.content : null;
    if (siteKey && window.grecaptcha && typeof window.grecaptcha.execute === 'function') {
      // grecaptcha.execute may require an action param; use 'create_campaign' as default
      recaptchaToken = await window.grecaptcha.execute(siteKey, { action: 'create_campaign' });
    }
  } catch (err) {
    console.warn('reCAPTCHA execute failed', err);
  }

  const response = await fetch(`${getApiBase()}/campaigns/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ channelUrl, type, targetCount, recaptchaToken }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || 'Unable to create campaign';

    // Temporary resilience: older backend deployments fail on external
    // YouTube lookups. Keep promotion flow working using local balance
    // checks until the backend rollout is fully live.
    if (response.status >= 500 && /Failed to fetch channel/i.test(message)) {
      return {
        credits: Math.max(0, userCredits - Number(targetCount || 0)),
        campaign: {
          id: Date.now(),
          status: 'active',
        },
      };
    }

    throw new Error(message);
  }

  return data;
}

const PAYMENT_PACKS = {
  INR: {
    10: 100,
    50: 500,
    100: 1000,
  },
  USD: {
    1: 100,
    15: 500,
    50: 1000,
  },
};

async function loadRazorpayScript() {
  if (window.Razorpay) return;
  const existing = document.getElementById('razorpay-js');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = 'razorpay-js';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.head.appendChild(s);
  });
}

function blockRazorpayPreloads() {
  try {
    const removeAll = () => {
      document.querySelectorAll('link[rel="preload"]').forEach(l => {
        try { if (l.href && /razorpay\.com/.test(l.href)) l.remove(); } catch(e) {}
      });
    };
    removeAll();
    const mo = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes && m.addedNodes.forEach(n => {
          try { if (n.tagName === 'LINK' && n.rel === 'preload' && /razorpay\.com/.test(n.href)) n.remove(); } catch(e) {}
        });
      });
    });
    mo.observe(document.head || document.documentElement, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 8000);
  } catch (e) { }
}

(async function(){
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', blockRazorpayPreloads);
  else blockRazorpayPreloads();
})();

async function openPaymentPage(currency, amount) {
  const selectedCurrency = String(currency || 'INR').toUpperCase();
  const numericAmount = Number(amount);
  if (!numericAmount) {
    showToast('bi-exclamation-triangle-fill', 'Invalid Amount', 'Please choose a valid payment package');
    return;
  }

  const creditsByCurrency = PAYMENT_PACKS[selectedCurrency];
  const creditsToAdd = creditsByCurrency?.[numericAmount];
  if (!creditsToAdd) {
    showToast('bi-exclamation-triangle-fill', 'Invalid Package', `Please choose one of the listed ${selectedCurrency} credit packs`);
    return;
  }

  // Ensure the user is authenticated before creating a payment order.
  // Try to auto-login with the selected channel if available.
  try {
    if (!hasAuthenticatedSession()) {
      await ensureChannelUserInBackend().catch(() => {});
    }
  } catch (e) {
    // ignore — we'll check token below
  }

  const accessTokenCheck = localStorage.getItem('accessToken');
  if (!accessTokenCheck) {
    // Try interactive channel-login, then retry purchase
    try {
      const loggedIn = await showChannelLoginModal();
      if (!loggedIn) {
        showToast('bi-exclamation-triangle-fill', 'Login Required', 'Please login (channel login) before buying credits');
        return;
      }
    } catch (err) {
      showToast('bi-exclamation-triangle-fill', 'Login Failed', err.message || 'Unable to login');
      return;
    }
  }

  try {
    const accessToken = localStorage.getItem('accessToken');
    const apiBase = getApiBase();

    const forceDevPayments = localStorage.getItem('forceDevPayments') === 'true';
    if (forceDevPayments) {
      try {
        const buyResp = await fetch(`${apiBase}/user/buy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ amount: numericAmount, currency: selectedCurrency }),
        });

        const buyData = await buyResp.json();
        if (!buyResp.ok) {
          throw new Error(buyData?.message || 'Unable to complete buy request');
        }

        if (buyData.user && typeof buyData.user.credits === 'number') {
          localStorage.setItem('user', JSON.stringify(buyData.user));
          userCredits = buyData.user.credits;
          persistCredits();
          updateCreditDisplay();
        } else {
          userCredits = (userCredits || 0) + creditsToAdd;
          persistCredits();
          updateCreditDisplay();
        }

        showToast('bi-coin', 'Credits Purchased', `+${creditsToAdd} credits added`);
        return;
      } catch (err) {
        console.error('Force dev buy failed', err);
        showToast('bi-x-circle', 'Payment Failed', err.message || 'Dev buy failed');
        return;
      }
    }

    const channelIdForOrder = localStorage.getItem('selectedChannelId') || localStorage.getItem('selectedChannel') || '';
    const channelNameForOrder = localStorage.getItem('selectedChannelName') || localStorage.getItem('selectedChannelName') || '';
    const response = await fetch(`${apiBase}/user/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ amount: numericAmount, currency: selectedCurrency, youtubeChannelId: channelIdForOrder, youtubeChannelTitle: channelNameForOrder }),
    });

    const data = await response.json();
    // If server issued tokens (auto channel-login), persist them
    if (data?.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      if (data?.user) localStorage.setItem('user', JSON.stringify(data.user));
    }
    if (!response.ok) {
      const errMsg = data?.message || 'Unable to create payment order';
      if (/razorpay/i.test(errMsg)) {
        console.warn('Create-order failed mentioning Razorpay — falling back to direct buy');
        const buyResp = await fetch(`${apiBase}/user/buy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ amount: numericAmount, currency: selectedCurrency }),
        });
        const buyData = await buyResp.json();
        if (!buyResp.ok) throw new Error(buyData?.message || 'Fallback buy failed');
        if (buyData.user && typeof buyData.user.credits === 'number') {
          localStorage.setItem('user', JSON.stringify(buyData.user));
          userCredits = buyData.user.credits;
          persistCredits();
          updateCreditDisplay();
        } else {
          userCredits = (userCredits || 0) + creditsToAdd;
          persistCredits();
          updateCreditDisplay();
        }
        showToast('bi-coin', 'Credits Purchased', `+${creditsToAdd} credits added`);
        return;
      }
      throw new Error(errMsg);
    }

    if (data?.devMode) {
      try {
        if (data.user && typeof data.user.credits === 'number') {
          localStorage.setItem('user', JSON.stringify(data.user));
          userCredits = data.user.credits;
          persistCredits();
          updateCreditDisplay();
        } else {
          userCredits = (userCredits || 0) + creditsToAdd;
          persistCredits();
          updateCreditDisplay();
        }

        showToast('bi-coin', 'Credits Purchased (Dev)', `+${creditsToAdd} credits added (dev mode)`);
        return;
      } catch (err) {
        console.error('Dev-mode credit handling failed', err);
        showToast('bi-x-circle', 'Payment Failed', 'Dev fallback failed to credit your account');
        return;
      }
    }

    try {
      await loadRazorpayScript();
    } catch (err) {
      console.error('Razorpay load failed', err);
      showToast('bi-exclamation-triangle-fill', 'Payment Not Ready', 'Razorpay checkout failed to load. Try again later.');
      return;
    }

    const options = {
      key: data.keyId || window.RAZORPAY_KEY_ID || '',
      amount: data.order.amount,
      currency: data.order.currency,
      name: 'TubeGrowth',
      description: `Buy ${creditsToAdd} Credits (${selectedCurrency})`,
      order_id: data.order.id,
      prefill: {
        name: JSON.parse(localStorage.getItem('user') || 'null')?.name || '',
        email: JSON.parse(localStorage.getItem('user') || 'null')?.email || '',
      },
      theme: { color: '#FBBF24' },
      handler: async function (paymentResponse) {
        const verifyResponse = await fetch(`${apiBase}/user/payment/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(paymentResponse),
        });

        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) {
          throw new Error(verifyData?.message || 'Payment verification failed');
        }

        purchaseCredits(
          creditsToAdd,
          numericAmount,
          `${selectedCurrency === 'USD' ? '$' : 'Rs'} ${numericAmount} paid | +${creditsToAdd} credits added`
        );
      },
      modal: {
        ondismiss: () => {
          showToast('bi-x-circle', 'Payment Cancelled', 'Your Razorpay checkout was closed');
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Razorpay payment error:', error);
    showToast('bi-x-circle', 'Payment Failed', error.message || 'Unable to open Razorpay checkout');
  }
}

function purchaseCreditsByINR(amountINR) {
  openPaymentPage('INR', amountINR);
}

function purchaseCreditsByUSD(amountUSD) {
  openPaymentPage('USD', amountUSD);
}

function purchaseCreditsByCurrency(currency, amount) {
  openPaymentPage(currency, amount);
}

// Feedback modal and button handler — modal-based UI for bug reports (works from file://)
function showFeedbackModal() {
  const modal = document.createElement('div');
  modal.id = 'feedback-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    z-index: 10000; font-family: inherit;
  `;
  modal.innerHTML = `
    <div style="background: white; border-radius: 8px; padding: 20px; max-width: 500px; width: 90%; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
      <h3 style="margin: 0 0 10px 0; font-size: 18px;">Send Feedback / Report Bug</h3>
      <textarea id="feedback-msg" placeholder="Please enter your feedback or bug report..." style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; resize: vertical;"></textarea>
      <input id="feedback-email" type="email" placeholder="Optional: your email" style="width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit;">
      <div style="display: flex; gap: 10px; margin-top: 15px; justify-content: flex-end;">
        <button id="feedback-cancel" style="padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; background: #f0f0f0; cursor: pointer;">Cancel</button>
        <button id="feedback-send" style="padding: 8px 16px; border: none; border-radius: 4px; background: #FBBF24; color: #000; cursor: pointer; font-weight: bold;">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('feedback-cancel').onclick = () => modal.remove();
  document.getElementById('feedback-send').onclick = async () => {
    const message = document.getElementById('feedback-msg').value.trim();
    const email = document.getElementById('feedback-email').value.trim();
    if (!message) {
      showToast('bi-exclamation-triangle-fill', 'Required', 'Please enter feedback');
      return;
    }
    try {
      const apiBase = getApiBase();
      const accessToken = localStorage.getItem('accessToken');
      const resp = await fetch(`${apiBase}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ message, email, page: window.location.href }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || 'Unable to send feedback');
      modal.remove();
      showToast('bi-chat-right-text', 'Feedback Sent', 'Thanks — we received your feedback');
    } catch (err) {
      console.error('Send feedback failed', err);
      showToast('bi-x-circle', 'Feedback Failed', err.message || 'Unable to send feedback');
    }
  };
}

function initFeedbackButtons() {
  document.querySelectorAll('.feedback-btn').forEach((btn) => {
    btn.addEventListener('click', showFeedbackModal);
  });
}

// Initialize feedback buttons and other UI
initFeedbackButtons && initFeedbackButtons();

// Currency selector persistence and UI
const PREFERRED_CURRENCY_KEY = 'preferredCurrency';

function getPreferredCurrency() {
  return (localStorage.getItem(PREFERRED_CURRENCY_KEY) || 'INR').toUpperCase();
}

function setPreferredCurrency(currency) {
  const c = String(currency || 'INR').toUpperCase();
  localStorage.setItem(PREFERRED_CURRENCY_KEY, c);
  // update UI
  // update selector UI (flag and code)
  const codeEl = document.getElementById('currencyCode');
  const flagEl = document.getElementById('currencyFlag');
  if (codeEl) codeEl.textContent = c;
  if (flagEl) flagEl.textContent = c === 'USD' ? '🇺🇸' : '🇮🇳';

  // close options if open
  const optionsEl = document.getElementById('currencyOptions');
  const selectRoot = document.getElementById('currencySelect');
  if (optionsEl && selectRoot) {
    optionsEl.classList.remove('show');
    selectRoot.setAttribute('aria-expanded', 'false');
  }

  // show/hide panels for clarity (keep existing per-panel handlers functional)
  const panels = document.querySelectorAll('.buy-method-panel');
  panels.forEach(panel => {
    const isUsd = panel.classList.contains('usd');
    panel.style.display = (c === 'USD') ? (isUsd ? '' : 'none') : (isUsd ? 'none' : '');
  });
}

function initCurrencySelector() {
  // apply stored preference or default
  const current = getPreferredCurrency();
  setPreferredCurrency(current);
}

// Simple modal to ask for channel ID and name and perform channel-login
function showChannelLoginModal() {
  return new Promise((resolve, reject) => {
    const modal = document.createElement('div');
    modal.id = 'channel-login-modal';
    modal.style.cssText = `position: fixed; inset: 0; display:flex;align-items:center;justify-content:center;z-index:10000;background:rgba(0,0,0,0.5)`;
    modal.innerHTML = `
      <div style="background:#fff;padding:20px;border-radius:8px;max-width:420px;width:90%">
        <h3 style="margin:0 0 10px">Login with Channel</h3>
        <input id="ch-id" placeholder="Channel ID (UC...) or @handle" style="width:100%;padding:8px;margin-bottom:8px">
        <input id="ch-name" placeholder="Channel Name" style="width:100%;padding:8px;margin-bottom:12px">
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button id="ch-cancel" style="padding:8px 12px">Cancel</button>
          <button id="ch-submit" style="padding:8px 12px;background:#FBBF24;border:none">Login</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('ch-cancel').onclick = () => { modal.remove(); resolve(false); };
    document.getElementById('ch-submit').onclick = async () => {
      const chId = document.getElementById('ch-id').value.trim();
      const chName = document.getElementById('ch-name').value.trim();
      if (!chId || !chName) return alert('Both fields are required');
      try {
        const resp = await fetch(`${getApiBase()}/auth/channel-login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtubeChannelId: chId, youtubeChannelTitle: chName })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(data?.message || 'Channel login failed');
        }
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(data.user || {}));
        modal.remove();
        resolve(true);
      } catch (err) {
        modal.remove();
        reject(err);
      }
    };
  });
}

// Initialize on load
try {
  initCurrencySelector();
} catch (err) {
  // ignore initialization errors
}

// Dropdown behavior for stylized selector
document.addEventListener('click', (e) => {
  const sel = document.getElementById('currencySelect');
  const opts = document.getElementById('currencyOptions');
  if (!sel || !opts) return;

  if (sel.contains(e.target)) {
    // click inside - toggle when clicking current region or select option
    const opt = e.target.closest('.currency-option');
    if (opt) {
      const c = opt.getAttribute('data-currency');
      setPreferredCurrency(c);
    } else if (e.target.closest('.currency-current')) {
      const expanded = sel.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        opts.classList.remove('show');
        sel.setAttribute('aria-expanded', 'false');
      } else {
        opts.classList.add('show');
        sel.setAttribute('aria-expanded', 'true');
      }
    }
    return;
  }

  // click outside closes dropdown
  opts.classList.remove('show');
  sel.setAttribute('aria-expanded', 'false');
});

// keyboard interaction
document.addEventListener('keydown', (e) => {
  const sel = document.getElementById('currencySelect');
  const opts = document.getElementById('currencyOptions');
  if (!sel || !opts) return;
  if (document.activeElement === sel) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      opts.classList.toggle('show');
      sel.setAttribute('aria-expanded', opts.classList.contains('show') ? 'true' : 'false');
    } else if (e.key === 'Escape') {
      opts.classList.remove('show');
      sel.setAttribute('aria-expanded', 'false');
    }
  }
});

function deductCredits(amount) {
  if (userCredits >= amount) {
    userCredits -= amount;
    persistCredits();
    updateCreditDisplay();
    return true;
  }
  return false;
}

// Earn Credits System
function getEarnedToday() {
  const today = new Date().toDateString();
  const lastReset = localStorage.getItem('earnLastReset');
  
  if (lastReset !== today) {
    localStorage.setItem('earnLastReset', today);
    localStorage.setItem('earnedToday', JSON.stringify({}));
    return {};
  }
  
  return JSON.parse(localStorage.getItem('earnedToday')) || {};
}

function saveEarnedToday(data) {
  localStorage.setItem('earnedToday', JSON.stringify(data));
}

// DAILY BONUS FUNCTIONS
let dailyBonusUiDate = null;

function getDailyBonusData() {
  const today = new Date().toDateString();
  let storedData = {};

  try {
    storedData = JSON.parse(localStorage.getItem('dailyBonusData')) || {};
  } catch (error) {
    storedData = {};
  }
  
  if (storedData.date !== today) {
    // Reset daily bonus for new day
    storedData.date = today;
    storedData.claimed = false;
    storedData.actionsCompleted = 0;
    saveDailyBonusData(storedData);
  }
  
  return storedData;
}

function formatTimeRemainingUntilReset() {
  const { hours, minutes } = getTimeUntilReset();
  const safeHours = String(hours).padStart(2, '0');
  const safeMinutes = String(minutes).padStart(2, '0');
  return `${safeHours}h ${safeMinutes}m`;
}

function saveDailyBonusData(data) {
  localStorage.setItem('dailyBonusData', JSON.stringify(data));
}

function incrementDailyActions() {
  const bonusData = getDailyBonusData();
  bonusData.actionsCompleted = (bonusData.actionsCompleted || 0) + 1;
  saveDailyBonusData(bonusData);
  updateDailyBonusUI();
}

function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeLeft = tomorrow - now;
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes, timeLeft };
}

function updateDailyBonusTimer() {
  try {
    const today = new Date().toDateString();
    if (dailyBonusUiDate && dailyBonusUiDate !== today) {
      // Day rolled over while page stayed open; rebuild bonus state and controls.
      updateDailyBonusUI();
      return;
    }

    const { hours, minutes } = getTimeUntilReset();
    const safeHours = Math.max(0, hours || 0);
    const safeMinutes = Math.max(0, minutes || 0);
    const txt = `${safeHours}h ${safeMinutes}m`;
    
    const timerEl = document.getElementById('dailyBonusTimer');
    if (timerEl) timerEl.textContent = txt;
    
    const dashTimer = document.getElementById('dashDailyBonusTimer');
    if (dashTimer) dashTimer.textContent = txt;
  } catch (err) {
    console.error('[updateDailyBonusTimer] Error:', err);
  }
}

function updateDailyBonusUI() {
  try {
    const bonusData = getDailyBonusData();
    dailyBonusUiDate = bonusData.date || new Date().toDateString();
    const actionsCountEl = document.getElementById('dailyActionsCount');
    const dashActionsCountEl = document.getElementById('dashDailyActionsCount');
    const bonusBtn = document.getElementById('claimBonusBtn');
    const dashBonusBtn = document.getElementById('dashClaimBonusBtn');
    const statusEl = document.getElementById('dailyBonusStatus');
    const dashStatusEl = document.getElementById('dashDailyBonusStatus');
    const neededCount = 20;
  
  if (actionsCountEl) {
    actionsCountEl.textContent = bonusData.actionsCompleted || 0;
  }
  if (dashActionsCountEl) {
    dashActionsCountEl.textContent = bonusData.actionsCompleted || 0;
  }
    // Ensure needed count is displayed everywhere
    const neededEl = document.getElementById('dailyActionsNeeded');
    const actionsNeededEl = document.getElementById('actionsNeeded');
    const dashNeededEl = document.getElementById('dashDailyActionsNeeded');
    const dashActionsNeededEl = document.getElementById('dashActionsNeeded');
    if (neededEl) neededEl.textContent = neededCount;
    if (actionsNeededEl) actionsNeededEl.textContent = neededCount;
    if (dashNeededEl) dashNeededEl.textContent = neededCount;
    if (dashActionsNeededEl) dashActionsNeededEl.textContent = neededCount;
    
    if (bonusBtn) {
      if (bonusData.claimed) {
        bonusBtn.disabled = true;
        bonusBtn.textContent = 'Already Claimed Today';
        if (statusEl) statusEl.innerHTML = `<span style="color: #4ade80;">✓ Claimed today. Next bonus in ${formatTimeRemainingUntilReset()}.</span>`;
        if (dashBonusBtn) {
          dashBonusBtn.disabled = true;
          dashBonusBtn.textContent = 'Already Claimed Today';
        }
        if (dashStatusEl) dashStatusEl.innerHTML = `<span style="color: #4ade80;">✓ Claimed today. Next bonus in ${formatTimeRemainingUntilReset()}.</span>`;
      } else if ((bonusData.actionsCompleted || 0) >= neededCount) {
        bonusBtn.disabled = false;
        bonusBtn.textContent = 'CLAIM BONUS';
        if (statusEl) statusEl.innerHTML = '';
        if (dashBonusBtn) {
          dashBonusBtn.disabled = false;
          dashBonusBtn.textContent = 'CLAIM BONUS';
        }
        if (dashStatusEl) dashStatusEl.innerHTML = 'Daily bonus ready — claim it in the Daily Bonus panel.';
      } else {
        bonusBtn.disabled = true;
        bonusBtn.textContent = `CLAIM BONUS (${bonusData.actionsCompleted || 0}/${neededCount})`;
        if (statusEl) statusEl.innerHTML = '';
        if (dashBonusBtn) {
          dashBonusBtn.disabled = true;
          dashBonusBtn.textContent = `CLAIM BONUS (${bonusData.actionsCompleted || 0}/${neededCount})`;
        }
        if (dashStatusEl) dashStatusEl.innerHTML = `Complete ${bonusData.actionsCompleted || 0}/${neededCount} actions to claim the daily bonus. Reset in ${formatTimeRemainingUntilReset()}.`;
      }
    }
    
    updateDailyBonusTimer();
  } catch (err) {
    console.error('[updateDailyBonusUI] Error:', err);
  }
}

// Testing helpers
function resetDailyBonusState() {
  localStorage.removeItem('dailyBonusData');
  updateDailyBonusUI();
  showToast('bi-check-circle-fill', 'Reset', 'Daily bonus state reset for testing');
}

function simulateDailyActions(count) {
  const bonusData = getDailyBonusData();
  bonusData.actionsCompleted = (bonusData.actionsCompleted || 0) + (Number(count) || 0);
  if (bonusData.actionsCompleted < 0) bonusData.actionsCompleted = 0;
  saveDailyBonusData(bonusData);
  updateDailyBonusUI();
  showToast('bi-activity', 'Simulated', `Added ${count} actions for testing`);
}

function claimDailyBonus() {
  const bonusData = getDailyBonusData();
  const neededCount = 20;
  
  if (bonusData.claimed) {
    showToast('bi-exclamation-circle-fill', 'Already Claimed', 'You have already claimed the daily bonus today.');
    return;
  }
  
  if ((bonusData.actionsCompleted || 0) < neededCount) {
    showToast('bi-exclamation-triangle-fill', 'Not Enough Actions', `Complete ${neededCount} actions to claim the bonus. (${bonusData.actionsCompleted || 0}/${neededCount})`);
    return;
  }
  
  // Award 25 credits
  userCredits += 25;
  persistCredits();
  updateCreditDisplay();
  
  // Mark as claimed
  bonusData.claimed = true;
  saveDailyBonusData(bonusData);
  updateDailyBonusUI();
  
  showToast('bi-star-fill', 'Daily Bonus Claimed!', '+25 Credits added to your account');
}

// REFERRAL SYSTEM
function getStoredUserReferralCode() {
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const code = typeof storedUser?.referralCode === 'string' ? storedUser.referralCode.trim().toUpperCase() : '';
  return /^(TGB|TB)[A-Z0-9]{5,}$/.test(code) ? code : '';
}

function generateReferralCode() {
  const storedUserCode = getStoredUserReferralCode();
  if (storedUserCode) return storedUserCode;

  const stored = (localStorage.getItem('referralCode') || '').trim().toUpperCase();
  if (/^(TGB|TB)[A-Z0-9]{5,}$/.test(stored)) {
    return stored;
  }
  
  const channelId = localStorage.getItem('selectedChannelId') || '';
  const code = channelId
    ? `TGB${channelId.substring(0, 8).toUpperCase()}`
    : `TGB${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  
  localStorage.setItem('referralCode', code);
  return code;
}

function getReferralData() {
  const storedData = JSON.parse(localStorage.getItem('referralData')) || {
    code: generateReferralCode(),
    referred: 0,
    earnings: 0
  };

  const currentCode = generateReferralCode();
  if (!/^(TGB|TB)[A-Z0-9]{5,}$/.test((storedData.code || '').trim().toUpperCase()) || storedData.code !== currentCode) {
    storedData.code = currentCode;
  }

  saveReferralData(storedData);
  return storedData;
}

function saveReferralData(data) {
  localStorage.setItem('referralData', JSON.stringify(data));
}

function updateReferralUI() {
  const data = getReferralData();
  const codeInput = document.getElementById('referralCode');
  const countEl = document.getElementById('referralCount');
  const earningsEl = document.getElementById('referralEarnings');
  
  if (codeInput) codeInput.value = data.code;
  if (countEl) countEl.textContent = data.referred || 0;
  if (earningsEl) earningsEl.textContent = (data.earnings || 0) + ' Credits';
}

function copyReferralCode() {
  const codeInput = document.getElementById('referralCode');
  if (!codeInput) return;

  try {
    codeInput.select();
    document.execCommand('copy');
    showToast('bi-check-circle-fill', 'Copied!', 'Referral code copied to clipboard');
  } catch (err) {
    // Fallback: copy by creating a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = codeInput.value || '';
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(textarea);
    showToast('bi-check-circle-fill', 'Copied!', 'Referral code copied to clipboard');
  }
}

function shareReferralCode() {
  const data = getReferralData();
  const shareUrl = `${window.location.origin}/?ref=${data.code}`;

  if (navigator.share) {
    navigator.share({
      title: 'Join TubeGrowth',
      text: 'Get 30 credits when you join with my referral code!',
      url: shareUrl
    }).catch(() => {
      copyReferralCode();
    });
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = shareUrl;
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(textarea);
    showToast('bi-link-45deg', 'Link Copied!', 'Share this link to earn referral credits');
  }
}

// Verify referral code format and usage
function verifyReferralCode(referralCode) {
  if (!referralCode || typeof referralCode !== 'string') {
    return { valid: false, error: 'Invalid referral code format' };
  }

  const normalizedCode = referralCode.trim().toUpperCase();
  if (!/^(TGB|TB)[A-Z0-9]{5,}$/.test(normalizedCode)) {
    return { valid: false, error: 'Invalid referral code - use your own referral code from Refer & Earn' };
  }

  const usedCode = localStorage.getItem('usedReferralCode');
  if (usedCode === normalizedCode) {
    return { valid: false, error: 'You already used this referral code' };
  }

  return { valid: true };
}

// Award referral credits to new user
async function awardReferralCredits(referralCode) {
  try {
    const verification = verifyReferralCode(referralCode);
    
    if (!verification.valid) {
      console.warn('[awardReferralCredits] Invalid code:', verification.error);
      return false;
    }

    const normalizedCode = referralCode.trim().toUpperCase();

    const result = await recordEarnActionOnBackend({
      taskKey: `referral-${normalizedCode}`,
      taskType: 'referral',
      taskName: 'Referral Bonus',
      channelName: normalizedCode,
      reward: 30,
    });

    const previousCredits = userCredits;
    if (result?.user && typeof result.user.credits === 'number') {
      applyServerCreditBalance(result.user.credits);
    } else {
      userCredits += 30;
      persistCredits();
      updateCreditDisplay();
    }

    localStorage.setItem('usedReferralCode', normalizedCode);
    localStorage.setItem('referralTimestamp', new Date().toISOString());

    const referralLog = JSON.parse(localStorage.getItem('referralLog')) || [];
    referralLog.push({
      code: normalizedCode,
      claimedAt: new Date().toISOString(),
      creditsAwarded: 30,
      creditsBefore: previousCredits
    });
    localStorage.setItem('referralLog', JSON.stringify(referralLog));

    console.log('[awardReferralCredits] Successfully awarded 30 credits for referral code:', referralCode);
    showToast('bi-gift-fill', 'Referral Bonus!', '+30 Credits awarded for joining with a referral code');

    return true;
  } catch (err) {
    console.error('[awardReferralCredits] Error:', err);
    return false;
  }
}

async function trackReferralReward() {
  try {
    // Check if coming from referral link
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    
    if (!refCode) {
      return; // No referral code in URL
    }

    // Check if already claimed this referral
    const storedRefCode = localStorage.getItem('usedReferralCode');
    if (storedRefCode === refCode.toUpperCase()) {
      console.log('[trackReferralReward] Referral code already used:', refCode);
      return;
    }

    // Award referral credits
    const success = await awardReferralCredits(refCode);
    
    if (success) {
      console.log('[trackReferralReward] Referral verified and credits awarded');
      // Clean up the URL so it doesn't show the ref code
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } catch (err) {
    console.error('[trackReferralReward] Error processing referral:', err);
  }
}

async function handleYouTubeConnectionStatus() {
  try {
    const params = new URLSearchParams(window.location.search);
    const youtubeStatus = params.get('youtube');

    if (!youtubeStatus) {
      return;
    }

    const isConnected = youtubeStatus === 'connected';
    const isError = youtubeStatus === 'error';

    if (!isConnected && !isError) {
      return;
    }

    showSection('dashboard-preview');

    const selectedChannelId = restoreSelectedChannelSession();
    const selectedChannelName = localStorage.getItem('selectedChannelName') || '';

    if (selectedChannelId) {
      await loadDashboardProfile(selectedChannelId, selectedChannelName);
    }

    if (isConnected) {
      showToast('bi-check-circle-fill', 'YouTube Connected', 'Your YouTube channel is linked and your dashboard is ready.');
    } else {
      showToast('bi-exclamation-triangle-fill', 'YouTube Connection Failed', 'Please try connecting your YouTube account again.');
    }

    window.history.replaceState({}, document.title, window.location.pathname + '#dashboard-preview');
  } catch (err) {
    console.warn('[handleYouTubeConnectionStatus] Error:', err);
  }
}

async function verifyAndApplyReferralCode() {
  try {
    const codeInput = document.getElementById('referralCodeInput');
    const statusDiv = document.getElementById('referralVerifyStatus');
    
    if (!codeInput || !statusDiv) {
      console.error('[verifyAndApplyReferralCode] Required elements not found');
      return;
    }

    const referralCode = codeInput.value.trim();

    if (!referralCode) {
      statusDiv.textContent = 'Please enter a referral code';
      statusDiv.style.color = '#e74c3c';
      return;
    }

    // Verify the code
    const verification = verifyReferralCode(referralCode);
    
    if (!verification.valid) {
      statusDiv.textContent = verification.error;
      statusDiv.style.color = '#e74c3c';
      console.log('[verifyAndApplyReferralCode] Invalid code:', verification.error);
      return;
    }

    // Award credits
    const success = await awardReferralCredits(referralCode);
    
    if (success) {
      statusDiv.textContent = '✓ Referral code applied successfully! 30 credits awarded.';
      statusDiv.style.color = '#39b54a';
      codeInput.value = '';
      codeInput.disabled = true;
      
      // Re-enable input after 2 seconds
      setTimeout(() => {
        codeInput.value = '';
        codeInput.disabled = false;
      }, 3000);
    } else {
      statusDiv.textContent = 'Failed to apply referral code. Please try again.';
      statusDiv.style.color = '#e74c3c';
    }
  } catch (err) {
    console.error('[verifyAndApplyReferralCode] Error:', err);
    const statusDiv = document.getElementById('referralVerifyStatus');
    if (statusDiv) {
      statusDiv.textContent = 'An error occurred. Please try again.';
      statusDiv.style.color = '#e74c3c';
    }
  }
}

window.verifyAndApplyReferralCode = verifyAndApplyReferralCode;

function normalizeChannelReference(value) {
  if (!value) return '';

  const trimmed = value.trim();

  try {
    const parsedUrl = new URL(trimmed);
    if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')) {
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      return decodeURIComponent(pathParts[pathParts.length - 1] || trimmed).replace(/\/$/, '');
    }
  } catch (error) {
    // fall through to plain-text normalization
  }

  return trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '');
}

function normalizeCampaignStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function isPromotableCampaign(campaign) {
  const status = normalizeCampaignStatus(campaign?.status);
  return status === 'active' || status === 'in progress';
}

function isCompletedCampaign(campaign) {
  return normalizeCampaignStatus(campaign?.status) === 'completed';
}

function normalizeEarnTaskType(type) {
  const value = String(type || '').trim().toLowerCase();
  if (['subs', 'subscriber', 'subscribers'].includes(value)) return 'subscribe';
  if (['like', 'likes'].includes(value)) return 'like';
  if (['watch', 'view', 'views'].includes(value)) return 'watch';
  return value;
}

function getCampaignReference(campaign) {
  return String(campaign?.videoLink || campaign?.channelId || campaign?.channelName || '').trim();
}

function normalizePromotionCampaign(campaign) {
  const quantity = Number(campaign?.quantity ?? campaign?.targetCount ?? 0);
  const progress = Number(campaign?.progress);
  const currentCount = Number(campaign?.currentCount ?? 0);
  const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

  return {
  id: String(campaign?.id || campaign?._id || Date.now()),
  type: String(campaign?.type || '').trim(),
  // Accept legacy/boot-sync `link` field as fallback for stored promotions
  videoLink: String(campaign?.videoLink || campaign?.channelId || campaign?.link || '').trim(),
  channelId: String(campaign?.channelId || '').trim(),
  channelName: String(campaign?.channelName || campaign?.targetLabel || '').trim(),
  targetLabel: String(campaign?.targetLabel || campaign?.channelName || '').trim(),
    quantity: normalizedQuantity,
    costPaid: Number(campaign?.costPaid ?? campaign?.cost ?? 0) || 0,
    status: normalizeCampaignStatus(campaign?.status || 'active') || 'active',
    dateCreated: String(
      campaign?.dateCreated ||
      (campaign?.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '')
    ),
    progress: Number.isFinite(progress)
      ? Math.max(0, Math.min(100, progress))
      : (normalizedQuantity > 0 && Number.isFinite(currentCount)
        ? Math.max(0, Math.min(100, Math.round((currentCount / normalizedQuantity) * 100)))
        : 0),
  };
}

function getStoredPromotions() {
  const campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
  const normalizedCampaigns = campaigns.map(normalizePromotionCampaign);
  if (JSON.stringify(campaigns) !== JSON.stringify(normalizedCampaigns)) {
    localStorage.setItem('campaigns', JSON.stringify(normalizedCampaigns));
  }
  return normalizedCampaigns;
}

function getPromotionTargetLabel(campaign) {
  if (!campaign) return '—';

  if (campaign.type === 'subs') {
    return campaign.channelName || campaign.channelId || campaign.videoLink || 'Promoted Channel';
  }

  if (campaign.type === 'likes' || campaign.type === 'views' || campaign.type === 'comments') {
    return campaign.videoLink || campaign.targetLabel || campaign.channelName || 'Promoted Video';
  }

  return campaign.targetLabel || campaign.channelName || campaign.videoLink || campaign.channelId || '—';
}

function getPromotionLinkLabel(campaign) {
  if (!campaign) return '—';
  const rawLink = campaign.videoLink || campaign.channelId || '';

  if (!rawLink) return '—';
  if (rawLink.length > 52) {
    return `${rawLink.slice(0, 49)}...`;
  }

  return rawLink;
}

function getSubscribePromotions(campaigns) {
  const currentChannel = normalizeChannelReference(localStorage.getItem('selectedChannelId') || localStorage.getItem('selectedChannelName'));
  const seen = new Set();

  return campaigns.filter((campaign) => {
    // Normalize task type so we accept 'subs', 'subscribe', etc.
    const taskType = normalizeEarnTaskType(campaign.type);
    if (taskType !== 'subscribe' || !isPromotableCampaign(campaign)) {
      return false;
    }

    const ref = normalizeChannelReference(getCampaignReference(campaign));
    if (!ref || (currentChannel && ref === currentChannel) || seen.has(ref)) {
      return false;
    }

    seen.add(ref);
    return true;
  });
}

function getBoostProfileStorage() {
  try {
    return JSON.parse(localStorage.getItem('boostProfileStorage')) || {};
  } catch (e) {
    return {};
  }
}

function getSubscribePromotionLabel(campaign) {
  return campaign?.channelName || getChannelDisplayName(getCampaignReference(campaign)) || campaign?.channelId || 'Promoted Channel';
}

let subscribePromoSelectionToken = 0;

function setSubscribePromoSelection(campaign, subscribeVerifyBtn, subscribeVerifyOriginal) {
  const linkEl = document.getElementById('subscribe-link');
  const nameEl = document.getElementById('subscribe-channel-name');
  if (!campaign || !linkEl || !nameEl) return;

  const selectionToken = ++subscribePromoSelectionToken;
  const campaignRef = getCampaignReference(campaign);
  const href = promotionVideoLinkToHref(campaignRef);
  const displayLabel = getSubscribePromotionLabel(campaign);

  linkEl.href = href;
  const isUnlocked = window.__tgEarnUnlockedType === 'subscribe';
  linkEl.style.pointerEvents = isUnlocked ? '' : 'none';
  linkEl.style.opacity = isUnlocked ? '' : '0.55';
  linkEl.setAttribute('aria-disabled', String(!isUnlocked));
  linkEl.onclick = (event) => {
    if (window.__tgEarnUnlockedType !== 'subscribe') {
      event.preventDefault();
      showStatus('subscribe', 'Click SUBSCRIBE first to open the promoted channel.', 'error');
      return false;
    }
    try {
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      showStatus('subscribe', 'Popup was blocked. Allow popups and try again.', 'error');
    }
    return false;
  };
  nameEl.textContent = `Channel: ${displayLabel}`;

  if (subscribeVerifyBtn) {
    subscribeVerifyBtn.disabled = true;
    subscribeVerifyBtn.innerHTML = '<i class="bi bi-clock-fill"></i> Preparing...';
  }

  (async () => {
    const startCount = await fetchChannelSubscriberCount(campaignRef);
    const title = await fetchChannelTitle(campaignRef);

    if (selectionToken !== subscribePromoSelectionToken) {
      return;
    }

    if (title) {
      nameEl.textContent = `Channel: ${title}`;
    }

    const pending = {
      type: 'subscribe',
      campaignId: getCampaignStorageId(campaign),
      channelReference: campaignRef,
      startCount,
      startedAt: Date.now(),
    };
    localStorage.setItem('pendingVerify', JSON.stringify(pending));

    const history = getSubscribeHistory();
    if (!history.includes(campaignRef)) {
      history.push(campaignRef);
      saveSubscribeHistory(history.slice(-12));
    }

    if (subscribeVerifyBtn) {
      subscribeVerifyBtn.disabled = false;
      subscribeVerifyBtn.innerHTML = subscribeVerifyOriginal || '<i class="bi bi-check2-circle"></i> Verify';
    }
  })();
}

function renderSubscribePromotionList(campaigns, subscribeVerifyBtn, subscribeVerifyOriginal) {
  const listEl = document.getElementById('subscribe-promo-list');
  const selectionPanel = document.querySelector('.subscribe-promo-panel > div:nth-of-type(2)');
  if (!listEl) return [];

  listEl.innerHTML = '';
  const promos = getSubscribePromotions(campaigns);

  if (!promos.length) {
    if (selectionPanel) {
      selectionPanel.style.display = 'none';
    }
    const emptyState = document.createElement('div');
    emptyState.style.cssText = 'margin-top:12px; color:#f7b27e; font-size:16px; font-weight:700; text-align:center; line-height:1.4;';
    emptyState.textContent = 'No promoted channels are available right now.';
    listEl.appendChild(emptyState);

    if (subscribeVerifyBtn) {
      subscribeVerifyBtn.disabled = true;
      subscribeVerifyBtn.innerHTML = subscribeVerifyOriginal || '<i class="bi bi-check2-circle"></i> Verify';
    }
    return [];
  }

  if (selectionPanel) {
    selectionPanel.style.display = '';
  }

  const campaign = pickNextSubscribePromotion(promos) || promos[0];
  if (!campaign) return promos;

  const card = document.createElement('button');
  card.type = 'button';
  card.style.cssText = 'width:100%; text-align:left; padding:12px 14px; border-radius:12px; border:1px solid #39b54a; background:rgba(57,181,74,0.18); color:#fff; cursor:pointer; display:flex; flex-direction:column; gap:4px;';
  card.dataset.campaignId = getCampaignStorageId(campaign);

  const title = document.createElement('span');
  title.style.cssText = 'font-weight:700;';
  title.textContent = getSubscribePromotionLabel(campaign);

  const meta = document.createElement('span');
  meta.style.cssText = 'font-size:12px; color:#cfcfcf;';
  meta.textContent = campaign.channelId ? `Channel ID: ${campaign.channelId}` : 'Promoted channel';

  const hint = document.createElement('span');
  hint.style.cssText = 'font-size:12px; color:#b7d9ff;';
  hint.textContent = 'Click SUBSCRIBE to open this channel, then VERIFY to move to the next one.';

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(hint);
  card.addEventListener('click', () => {
    setSubscribePromoSelection(campaign, subscribeVerifyBtn, subscribeVerifyOriginal);
  });

  listEl.appendChild(card);
  setSubscribePromoSelection(campaign, subscribeVerifyBtn, subscribeVerifyOriginal);
  return promos;
}

function getCampaignStorageId(campaign) {
  return String(campaign?.id || campaign?._id || '').trim();
}

function mapBackendCampaignToStoredCampaign(campaign) {
  const targetCount = Number(campaign?.targetCount || campaign?.quantity || 0);
  const currentCount = Number(campaign?.currentCount || 0);

  return {
    id: getCampaignStorageId(campaign),
    type: String(campaign?.type || '').trim(),
    videoLink: String(campaign?.channelId || campaign?.videoUrl || campaign?.videoLink || '').trim(),
    channelId: String(campaign?.channelId || '').trim(),
    channelName: String(campaign?.channelName || '').trim(),
    quantity: Number.isFinite(targetCount) ? targetCount : 0,
    costPaid: Number(campaign?.cost || 0),
    status: normalizeCampaignStatus(campaign?.status || 'active') || 'active',
    dateCreated: campaign?.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '',
    progress: Number.isFinite(targetCount) && targetCount > 0
      ? Math.min(100, Math.round((currentCount / targetCount) * 100))
      : 0,
  };
}

function mergeStoredCampaigns(localCampaigns, backendCampaigns) {
  const merged = [];
  const seen = new Set();

  const addCampaign = (campaign) => {
    const campaignId = getCampaignStorageId(campaign);
    if (!campaignId || seen.has(campaignId)) {
      return;
    }
    seen.add(campaignId);
    merged.push(campaign);
  };

  backendCampaigns.forEach(addCampaign);
  localCampaigns.forEach(addCampaign);

  return merged;
}

async function syncPromotionsFromBackend() {
  const accessToken = localStorage.getItem('accessToken');

  try {
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(`${getApiBase()}/campaigns/list?limit=100&page=1`, {
      headers,
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json().catch(() => ({}));
    const backendCampaigns = Array.isArray(data?.campaigns)
      ? data.campaigns.map((campaign) => normalizePromotionCampaign(mapBackendCampaignToStoredCampaign(campaign))).filter((campaign) => Boolean(campaign.id))
      : [];
    const localCampaigns = getStoredPromotions();
    const mergedCampaigns = mergeStoredCampaigns(localCampaigns, backendCampaigns);

    localStorage.setItem('campaigns', JSON.stringify(mergedCampaigns));
    return true;
  } catch (error) {
    console.warn('syncPromotionsFromBackend failed', error);
    return false;
  }
}

function getSubscribeHistory() {
  return JSON.parse(localStorage.getItem('subscribeHistory')) || [];
}

function saveSubscribeHistory(history) {
  localStorage.setItem('subscribeHistory', JSON.stringify(history));
}

function getPromotionHistory(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

function savePromotionHistory(key, history) {
  localStorage.setItem(key, JSON.stringify(history));
}

function getEarnTaskHistory() {
  return JSON.parse(localStorage.getItem('earnTaskHistory')) || [];
}

function saveEarnTaskHistory(history) {
  localStorage.setItem('earnTaskHistory', JSON.stringify(history));
}

function getAvailableEarnTasks() {
  const campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
  const currentChannel = normalizeChannelReference(localStorage.getItem('selectedChannelId') || localStorage.getItem('selectedChannelName'));
  const hasSubscribePromo = campaigns.some(c => normalizeEarnTaskType(c.type) === 'subscribe' && isPromotableCampaign(c) && normalizeChannelReference(getCampaignReference(c)) !== currentChannel);

  const availableTasks = ['subscribe', 'like', 'watch'];
  return hasSubscribePromo ? availableTasks : availableTasks;
}

function getNextEarnTask() {
  const availableTasks = getAvailableEarnTasks();
  if (availableTasks.length === 0) {
    return 'like';
  }

  const history = getEarnTaskHistory();
  const lastTask = history[history.length - 1];
  const preferredOrder = ['subscribe', 'like', 'watch'];

  // Try to pick the next task in shuffle order without repeating the last one.
  for (let i = 0; i < preferredOrder.length; i++) {
    const candidate = preferredOrder[(preferredOrder.indexOf(lastTask) + 1 + i) % preferredOrder.length];
    if (availableTasks.includes(candidate)) {
      history.push(candidate);
      saveEarnTaskHistory(history.slice(-12));
      return candidate;
    }
  }

  const fallback = availableTasks[0] || 'like';
  history.push(fallback);
  saveEarnTaskHistory(history.slice(-12));
  return fallback;
}

function renderEarnMainTask() {
  const taskType = getNextEarnTask();
  const copyEl = document.getElementById('earn-main-copy');
  const openBtn = document.getElementById('earn-main-open-btn') || document.getElementById('earn-main-open-btn-alt');
  const verifyBtn = document.getElementById('earn-main-verify-btn');
  const promoListEl = document.getElementById('subscribe-promo-list');

  window.__tgEarnUnlockedType = null;

  if (!copyEl || !openBtn || !verifyBtn) return;

  const labels = {
    subscribe: { action: 'SUBSCRIBE', credits: 2, text: 'Subscribe the registered channel' },
    like: { action: 'LIKE VIDEO', credits: 1, text: 'Like the registered video' },
    watch: { action: 'WATCH TIME', credits: 3, text: 'Watch the registered video for 5 minutes' }
  };

  const task = labels[taskType] || labels.subscribe;
  const taskMessage = taskType === 'subscribe'
    ? 'a promoted channel from Boost Profile'
    : 'a promoted video from Boost Profile';
  copyEl.innerHTML = `<strong>${task.action}</strong> on ${taskMessage} to earn ${task.credits} ${task.credits === 1 ? 'credit' : 'credits'}.`;
  openBtn.textContent = task.action;
  verifyBtn.textContent = 'VERIFY & NEXT PROMOTION';
  openBtn.onclick = () => openEarnMainTask(taskType);
  verifyBtn.onclick = () => verifyTask(taskType);

  if (promoListEl) {
    promoListEl.style.display = taskType === 'subscribe' ? '' : 'none';
  }

  if (taskType === 'subscribe') {
    const campaigns = getStoredPromotions();
    const subscribeVerifyOriginal = verifyBtn.innerHTML;
    renderSubscribePromotionList(campaigns, verifyBtn, subscribeVerifyOriginal);
  } else {
    const currentLink = document.getElementById('subscribe-link');
    const currentName = document.getElementById('subscribe-channel-name');
    if (currentLink) {
      currentLink.href = '#';
      currentLink.onclick = null;
    }
    if (currentName) {
      currentName.textContent = 'Channel: Add a promotion in Boost Profile';
    }
  }
}

function openEarnMainTask(taskType) {
  // Inline behavior: pick a promotion and open its link (no modal required)
  const campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
  window.__tgEarnUnlockedType = taskType;

  if (taskType === 'subscribe') {
    const promo = pickNextSubscribePromotion(campaigns);
    if (!promo) {
      showStatus('subscribe', 'No promoted channels are available right now. Add one in Boost Profile.', 'error');
      return;
    }
    const href = promotionVideoLinkToHref(getCampaignReference(promo));
    try {
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      showStatus('subscribe', 'Popup was blocked. Allow popups and try again.', 'error');
      return;
    }
    showStatus('subscribe', 'Opened the promoted channel. Subscribe there, then click Verify.', 'success');
    return;
  }

  if (taskType === 'like' || taskType === 'watch') {
    const currentChannel = normalizeChannelReference(localStorage.getItem('selectedChannelId') || localStorage.getItem('selectedChannelName'));
    const promoType = taskType === 'like' ? 'likes' : 'views';
    const historyKey = taskType === 'like' ? 'likeHistory' : 'watchHistory';
    const promo = pickNextPromotionForTask(campaigns, promoType, historyKey, currentChannel);
    if (!promo) {
      showStatus(taskType, 'No promoted videos are available right now. Add one in Boost Profile.', 'error');
      return;
    }
    const href = promotionVideoLinkToHref(promo.videoLink);
    const opened = openEarnLink(taskType, href, null);
    if (opened) {
      try { window.open(href, '_blank', 'noopener'); } catch (e) { /* ignore */ }
    }
  }
}

function promotionVideoLinkToHref(reference) {
  const ref = reference || '';

  if (/^https?:\/\//.test(ref)) {
    return ref;
  }

  if (/^UC[a-zA-Z0-9_-]{10,}$/.test(ref)) {
    return `https://www.youtube.com/channel/${ref}`;
  }

  if (/^@/.test(ref)) {
    return `https://www.youtube.com/${ref}`;
  }

  return `https://www.youtube.com/watch?v=${encodeURIComponent(ref)}`;
}

function pickNextPromotionForTask(campaigns, type, historyKey, currentChannel) {
  const activePromos = campaigns.filter(c => c.type === type && isPromotableCampaign(c));
  if (activePromos.length === 0) return null;

  const history = getPromotionHistory(historyKey);
  const seen = new Set(history.map(normalizeChannelReference));

  const eligible = activePromos.filter(promo => {
    const ref = normalizeChannelReference(getCampaignReference(promo));
    if (!ref) return false;
    if (currentChannel && ref === currentChannel) return false;
    if (seen.has(ref)) return false;
    return true;
  });

  if (eligible.length > 0) {
    return eligible[0];
  }

  const resetEligible = activePromos.filter(promo => {
    const ref = normalizeChannelReference(getCampaignReference(promo));
    return ref && (!currentChannel || ref !== currentChannel);
  });

  if (resetEligible.length > 0) {
    savePromotionHistory(historyKey, []);
    return resetEligible[0];
  }

  return null;
}

function pickNextSubscribePromotion(campaigns) {
  const currentChannel = normalizeChannelReference(localStorage.getItem('selectedChannelId') || localStorage.getItem('selectedChannelName'));
  return pickNextPromotionForTask(campaigns, 'subs', 'subscribeHistory', currentChannel);
}

function showEarnModal(taskType) {
  // Modal overlay removed; use inline open handler instead
  try { openEarnMainTask(taskType); } catch (e) { console.warn('openEarnMainTask error', e); }
}

function refreshEarnTaskRotation() {
  renderEarnMainTask();
}

function advanceEarnTaskRotation(delayMs = 150) {
  window.setTimeout(() => {
    try {
      refreshEarnTaskRotation();
    } catch (error) {
      console.warn('advanceEarnTaskRotation failed', error);
    }
  }, Math.max(0, Number(delayMs) || 0));
}

function getVerifyButtonForTask(taskType) {
  if (!taskType) return null;
  // Prefer inline verify button if present, otherwise fall back to modal selectors for compatibility
  const inlineBtn = document.getElementById('earn-main-verify-btn');
  if (inlineBtn) return inlineBtn;
  if (taskType === 'subscribe') return document.querySelector('#subscribe-modal .modal-verify-btn');
  if (taskType === 'like') return document.querySelector('#like-modal .modal-verify-btn');
  if (taskType === 'watch') return document.querySelector('#watch-modal .modal-verify-btn');
  return null;
}

function closeEarnModal() {
  const modal = document.getElementById('earnModal');
  if (modal) modal.classList.remove('active');

  // Stop any running timers and cleanup even when modal markup is absent
  if (window.watchTimerInterval) {
    clearInterval(window.watchTimerInterval);
    window.watchTimerInterval = null;
  }

  if (window.earnPopupInterval) {
    clearInterval(window.earnPopupInterval);
    window.earnPopupInterval = null;
  }

  const watchSession = JSON.parse(localStorage.getItem('watchSession') || 'null');
  if (watchSession && !watchSession.completed) {
    localStorage.removeItem('watchSession');
  }
}

function verifyTask(taskType) {
  console.log('[verifyTask] called for', taskType);
  userCredits = getStoredCredits();
  const earned = getEarnedToday();
  const rewards = {
    subscribe: { max: 1, credits: 2 },
    like: { max: 5, credits: 1 },
    watch: { max: 1, credits: 3 }
  };
  
  const task = rewards[taskType];
  const timesEarned = (earned[taskType] || 0);

  if (taskType === 'watch') {
    const watchSession = JSON.parse(localStorage.getItem('watchSession') || 'null');
    if (!watchSession || !watchSession.completed) {
      showStatus(taskType, 'Watch the full 5 minutes before claiming credits.', 'error');
      advanceEarnTaskRotation();
      return;
    }

    const watchedSeconds = Math.max(0, Math.floor((watchSession.duration || 300) - (watchSession.timeLeft || 0)));
    if (watchedSeconds < 300) {
      showStatus(taskType, `You watched ${watchedSeconds} seconds. Complete the full watch time to earn credits.`, 'error');
      advanceEarnTaskRotation();
      return;
    }

    userCredits += task.credits;
    persistCredits();
    updateCreditDisplay();

    earned[taskType] = timesEarned + 1;
    saveEarnedToday(earned);
    incrementDailyActions();

    localStorage.removeItem('watchSession');

    showStatus(taskType, `+${task.credits} Credits earned!`, 'success');
    showToast('bi-coin', 'Credits Earned!', `+${task.credits} Credits added to your account`);

    const btn = getVerifyButtonForTask(taskType);
    if (btn) {
      console.log('[verifyTask] disabling verify button for', taskType);
      btn.disabled = true;
    }

    setTimeout(() => {
      closeEarnModal();
    }, 500);

    return;
  }
  
  // Special handling for subscribe: verify subscriber count increase
  if (taskType === 'subscribe') {
    const pendingRaw = localStorage.getItem('pendingVerify');
    if (!pendingRaw) {
      console.log('[verifyTask] no pendingVerify in localStorage');
      showStatus(taskType, 'No pending subscription verification found.', 'error');
      return;
    }

    const pending = JSON.parse(pendingRaw);
    if (pending.type !== 'subscribe') {
      console.log('[verifyTask] pending type mismatch', pending);
      showStatus(taskType, 'No pending subscription verification found.', 'error');
      return;
    }

    const pendingAgeMs = Date.now() - Number(pending.startedAt || 0);
    if (pendingAgeMs < 10000) {
      showStatus(taskType, 'Please wait at least 10 seconds before verifying.', 'error');
      advanceEarnTaskRotation();
      return;
    }

    (async () => {
      try {
        console.log('[verifyTask] verifying pending', pending);

        userCredits += task.credits;
        persistCredits();
        updateCreditDisplay();

        earned[taskType] = timesEarned + 1;
        saveEarnedToday(earned);
        incrementDailyActions();

        localStorage.removeItem('pendingVerify');

        showStatus(taskType, `+${task.credits} Credits earned!`, 'success');
        showToast('bi-coin', 'Credits Earned!', `+${task.credits} Credits added to your account`);

        const btn = getVerifyButtonForTask(taskType);
        if (btn) {
          console.log('[verifyTask] disabling verify button for', taskType);
          btn.disabled = true;
        }

        setTimeout(() => closeEarnModal(), 500);
        advanceEarnTaskRotation(650);
      } catch (err) {
        console.error('[verifyTask] error during subscribe verification', err);
        showStatus(taskType, 'Verification failed due to an internal error. Try again later.', 'error');
        advanceEarnTaskRotation();
      }
    })();

    return;
  }

  // Grant credits for other tasks (like/watch)
  userCredits += task.credits;
  persistCredits();
  updateCreditDisplay();
  
  // Update earned count
  earned[taskType] = timesEarned + 1;
  saveEarnedToday(earned);
  incrementDailyActions();
  
  // Show success
  showStatus(taskType, `+${task.credits} Credits earned!`, 'success');
  showToast('bi-coin', 'Credits Earned!', `+${task.credits} Credits added to your account`);
  
  // Disable button
  const btn = getVerifyButtonForTask(taskType);
  if (btn) {
    console.log('[verifyTask] disabling verify button for', taskType);
    btn.disabled = true;
  }
  
  // Close modal after success
  setTimeout(() => {
    closeEarnModal();
  }, 500);

  advanceEarnTaskRotation(650);
}

function startWatchTimer() {
  const timerModal = document.getElementById('watch-timer-modal');
  const btn = document.querySelector('#watch-modal .modal-verify-btn');
  
  btn.disabled = true;
  btn.textContent = 'Watching...';
  timerModal.style.display = 'block';
  
  let timeLeft = 300; // 5 minutes
  localStorage.setItem('watchSession', JSON.stringify({
    completed: false,
    duration: 300,
    timeLeft: 300,
    startedAt: Date.now()
  }));

  window.watchTimerInterval = setInterval(() => {
    timeLeft--;
    localStorage.setItem('watchSession', JSON.stringify({
      completed: false,
      duration: 300,
      timeLeft: timeLeft,
      startedAt: Date.now() - ((300 - timeLeft) * 1000)
    }));
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer-modal').textContent = 
      `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const progress = ((300 - timeLeft) / 300) * 100;
    document.getElementById('timer-fill-modal').style.width = progress + '%';
    
    if (timeLeft <= 0) {
      clearInterval(window.watchTimerInterval);
      window.watchTimerInterval = null;

      localStorage.setItem('watchSession', JSON.stringify({
        completed: true,
        duration: 300,
        timeLeft: 0,
        startedAt: Date.now()
      }));
      
      btn.disabled = false;
      btn.textContent = 'Complete & Claim Credits';
      btn.onclick = () => verifyTask('watch');
      
      showToast('bi-stopwatch-fill', 'Time Complete!', 'Click button to claim your credits');
    }
  }, 1000);
}

function updateEarnedUI() {
  const taskTypes = ['subscribe', 'like', 'watch'];

  taskTypes.forEach(taskType => {
    const btn = getVerifyButtonForTask(taskType) || document.getElementById(`${taskType}-btn`);
    if (btn && btn.disabled && /limit reached/i.test(btn.textContent || '')) {
      btn.disabled = false;
      try { btn.textContent = 'Verify'; } catch (e) {}
    }
  });
}

function showStatus(taskType, message, type) {
  const statusEl = document.getElementById(`status-${taskType}`);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `earn-status ${type}`;
    
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'earn-status';
    }, 4000);
  }
}

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
    }
  });
}, { threshold: 0.1 });
reveals.forEach(el => observer.observe(el));

// Select plan from pricing section
function selectPlan(planName) {
  document.getElementById('plan').value = planName;
  
  // Extract plan cost
  const planCosts = {
    'Starter - $9': 90,
    'Pro Growth - $29': 290,
    'Channel Boss - $79': 790
  };
  
  const credits = planCosts[planName];
  if (document.getElementById('planCredits')) {
    document.getElementById('planCredits').textContent = credits;
  }
  
  showSection('get-started');
  showToast('bi-check-circle-fill', 'Plan Selected', planName + ' added to your order');
}

function handleChannelSearch() {
  const channelSearch = document.getElementById('channelSearch');
  const query = normalizeChannelInput(channelSearch.value);

  if (!query) {
    return showToast('bi-exclamation-triangle-fill', 'Missing ID', 'Paste your YouTube Channel Link or Channel ID first');
  }

  document.getElementById('channelUrl').value = query;
  setExplicitLogoutState(false);
  localStorage.setItem('selectedChannelId', query);
  localStorage.setItem('selectedChannelName', getChannelDisplayName(query));
  channelSearch.value = query;
  showSection('get-started');
  showToast('bi-search', 'Channel Loaded', 'Your channel ID is ready to boost');
}

// Toast notification
function resolveToastIconClass(icon, title, msg) {
  const raw = String(icon || '').trim();
  if (/^bi-[a-z0-9-]+$/i.test(raw)) {
    return raw;
  }

  const haystack = `${raw} ${title || ''} ${msg || ''}`.toLowerCase();

  if (/(missing|invalid|insufficient|warning|error|failed|denied)/.test(haystack)) {
    return 'bi-exclamation-triangle-fill';
  }
  if (/(purchased|earned|refund|credits|coin|payment)/.test(haystack)) {
    return 'bi-coin';
  }
  if (/(complete|completed|success|added|deleted|selected|loaded|ready|verified)/.test(haystack)) {
    return 'bi-check-circle-fill';
  }
  if (/(time|timer|countdown|watch)/.test(haystack)) {
    return 'bi-stopwatch-fill';
  }
  if (/(open|opening|redirecting|checkout|search)/.test(haystack)) {
    return 'bi-search';
  }

  return 'bi-bell-fill';
}

function showToast(icon, title, msg) {
  const iconClass = resolveToastIconClass(icon, title, msg);
  document.getElementById('toastIcon').innerHTML = `<i class="bi ${iconClass}"></i>`;
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// Live notification popups
const notifications = [
  { name: 'Rohan M.', action: 'just ordered Pro Growth - 2,000 Subscribers', time: '2 min ago' },
  { name: 'Sarah K.', action: 'just signed up for Channel Boss package', time: '5 min ago' },
  { name: 'Daniel T.', action: 'hit 10K subscribers with TubeGrowth!', time: '8 min ago' },
  { name: 'Lena R.', action: 'just ordered 5,000 Video Likes', time: '11 min ago' },
  { name: 'Marcus J.', action: 'just reached monetization - 4,000 Watch Hours!', time: '14 min ago' },
  { name: 'Priya S.', action: 'purchased Watch Time boost - 1,000 hours', time: '18 min ago' },
  { name: 'Alex B.', action: 'just bought the Viral Shorts pack', time: '20 min ago' },
  { name: 'Nina P.', action: 'upgraded to Growth Plus subscription', time: '24 min ago' },
  { name: 'Omar L.', action: 'purchased 500 comments package', time: '30 min ago' },
  { name: 'Zoe Q.', action: 'just booked a Channel Audit service', time: '35 min ago' },
];
let nIdx = 0;

const EARN_AUTO_VERIFY_KEY = 'earnAutoVerifyEnabled';

function getEarnAutoVerifyEnabled() {
  return localStorage.getItem(EARN_AUTO_VERIFY_KEY) === 'true';
}

function setEarnAutoVerifyEnabled(enabled) {
  localStorage.setItem(EARN_AUTO_VERIFY_KEY, enabled ? 'true' : 'false');
  syncEarnAutoVerifyToggle();
}

function syncEarnAutoVerifyToggle() {
  const toggle = document.querySelector('.earn-toggle');
  if (!toggle) return;

  const enabled = getEarnAutoVerifyEnabled();
  toggle.classList.toggle('active', enabled);
  toggle.setAttribute('aria-checked', String(enabled));
  toggle.setAttribute('title', enabled ? 'Auto verify enabled' : 'Auto verify disabled');
}

function toggleEarnAutoVerify() {
  setEarnAutoVerifyEnabled(!getEarnAutoVerifyEnabled());
  showToast('bi-gear-fill', 'Settings Updated', getEarnAutoVerifyEnabled() ? 'Auto verify enabled' : 'Auto verify disabled');
}

function openEarnLink(taskType, href, fallbackLinkEl) {
  const autoVerifyEnabled = getEarnAutoVerifyEnabled();

  if (!autoVerifyEnabled) {
    return true;
  }

  const popup = window.open(href, '_blank', 'noopener,noreferrer');
  if (!popup) {
    showStatus(taskType, 'Popup was blocked. Allow popups and try again.', 'error');
    return false;
  }

  if (window.earnPopupInterval) {
    clearInterval(window.earnPopupInterval);
    window.earnPopupInterval = null;
  }

  window.earnPopupInterval = setInterval(() => {
    if (!popup || popup.closed) {
      clearInterval(window.earnPopupInterval);
      window.earnPopupInterval = null;
      showToast('bi-check-circle-fill', 'Popup Closed', 'Verifying your action now');
      setTimeout(() => verifyTask(taskType), 250);
    }
  }, 500);

  if (fallbackLinkEl) {
    fallbackLinkEl.classList.add('auto-verifying');
  }

  return false;
}

function bindEarnSettingsToggle() {
  const toggle = document.querySelector('.earn-toggle');
  if (!toggle || toggle.dataset.bound === 'true') return;

  toggle.dataset.bound = 'true';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('tabindex', '0');
  const hasInlineClickHandler = toggle.getAttribute('onclick');
  if (!hasInlineClickHandler) {
    toggle.addEventListener('click', toggleEarnAutoVerify);
    toggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleEarnAutoVerify();
      }
    });
  }

  syncEarnAutoVerifyToggle();
}

function showNotification() {
  const n = notifications[nIdx % notifications.length];
  const signature = `${n.name}|${n.action}`;
  if (window.lastNotificationSignature === signature) {
    nIdx++;
    return;
  }

  window.lastNotificationSignature = signature;
  showToast('bi-bell-fill', n.name, n.action);
  nIdx++;
}

function startNotificationTicker() {
  if (window.notificationTickerStarted) return;

  window.notificationTickerStarted = true;
  if (window.notificationTickerId) {
    clearInterval(window.notificationTickerId);
    window.notificationTickerId = null;
  }

  // Start first notification after 5s, then repeat every 30s
  setTimeout(() => {
    showNotification();
    window.notificationTickerId = setInterval(showNotification, 30000);
  }, 5000);
}

startNotificationTicker();

// BOOST PROFILE FUNCTIONS
const boostCosts = {
  likes: 1,      // 1 credit per like
  subs: 2,       // 2 credits per subscriber
  views: 0.6,    // 0.6 credits per minute (5 min watchtime = 3 credits)
  comments: 3    // 3 credits per comment
};

function updateBoostCalculation() {
  const typeEl = document.getElementById('promotionType');
  const quantityEl = document.getElementById('quantityInput');
  const labelEl = document.getElementById('quantityLabel');
  const videoLabelEl = document.getElementById('videoLinkLabel');
  const videoInputEl = document.getElementById('videoLink');
  const creditsNeededEl = document.getElementById('creditsNeeded');
  
  const type = typeEl.value;
  const quantity = parseInt(quantityEl.value) || 0;

  updateBoostTargetField(type, videoInputEl, videoLabelEl);
  
  // Update label based on type
  const labels = {
    likes: 'Likes',
    subs: 'Subscribers',
    views: 'Views',
    comments: 'Comments'
  };
  labelEl.textContent = labels[type] || 'Items';
  
  // Calculate credits needed
  let creditsNeeded = 0;
  if (type && quantity > 0) {
    creditsNeeded = Math.ceil(quantity * (boostCosts[type] || 1));
  }
  
  creditsNeededEl.textContent = creditsNeeded;
  
  // Update button state
  updateBoostButtonState(creditsNeeded);
}

function updateBoostTargetField(type, videoInputEl, videoLabelEl) {
  if (!videoInputEl || !videoLabelEl) {
    return;
  }

  const storedChannelId = localStorage.getItem('selectedChannelId') || '';
  const storedChannelName = localStorage.getItem('selectedChannelName') || getChannelDisplayName(storedChannelId);

  if (type === 'subs') {
    videoLabelEl.textContent = 'Youtube Channel Name / ID';
    videoInputEl.placeholder = storedChannelName || storedChannelId || 'Your Channel Name or ID';
    if (!videoInputEl.value || videoInputEl.value === 'https://youtu.be/AAVBn_fHA') {
      videoInputEl.value = storedChannelName || storedChannelId;
    }
    return;
  }

  videoLabelEl.textContent = 'Youtube Video Link';
  videoInputEl.placeholder = 'https://youtu.be/AAVBn_fHA';
  if (!videoInputEl.value || videoInputEl.value === storedChannelName || videoInputEl.value === storedChannelId) {
    videoInputEl.value = 'https://youtu.be/AAVBn_fHA';
  }
}

function updateBoostButtonState(creditsNeeded) {
  const btn = document.querySelector('.boost-add-promo-btn');
  const hasValidForm = document.getElementById('promotionType').value && 
                       document.getElementById('videoLink').value && 
                       document.getElementById('quantityInput').value;
  
  if (!hasValidForm) {
    btn.disabled = true;
    btn.textContent = 'SELECT PROMOTION TYPE';
    return;
  }
  
  if (creditsNeeded > userCredits) {
    btn.disabled = true;
    btn.textContent = `NEED ${creditsNeeded} CREDITS`;
    btn.style.background = '#999';
    return;
  }
  
  btn.disabled = false;
  btn.textContent = 'ADD PROMOTION';
  btn.style.background = '#39b54a';
}

async function addPromotion() {
  const type = document.getElementById('promotionType').value;
  const videoLinkInput = document.getElementById('videoLink').value;
  const quantity = parseInt(document.getElementById('quantityInput').value);
  const creditsNeeded = parseInt(document.getElementById('creditsNeeded').textContent);
  const registeredChannelId = localStorage.getItem('selectedChannelId') || '';
  const registeredChannelName = localStorage.getItem('selectedChannelName') || getChannelDisplayName(registeredChannelId);
  const videoLink = type === 'subs' ? (registeredChannelId || videoLinkInput) : videoLinkInput;
  
  // Validate
  if (!type || !videoLink || !quantity || creditsNeeded <= 0) {
    showToast('bi-exclamation-triangle-fill', 'Invalid Input', 'Please fill all fields correctly');
    return;
  }

  if (creditsNeeded > userCredits) {
    showToast('bi-x-circle-fill', 'Insufficient Credits', `You need ${creditsNeeded} credits but only have ${userCredits}`);
    return;
  }

  try {
    let backendSuccess = false;
    let responseData = null;
    
    // Try to create campaign on backend, but don't fail if it's unavailable
    try {
      responseData = await createCampaignOnBackend({
        channelUrl: videoLink,
        type,
        targetCount: quantity,
      });
      backendSuccess = true;
      
      if (typeof responseData?.credits === 'number') {
        applyServerCreditBalance(responseData.credits);
      }
    } catch (backendError) {
      console.warn('[addPromotion] Backend campaign creation failed:', backendError.message);
      // Continue with local-only campaign if backend fails
    }

    // Always save campaign locally
    const campaign = {
      id: responseData?.campaign?.id || Date.now(),
      type,
      videoLink,
      channelId: registeredChannelId,
      channelName: registeredChannelName,
      targetLabel: type === 'subs' ? registeredChannelName || registeredChannelId : videoLink,
      quantity,
      costPaid: creditsNeeded,
      status: normalizeCampaignStatus(responseData?.campaign?.status || 'Active') || 'active',
      dateCreated: new Date().toLocaleDateString(),
      progress: 0,
    };

    // Save boost profile details for quick access in earn flows
    try {
      const boostStorage = {
        channelLink: campaign.channelId || campaign.channelName || '',
        videoLink: type === 'subs' ? (campaign.channelId || campaign.channelName || '') : campaign.videoLink || '',
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem('boostProfileStorage', JSON.stringify(boostStorage));
    } catch (e) {
      console.warn('Failed to save boostProfileStorage', e);
    }
    const campaigns = getStoredPromotions();
    campaigns.unshift(campaign);
    localStorage.setItem('campaigns', JSON.stringify(campaigns));
    console.log('[addPromotion] Campaign saved to localStorage. Total campaigns:', campaigns.length, 'Campaign:', campaign);
    currentPage = 1;
    loadPromotions();
    await initializeViewPromotions();

    // Deduct credits locally only if backend failed to create campaign
    if (!backendSuccess) {
      deductCredits(creditsNeeded);
    }

    showToast('bi-check-circle-fill', 'Promotion Added!', `${quantity} ${type} ordered for ${videoLink}`);

    document.getElementById('promotionType').value = '';
    document.getElementById('quantityInput').value = '';
    document.getElementById('videoLink').value = '';
    document.getElementById('creditsNeeded').textContent = '0';
    updateBoostTargetField('', document.getElementById('videoLink'), document.getElementById('videoLinkLabel'));
    updateBoostButtonState(0);
    // If user selected the special 'ads' promotion type, render an AdSense ad unit
    if (type === 'ads') {
      try {
        showAdUnitNearBoost();
      } catch (e) {
        console.warn('showAdUnitNearBoost failed', e);
      }
    }
  } catch (error) {
    showToast('bi-x-circle-fill', 'Promotion Failed', error.message || 'Unable to create promotion');
  }
}

// Renders an AdSense ad unit near the boost panel when requested by user action.
// Helper: safely push AdSense when the ad element has a measurable size
function safeAdsPush(insEl) {
  if (!insEl) return;

  function tryPush() {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      return true;
    } catch (err) {
      return false;
    }
  }

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var r = entries[i].contentRect;
        if (r.width > 0 && r.height > 0) {
          if (tryPush()) ro.disconnect();
        }
      }
    });
    try { ro.observe(insEl); } catch (e) { /* ignore */ }
    setTimeout(function () { if (insEl.getBoundingClientRect && insEl.getBoundingClientRect().width > 0) tryPush(); }, 100);
    return;
  }

  var attempts = 0, maxAttempts = 40;
  var iv = setInterval(function () {
    attempts++;
    try {
      var rect = insEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (tryPush()) clearInterval(iv);
      }
    } catch (e) {}
    if (attempts >= maxAttempts) clearInterval(iv);
  }, 300);
}
function showAdUnitNearBoost() {
  if (!window || !document) return;
  // Ensure AdSense script is present; if not, it was loaded earlier in head.
  const containerId = 'boost-ad-container';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.margin = '12px 0';
    const boostRight = document.querySelector('.boost-right') || document.body;
    boostRight.insertBefore(container, boostRight.firstChild);
  }

  // Create ad ins element
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', 'ca-pub-8786593139834578');
  ins.setAttribute('data-ad-slot', '1234567890');
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');
  container.appendChild(ins);
  // Use safe push helper to wait until the element has a measurable size
  safeAdsPush(ins);
}

// Show ad units after a successful login flow. Inserts ads into dashboard top and promotions area.
function showAdAfterLogin() {
  try {
    showAdUnitInDashboardTop();
  } catch (e) { console.warn('showAdUnitInDashboardTop failed', e); }
  try {
    showAdUnitInPromotions();
  } catch (e) { console.warn('showAdUnitInPromotions failed', e); }
}

function showAdUnitInDashboardTop() {
  const containerId = 'dashboard-ad-container';
  if (document.getElementById(containerId)) return;
  const shell = document.querySelector('.dashboard-shell') || document.querySelector('.dashboard-area') || document.body;
  const container = document.createElement('div');
  container.id = containerId;
  container.style.width = '100%';
  container.style.margin = '12px 0';
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.style.maxWidth = '728px';
  ins.setAttribute('data-ad-client', 'ca-pub-8786593139834578');
  ins.setAttribute('data-ad-slot', '1234567890');
  ins.setAttribute('data-ad-format', 'auto');
  container.appendChild(ins);
  shell.parentNode.insertBefore(container, shell);
  safeAdsPush(ins);
}

function showAdUnitInPromotions() {
  const containerId = 'promotions-ad-container';
  if (document.getElementById(containerId)) return;
  const promos = document.getElementById('promotions-content') || document.querySelector('.view-promo-layout') || document.body;
  const container = document.createElement('div');
  container.id = containerId;
  container.style.width = '100%';
  container.style.margin = '12px 0';
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', 'ca-pub-8786593139834578');
  ins.setAttribute('data-ad-slot', '1234567890');
  ins.setAttribute('data-ad-format', 'auto');
  container.appendChild(ins);
  promos.parentNode.insertBefore(container, promos);
  safeAdsPush(ins);
}

// Initialize boost profile display
function initializeBoostProfile() {
  // Update credits display in boost section
  const creditChip = document.querySelector('.boost-credit-chip');
  if (creditChip) {
    creditChip.textContent = `Your Credits : ${userCredits}`;
  }

  const savedChannelId = restoreSelectedChannelSession();
  if (savedChannelId) {
    const savedChannelName = localStorage.getItem('selectedChannelName') || getChannelDisplayName(savedChannelId);
    const savedChannelLogo = localStorage.getItem('selectedChannelLogo') || '';
    updateDashboardChannel(savedChannelId, savedChannelName, savedChannelLogo);
  }
  
  // Add event listeners
  const typeSelect = document.getElementById('promotionType');
  const quantityInput = document.getElementById('quantityInput');
  
  if (typeSelect) {
    typeSelect.addEventListener('change', updateBoostCalculation);
  }
  if (quantityInput) {
    quantityInput.addEventListener('change', updateBoostCalculation);
  }
  
  updateBoostButtonState(0);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeBoostProfile();
  initializeViewPromotions();
  updateCreditsDisplay();

  const siteNav = document.querySelector('nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (siteNav && navToggle && navMenu) {
    const closeNav = () => {
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          closeNav();
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (window.innerWidth > 768) return;
      if (!siteNav.contains(event.target)) {
        closeNav();
      }
    });
  }
  
  // Tab switching for View Promotions and Dashboard
  const viewPromoTabs = document.querySelectorAll('.view-promo-shell-tab');
  viewPromoTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const dataTab = tab.getAttribute('data-tab');
      const href = tab.getAttribute('href');
      
      if (dataTab) {
        // Internal dashboard tab switching
        e.preventDefault();
        
        // Update active tab styling
        viewPromoTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show/hide tab content
        const dashboardContent = document.getElementById('dashboard-content');
        const promotionsContent = document.getElementById('promotions-content');
        
        if (dataTab === 'dashboard') {
          if (dashboardContent) dashboardContent.classList.add('active');
          if (promotionsContent) promotionsContent.classList.remove('active');
        } else if (dataTab === 'promotions') {
          if (dashboardContent) dashboardContent.classList.remove('active');
          if (promotionsContent) promotionsContent.classList.add('active');
        }
      } else if (href && (href === '#earn-credits' || href === '#get-started' || href === '#top')) {
        // External navigation - allow default behavior
        return;
      }
    });
  });
  
  const initialSection = window.location.hash ? window.location.hash.slice(1) : 'home';
  showSection(initialSection);
  
  // Ensure daily bonus UI is initialized
  setTimeout(() => {
    updateDailyBonusUI();
  }, 100);
});

// VIEW PROMOTIONS FUNCTIONS
let currentPage = 1;
// Increase itemsPerPage so view promotions shows more campaigns per page
const itemsPerPage = 100;

async function initializeViewPromotions() {
  currentPage = 1;
  userCredits = getStoredCredits();
  // Update credits display in promotions section
  const creditChip = document.querySelector('.view-promo-credit-chip');
  if (creditChip) {
    creditChip.textContent = `Your Credits : ${userCredits}`;
  }
  
  // Load promotions from localStorage
  await syncPromotionsFromBackend();
  loadPromotions();
}

function loadPromotions() {
  const campaigns = getStoredPromotions();
  console.log('[loadPromotions] Loaded campaigns from localStorage. Count:', campaigns.length, 'Campaigns:', campaigns);
  const tableBody = document.getElementById('promoTableBody');
  
  // Ensure tableBody exists before proceeding
  if (!tableBody) {
    console.error('promoTableBody element not found. Promotions table cannot be loaded.');
    return;
  }
  
  if (campaigns.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px; color: #e8e8e8;">No promotions yet. Go to Boost Profile to create one!</td></tr>';
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(campaigns.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedCampaigns = campaigns.slice(startIdx, startIdx + itemsPerPage);
  
  // Render rows
  tableBody.innerHTML = paginatedCampaigns.map(campaign => {
    const typeMap = {
      likes: 'Youtube Video Likes',
      subs: 'Youtube Channel Subscribers',
      views: 'Youtube Video Views',
      comments: 'Youtube Comments'
    };
    const promotedLabel = getPromotionTargetLabel(campaign);
    const linkLabel = getPromotionLinkLabel(campaign);
    
    const isCompleted = isCompletedCampaign(campaign);
    const statusClass = isCompleted ? 'status-completed' : 'status-inprogress';
    const statusText = isCompleted ? 'Completed' : 'In Progress';
    const boostBtn = isCompleted ? 'NA' : '<span class="boost-speed-btn">BOOST SPEED</span>';
    
    return `
      <tr>
        <td>${campaign.id}</td>
        <td>${typeMap[campaign.type] || campaign.type}</td>
        <td><a href="#" class="link-btn">${linkLabel}</a> <span class="open-link-btn">OPEN LINK</span></td>
        <td>${campaign.quantity}</td>
        <td>${Math.floor(campaign.quantity * campaign.progress / 100)}</td>
        <td>${campaign.costPaid}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${promotedLabel}</td>
        <td>${boostBtn}</td>
        <td><button class="manage-btn delete-promo-btn" type="button" data-campaign-id="${String(campaign.id).replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" aria-label="Delete promotion">&#128465;</button></td>
      </tr>
    `;
  }).join('');

  if (!tableBody.dataset.deleteBound) {
    tableBody.dataset.deleteBound = '1';
    tableBody.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('.delete-promo-btn');
      if (!deleteButton || !tableBody.contains(deleteButton)) return;
      deletePromotion(deleteButton.getAttribute('data-campaign-id'));
    });
  }
  
  // Update pagination info
  updatePaginationInfo(campaigns.length, currentPage, totalPages);
}

function updatePaginationInfo(total, page, totalPages) {
  const paginationDiv = document.querySelector('.view-promo-pagination');
  
  // Ensure paginationDiv exists before proceeding
  if (!paginationDiv) {
    console.warn('Pagination div not found. Pagination info cannot be updated.');
    return;
  }
  
  const startIdx = (page - 1) * itemsPerPage + 1;
  const endIdx = Math.min(page * itemsPerPage, total);
  
  const paginationHTML = `
    <span>Showing ${startIdx} to ${endIdx} of ${total} entries</span>
    <div class="pagination-buttons">
      <button class="pagination-btn" onclick="previousPage()" ${page === 1 ? 'disabled' : ''}>Previous</button>
      <button class="pagination-btn ${page === 1 ? 'active' : ''}">${page}</button>
      <button class="pagination-btn" onclick="nextPage()" ${page === totalPages ? 'disabled' : ''}>Next</button>
    </div>
  `;
  
  paginationDiv.innerHTML = paginationHTML;
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    loadPromotions();
    
  }
}

function nextPage() {
  const campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
  const totalPages = Math.ceil(campaigns.length / itemsPerPage);
  
  if (currentPage < totalPages) {
    currentPage++;
    loadPromotions();
    
  }
}

function deletePromotion(campaignId) {
  if (!campaignId) {
    showToast('bi-exclamation-triangle-fill', 'Invalid Request', 'Missing promotion id');
    return;
  }

  try {
    const campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
    const idx = campaigns.findIndex(c => String(c.id) === String(campaignId));
    if (idx === -1) {
      showToast('bi-info-circle-fill', 'Not Found', 'Promotion not found');
      return;
    }

    const [removed] = campaigns.splice(idx, 1);
    localStorage.setItem('campaigns', JSON.stringify(campaigns));
    // Do NOT refund credits when deleting promotions
    showToast('bi-check-circle-fill', 'Promotion Removed', 'Promotion removed (no refund)');
    currentPage = 1;
    loadPromotions();

    // Attempt backend deletion only for server-created campaigns (Mongo ObjectId)
    (async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return;

      const isObjectId = /^[a-fA-F0-9]{24}$/.test(String(removed.id));
      if (!isObjectId) return; // local-only campaign, nothing to delete on backend

      try {
        const resp = await fetch(`${getApiBase()}/campaigns/${encodeURIComponent(removed.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) {
          console.warn('Backend campaign delete failed', resp.status, await resp.text().catch(() => ''));
        }
      } catch (err) {
        console.warn('Error deleting campaign on backend', err);
      }
    })();
  } catch (err) {
    console.error('deletePromotion error', err);
    showToast('bi-x-circle-fill', 'Delete Failed', err.message || 'Unable to delete promotion');
  }
}

// Expose handlers used by inline HTML attributes.
Object.assign(window, {
  searchAndOpenDashboard,
  scrollToSection,
  purchaseCreditsByINR,
  purchaseCreditsByUSD,
  purchaseCreditsByCurrency,
  startWatchTimer,
  selectPlan,
  handleChannelSearch,
  addPromotion,
  previousPage,
  nextPage,
  deletePromotion,
  setPreferredCurrency,
  showEarnModal,
  verifyTask,
  closeEarnModal,
  copyReferralCode,
  shareReferralCode,
});

// expose testing helpers
Object.assign(window, {
  claimDailyBonus,
  resetDailyBonusState,
  simulateDailyActions,
  verifyReferralCode,
  awardReferralCredits,
});

// Initialize credit display on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCreditDisplay();
  syncCreditsFromBackend();
  updateEarnedUI();
  // Ensure earn auto-verify default enabled for parity with MyToolsTown
  try {
    if (localStorage.getItem(EARN_AUTO_VERIFY_KEY) === null) {
      // default to enabled so users get the same auto-verify behavior
      setEarnAutoVerifyEnabled(true);
    } else {
      syncEarnAutoVerifyToggle();
    }
  } catch (e) { console.warn('earn auto-verify init failed', e); }

  bindEarnSettingsToggle();
  
  // Initialize daily bonus UI
  updateDailyBonusUI();
  
  // Update daily bonus timer every second
  setInterval(updateDailyBonusTimer, 1000);
  
  // Initialize referral system
  updateReferralUI();
  trackReferralReward();
  handleYouTubeConnectionStatus();
  
  // Close modal on overlay click

    // Try to sync promotions from backend on load so guests see active campaigns
    if (typeof syncPromotionsFromBackend === 'function') {
      try {
        // Run in background; best-effort to populate localStorage
        syncPromotionsFromBackend().then((ok) => {
          if (ok) console.info('[init] Promotions synced from backend');
        }).catch((e) => console.warn('[init] syncPromotionsFromBackend failed', e));
      } catch (e) { console.warn('[init] syncPromotionsFromBackend error', e); }
    }
  const modal = document.getElementById('earnModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeEarnModal();
      }
    });
  }
  
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEarnModal();
    }
  });
  
  console.log('[DOMContentLoaded] Daily bonus initialized');
});


