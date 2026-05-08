import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiCopy, FiCheck } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { userAPI } from '../utils/api';

export const DashboardPage = () => {
  const { user, logout, updateUser, refreshUser } = useAuth();
  const balance = user?.credits ?? 1000;
  const subscribers = user?.subscribers ?? 0;
  const watchTimeHours = user?.watchTimeHours ?? 0;
  const youtubeChannelId = user?.youtubeChannelId || '';
  const hasYouTubeConnection = Boolean(user?.youtubeConnected || youtubeChannelId);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dailyBonusCollected, setDailyBonusCollected] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [channelIdInput, setChannelIdInput] = useState('');
  const [youtubeActionLoading, setYoutubeActionLoading] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyAmountINR, setBuyAmountINR] = useState('100');
  const [buyLoading, setBuyLoading] = useState(false);
  const premiumPackages = [
    { label: '₹10 - 100 credits', amount: 10 },
    { label: '₹50 - 500 credits', amount: 50 },
    { label: '₹100 - 1000 credits', amount: 100 },
  ];
  const [updates] = useState([
    { date: '2024-01-15', description: 'New dashboard theme launched' },
    { date: '2024-01-10', description: 'Bug fixes and performance improvements' },
    { date: '2024-01-05', description: 'Added referral system' },
  ]);

  useEffect(() => {
    let isActive = true;

    const syncYouTubeStats = async () => {
      if (!user || user.isGuest || !youtubeChannelId) {
        return;
      }

      try {
        const response = await userAPI.syncYouTubeStats();
        if (!isActive) {
          return;
        }

        if (response.data?.user) {
          updateUser(response.data.user);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
      }
    };

    syncYouTubeStats();

    return () => {
      isActive = false;
    };
  }, [user?.id, user?.isGuest, youtubeChannelId, updateUser]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);

    if (query.get('youtube') !== 'connected') {
      return;
    }

    const refreshAfterConnect = async () => {
      try {
        await refreshUser();
        const response = await userAPI.syncYouTubeStats();
        if (response.data?.user) {
          updateUser(response.data.user);
        }
      } catch (error) {
        console.error('Unable to refresh YouTube connection:', error);
      }
    };

    refreshAfterConnect();
  }, [location.search, refreshUser, updateUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDailyBonus = () => {
    setDailyBonusCollected(true);
    setTimeout(() => setDailyBonusCollected(false), 2000);
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(user?.referralCode || 'TUBEGROWTH123');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleConnectYouTube = async () => {
    try {
      const response = await userAPI.getYouTubeAuthUrl();
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Unable to start YouTube connection:', error);
    }
  };

  const handleSearchAndConnectYouTube = async (channelIdArg) => {
    const raw = (channelIdArg !== undefined && channelIdArg !== null) ? channelIdArg : channelIdInput;
    const trimmedChannelId = String(raw || '').trim();

    if (!trimmedChannelId) {
      return;
    }

    try {
      setYoutubeActionLoading(true);

      const profileResponse = await userAPI.updateProfile({ youtubeChannelId: trimmedChannelId });
      if (profileResponse.data?.user) {
        updateUser(profileResponse.data.user);
      }

      const authResponse = await userAPI.getYouTubeAuthUrl();
      window.location.href = authResponse.data.authUrl;
    } catch (error) {
      console.error('Unable to search and connect YouTube channel:', error);
    } finally {
      setYoutubeActionLoading(false);
    }
  };

  const handleRefreshYouTubeStats = async () => {
    try {
      const response = await userAPI.syncYouTubeStats();
      if (response.data?.user) {
        updateUser(response.data.user);
      }
    } catch (error) {
      console.error('Unable to refresh YouTube stats:', error);
    }
  };

  const handleBuyCredits = async () => {
    const amount = Number(buyAmountINR);
    if (isNaN(amount) || amount <= 0) return;

    try {
      setBuyLoading(true);
      const response = await userAPI.buyCredits({ amountINR: amount });
      if (response.data?.user) {
        updateUser(response.data.user);
      }
      setShowBuyModal(false);
    } catch (error) {
      console.error('Buy credits failed:', error);
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark pt-20 pb-12">
      {/* DASHBOARD HEADER */}
      <div className="bg-primary text-white text-center py-4 mb-6">
        <h1 className="text-3xl font-bold">DASHBOARD</h1>
      </div>

      {/* NAVIGATION TABS */}
      <div className="max-w-7xl mx-auto px-4 mb-8 flex flex-wrap justify-center gap-4 bg-white p-4 rounded-lg">
        <button
          onClick={() => {}}
          className="font-bold text-sm hover:text-primary transition-colors"
        >
          DASHBOARD
        </button>
        <button
          onClick={() => navigate('/earn')}
          className="font-bold text-sm text-text-secondary hover:text-primary transition-colors"
        >
          EARN CREDITS
        </button>
        <button
          onClick={() => navigate('/campaigns')}
          className="font-bold text-sm text-text-secondary hover:text-primary transition-colors"
        >
          BOOST PROFILE
        </button>
        <button
          onClick={() => {}}
          className="font-bold text-sm text-text-secondary hover:text-primary transition-colors"
        >
          VIEW PROMOTIONS
        </button>
        <button
          onClick={handleLogout}
          className="font-bold text-sm text-text-secondary hover:text-primary transition-colors ml-auto"
        >
          LOGOUT
        </button>
      </div>

      {/* MAIN CONTENT - 3 COLUMN LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* LEFT: PROFILE INFORMATION */}
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="bg-primary text-white text-center py-3 font-bold">
            PROFILE INFORMATION
          </div>
          <div className="p-6 flex flex-col items-center">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gray-300 rounded-full mb-4"></div>
            
            {/* User Info */}
            <p className="text-sm text-gray-600">{user?.isGuest ? 'Guest User' : user?.name}</p>
            <p className="text-sm text-gray-600 mb-3">
              {user?.email || 'guest@tubegrowth.com'}
            </p>

            {/* Credits Badge */}
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              Your Credits : {balance}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 w-full max-w-xs">
              <div className="bg-gray-100 rounded-lg py-3 text-center border border-gray-200">
                <p className="text-xs text-gray-600 uppercase tracking-wide">Subscribers</p>
                <p className="text-lg font-bold text-gray-900">{subscribers}</p>
              </div>
              <div className="bg-gray-100 rounded-lg py-3 text-center border border-gray-200">
                <p className="text-xs text-gray-600 uppercase tracking-wide">Watch Time</p>
                <p className="text-lg font-bold text-gray-900">{watchTimeHours}h</p>
              </div>
            </div>

            <div className="mt-4 w-full max-w-xs">
              {!hasYouTubeConnection && (
                <div className="mb-3 space-y-2">
                  <input
                    type="text"
                    value={channelIdInput}
                    onChange={(event) => setChannelIdInput(event.target.value)}
                    onPaste={(e) => {
                      const pasted = (e.clipboardData && e.clipboardData.getData)
                        ? e.clipboardData.getData('text')
                        : '';
                      if (pasted) {
                        setChannelIdInput(pasted);
                        // start immediate search-and-connect when a link/id is pasted
                        handleSearchAndConnectYouTube(pasted);
                      }
                    }}
                    placeholder="Paste your YouTube Channel ID or URL"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              <button
                onClick={hasYouTubeConnection ? handleRefreshYouTubeStats : handleSearchAndConnectYouTube}
                disabled={!hasYouTubeConnection && (!channelIdInput.trim() || youtubeActionLoading)}
                className="w-full bg-primary text-white py-2 rounded font-bold text-xs hover:bg-red-700 transition"
              >
                {youtubeActionLoading
                  ? 'SEARCHING...'
                  : hasYouTubeConnection
                    ? 'REFRESH REAL WATCH TIME'
                    : 'SEARCH & CONNECT YOUTUBE'}
              </button>
            </div>
            <div className="mt-3 w-full max-w-xs">
              <button
                onClick={() => setShowBuyModal(true)}
                className="w-full bg-yellow-500 text-white py-2 rounded font-bold text-xs hover:bg-yellow-600 transition"
              >
                BUY CREDITS (INR)
              </button>
            </div>
          </div>

          {/* UPDATES LOG */}
          <div className="bg-gray-100 p-4">
            <h3 className="font-bold text-sm mb-3">UPDATES LOG</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="p-2 text-left">Release Date</th>
                  <th className="p-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {updates.map((update, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{update.date}</td>
                    <td className="p-2">{update.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SEND FEEDBACK */}
          <div className="border-t p-4 text-center">
            <h3 className="font-bold text-sm mb-2">SEND FEEDBACK / REPORT BUG</h3>
            <p className="text-xs text-gray-600 mb-3">
              If you have any bug to report or any suggestions, Please let us know!
            </p>
            <button className="w-full bg-primary text-white py-2 rounded font-bold text-xs hover:bg-red-700 transition">
              SEND FEEDBACK
            </button>
          </div>
        </div>

        {/* CENTER: DAILY BONUS */}
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="bg-purple-600 text-white text-center py-3 font-bold">
            DAILY BONUS <span className="text-yellow-300">25 CREDITS</span>
          </div>
          <div className="p-6">
            {dailyBonusCollected ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                ✓ Daily bonus collected! Come back tomorrow.
              </div>
            ) : (
              <>
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 text-sm">
                  You have already claimed daily bonus for today. You can again claim it tomorrow.
                </div>
                <button
                  onClick={handleDailyBonus}
                  disabled={dailyBonusCollected}
                  className="w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700 transition disabled:opacity-50"
                >
                  CLAIM BONUS
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: REFER & EARN */}
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="bg-primary text-white text-center py-3 font-bold">
            REFER & EARN
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700 mb-4">
              Refer your friends to My Tube Town and earn credits.
            </p>

            {/* Referral Code Box */}
            <div className="bg-gray-100 p-3 rounded mb-4 flex items-center justify-between">
              <code className="text-sm font-mono">{user?.referralCode || 'TUBEGROWTH123'}</code>
              <button
                onClick={handleCopyReferral}
                className="text-primary hover:text-red-700 transition"
              >
                {copySuccess ? <FiCheck size={18} /> : <FiCopy size={18} />}
              </button>
            </div>

            {copySuccess && (
              <p className="text-xs text-green-600 mb-2">✓ Copied to clipboard!</p>
            )}

            <button className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-red-700 transition">
              REFER & EARN
            </button>
          </div>
        </div>
      </div>

      {/* BUY CREDITS MODAL */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="font-bold mb-3">Buy Credits (INR)</h3>
            <p className="text-sm text-gray-600 mb-3">Choose a package</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {premiumPackages.map((p) => (
                <button
                  key={p.amount}
                  onClick={() => setBuyAmountINR(String(p.amount))}
                  className={`py-2 px-2 rounded text-sm border ${String(buyAmountINR) === String(p.amount) ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-3">Or enter a custom INR amount below (fallback rate: 1 INR = 1 credit)</p>
            <input
              type="number"
              value={buyAmountINR}
              onChange={(e) => setBuyAmountINR(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
            />
            <div className="flex gap-3">
              <button
                onClick={handleBuyCredits}
                disabled={buyLoading}
                className="flex-1 bg-yellow-500 text-white py-2 rounded font-bold hover:bg-yellow-600"
              >
                {buyLoading ? 'PROCESSING...' : 'BUY'}
              </button>
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-bold hover:bg-gray-300"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOW IT WORKS SECTION */}
      <div className="max-w-7xl mx-auto px-4 bg-white rounded-lg overflow-hidden">
        <h2 className="text-center text-primary font-bold text-xl py-4">HOW IT WORKS ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          {[
            {
              step: 'STEP 1',
              title: 'Earn Credits',
              description: 'by liking other user\'s posts and subscribing them.'
            },
            {
              step: 'STEP 2',
              title: 'Boost Profile',
              description: 'to receive likes and subscribers on your profile.'
            },
            {
              step: 'STEP 3',
              title: 'Sit Back & Relax',
              description: 'while you receive likes and subscribers on your profile.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-blue-100 rounded-lg p-4 text-center border-2 border-blue-300"
            >
              <h3 className="text-blue-600 font-bold mb-2">{item.step}</h3>
              <h4 className="font-bold text-gray-800 mb-2">{item.title}</h4>
              <p className="text-sm text-gray-700">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
