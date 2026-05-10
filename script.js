// DEFAULT SUBSCRIBE CHANNELS FOR EARN CREDITS
const DEFAULT_SUBSCRIBE_CHANNELS = [
  'UCmam8Q0LmXbyjU4ZuOln-Zg',
  'UCKCt8T9Z5MbnOgbxA3PYJNQ',
  'UCXsx4kQEJsIMrdAtm-mayuw',
  'UC38mFaJiTacvINx-QdQnpOw'
];

const PROTECTED_SECTION_IDS = new Set(['dashboard-preview', 'earn-credits', 'get-started', 'services']);

function hasSelectedChannel() {
  return Boolean((localStorage.getItem('selectedChannelId') || '').trim());
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

function clearSelectedChannelSession() {
  localStorage.removeItem('selectedChannelId');
  localStorage.removeItem('selectedChannelName');
  localStorage.removeItem('selectedChannelLogo');

  const dashboardSearchInput = document.getElementById('channelSearchInput');
  if (dashboardSearchInput) {
    dashboardSearchInput.value = '';
  }

  const boostSearchInput = document.getElementById('channelSearch');
  if (boostSearchInput) {
    boostSearchInput.value = '';
  }

  // Hide credits display on logout
  updateCreditsDisplay();
}

function updateCreditsDisplay() {
  const navCredits = document.getElementById('navCredits');
  const hasChannel = hasSelectedChannel();
  
  if (navCredits) {
    navCredits.style.display = hasChannel ? 'flex' : 'none';
  }
}

// LANDING PAGE FUNCTIONS
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
    if (element.tagName === 'NAV' || element.id === 'toast' || element.id === 'earnModal' || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
      return;
    }

    element.style.display = element === sectionElement ? '' : 'none';
  });

  history.replaceState(null, '', normalizedId === 'home' ? '#top' : `#${normalizedId}`);
  updateActiveSectionLinks(normalizedId);

  if (normalizedId === 'dashboard-preview') {
    const savedChannelId = normalizeChannelInput(localStorage.getItem('selectedChannelId') || '') || 'UCXsX4kQEJsIMrdAtm-mayuw';
    const savedChannelName = localStorage.getItem('selectedChannelName') || getChannelDisplayName(savedChannelId);
    localStorage.setItem('selectedChannelId', savedChannelId);
    loadDashboardProfile(savedChannelId, savedChannelName);
  } else if (normalizedId === 'earn-credits') {
    refreshEarnTaskRotation();
  }
}

function updateActiveSectionLinks(activeSectionId) {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href === '#') {
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

function searchAndOpenDashboard() {
  const channelInput = document.getElementById('channelSearchInput');
  const channelId = normalizeChannelInput(channelInput.value);
  const channelName = getChannelDisplayName(channelId);
  
  if (!channelId) {
    showToast('bi-exclamation-triangle-fill', 'Missing Channel ID', 'Please enter your YouTube Channel Link or Channel ID');
    return;
  }
  
  // Save channel info to localStorage for dashboard
  localStorage.setItem('selectedChannelId', channelId);
  localStorage.setItem('selectedChannelName', channelName);
  channelInput.value = channelId;
  
  // Update dashboard profile info
  // Try to resolve a real channel title via YouTube Data API (falls back to provided name)
  fetchChannelProfile(channelId).then(profile => {
    const finalName = profile?.title || channelName;
    localStorage.setItem('selectedChannelName', finalName);
    localStorage.setItem('selectedChannelLogo', profile?.thumbnail || '');
    updateDashboardChannel(channelId, finalName, profile?.thumbnail || '');
  }).catch(() => {
    updateDashboardChannel(channelId, channelName, '');
  });
  
  // Show toast
  showToast('?', 'Channel Loaded', 'Opening your dashboard...');
  
  // Navigate to dashboard without scrolling
  setTimeout(() => {
    updateCreditsDisplay();
    showSection('dashboard-preview');
  }, 500);
}

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
  if (!input) return { title: null, thumbnail: '' };

  try {
    const isChannelId = /^UC[a-zA-Z0-9_-]{10,}$/.test(input);
    let channelId = isChannelId ? input : null;

    if (!channelId) {
      const query = input.replace(/https?:\/\//, '').replace(/^www\./, '');
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${YOUTUBE_API_KEY}`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return { title: null, thumbnail: '' };
      const searchData = await searchRes.json();
      channelId = searchData.items && searchData.items.length ? (searchData.items[0].snippet.channelId || searchData.items[0].id.channelId) : null;
      if (!channelId) return { title: null, thumbnail: '' };
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return { title: null, thumbnail: '' };
    const data = await res.json();
    if (data.items && data.items.length) {
      const snippet = data.items[0].snippet || {};
      return {
        title: snippet.title || null,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || ''
      };
    }

    return { title: null, thumbnail: '' };
  } catch (error) {
    return { title: null, thumbnail: '' };
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
  
  if (profileName) profileName.textContent = channelName === channelId ? getChannelFallbackName(channelId) : channelName;
  if (profileChannel) profileChannel.innerHTML = `<strong>YT Channel Link :</strong> ${channelId}`;
  if (profileCredits) profileCredits.textContent = `Your Credits : ${userCredits}`;
  if (profileSubscribers) profileSubscribers.textContent = `Subscribers : ${subscribers}`;
  if (profileWatchTime) profileWatchTime.textContent = `Watch Time : ${watchHours}h`;
  if (profileAvatarImg) {
    const logoUrl = channelLogo || localStorage.getItem('selectedChannelLogo') || '';
    const fallbackInitial = ((channelName || 'TubeBoost').trim().charAt(0) || 'T').toUpperCase();
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
  if (boostChannel) boostChannel.textContent = `Your Channel : ${channelName === channelId ? getChannelFallbackName(channelId) : channelName}`;
}

async function loadDashboardProfile(channelId, channelName) {
  const normalizedChannelId = normalizeChannelInput(channelId);
  if (!normalizedChannelId) {
    return;
  }

  const storedLogo = localStorage.getItem('selectedChannelLogo') || '';
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const watchTimeHours = typeof storedUser?.watchTimeHours === 'number' ? storedUser.watchTimeHours : 0;
  const subscriberCount = await fetchChannelSubscriberCount(normalizedChannelId);

  if (Number.isFinite(subscriberCount)) {
    localStorage.setItem('selectedChannelSubscribers', String(subscriberCount));
  }

  if (storedLogo) {
    updateDashboardChannel(normalizedChannelId, channelName, storedLogo, subscriberCount, watchTimeHours);
    return;
  }

  try {
    const profile = await fetchChannelProfile(normalizedChannelId);
    const finalName = profile?.title || channelName || getChannelDisplayName(normalizedChannelId);
    const finalLogo = profile?.thumbnail || '';
    localStorage.setItem('selectedChannelId', normalizedChannelId);
    localStorage.setItem('selectedChannelName', finalName);
    localStorage.setItem('selectedChannelLogo', finalLogo);
    updateDashboardChannel(normalizedChannelId, finalName, finalLogo, subscriberCount, watchTimeHours);
  } catch (error) {
    updateDashboardChannel(normalizedChannelId, channelName || getChannelDisplayName(normalizedChannelId), '', subscriberCount, watchTimeHours);
  }
}
// Credit System
function getStoredCredits() {
  const userCreditsValue = parseInt(localStorage.getItem('userCredits') || '', 10);
  if (!Number.isNaN(userCreditsValue)) {
    return userCreditsValue;
  }

  const legacyCreditsValue = parseInt(localStorage.getItem('credits') || '', 10);
  if (!Number.isNaN(legacyCreditsValue)) {
    return legacyCreditsValue;
  }

  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (storedUser && typeof storedUser.credits === 'number') {
      return storedUser.credits;
    }
  } catch (error) {
    // Ignore invalid stored user data and fall back to zero.
  }

  return 0;
}

function persistCredits() {
  localStorage.setItem('userCredits', String(userCredits));
  localStorage.setItem('credits', JSON.stringify(userCredits));

  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (storedUser) {
      storedUser.credits = userCredits;
      localStorage.setItem('user', JSON.stringify(storedUser));
    }
  } catch (error) {
    // Ignore invalid stored user data and keep the balance in the credit keys.
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
    const response = await fetch('http://localhost:5000/api/user/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const serverUser = data?.user;
    if (!serverUser || typeof serverUser.credits !== 'number') {
      return false;
    }

    userCredits = serverUser.credits;
    localStorage.setItem('userCredits', String(userCredits));
    localStorage.setItem('credits', JSON.stringify(userCredits));

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

let userCredits = getStoredCredits();

function updateCreditDisplay() {
  const topBalance = document.getElementById('userCredits');
  if (topBalance) {
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

function getPaymentsApiBase() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }

  return 'https://tubegrowth.onrender.com/api';
}

async function openPaymentPage(amountINR) {
  const numericAmount = Number(amountINR);
  if (!numericAmount) {
    showToast('bi-exclamation-triangle-fill', 'Invalid Amount', 'Please choose a valid INR package');
    return;
  }

  const creditsByINR = {
    10: 100,
    50: 500,
    100: 1000
  };

  const creditsToAdd = creditsByINR[numericAmount];
  if (!creditsToAdd) {
    showToast('bi-exclamation-triangle-fill', 'Invalid Package', 'Please choose one of the listed credit packs');
    return;
  }

  try {
    const accessToken = localStorage.getItem('accessToken');
    const apiBase = getPaymentsApiBase();

    if (!window.Razorpay) {
      showToast('bi-exclamation-triangle-fill', 'Payment Not Ready', 'Razorpay checkout is not loaded yet. Refresh the page and try again.');
      return;
    }

    const response = await fetch(`${apiBase}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ amountINR: numericAmount }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to create payment order');
    }

    const options = {
      key: data.keyId || window.RAZORPAY_KEY_ID || '',
      amount: data.order.amount,
      currency: data.order.currency,
      name: 'TubeBoost',
      description: `Buy ${creditsToAdd} Credits`,
      order_id: data.order.id,
      prefill: {
        name: JSON.parse(localStorage.getItem('user') || 'null')?.name || '',
        email: JSON.parse(localStorage.getItem('user') || 'null')?.email || '',
      },
      theme: { color: '#FBBF24' },
      handler: async function (paymentResponse) {
        const verifyResponse = await fetch(`${apiBase}/payments/verify`, {
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
          `Rs ${numericAmount} paid | +${creditsToAdd} credits added`
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

function getLegacyUSDLabel(amountINR) {
  const usdMap = {
    10: '$1',
    50: '$15',
    100: '$50'
  };

  return usdMap[Number(amountINR)] || '$0';
}

function purchaseCreditsByINR(amountINR) {
  openPaymentPage(amountINR);
}

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
const earnedToday = JSON.parse(localStorage.getItem('earnedToday')) || {};
const earnLimits = {
  subscribe: { max: 1, earned: 0 },
  like: { max: 5, earned: 0 },
  watch: { max: 1, earned: 0 }
};

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
  const taskMap = [
    { type: 'like', promoType: 'likes' },
    { type: 'watch', promoType: 'views' },
    { type: 'subscribe', promoType: 'subs' }
  ];

  return taskMap.filter(({ type, promoType }) => {
    const promo = campaigns.find(c => c.type === promoType && (c.status === 'Active' || c.status === 'In Progress') && normalizeChannelReference(c.videoLink) !== currentChannel);
    return !!promo;
  }).map(item => item.type);
}

function getNextEarnTask() {
  const availableTasks = getAvailableEarnTasks();
  if (availableTasks.length === 0) {
    return 'subscribe';
  }

  const history = getEarnTaskHistory();
  const lastTask = history[history.length - 1];
  const preferredOrder = ['like', 'watch', 'subscribe'];

  // Try to pick the next task in shuffle order without repeating the last one.
  for (let i = 0; i < preferredOrder.length; i++) {
    const candidate = preferredOrder[(preferredOrder.indexOf(lastTask) + 1 + i) % preferredOrder.length];
    if (availableTasks.includes(candidate)) {
      history.push(candidate);
      saveEarnTaskHistory(history.slice(-12));
      return candidate;
    }
  }

  const fallback = availableTasks[0];
  history.push(fallback);
  saveEarnTaskHistory(history.slice(-12));
  return fallback;
}

function renderEarnMainTask() {
  const taskType = getNextEarnTask();
  const copyEl = document.getElementById('earn-main-copy');
  const openBtn = document.getElementById('earn-main-open-btn');
  const verifyBtn = document.getElementById('earn-main-verify-btn');

  if (!copyEl || !openBtn || !verifyBtn) return;

  const labels = {
    subscribe: { action: 'SUBSCRIBE', credits: 2, text: 'Subscribe the registered channel' },
    like: { action: 'LIKE VIDEO', credits: 1, text: 'Like the registered video' },
    watch: { action: 'WATCH TIME', credits: 3, text: 'Watch the registered video for 5 minutes' }
  };

  const task = labels[taskType] || labels.subscribe;
  copyEl.innerHTML = `<strong>${task.action}</strong> to earn ${task.credits} ${task.credits === 1 ? 'credit' : 'credits'}.`;
  openBtn.textContent = task.action;
  verifyBtn.textContent = 'VERIFY & NEXT PROMOTION';
  openBtn.onclick = () => showEarnModal(taskType);
  verifyBtn.onclick = () => verifyTask(taskType);
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
  const activePromos = campaigns.filter(c => c.type === type && (c.status === 'Active' || c.status === 'In Progress'));
  if (activePromos.length === 0) return null;

  const history = getPromotionHistory(historyKey);
  const seen = new Set(history.map(normalizeChannelReference));

  const eligible = activePromos.filter(promo => {
    const ref = normalizeChannelReference(promo.videoLink);
    if (!ref) return false;
    if (currentChannel && ref === currentChannel) return false;
    if (seen.has(ref)) return false;
    return true;
  });

  if (eligible.length > 0) {
    return eligible[0];
  }

  const resetEligible = activePromos.filter(promo => {
    const ref = normalizeChannelReference(promo.videoLink);
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
  const modal = document.getElementById('earnModal');
  modal.classList.add('active');
  
  // Hide all views
  document.getElementById('subscribe-modal').style.display = 'none';
  document.getElementById('like-modal').style.display = 'none';
  document.getElementById('watch-modal').style.display = 'none';
  
  // Show selected view
  document.getElementById(`${taskType}-modal`).style.display = 'block';

  // If subscribe modal, try to populate with a promotion channel
  if (taskType === 'subscribe') {
    const campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
    const promo = pickNextSubscribePromotion(campaigns);
    const linkEl = document.getElementById('subscribe-link');
    const nameEl = document.getElementById('subscribe-channel-name');

    if (promo && linkEl && nameEl) {
      const promoRef = normalizeChannelReference(promo.videoLink);
      // Normalize link for display: convert raw channel ID or handle to full URL
      const ref = promo.videoLink;
      let href = ref;
      if (/^UC[A-Za-z0-9_-]{10,}$/.test(ref)) {
        href = `https://www.youtube.com/channel/${ref}`;
      } else if (/^@/.test(ref)) {
        href = `https://www.youtube.com/${ref}`;
      } else if (!/^https?:\/\//.test(ref)) {
        // assume it's a handle or id fragment
        href = `https://www.youtube.com/${ref}`;
      }

      linkEl.href = href;
      nameEl.textContent = `Channel: ${ref}`;

      const history = getSubscribeHistory();
      if (!history.includes(promoRef)) {
        history.push(promoRef);
        saveSubscribeHistory(history);
      }

      // Start verification: store pending verify with start subscriber count and fetch channel title
      (async () => {
        const channelRef = promo.videoLink;
        const startCount = await fetchChannelSubscriberCount(channelRef);
        const title = await fetchChannelTitle(channelRef);
        if (title) nameEl.textContent = `Channel: ${title}`;
        const pending = { type: 'subscribe', campaignId: promo.id, channelReference: promo.videoLink, startCount: startCount };
        localStorage.setItem('pendingVerify', JSON.stringify(pending));
      })();
    } else if (linkEl && nameEl) {
      // Fallback: rotate through default subscribe channels
      const defaultChannelHistory = JSON.parse(localStorage.getItem('defaultSubscribeHistory') || '[]');
      const lastUsedIndex = (defaultChannelHistory.length > 0) ? (DEFAULT_SUBSCRIBE_CHANNELS.indexOf(defaultChannelHistory[defaultChannelHistory.length - 1])) : -1;
      const nextIndex = (lastUsedIndex + 1) % DEFAULT_SUBSCRIBE_CHANNELS.length;
      const selectedChannel = DEFAULT_SUBSCRIBE_CHANNELS[nextIndex];
      
      // Update history
      defaultChannelHistory.push(selectedChannel);
      localStorage.setItem('defaultSubscribeHistory', JSON.stringify(defaultChannelHistory.slice(-12)));
      
      const href = `https://www.youtube.com/channel/${selectedChannel}`;
      linkEl.href = href;
      nameEl.textContent = `Channel: ${selectedChannel}`;
      
      // Start verification with default channel
      (async () => {
        const startCount = await fetchChannelSubscriberCount(selectedChannel);
        const title = await fetchChannelTitle(selectedChannel);
        if (title) nameEl.textContent = `Channel: ${title}`;
        const pending = { type: 'subscribe', channelReference: selectedChannel, startCount: startCount };
        localStorage.setItem('pendingVerify', JSON.stringify(pending));
      })();
    }
  } else if (taskType === 'like' || taskType === 'watch') {
    const campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
    const currentChannel = normalizeChannelReference(localStorage.getItem('selectedChannelId') || localStorage.getItem('selectedChannelName'));
    const promoType = taskType === 'like' ? 'likes' : 'views';
    const historyKey = taskType === 'like' ? 'likeHistory' : 'watchHistory';
    const promo = pickNextPromotionForTask(campaigns, promoType, historyKey, currentChannel);
    const linkEl = document.getElementById(taskType === 'like' ? 'like-link' : 'watch-link');
    const nameEl = document.getElementById(taskType === 'like' ? 'like-channel-name' : 'watch-channel-name');

    if (promo && linkEl && nameEl) {
      const promoRef = normalizeChannelReference(promo.videoLink);
      linkEl.href = promotionVideoLinkToHref(promo.videoLink);
      const channelLabel = promo.channelName || promo.channelId || getChannelDisplayName(promo.videoLink);
      nameEl.textContent = `Channel: ${channelLabel}`;

      const history = getPromotionHistory(historyKey);
      if (!history.includes(promoRef)) {
        history.push(promoRef);
        savePromotionHistory(historyKey, history);
      }
    } else if (linkEl && nameEl) {
      linkEl.href = 'https://youtube.com/@TubeBoost';
      nameEl.textContent = 'Channel: TubeBoost';
    }
  }
}

function refreshEarnTaskRotation() {
  renderEarnMainTask();
}

function closeEarnModal() {
  const modal = document.getElementById('earnModal');
  modal.classList.remove('active');
  
  // Stop any running timers
  if (window.watchTimerInterval) {
    clearInterval(window.watchTimerInterval);
    window.watchTimerInterval = null;
  }

  const watchSession = JSON.parse(localStorage.getItem('watchSession') || 'null');
  if (watchSession && !watchSession.completed) {
    localStorage.removeItem('watchSession');
  }
}

function verifyTask(taskType) {
  userCredits = getStoredCredits();
  const earned = getEarnedToday();
  const limits = {
    subscribe: { max: 1, credits: 2 },
    like: { max: 5, credits: 1 },
    watch: { max: 1, credits: 3 }
  };
  
  const task = limits[taskType];
  const timesEarned = (earned[taskType] || 0);
  
  if (timesEarned >= task.max) {
    showStatus(taskType, `Limit reached (${task.max}/${task.max})`, 'error');
    return;
  }

  if (taskType === 'watch') {
    const watchSession = JSON.parse(localStorage.getItem('watchSession') || 'null');
    if (!watchSession || !watchSession.completed) {
      showStatus(taskType, 'Watch the full 5 minutes before claiming credits.', 'error');
      return;
    }

    const watchedSeconds = Math.max(0, Math.floor((watchSession.duration || 300) - (watchSession.timeLeft || 0)));
    if (watchedSeconds < 300) {
      showStatus(taskType, `You watched ${watchedSeconds} seconds. Complete the full watch time to earn credits.`, 'error');
      return;
    }

    userCredits += task.credits;
    persistCredits();
    updateCreditDisplay();

    earned[taskType] = timesEarned + 1;
    saveEarnedToday(earned);

    localStorage.removeItem('watchSession');

    showStatus(taskType, `+${task.credits} Credits earned! (${earned[taskType]}/${task.max})`, 'success');
    showToast('bi-coin', 'Credits Earned!', `+${task.credits} Credits added to your account`);

    const btn = document.getElementById(`${taskType}-btn`);
    if (btn) {
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
      showStatus(taskType, 'No pending subscription verification found.', 'error');
      return;
    }

    const pending = JSON.parse(pendingRaw);
    if (pending.type !== 'subscribe') {
      showStatus(taskType, 'No pending subscription verification found.', 'error');
      return;
    }

    (async () => {
      const current = await fetchChannelSubscriberCount(pending.channelReference);
      if (current === null) {
        showStatus(taskType, 'Unable to verify at this time. Try again later.', 'error');
        return;
      }

      const start = parseInt(pending.startCount || 0, 10);
      if (current > start) {
        // Grant credits
        userCredits += task.credits;
        persistCredits();
        updateCreditDisplay();

        // Update earned count
        earned[taskType] = timesEarned + 1;
        saveEarnedToday(earned);

        // Clear pending
        localStorage.removeItem('pendingVerify');

        // Show success
        showStatus(taskType, `+${task.credits} Credits earned! (${earned[taskType]}/${task.max})`, 'success');
        showToast('bi-coin', 'Credits Earned!', `+${task.credits} Credits added to your account`);

        // Disable button
        const btn = document.getElementById(`${taskType}-btn`);
        if (btn) btn.disabled = true;

        // Close modal
        setTimeout(() => closeEarnModal(), 500);
      } else {
        showStatus(taskType, 'No new subscriber detected yet. Please subscribe and try again.', 'error');
      }
    })();

    return;
  }

  // Grant credits for other tasks (like/watch)
  userCredits += task.credits;
  localStorage.setItem('userCredits', userCredits);
  updateCreditDisplay();
  
  // Update earned count
  earned[taskType] = timesEarned + 1;
  saveEarnedToday(earned);
  
  // Show success
  showStatus(taskType, `+${task.credits} Credits earned! (${earned[taskType]}/${task.max})`, 'success');
  showToast('bi-coin', 'Credits Earned!', `+${task.credits} Credits added to your account`);
  
  // Disable button
  const btn = document.getElementById(`${taskType}-btn`);
  if (btn) {
    btn.disabled = true;
  }
  
  // Close modal after success
  setTimeout(() => {
    closeEarnModal();
  }, 500);
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
  const earned = getEarnedToday();
  const limits = {
    subscribe: { max: 1, credits: 2 },
    like: { max: 5, credits: 1 },
    watch: { max: 1, credits: 3 }
  };
  
  Object.keys(limits).forEach(taskType => {
    const timesEarned = earned[taskType] || 0;
    const btn = document.getElementById(`${taskType}-btn`);
    
    if (btn && timesEarned >= limits[taskType].max) {
      btn.disabled = true;
      btn.textContent = 'Limit Reached';
      showStatus(taskType, `Daily limit reached (${timesEarned}/${limits[taskType].max})`, 'success');
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
  { name: 'Daniel T.', action: 'hit 10K subscribers with TubeBoost!', time: '8 min ago' },
  { name: 'Lena R.', action: 'just ordered 5,000 Video Likes', time: '11 min ago' },
  { name: 'Marcus J.', action: 'just reached monetization - 4,000 Watch Hours!', time: '14 min ago' },
];
let nIdx = 0;
function showNotification() {
  const n = notifications[nIdx % notifications.length];
  showToast('bi-bell-fill', n.name, n.action);
  nIdx++;
}
setTimeout(() => { showNotification(); setInterval(showNotification, 12000); }, 5000);

// BOOST PROFILE FUNCTIONS
const boostCosts = {
  likes: 1,      // 1 credit per like
  subs: 2,       // 2 credits per subscriber
  views: 0.5,    // 0.5 credits per view
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

function addPromotion() {
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
  
  // Deduct credits
  deductCredits(creditsNeeded);
  
  // Create campaign object
  const campaign = {
    id: Date.now(),
    type: type,
    videoLink: videoLink,
    channelId: registeredChannelId,
    channelName: registeredChannelName,
    quantity: quantity,
    costPaid: creditsNeeded,
    status: 'Active',
    dateCreated: new Date().toLocaleDateString(),
    progress: 0
  };
  
  // Save to localStorage
  let campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
  campaigns.push(campaign);
  localStorage.setItem('campaigns', JSON.stringify(campaigns));
  
  // Show success
  showToast('bi-check-circle-fill', 'Promotion Added!', `${quantity} ${type} ordered for ${videoLink}`);
  
  // Reset form
  document.getElementById('promotionType').value = '';
  document.getElementById('quantityInput').value = '';
  document.getElementById('videoLink').value = '';
  document.getElementById('creditsNeeded').textContent = '0';
  updateBoostTargetField('', document.getElementById('videoLink'), document.getElementById('videoLinkLabel'));
  updateBoostButtonState(0);
  
  // Update UI (optional: display campaigns list)
}

// Initialize boost profile display
function initializeBoostProfile() {
  // Update credits display in boost section
  const creditChip = document.querySelector('.boost-credit-chip');
  if (creditChip) {
    creditChip.textContent = `Your Credits : ${userCredits}`;
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
  const initialSection = window.location.hash ? window.location.hash.slice(1) : 'home';
  showSection(initialSection);
});

// VIEW PROMOTIONS FUNCTIONS
let currentPage = 1;
const itemsPerPage = 4;

function initializeViewPromotions() {
  // Update credits display in promotions section
  const creditChip = document.querySelector('.view-promo-credit-chip');
  if (creditChip) {
    creditChip.textContent = `Your Credits : ${userCredits}`;
  }
  
  // Load promotions from localStorage
  loadPromotions();
}

function loadPromotions() {
  const campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
  const tableBody = document.getElementById('promoTableBody');
  
  if (campaigns.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px; color: #999;">No promotions yet. Go to Boost Profile to create one!</td></tr>';
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
    
    const statusClass = campaign.status === 'Completed' ? 'status-completed' : 'status-inprogress';
    const statusText = campaign.status === 'Completed' ? 'Completed' : 'In Progress';
    const boostBtn = campaign.status === 'Completed' ? 'NA' : '<span class="boost-speed-btn">BOOST SPEED</span>';
    
    return `
      <tr>
        <td>${campaign.id}</td>
        <td>${typeMap[campaign.type] || campaign.type}</td>
        <td><a href="#" class="link-btn">${campaign.videoLink}</a> <span class="open-link-btn">OPEN LINK</span></td>
        <td>${campaign.quantity}</td>
        <td>${Math.floor(campaign.quantity * campaign.progress / 100)}</td>
        <td>${campaign.costPaid}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${campaign.dateCreated}</td>
        <td>${boostBtn}</td>
        <td><button class="manage-btn" onclick="deletePromotion(${campaign.id})" aria-label="Delete promotion">&#128465;</button></td>
      </tr>
    `;
  }).join('');
  
  // Update pagination info
  updatePaginationInfo(campaigns.length, currentPage, totalPages);
}

function updatePaginationInfo(total, page, totalPages) {
  const paginationDiv = document.querySelector('.view-promo-pagination');
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
  if (confirm('Are you sure you want to delete this promotion? Credits will be refunded.')) {
    let campaigns = JSON.parse(localStorage.getItem('campaigns')) || [];
    const campaignToDelete = campaigns.find(c => c.id === campaignId);
    
    if (campaignToDelete) {
      // Refund credits
      userCredits += campaignToDelete.costPaid;
      persistCredits();
      updateCreditDisplay();
      
      // Remove campaign
      campaigns = campaigns.filter(c => c.id !== campaignId);
      localStorage.setItem('campaigns', JSON.stringify(campaigns));
      
      // Reload
      loadPromotions();
      initializeViewPromotions();
      showToast('bi-check-circle-fill', 'Promotion Deleted', `Refunded ${campaignToDelete.costPaid} credits`);
    }
  }
}

// Initialize credit display on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCreditDisplay();
  syncCreditsFromBackend();
  updateEarnedUI();
  
  // Close modal on overlay click
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
});


